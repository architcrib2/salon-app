"""
Customer segmentation logic for WhatsApp campaigns.
Each function returns a Django QuerySet of Customer objects matching the segment.
"""
from datetime import date, timedelta
from django.db import models as db_models


def get_segment_queryset(segment):
    """
    Returns a Customer queryset for the given segment name.
    Segments:
    - lapsed_60: no visit in 60+ days
    - lapsed_30: no visit in 30+ days
    - loyalty_low: fewer than 50 loyalty points
    - new_customers: joined in last 30 days
    - all: every customer
    """
    from apps.customers.models import Customer
    today = date.today()

    if segment == 'lapsed_60':
        cutoff = today - timedelta(days=60)
        return Customer.objects.filter(
            db_models.Q(last_visit__lt=cutoff) |
            db_models.Q(last_visit__isnull=True, created_at__date__lt=cutoff)
        )

    elif segment == 'lapsed_30':
        cutoff = today - timedelta(days=30)
        return Customer.objects.filter(last_visit__lt=cutoff)

    elif segment == 'loyalty_low':
        return Customer.objects.filter(loyalty_points__lt=50)

    elif segment == 'new_customers':
        cutoff = today - timedelta(days=30)
        return Customer.objects.filter(created_at__date__gte=cutoff)

    else:  # 'all'
        return Customer.objects.all()


def render_message(template, customer):
    """
    Render a message template with customer-specific data.
    Supported placeholders: {name}, {last_visit}, {offer}
    """
    last_visit_str = customer.last_visit.strftime('%d %b %Y') if customer.last_visit else 'a while ago'
    return template.format(
        name=customer.name,
        last_visit=last_visit_str,
        offer='special offer',  # placeholder — staff customises in template
    )
