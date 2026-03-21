"""
Customer Intelligence Algorithms for salon management.

All algorithms are deterministic, zero-ML, computed fresh per API call.
All thresholds are explained inline. All functions take Django querysets.
"""
from datetime import date, timedelta
from decimal import Decimal


def calculate_churn_risk(customers_queryset):
    """
    Scores every customer by how likely they are to never return.
    Returns a list of dicts sorted by churn_score descending.

    Inputs per customer (computed from existing models):
      - days_since_last_visit: (today - last_visit).days
                               if last_visit is null, use (today - created_at.date()).days
      - visit_frequency_days:  average gap in days between consecutive completed appointments
                               computed from appointment scheduled_at dates
                               if fewer than 2 completed appointments, this is None
      - total_visits:          count of completed appointments
      - bad_rate:              (cancelled + no_show) / max(total_appointments, 1)

    Formula:
      expected_return = visit_frequency_days if total_visits >= 3 else 45
      base_score = min(50, (days_since_last_visit / expected_return) * 50)
      frequency_penalty = 0
        if visit_frequency_days is not None and days_since_last_visit > visit_frequency_days * 1.5: += 20
        if visit_frequency_days is not None and days_since_last_visit > visit_frequency_days * 2.0: += 30
      reliability_penalty = bad_rate * 20
      final_score = min(100, base_score + frequency_penalty + reliability_penalty)

    Risk bands:
      0-30:   "healthy"
      31-60:  "at_risk"
      61-80:  "high_risk"
      81-100: "churned"

    churn_reason: human-readable string. Examples:
      "No visit in 67 days against usual 30-day pattern"
      "3 no-shows in last 5 appointments"
      "First-time visitor 50 days ago, never returned"
    """
    from apps.appointments.models import Appointment
    today = date.today()
    results = []

    for customer in customers_queryset:
        # --- Basic counts ---
        all_appts = Appointment.objects.filter(customer=customer)
        total_appointments = all_appts.count()
        total_visits = all_appts.filter(status='completed').count()
        bad_appts = all_appts.filter(status__in=['cancelled', 'no_show']).count()
        bad_rate = bad_appts / max(total_appointments, 1)

        # --- Days since last visit ---
        if customer.last_visit:
            days_since_last_visit = (today - customer.last_visit).days
        else:
            days_since_last_visit = (today - customer.created_at.date()).days

        # --- Visit frequency ---
        completed_appts = list(
            all_appts.filter(status='completed')
            .order_by('scheduled_at')
            .values_list('scheduled_at', flat=True)
        )
        visit_intervals = []
        for i in range(1, len(completed_appts)):
            gap = (completed_appts[i].date() - completed_appts[i-1].date()).days
            if gap > 0:
                visit_intervals.append(gap)
        visit_frequency_days = (sum(visit_intervals) / len(visit_intervals)) if visit_intervals else None

        # --- Scoring ---
        expected_return = visit_frequency_days if (total_visits >= 3 and visit_frequency_days) else 45
        base_score = min(50, (days_since_last_visit / expected_return) * 50)

        frequency_penalty = 0
        if visit_frequency_days is not None:
            if days_since_last_visit > visit_frequency_days * 1.5:
                frequency_penalty += 20
            if days_since_last_visit > visit_frequency_days * 2.0:
                frequency_penalty += 30  # cumulative: total 50 at 2x

        reliability_penalty = bad_rate * 20
        final_score = min(100, base_score + frequency_penalty + reliability_penalty)
        final_score = round(final_score, 1)

        # --- Risk band ---
        if final_score <= 30:
            risk_band = 'healthy'
        elif final_score <= 60:
            risk_band = 'at_risk'
        elif final_score <= 80:
            risk_band = 'high_risk'
        else:
            risk_band = 'churned'

        # --- Churn reason ---
        if total_visits == 0:
            churn_reason = f"Has never visited — registered {days_since_last_visit} days ago"
        elif total_visits == 1 and days_since_last_visit > 30:
            churn_reason = f"First-time visitor {days_since_last_visit} days ago, never returned"
        elif frequency_penalty >= 30 and visit_frequency_days:
            churn_reason = f"No visit in {days_since_last_visit} days against usual {int(visit_frequency_days)}-day pattern"
        elif bad_appts > 0 and total_appointments >= 3 and (bad_appts / total_appointments) > 0.3:
            churn_reason = f"{bad_appts} cancellations/no-shows in {total_appointments} appointments"
        else:
            churn_reason = f"No visit in {days_since_last_visit} days"

        results.append({
            'id': customer.id,
            'name': customer.name,
            'phone': customer.phone,
            'last_visit': str(customer.last_visit) if customer.last_visit else None,
            'days_since_last_visit': days_since_last_visit,
            'visit_frequency_days': round(visit_frequency_days, 1) if visit_frequency_days else None,
            'total_visits': total_visits,
            'churn_score': final_score,
            'risk_band': risk_band,
            'churn_reason': churn_reason,
        })

    results.sort(key=lambda x: x['churn_score'], reverse=True)
    return results


