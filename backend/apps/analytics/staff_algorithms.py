"""
Staff Intelligence Algorithms.
All deterministic, zero-ML. Computed fresh per API call.
"""
from datetime import date, timedelta
from decimal import Decimal
from collections import defaultdict, Counter


def score_staff_performance(staff_queryset):
    """
    Scores every active stylist across 4 weighted dimensions (total 100).

    Dimensions:
      revenue_score (35):    (stylist_lifetime_revenue / max_in_cohort) * 35
      completion_score (30): (completed_appts / total_appts) * 30
      retention_score (20):  (customers_with_2+_visits_to_stylist / unique_customers) * 20
      efficiency_score (15): (avg_revenue_per_completed_visit / max_in_cohort) * 15

    Performance tiers:
      star:       75-100
      strong:     55-74
      average:    35-54
      developing: 0-34

    Returns list sorted by performance_score descending.
    """
    from apps.appointments.models import Appointment
    from apps.billing.models import InvoiceItem
    from django.db.models import Sum

    staff_list = list(staff_queryset)
    if not staff_list:
        return []

    raw = []
    for staff in staff_list:
        all_appts = Appointment.objects.filter(stylist=staff)
        total_appts = all_appts.count()
        completed = all_appts.filter(status='completed').count()
        cancelled = all_appts.filter(status='cancelled').count()
        no_shows = all_appts.filter(status='no_show').count()

        # Revenue from InvoiceItems where this person was the stylist
        revenue = float(
            InvoiceItem.objects.filter(stylist=staff).aggregate(total=Sum('price'))['total'] or 0
        )

        # Unique customers served (completed appointments)
        customer_ids = list(all_appts.filter(status='completed').values_list('customer_id', flat=True))
        unique_customers = len(set(customer_ids))

        # Returning customers: came back to THIS stylist 2+ times
        counts = Counter(customer_ids)
        returning_customers = sum(1 for n in counts.values() if n >= 2)

        avg_rev = revenue / max(completed, 1)

        raw.append({
            'staff': staff,
            'total_appts': total_appts,
            'completed': completed,
            'cancelled': cancelled,
            'no_shows': no_shows,
            'revenue': revenue,
            'unique_customers': unique_customers,
            'returning_customers': returning_customers,
            'avg_revenue_per_visit': round(avg_rev, 2),
        })

    if not raw:
        return []

    max_revenue = max(r['revenue'] for r in raw) or 1
    max_avg_rev = max(r['avg_revenue_per_visit'] for r in raw) or 1

    results = []
    for r in raw:
        s = r['staff']
        completion_rate = r['completed'] / max(r['total_appts'], 1)
        retention_rate = r['returning_customers'] / max(r['unique_customers'], 1)

        revenue_score     = (r['revenue'] / max_revenue) * 35
        completion_score  = completion_rate * 30
        retention_score   = retention_rate * 20
        efficiency_score  = (r['avg_revenue_per_visit'] / max_avg_rev) * 15

        performance_score = round(revenue_score + completion_score + retention_score + efficiency_score, 1)

        if performance_score >= 75:
            tier = 'star'
        elif performance_score >= 55:
            tier = 'strong'
        elif performance_score >= 35:
            tier = 'average'
        else:
            tier = 'developing'

        results.append({
            'id': s.id,
            'name': s.full_name,
            'role': s.role,
            'phone': s.phone,
            'commission_rate': float(s.commission_rate),
            'performance_score': performance_score,
            'tier': tier,
            'score_breakdown': {
                'revenue': round(revenue_score, 1),
                'completion': round(completion_score, 1),
                'retention': round(retention_score, 1),
                'efficiency': round(efficiency_score, 1),
            },
            'total_appointments': r['total_appts'],
            'completed_appointments': r['completed'],
            'completion_rate': round(completion_rate * 100, 1),
            'cancellation_rate': round(r['cancelled'] / max(r['total_appts'], 1) * 100, 1),
            'noshow_rate': round(r['no_shows'] / max(r['total_appts'], 1) * 100, 1),
            'total_revenue': round(r['revenue'], 2),
            'avg_revenue_per_visit': r['avg_revenue_per_visit'],
            'unique_customers': r['unique_customers'],
            'returning_customers': r['returning_customers'],
            'retention_rate': round(retention_rate * 100, 1),
        })

    results.sort(key=lambda x: x['performance_score'], reverse=True)
    return results


