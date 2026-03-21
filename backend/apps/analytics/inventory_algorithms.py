"""
Inventory Intelligence Algorithms.
All deterministic, zero-ML. Computed fresh per API call.
Uses InventoryTransaction ledger as the source of truth.
"""
from datetime import date, timedelta
from collections import defaultdict


def calculate_stockout_risk(products_queryset):
    """
    Ranks products by how soon they will run out at current consumption rate.

    Method:
      1. Sum all InventoryTransaction.quantity_change where type in ('usage','wastage')
         for the last 30 days. This is total_consumed_30d.
      2. avg_daily_consumption = total_consumed_30d / 30  (absolute value)
      3. days_until_stockout = current_stock / avg_daily_consumption  (if consumption > 0)
      4. Risk score (0-100):
           stockout already (<=0 days):   100
           0-3 days:  95  (critical)
           4-7 days:  80  (high)
           8-14 days: 60  (medium)
           15-30 days: 35  (low)
           30+ days:  10  (safe)
           no consumption: 5 (possibly dead stock)
      5. +10 bonus if already below reorder_level (capped at 100)

    Risk bands: critical (80-100), high (55-79), medium (30-54), low (0-29)

    Returns list sorted by stockout_risk_score descending.
    """
    from apps.inventory.models import InventoryTransaction
    from django.db.models import Sum

    today = date.today()
    cutoff = today - timedelta(days=30)

    results = []
    for product in products_queryset:
        consumed_30d = abs(float(
            InventoryTransaction.objects.filter(
                product=product,
                transaction_type__in=['usage', 'wastage'],
                created_at__date__gte=cutoff,
            ).aggregate(total=Sum('quantity_change'))['total'] or 0
        ))

        avg_daily = consumed_30d / 30
        current   = float(product.quantity_in_stock)
        reorder   = float(product.reorder_level)

        if avg_daily > 0:
            days_until_stockout = current / avg_daily
        else:
            days_until_stockout = None

        if days_until_stockout is None:
            score, band = 5, 'low'
        elif days_until_stockout <= 0:
            score, band = 100, 'critical'
        elif days_until_stockout <= 3:
            score, band = 95, 'critical'
        elif days_until_stockout <= 7:
            score, band = 80, 'high'
        elif days_until_stockout <= 14:
            score, band = 60, 'medium'
        elif days_until_stockout <= 30:
            score, band = 35, 'low'
        else:
            score, band = 10, 'low'

        if current <= reorder:
            score = min(100, score + 10)
            if band == 'low' and score >= 30:
                band = 'medium'

        results.append({
            'id': product.id,
            'name': product.name,
            'brand': product.brand,
            'category': product.category,
            'unit': product.unit,
            'current_stock': round(current, 2),
            'reorder_level': round(reorder, 2),
            'is_below_reorder': current <= reorder,
            'consumed_last_30d': round(consumed_30d, 2),
            'avg_daily_consumption': round(avg_daily, 3),
            'days_until_stockout': round(days_until_stockout, 1) if days_until_stockout is not None else None,
            'stockout_risk_score': score,
            'risk_band': band,
            'cost_price': float(product.cost_price),
            'supplier': product.supplier_name or '',
        })

    results.sort(key=lambda x: x['stockout_risk_score'], reverse=True)
    return results


def identify_dead_stock(products_queryset):
    """
    Detects products with stock on hand but no consumption activity.

    Scoring:
      0-30 days since last negative transaction:   active  (score=0)
      31-60 days:  slow_moving  (score=30)
      61-90 days:  stagnant     (score=60)
      90+ days or never used: dead_stock (score=90)

    Capital_tied = current_stock * cost_price (cost of idle inventory)
    Only includes products with current_stock > 0.

    Returns dict:
      {
        dead_and_slow: list of non-active products sorted by capital_tied desc,
        active: list of active products sorted by capital_tied desc,
        total_dead_capital: float,
        total_active_capital: float,
      }
    """
    from apps.inventory.models import InventoryTransaction

    today = date.today()

    all_results = []
    for product in products_queryset:
        current = float(product.quantity_in_stock)
        if current <= 0:
            continue

        last_usage_txn = (
            InventoryTransaction.objects.filter(
                product=product, quantity_change__lt=0,
            ).order_by('-created_at').first()
        )

        if last_usage_txn is None:
            days_since = None
            dead_score = 90
            status = 'never_used'
        else:
            days_since = (today - last_usage_txn.created_at.date()).days
            if days_since <= 30:
                dead_score, status = 0,  'active'
            elif days_since <= 60:
                dead_score, status = 30, 'slow_moving'
            elif days_since <= 90:
                dead_score, status = 60, 'stagnant'
            else:
                dead_score, status = 90, 'dead_stock'

        capital_tied = round(current * float(product.cost_price), 2)

        all_results.append({
            'id': product.id,
            'name': product.name,
            'brand': product.brand,
            'category': product.category,
            'unit': product.unit,
            'current_stock': round(current, 2),
            'cost_price': float(product.cost_price),
            'capital_tied': capital_tied,
            'days_since_last_usage': days_since,
            'last_usage_date': str(last_usage_txn.created_at.date()) if last_usage_txn else None,
            'dead_stock_score': dead_score,
            'status': status,
        })

    dead = [r for r in all_results if r['dead_stock_score'] > 0]
    active = [r for r in all_results if r['dead_stock_score'] == 0]

    dead.sort(key=lambda x: x['capital_tied'], reverse=True)
    active.sort(key=lambda x: x['capital_tied'], reverse=True)

    return {
        'dead_and_slow': dead,
        'active': active,
        'total_dead_capital': round(sum(r['capital_tied'] for r in dead), 2),
        'total_active_capital': round(sum(r['capital_tied'] for r in active), 2),
    }