def predict_next_visit(customers_queryset):
    """
    Predicts when each customer is most likely to return next.
    Returns list of dicts sorted by predicted_next_date ascending.

    Method:
      1. Collect visit_intervals (day-gaps between consecutive completed appointments)
      2. visits < 2:  predicted_gap = 45 days (Indian salon industry default), confidence = 'low'
      3. visits 2-4:  predicted_gap = median(intervals), confidence = 'medium'
      4. visits >= 5: weighted average of last 5 intervals (weights 1..5 oldest to newest),
                      confidence = 'high'

    Status:
      predicted_next > today+7:          'upcoming'
      predicted_next between today,today+7: 'due_soon'
      predicted_next < today:            'overdue'

    days_until_due: positive = days until due, negative = days overdue
    """
    import statistics
    from apps.appointments.models import Appointment
    today = date.today()
    results = []

    for customer in customers_queryset:
        completed = list(
            Appointment.objects.filter(customer=customer, status='completed')
            .order_by('scheduled_at')
            .values_list('scheduled_at', flat=True)
        )
        total_visits = len(completed)

        # Build intervals
        intervals = []
        for i in range(1, len(completed)):
            gap = (completed[i].date() - completed[i-1].date()).days
            if gap > 0:
                intervals.append(gap)

        # Predict gap
        if total_visits < 2:
            predicted_gap = 45
            confidence = 'low'
        elif total_visits <= 4:
            predicted_gap = statistics.median(intervals) if intervals else 45
            confidence = 'medium'
        else:
            # Weighted average of last 5 intervals
            last5 = intervals[-5:] if len(intervals) >= 5 else intervals
            weights = list(range(1, len(last5) + 1))
            if sum(weights) > 0:
                predicted_gap = sum(iv * w for iv, w in zip(last5, weights)) / sum(weights)
            else:
                predicted_gap = 45
            confidence = 'high'

        predicted_gap = int(round(predicted_gap))

        # Predicted date
        if customer.last_visit:
            predicted_next = customer.last_visit + timedelta(days=predicted_gap)
        else:
            predicted_next = today  # no visit data — treat as overdue immediately

        # Status
        if predicted_next > today + timedelta(days=7):
            status = 'upcoming'
        elif predicted_next >= today:
            status = 'due_soon'
        else:
            status = 'overdue'

        days_until_due = (predicted_next - today).days  # negative = overdue by that many days

        results.append({
            'id': customer.id,
            'name': customer.name,
            'phone': customer.phone,
            'last_visit': str(customer.last_visit) if customer.last_visit else None,
            'total_visits': total_visits,
            'predicted_gap_days': predicted_gap,
            'predicted_next_date': str(predicted_next),
            'confidence': confidence,
            'status': status,
            'days_until_due': days_until_due,
        })

    results.sort(key=lambda x: x['predicted_next_date'])
    return results