def analyze_staff_trends(staff_queryset):
    """
    Compares last 30 days vs previous 30 days per stylist.
    Returns revenue_change_pct, appointment_change_pct, trend direction,
    and a 14-day daily sparkline array.

    trend: 'up' (>+5%), 'down' (<-5%), 'stable'

    Returns list sorted by current_period revenue descending.
    """
    from apps.appointments.models import Appointment
    from apps.billing.models import InvoiceItem
    from django.db.models import Sum

    today = date.today()
    curr_start = today - timedelta(days=29)  # last 30 days inclusive
    prev_end   = curr_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=29)

    results = []
    for staff in staff_queryset:
        def period_stats(start, end):
            appts = Appointment.objects.filter(
                stylist=staff, status='completed',
                scheduled_at__date__gte=start,
                scheduled_at__date__lte=end,
            ).count()
            rev = float(
                InvoiceItem.objects.filter(
                    stylist=staff,
                    invoice__created_at__date__gte=start,
                    invoice__created_at__date__lte=end,
                ).aggregate(total=Sum('price'))['total'] or 0
            )
            return appts, rev

        curr_appts, curr_rev = period_stats(curr_start, today)
        prev_appts, prev_rev = period_stats(prev_start, prev_end)

        rev_change_pct  = round(((curr_rev  - prev_rev)  / max(prev_rev,  0.01)) * 100, 1)
        appt_change_pct = round(((curr_appts - prev_appts) / max(prev_appts, 0.01)) * 100, 1)

        trend = 'up' if rev_change_pct > 5 else ('down' if rev_change_pct < -5 else 'stable')

        # 14-day daily sparkline
        daily = []
        for i in range(13, -1, -1):
            d = today - timedelta(days=i)
            day_rev = float(
                InvoiceItem.objects.filter(
                    stylist=staff,
                    invoice__created_at__date=d,
                ).aggregate(total=Sum('price'))['total'] or 0
            )
            day_appts = Appointment.objects.filter(
                stylist=staff, status='completed',
                scheduled_at__date=d,
            ).count()
            daily.append({'date': str(d), 'revenue': round(day_rev, 2), 'appointments': day_appts})

        results.append({
            'id': staff.id,
            'name': staff.full_name,
            'role': staff.role,
            'current_period': {
                'appointments': curr_appts,
                'revenue': round(curr_rev, 2),
                'start': str(curr_start),
                'end': str(today),
            },
            'previous_period': {
                'appointments': prev_appts,
                'revenue': round(prev_rev, 2),
                'start': str(prev_start),
                'end': str(prev_end),
            },
            'revenue_change_pct': rev_change_pct,
            'appointment_change_pct': appt_change_pct,
            'trend': trend,
            'daily_sparkline': daily,
        })

    results.sort(key=lambda x: x['current_period']['revenue'], reverse=True)
    return results