def calculate_turnover_metrics(products_queryset):
    """
    Inventory turnover rate per product for the last 30 days.

    turnover_rate = units_consumed_30d / avg_stock_approx
      avg_stock_approx = (opening_stock + current_stock) / 2
        where opening_stock = current_stock + net_change_30d
        net_change_30d = sum(quantity_change) for last 30d (all transaction types)
      This avoids overstating turnover for recently restocked products.

    wastage_rate_pct = wastage_30d / (usage_30d + wastage_30d) * 100

    Speed classification:
      fast_mover:     turnover_rate >= 0.5
      medium_mover:   0.2 <= turnover_rate < 0.5
      slow_mover:     0 < turnover_rate < 0.2
      no_movement:    turnover_rate == 0

    Returns dict:
      {
        products: list sorted by usage_30d desc,
        by_category: list of category rollups sorted by total_cost desc,
        summary: {total_consumption_value, total_wastage_value, overall_wastage_rate_pct}
      }
    """
    from apps.inventory.models import InventoryTransaction
    from django.db.models import Sum

    today  = date.today()
    cutoff = today - timedelta(days=30)

    category_map = defaultdict(lambda: {'consumed': 0.0, 'cost': 0.0, 'wastage': 0.0, 'items': 0})

    results = []
    for product in products_queryset:
        def txn_sum(types):
            return float(
                InventoryTransaction.objects.filter(
                    product=product,
                    transaction_type__in=types,
                    created_at__date__gte=cutoff,
                ).aggregate(t=Sum('quantity_change'))['t'] or 0
            )

        usage_30d    = abs(txn_sum(['usage']))
        wastage_30d  = abs(txn_sum(['wastage']))
        restock_30d  = txn_sum(['restock'])
        net_change   = txn_sum(['restock', 'usage', 'wastage', 'adjustment', 'return'])

        current = float(product.quantity_in_stock)
        opening = current - net_change  # approximate opening stock
        avg_stock = max((opening + current) / 2, 0.01)

        turnover_rate = round(usage_30d / avg_stock, 4)
        total_out = usage_30d + wastage_30d
        wastage_rate = round(wastage_30d / max(total_out, 0.01) * 100, 1)

        cost = float(product.cost_price)
        cost_consumed = round(usage_30d * cost, 2)

        if usage_30d == 0:
            speed = 'no_movement'
        elif turnover_rate >= 0.5:
            speed = 'fast_mover'
        elif turnover_rate >= 0.2:
            speed = 'medium_mover'
        else:
            speed = 'slow_mover'

        cat = product.category or 'Other'
        category_map[cat]['consumed'] += usage_30d
        category_map[cat]['cost']     += cost_consumed
        category_map[cat]['wastage']  += wastage_30d
        category_map[cat]['items']    += 1

        results.append({
            'id': product.id,
            'name': product.name,
            'brand': product.brand,
            'category': product.category,
            'unit': product.unit,
            'usage_30d': round(usage_30d, 2),
            'wastage_30d': round(wastage_30d, 2),
            'restock_30d': round(restock_30d, 2),
            'current_stock': round(current, 2),
            'turnover_rate': turnover_rate,
            'wastage_rate_pct': wastage_rate,
            'cost_consumed_30d': cost_consumed,
            'cost_price': cost,
            'speed': speed,
        })

    results.sort(key=lambda x: x['usage_30d'], reverse=True)

    categories = [
        {
            'category': cat,
            'total_consumed': round(v['consumed'], 2),
            'total_cost':     round(v['cost'], 2),
            'total_wastage':  round(v['wastage'], 2),
            'items': v['items'],
            'wastage_rate_pct': round(
                v['wastage'] / max(v['consumed'] + v['wastage'], 0.01) * 100, 1
            ),
        }
        for cat, v in category_map.items()
    ]
    categories.sort(key=lambda x: x['total_cost'], reverse=True)

    total_consumption_value = sum(r['cost_consumed_30d'] for r in results)
    total_wastage_value = sum(r['wastage_30d'] * r['cost_price'] for r in results)
    overall_wastage_rate = round(
        total_wastage_value / max(total_consumption_value + total_wastage_value, 0.01) * 100, 1
    )

    return {
        'products': results,
        'by_category': categories,
        'summary': {
            'total_consumption_value': round(total_consumption_value, 2),
            'total_wastage_value': round(total_wastage_value, 2),
            'overall_wastage_rate_pct': overall_wastage_rate,
        },
    }