def calculate_vip_score(customers_queryset):
    """
    Ranks customers by total value across 5 dimensions (0-100 total).
    Returns list of dicts sorted by vip_score descending.

    Dimensions:
      revenue_score   (35): (lifetime_revenue / max_in_cohort) * 35
      frequency_score (25): (completed_visits / max_visits_in_cohort) * 25
      recency_score   (20): max(0, (1 - days_since_last / 180)) * 20
                            180-day decay: visit today=20pts, 180+ days ago=0pts
      loyalty_score   (10): (loyalty_points / max_loyalty) * 10
      referral_score  (10): min(10, referrals_made * 2)  — 5+ referrals = full 10pts

    VIP tiers: platinum 80-100, gold 60-79, silver 40-59, regular 0-39

    max_* values are computed within this queryset (relative ranking within cohort).
    """
    from apps.appointments.models import Appointment
    from apps.billing.models import Invoice
    from apps.customers.models import Customer
    from django.db.models import Sum, Count
    today = date.today()

    # Pre-compute per customer stats
    customer_list = list(customers_queryset)
    if not customer_list:
        return []

    # Gather raw data
    raw = []
    for customer in customer_list:
        # Lifetime revenue from invoices
        rev = Invoice.objects.filter(customer=customer).aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')

        # Completed visits
        completed = Appointment.objects.filter(customer=customer, status='completed').count()

        # Days since last visit
        if customer.last_visit:
            days_since = (today - customer.last_visit).days
        else:
            days_since = 365  # penalise unknown

        # Referrals made
        referrals = Customer.objects.filter(referred_by=customer).count()

        raw.append({
            'customer': customer,
            'lifetime_revenue': float(rev),
            'total_visits': completed,
            'days_since_last_visit': days_since,
            'loyalty_points': customer.loyalty_points,
            'referrals_made': referrals,
        })

    # Cohort maxima
    max_revenue = max(r['lifetime_revenue'] for r in raw) or 1
    max_visits = max(r['total_visits'] for r in raw) or 1
    max_loyalty = max(r['loyalty_points'] for r in raw) or 1

    results = []
    for r in raw:
        c = r['customer']

        revenue_score = (r['lifetime_revenue'] / max_revenue) * 35
        frequency_score = (r['total_visits'] / max_visits) * 25
        recency_score = max(0, (1 - r['days_since_last_visit'] / 180)) * 20
        loyalty_score = (r['loyalty_points'] / max_loyalty) * 10
        referral_score = min(10, r['referrals_made'] * 2)

        vip_score = round(revenue_score + frequency_score + recency_score + loyalty_score + referral_score, 1)

        if vip_score >= 80:
            tier = 'platinum'
        elif vip_score >= 60:
            tier = 'gold'
        elif vip_score >= 40:
            tier = 'silver'
        else:
            tier = 'regular'

        results.append({
            'id': c.id,
            'name': c.name,
            'phone': c.phone,
            'vip_score': vip_score,
            'vip_tier': tier,
            'lifetime_revenue': r['lifetime_revenue'],
            'total_visits': r['total_visits'],
            'days_since_last_visit': r['days_since_last_visit'],
            'loyalty_points': r['loyalty_points'],
            'referrals_made': r['referrals_made'],
            'revenue_score': round(revenue_score, 1),
            'frequency_score': round(frequency_score, 1),
            'recency_score': round(recency_score, 1),
            'loyalty_score': round(loyalty_score, 1),
            'referral_score': round(referral_score, 1),
        })

    results.sort(key=lambda x: x['vip_score'], reverse=True)
    return results