def analyze_staff_specializations(staff_queryset):
    """
    For each stylist: top services by count and revenue.
    Specialization concentration measured by Herfindahl-Hirschman Index (HHI):
      HHI = sum(share_i^2) for each service's share of total services performed
      HHI → 1.0 = pure specialist (does one thing)
      HHI → 0.0 = generalist (spread across many services)

    Returns list sorted by total_revenue descending.
    """
    from apps.billing.models import InvoiceItem

    results = []
    for staff in staff_queryset:
        items = list(
            InvoiceItem.objects.filter(stylist=staff)
            .select_related('service')
        )

        if not items:
            results.append({
                'id': staff.id,
                'name': staff.full_name,
                'role': staff.role,
                'total_services_performed': 0,
                'total_revenue': 0,
                'dominant_service': None,
                'specialization_index': 0,
                'profile': 'no_data',
                'top_by_count': [],
                'top_by_revenue': [],
            })
            continue

        svc_stats = defaultdict(lambda: {'count': 0, 'revenue': 0.0, 'name': ''})
        for item in items:
            sid = item.service_id
            svc_stats[sid]['name'] = item.service.name
            svc_stats[sid]['count'] += 1
            svc_stats[sid]['revenue'] += float(item.price)

        total_count   = sum(v['count']   for v in svc_stats.values())
        total_revenue = sum(v['revenue'] for v in svc_stats.values())

        shares = [v['count'] / max(total_count, 1) for v in svc_stats.values()]
        hhi = round(sum(s ** 2 for s in shares), 3)

        if hhi >= 0.6:
            profile = 'specialist'
        elif hhi >= 0.35:
            profile = 'focused'
        else:
            profile = 'generalist'

        by_count   = sorted(svc_stats.values(), key=lambda x: x['count'],   reverse=True)[:5]
        by_revenue = sorted(svc_stats.values(), key=lambda x: x['revenue'], reverse=True)[:5]

        results.append({
            'id': staff.id,
            'name': staff.full_name,
            'role': staff.role,
            'total_services_performed': total_count,
            'total_revenue': round(total_revenue, 2),
            'dominant_service': by_count[0]['name'] if by_count else None,
            'specialization_index': hhi,
            'profile': profile,
            'top_by_count': [
                {'name': s['name'], 'count': s['count'], 'revenue': round(s['revenue'], 2),
                 'share_pct': round(s['count'] / max(total_count, 1) * 100, 1)}
                for s in by_count
            ],
            'top_by_revenue': [
                {'name': s['name'], 'count': s['count'], 'revenue': round(s['revenue'], 2),
                 'share_pct': round(s['revenue'] / max(total_revenue, 0.01) * 100, 1)}
                for s in by_revenue
            ],
        })

    results.sort(key=lambda x: x['total_revenue'], reverse=True)
    return results


def analyze_workload_distribution(staff_queryset):
    """
    Appointment distribution by day-of-week and hour-of-day (last 90 days).
    Identifies peak day, peak hour, and estimates capacity utilization.

    Utilization assumes 6 bookable slots per working day, 6-day week.

    Returns list sorted by total_appointments_90d descending.
    """
    from apps.appointments.models import Appointment

    DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    today = date.today()
    cutoff = today - timedelta(days=90)

    results = []
    for staff in staff_queryset:
        appts = list(
            Appointment.objects.filter(
                stylist=staff,
                status__in=['completed', 'scheduled'],
                scheduled_at__date__gte=cutoff,
            ).values_list('scheduled_at', flat=True)
        )

        by_day  = defaultdict(int)
        by_hour = defaultdict(int)
        for dt in appts:
            by_day[dt.weekday()] += 1
            by_hour[dt.hour] += 1

        day_data  = [{'day': DAYS[i], 'count': by_day.get(i, 0)}  for i in range(7)]
        hour_data = [{'hour': f'{h:02d}:00', 'count': by_hour.get(h, 0)} for h in range(9, 22)]

        peak_day  = max(day_data,  key=lambda x: x['count'])['day']  if any(d['count'] for d in day_data)  else None
        peak_hour = max(hour_data, key=lambda x: x['count'])['hour'] if any(h['count'] for h in hour_data) else None

        total_90d     = len(appts)
        # ~77 working days in 90 days (6/7 of 90), 6 slots each
        capacity_90d  = (90 * 6 / 7) * 6
        utilization   = round(total_90d / max(capacity_90d, 1) * 100, 1)

        results.append({
            'id': staff.id,
            'name': staff.full_name,
            'role': staff.role,
            'total_appointments_90d': total_90d,
            'utilization_pct': min(100, utilization),
            'peak_day': peak_day,
            'peak_hour': peak_hour,
            'by_day_of_week': day_data,
            'by_hour': hour_data,
        })

    results.sort(key=lambda x: x['total_appointments_90d'], reverse=True)
    return results
