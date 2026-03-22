"""
Analytics views (owner-only).
Provides revenue trends, top services, staff performance, and customer retention data
for the analytics dashboard page with Recharts-compatible output format.
"""
from datetime import datetime, timedelta, date
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice, InvoiceItem
from apps.appointments.models import Appointment
from apps.customers.models import Customer
from apps.accounts.models import StaffMember
from apps.services.models import Service
from apps.core.filters import parse_filter_params, apply_date_filter


class RevenueAnalyticsView(APIView):
    """
    GET /api/analytics/revenue/?period=week|month
    Returns daily revenue totals for the last 7 or 30 days.
    Output format: [{date: 'DD MMM', revenue: 12500, appointments: 8}, ...]
    Compatible with Recharts BarChart data format.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            period = request.query_params.get('period', 'month')
            today = date.today()

            # If start_date/end_date provided, use those (up to 90 days)
            if 'start_date' in params and 'end_date' in params:
                start_day = params['start_date']
                end_day = params['end_date']
                delta = (end_day - start_day).days
                days_list = [start_day + timedelta(days=i) for i in range(min(delta + 1, 90))]
            else:
                days = 7 if period == 'week' else 30
                days_list = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]

            data = []
            for day in days_list:
                invoices = Invoice.objects.filter(created_at__date=day)
                appt_qs = Appointment.objects.filter(scheduled_at__date=day, status='completed')
                if 'staff_id' in params:
                    # Filter invoices that have items by this stylist
                    invoice_ids = InvoiceItem.objects.filter(
                        stylist_id=params['staff_id'],
                        invoice__created_at__date=day,
                    ).values_list('invoice_id', flat=True)
                    invoices = invoices.filter(id__in=invoice_ids)
                    appt_qs = appt_qs.filter(stylist_id=params['staff_id'])
                revenue = invoices.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
                appt_count = appt_qs.count()
                data.append({
                    'date': day.strftime('%d %b'),
                    'full_date': day.strftime('%Y-%m-%d'),
                    'revenue': float(revenue),
                    'appointments': appt_count,
                })

            return Response({'success': True, 'data': data, 'period': period})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class TopServicesView(APIView):
    """
    GET /api/analytics/top-services/
    Returns top 5 services by total revenue generated.
    Output: [{name, revenue, count}, ...] — compatible with Recharts HorizontalBar.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            qs = InvoiceItem.objects.all()
            qs = apply_date_filter(qs, params, 'invoice__created_at')
            if 'staff_id' in params:
                qs = qs.filter(stylist_id=params['staff_id'])
            top = (
                qs
                .values('service__name')
                .annotate(revenue=Sum('price'), count=Count('id'))
                .order_by('-revenue')[:5]
            )
            data = [
                {'name': item['service__name'], 'revenue': float(item['revenue']), 'count': item['count']}
                for item in top
            ]
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class StaffPerformanceView(APIView):
    """
    GET /api/analytics/staff-performance/
    Returns appointments count and revenue per stylist for current month.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            today = date.today()
            month_start = today.replace(day=1)

            # Use provided date range or fall back to current month
            range_start = params.get('start_date', month_start)
            range_end = params.get('end_date', today)

            stylists = StaffMember.objects.filter(role='stylist', is_active_staff=True)
            if 'staff_id' in params:
                stylists = stylists.filter(id=params['staff_id'])

            data = []
            for stylist in stylists:
                appts = Appointment.objects.filter(
                    stylist=stylist,
                    scheduled_at__date__gte=range_start,
                    scheduled_at__date__lte=range_end,
                    status='completed',
                )
                revenue = InvoiceItem.objects.filter(
                    stylist=stylist,
                    invoice__created_at__date__gte=range_start,
                    invoice__created_at__date__lte=range_end,
                ).aggregate(total=Sum('price'))['total'] or Decimal('0')

                # Commission = revenue * commission_rate / 100
                commission = float(revenue) * float(stylist.commission_rate) / 100

                data.append({
                    'stylist_id': stylist.id,
                    'name': stylist.full_name,
                    'appointments': appts.count(),
                    'revenue': float(revenue),
                    'commission': round(commission, 2),
                    'commission_rate': float(stylist.commission_rate),
                })

            data.sort(key=lambda x: x['revenue'], reverse=True)
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class CustomerRetentionView(APIView):
    """
    GET /api/analytics/customer-retention/
    Returns new vs returning customer counts for the last 30 days.
    A 'returning' customer has more than 1 appointment total.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            today = date.today()

            # Use provided date range or fall back to last 30 days
            range_start = params.get('start_date', today - timedelta(days=30))
            range_end = params.get('end_date', today)

            # Customers who visited in the date range
            recent_customers = Customer.objects.filter(last_visit__gte=range_start, last_visit__lte=range_end)

            new_customers = Customer.objects.filter(
                created_at__date__gte=range_start,
                created_at__date__lte=range_end,
            ).count()
            returning = recent_customers.annotate(
                visit_count=Count('appointments')
            ).filter(visit_count__gt=1).count()

            # Daily new customer trend for chart (over the date range, up to 30 days)
            delta = (range_end - range_start).days
            trend = []
            for i in range(min(delta, 29), -1, -1):
                day = range_end - timedelta(days=i)
                new_on_day = Customer.objects.filter(created_at__date=day).count()
                trend.append({'date': day.strftime('%d %b'), 'new': new_on_day})

            return Response({
                'success': True,
                'data': {
                    'new_customers_30d': new_customers,
                    'returning_customers_30d': returning,
                    'total_customers': Customer.objects.count(),
                    'trend': trend,
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class HeatmapView(APIView):
    """
    GET /api/analytics/heatmap/
    Returns appointment count per hour (9-21) per day-of-week (0=Mon..6=Sun).
    Output: [{day: 0, hour: 9, count: 12}, ...] — for a 7×13 CSS heatmap grid.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            today = date.today()

            # Use provided date range or fall back to last 90 days
            range_start = params.get('start_date', today - timedelta(days=90))
            range_end = params.get('end_date', today)

            appointments = Appointment.objects.filter(
                scheduled_at__date__gte=range_start,
                scheduled_at__date__lte=range_end,
                status__in=['completed', 'in_progress', 'scheduled'],
            )

            import pytz
            IST = pytz.timezone('Asia/Kolkata')
            matrix = {(d, h): 0 for d in range(7) for h in range(9, 22)}
            for appt in appointments:
                local = appt.scheduled_at.astimezone(IST)
                day_of_week = local.weekday()
                hour = local.hour
                if 9 <= hour <= 21:
                    matrix[(day_of_week, hour)] = matrix.get((day_of_week, hour), 0) + 1

            data = [
                {'day': d, 'hour': h, 'count': count}
                for (d, h), count in matrix.items()
            ]
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class RevenueBreakdownView(APIView):
    """
    GET /api/analytics/revenue-breakdown/
    Revenue split by service category + by payment method for current month.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            today = date.today()
            month_start = today.replace(day=1)

            # Use provided date range or fall back to current month
            range_start = params.get('start_date', month_start)
            range_end = params.get('end_date', today)

            invoice_qs = Invoice.objects.filter(
                created_at__date__gte=range_start,
                created_at__date__lte=range_end,
            )
            item_qs = InvoiceItem.objects.filter(
                invoice__created_at__date__gte=range_start,
                invoice__created_at__date__lte=range_end,
            )
            if 'staff_id' in params:
                invoice_qs = invoice_qs.filter(items__stylist_id=params['staff_id']).distinct()
                item_qs = item_qs.filter(stylist_id=params['staff_id'])

            by_method = list(
                invoice_qs
                .values('payment_method')
                .annotate(total=Sum('total_amount'), count=Count('id'))
            )

            by_category = list(
                item_qs
                .values('service__category__name')
                .annotate(revenue=Sum('price'), count=Count('id'))
                .order_by('-revenue')
            )

            stylist_filter = StaffMember.objects.filter(role='stylist', is_active_staff=True)
            if 'staff_id' in params:
                stylist_filter = stylist_filter.filter(id=params['staff_id'])

            by_stylist = []
            for stylist in stylist_filter:
                rev = item_qs.filter(stylist=stylist).aggregate(total=Sum('price'))['total'] or Decimal('0')
                by_stylist.append({
                    'stylist_id': stylist.id,
                    'name': stylist.full_name,
                    'revenue': float(rev),
                })
            by_stylist.sort(key=lambda x: x['revenue'], reverse=True)

            return Response({
                'success': True,
                'data': {
                    'by_payment_method': [
                        {'method': r['payment_method'], 'total': float(r['total'] or 0), 'count': r['count']}
                        for r in by_method
                    ],
                    'by_category': [
                        {'category': r['service__category__name'] or 'Uncategorized',
                         'revenue': float(r['revenue'] or 0), 'count': r['count']}
                        for r in by_category
                    ],
                    'by_stylist': by_stylist,
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class MembershipStatsView(APIView):
    """GET /api/analytics/membership-stats/ — active memberships count, revenue, top plans."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from apps.memberships.models import CustomerMembership, MembershipPlan
            params = parse_filter_params(request)
            active = CustomerMembership.objects.filter(status='active')
            active = apply_date_filter(active, params, 'purchased_at')
            total_revenue = active.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0')

            by_plan = []
            for plan in MembershipPlan.objects.filter(is_active=True):
                count = active.filter(plan=plan).count()
                rev = active.filter(plan=plan).aggregate(total=Sum('amount_paid'))['total'] or Decimal('0')
                by_plan.append({
                    'plan_id': plan.id,
                    'plan_name': plan.name,
                    'active_count': count,
                    'revenue': float(rev),
                })

            return Response({
                'success': True,
                'data': {
                    'total_active': active.count(),
                    'total_revenue': float(total_revenue),
                    'by_plan': by_plan,
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class ReferralAnalyticsView(APIView):
    """GET /api/analytics/referral-stats/ — total referrals, top referrers, points awarded."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            params = parse_filter_params(request)
            customer_qs = Customer.objects.filter(referred_by__isnull=False)
            customer_qs = apply_date_filter(customer_qs, params, 'created_at')
            total = customer_qs.count()
            total_points = Customer.objects.aggregate(
                total=Sum('referral_points_earned')
            )['total'] or 0

            top = list(
                Customer.objects.annotate(ref_count=Count('referrals'))
                .filter(ref_count__gt=0)
                .order_by('-ref_count')[:5]
                .values('id', 'name', 'phone', 'ref_count', 'referral_points_earned')
            )

            return Response({
                'success': True,
                'data': {
                    'total_referred_customers': total,
                    'total_referral_points_awarded': total_points,
                    'top_referrers': top,
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class ChurnRiskView(APIView):
    """GET /api/analytics/churn-risk/?risk_band=at_risk|high_risk|churned&limit=50"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .algorithms import calculate_churn_risk
            params = parse_filter_params(request)
            customers = Customer.objects.all()
            if 'staff_id' in params:
                appt_qs = Appointment.objects.filter(stylist_id=params['staff_id'], status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)
            elif 'start_date' in params or 'end_date' in params:
                appt_qs = Appointment.objects.filter(status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)

            all_results = calculate_churn_risk(customers)

            summary = {
                'healthy_count': sum(1 for r in all_results if r['risk_band'] == 'healthy'),
                'at_risk_count': sum(1 for r in all_results if r['risk_band'] == 'at_risk'),
                'high_risk_count': sum(1 for r in all_results if r['risk_band'] == 'high_risk'),
                'churned_count': sum(1 for r in all_results if r['risk_band'] == 'churned'),
            }

            filtered = all_results
            risk_band = request.query_params.get('risk_band')
            if risk_band:
                filtered = [r for r in filtered if r['risk_band'] == risk_band]
            min_score = request.query_params.get('min_score')
            if min_score:
                filtered = [r for r in filtered if r['churn_score'] >= float(min_score)]
            limit = int(request.query_params.get('limit', 50))

            return Response({'success': True, 'data': {'summary': summary, 'customers': filtered[:limit]}})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class NextVisitPredictionsView(APIView):
    """GET /api/analytics/next-visit-predictions/?status=upcoming|due_soon|overdue&limit=50"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .algorithms import predict_next_visit
            params = parse_filter_params(request)
            customers = Customer.objects.all()
            if 'staff_id' in params:
                appt_qs = Appointment.objects.filter(stylist_id=params['staff_id'], status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)
            elif 'start_date' in params or 'end_date' in params:
                appt_qs = Appointment.objects.filter(status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)

            all_results = predict_next_visit(customers)

            summary = {
                'upcoming_count': sum(1 for r in all_results if r['status'] == 'upcoming'),
                'due_soon_count': sum(1 for r in all_results if r['status'] == 'due_soon'),
                'overdue_count': sum(1 for r in all_results if r['status'] == 'overdue'),
            }

            filtered = all_results
            status_filter = request.query_params.get('status')
            if status_filter:
                filtered = [r for r in filtered if r['status'] == status_filter]
            min_score = request.query_params.get('min_score')
            if min_score:
                filtered = [r for r in filtered if abs(r['days_until_due']) >= float(min_score)]
            limit = int(request.query_params.get('limit', 50))

            return Response({'success': True, 'data': {'summary': summary, 'customers': filtered[:limit]}})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class VIPRankingView(APIView):
    """GET /api/analytics/vip-ranking/?tier=platinum|gold|silver|regular&limit=50"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .algorithms import calculate_vip_score
            params = parse_filter_params(request)
            customers = Customer.objects.all()
            if 'staff_id' in params:
                appt_qs = Appointment.objects.filter(stylist_id=params['staff_id'], status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)
            elif 'start_date' in params or 'end_date' in params:
                appt_qs = Appointment.objects.filter(status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)

            all_results = calculate_vip_score(customers)

            platinum = [r for r in all_results if r['vip_tier'] == 'platinum']
            gold = [r for r in all_results if r['vip_tier'] == 'gold']

            total_vip_revenue = sum(r['lifetime_revenue'] for r in platinum + gold)
            vip_count = len(platinum) + len(gold)
            avg_vip_spend = total_vip_revenue / max(vip_count, 1)

            summary = {
                'platinum_count': len(platinum),
                'gold_count': len(gold),
                'silver_count': sum(1 for r in all_results if r['vip_tier'] == 'silver'),
                'regular_count': sum(1 for r in all_results if r['vip_tier'] == 'regular'),
                'total_vip_revenue': round(total_vip_revenue, 2),
                'avg_vip_spend': round(avg_vip_spend, 2),
            }

            filtered = all_results
            tier_filter = request.query_params.get('tier')
            if tier_filter:
                filtered = [r for r in filtered if r['vip_tier'] == tier_filter]
            limit = int(request.query_params.get('limit', 50))

            return Response({'success': True, 'data': {'summary': summary, 'customers': filtered[:limit]}})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class RebookingOpportunitiesView(APIView):
    """GET /api/analytics/rebooking-opportunities/?limit=20"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .algorithms import calculate_rebooking_opportunities
            params = parse_filter_params(request)
            customers = Customer.objects.all()
            if 'staff_id' in params:
                appt_qs = Appointment.objects.filter(stylist_id=params['staff_id'], status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)
            elif 'start_date' in params or 'end_date' in params:
                appt_qs = Appointment.objects.filter(status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                customers = customers.filter(id__in=customer_ids)

            limit = int(request.query_params.get('limit', 20))
            all_results = calculate_rebooking_opportunities(customers)

            top = all_results[:limit]
            potential_revenue = sum(r['avg_spend_per_visit'] for r in top)

            return Response({'success': True, 'data': {
                'summary': {
                    'total_opportunities': len(all_results),
                    'potential_revenue_today': round(potential_revenue, 2),
                },
                'customers': top,
            }})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class SendRebookingNudgeView(APIView):
    """POST /api/analytics/send-rebooking-nudge/ — send rebooking_nudge notification to a customer."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from apps.notifications.models import WhatsAppNotification
            from apps.notifications.constants import REBOOKING_NUDGE
            from django.utils import timezone
            customer_id = request.data.get('customer_id')
            customer = Customer.objects.get(pk=customer_id)

            # Render message
            msg = REBOOKING_NUDGE.format(
                name=customer.name.split()[0],
                days=request.data.get('days_overdue', ''),
                salon_name='KaratOS Salon',
                stylist_name='your stylist',
                booking_link='http://localhost:5173/book',
            )

            notif = WhatsAppNotification.objects.create(
                customer=customer,
                notification_type='rebooking_nudge',
                phone_number=customer.phone,
                message_body=msg,
                status='pending',
                scheduled_at=timezone.now(),
            )
            from apps.notifications.services import WhatsAppService
            WhatsAppService.send(notif)

            return Response({'success': True, 'message': f'Nudge sent to {customer.name}'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class StaffIntelligenceView(APIView):
    """GET /api/analytics/staff-intelligence/
    Returns 4 scorecard datasets: performance, trends, specializations, workload.
    Covers all active non-owner staff.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .staff_algorithms import (
                score_staff_performance,
                analyze_staff_trends,
                analyze_staff_specializations,
                analyze_workload_distribution,
            )
            stylists = StaffMember.objects.filter(is_active_staff=True).exclude(role='owner')

            performance     = score_staff_performance(stylists)
            trends          = analyze_staff_trends(stylists)
            specializations = analyze_staff_specializations(stylists)
            workload        = analyze_workload_distribution(stylists)

            summary = {
                'total_staff': len(performance),
                'star_performers':    sum(1 for p in performance if p['tier'] == 'star'),
                'strong_performers':  sum(1 for p in performance if p['tier'] == 'strong'),
                'developing':         sum(1 for p in performance if p['tier'] == 'developing'),
                'avg_completion_rate': round(
                    sum(p['completion_rate'] for p in performance) / max(len(performance), 1), 1
                ),
                'total_revenue': round(sum(p['total_revenue'] for p in performance), 2),
            }

            return Response({'success': True, 'data': {
                'summary': summary,
                'performance': performance,
                'trends': trends,
                'specializations': specializations,
                'workload': workload,
            }})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class InventoryIntelligenceView(APIView):
    """GET /api/analytics/inventory-intelligence/
    Returns 4 scorecard datasets: stockout_risk, dead_stock, turnover, reorder.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from apps.inventory.models import Product
            from .inventory_algorithms import (
                calculate_stockout_risk,
                identify_dead_stock,
                calculate_turnover_metrics,
                generate_reorder_suggestions,
            )
            products = Product.objects.all()

            stockout  = calculate_stockout_risk(products)
            dead      = identify_dead_stock(products)
            turnover  = calculate_turnover_metrics(products)
            reorder   = generate_reorder_suggestions(products)

            summary = {
                'total_products': products.count(),
                'critical_stockout':   sum(1 for s in stockout if s['risk_band'] == 'critical'),
                'high_stockout':       sum(1 for s in stockout if s['risk_band'] == 'high'),
                'dead_stock_items':    len(dead['dead_and_slow']),
                'dead_capital':        dead['total_dead_capital'],
                'items_to_reorder':    reorder['total_items_to_reorder'],
                'reorder_cost':        reorder['total_reorder_cost'],
            }

            return Response({'success': True, 'data': {
                'summary': summary,
                'stockout_risk': stockout,
                'dead_stock': dead,
                'turnover': turnover,
                'reorder': reorder,
            }})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