def calculate_rebooking_opportunities(customers_queryset):
    """
    Ranks customers as best candidates for a rebooking nudge RIGHT NOW.
    Only includes customers who are 'overdue' or 'due_soon'.
    Returns list sorted by rebooking_score descending.

    Score formula (0-100):
      urgency_score (40):
        overdue 0-7 days:  40
        overdue 8-14 days: 30
        due in 0-7 days:   25
        overdue 15-30 days:15
        overdue 30+ days:   5
        not due (>7 days):  0

      reliability_score (30): (1 - bad_rate) * 30
        bad_rate = (cancelled + no_show) / max(total_appointments, 1)

      spend_score (20): (avg_spend_per_visit / max_avg_spend_in_cohort) * 20

      engagement_score (10):
        +5 if customer has a WhatsApp notification sent in last 90 days (proxy for engagement)
        +3 if customer has an active membership
        +2 if customer has made a referral

    suggested_action: human-readable string for the receptionist.
    """
    from apps.appointments.models import Appointment
    from apps.billing.models import Invoice
    from apps.customers.models import Customer
    from apps.notifications.models import WhatsAppNotification
    from django.db.models import Sum, Count
    today = date.today()
    days_90_ago = today - timedelta(days=90)

    # First get next-visit predictions to determine overdue/due_soon
    predictions = {p['id']: p for p in predict_next_visit(customers_queryset)}

    raw = []
    for customer in customers_queryset:
        pred = predictions.get(customer.id)
        if not pred or pred['status'] not in ('overdue', 'due_soon'):
            continue

        # Appointments stats
        all_appts = Appointment.objects.filter(customer=customer)
        total_appts = all_appts.count()
        completed_appts = all_appts.filter(status='completed').count()
        bad_appts = all_appts.filter(status__in=['cancelled', 'no_show']).count()
        bad_rate = bad_appts / max(total_appts, 1)

        # Average spend per visit
        total_rev = float(Invoice.objects.filter(customer=customer).aggregate(
            total=Sum('total_amount')
        )['total'] or 0)
        avg_spend = total_rev / max(completed_appts, 1)

        # Engagement signals
        has_recent_notif = WhatsAppNotification.objects.filter(
            customer=customer, sent_at__date__gte=days_90_ago, status='sent'
        ).exists()
        has_active_membership = False
        try:
            from apps.memberships.models import CustomerMembership
            has_active_membership = CustomerMembership.objects.filter(
                customer=customer, status='active'
            ).exists()
        except Exception:
            pass
        has_referral = Customer.objects.filter(referred_by=customer).exists()

        raw.append({
            'customer': customer,
            'pred': pred,
            'total_appts': total_appts,
            'bad_rate': bad_rate,
            'avg_spend': avg_spend,
            'has_recent_notif': has_recent_notif,
            'has_active_membership': has_active_membership,
            'has_referral': has_referral,
        })

    if not raw:
        return []

    max_avg_spend = max(r['avg_spend'] for r in raw) or 1

    results = []
    for r in raw:
        pred = r['pred']
        days_until_due = pred['days_until_due']  # negative = overdue

        # Urgency score
        overdue_days = -days_until_due if days_until_due < 0 else 0
        due_in_days = days_until_due if days_until_due >= 0 else 0

        if pred['status'] == 'overdue':
            if overdue_days <= 7:
                urgency_score = 40
            elif overdue_days <= 14:
                urgency_score = 30
            elif overdue_days <= 30:
                urgency_score = 15
            else:
                urgency_score = 5
        else:  # due_soon
            urgency_score = 25

        reliability_score = round((1 - r['bad_rate']) * 30, 1)
        spend_score = round((r['avg_spend'] / max_avg_spend) * 20, 1)

        engagement_score = 0
        if r['has_recent_notif']:
            engagement_score += 5
        if r['has_active_membership']:
            engagement_score += 3
        if r['has_referral']:
            engagement_score += 2

        rebooking_score = round(urgency_score + reliability_score + spend_score + engagement_score, 1)

        # Suggested action string
        c = r['customer']
        if pred['status'] == 'overdue':
            action = f"Call today — overdue {overdue_days} days"
        else:
            action = f"Due in {due_in_days} days"
        if r['avg_spend'] > 0:
            action += f", avg spend \u20b9{int(r['avg_spend'])}"
        if r['bad_rate'] < 0.1 and r['total_appts'] >= 3:
            action += ", reliable customer"

        results.append({
            'id': c.id,
            'name': c.name,
            'phone': c.phone,
            'last_visit': pred['last_visit'],
            'predicted_next_date': pred['predicted_next_date'],
            'days_until_due': days_until_due,
            'rebooking_score': rebooking_score,
            'urgency_score': urgency_score,
            'reliability_score': reliability_score,
            'spend_score': spend_score,
            'engagement_score': engagement_score,
            'avg_spend_per_visit': round(r['avg_spend'], 2),
            'has_active_membership': r['has_active_membership'],
            'suggested_action': action,
        })

    results.sort(key=lambda x: x['rebooking_score'], reverse=True)
    return results