def generate_reorder_suggestions(products_queryset):
    """
    Generates smart purchase order recommendations.

    Logic:
      Only include products where:
        - avg_daily_consumption > 0 AND days_until_stockout < 30, OR
        - current_stock <= reorder_level (regardless of consumption rate)

    Suggested order quantity = max(
        avg_daily_consumption * 45 - current_stock,   # 45-day supply buffer
        reorder_level * 1.5 - current_stock,           # always above reorder line
        1                                               # minimum 1 unit
    )

    Reorder-by date = today + days until stock hits reorder_level
      = (current_stock - reorder_level) / avg_daily_consumption  (if > 0)

    Priority:
      urgent: days_until_stockout <= 7  OR current_stock <= 0
      soon:   7 < days_until_stockout <= 14  OR current_stock <= reorder_level
      plan:   14 < days_until_stockout <= 30

    Returns dict:
      {
        suggestions: list sorted by (priority, days_until_stockout asc),
        total_items_to_reorder: int,
        total_reorder_cost: float,
        by_priority: {urgent_count, soon_count, plan_count},
      }
    """
    from apps.inventory.models import InventoryTransaction
    from django.db.models import Sum

    today  = date.today()
    cutoff = today - timedelta(days=30)

    results = []
    total_cost = 0.0

    for product in products_queryset:
        consumed_30d = abs(float(
            InventoryTransaction.objects.filter(
                product=product,
                transaction_type__in=['usage', 'wastage'],
                created_at__date__gte=cutoff,
            ).aggregate(t=Sum('quantity_change'))['t'] or 0
        ))

        avg_daily = consumed_30d / 30
        current   = float(product.quantity_in_stock)
        reorder   = float(product.reorder_level)
        cost      = float(product.cost_price)

        days_until_stockout = (current / avg_daily) if avg_daily > 0 else None

        # Inclusion criteria
        include = (
            current <= reorder or
            (days_until_stockout is not None and days_until_stockout < 30)
        )
        if not include:
            continue

        # Suggested quantity
        option_a = avg_daily * 45 - current if avg_daily > 0 else 0
        option_b = reorder * 1.5 - current
        suggested_qty = max(option_a, option_b, 1.0)
        suggested_qty = round(suggested_qty, 1)

        # Reorder-by date
        if avg_daily > 0 and current > reorder:
            days_to_reorder_lvl = (current - reorder) / avg_daily
            reorder_by = today + timedelta(days=int(days_to_reorder_lvl))
        else:
            reorder_by = today  # already at or below reorder level

        # Priority
        if current <= 0 or (days_until_stockout is not None and days_until_stockout <= 7):
            priority = 'urgent'
        elif current <= reorder or (days_until_stockout is not None and days_until_stockout <= 14):
            priority = 'soon'
        else:
            priority = 'plan'

        est_cost = round(suggested_qty * cost, 2)
        total_cost += est_cost

        results.append({
            'id': product.id,
            'name': product.name,
            'brand': product.brand,
            'category': product.category,
            'unit': product.unit,
            'current_stock': round(current, 2),
            'reorder_level': round(reorder, 2),
            'avg_daily_consumption': round(avg_daily, 3),
            'days_until_stockout': round(days_until_stockout, 1) if days_until_stockout is not None else None,
            'suggested_order_qty': suggested_qty,
            'reorder_by': str(reorder_by),
            'estimated_cost': est_cost,
            'cost_price': cost,
            'priority': priority,
            'supplier': product.supplier_name or '',
        })

    priority_rank = {'urgent': 0, 'soon': 1, 'plan': 2}
    results.sort(key=lambda x: (priority_rank[x['priority']], x['days_until_stockout'] or 999))

    return {
        'suggestions': results,
        'total_items_to_reorder': len(results),
        'total_reorder_cost': round(total_cost, 2),
        'by_priority': {
            'urgent_count': sum(1 for r in results if r['priority'] == 'urgent'),
            'soon_count':   sum(1 for r in results if r['priority'] == 'soon'),
            'plan_count':   sum(1 for r in results if r['priority'] == 'plan'),
        },
    }
