"""
Signal handlers for auto-creating WhatsApp notifications.
Connected lazily in NotificationsConfig.ready() to avoid circular imports.
"""
from datetime import timedelta


def on_appointment_saved(sender, instance, created, **kwargs):
    """
    When an Appointment is created with status=scheduled:
    - Create BOOKING_CONFIRM notification (scheduled immediately)
    - Create REMINDER_1HR notification (scheduled 1 hour before appointment)
    """
    if not created or instance.status != 'scheduled':
        return
    try:
        from django.utils import timezone
        from apps.notifications.models import WhatsAppNotification
        from apps.notifications.constants import BOOKING_CONFIRM, REMINDER_1HR, SALON_NAME

        customer = instance.customer
        stylist = instance.stylist
        now = timezone.now()

        # Booking confirmation — send immediately
        confirm_msg = BOOKING_CONFIRM.format(
            name=customer.name,
            salon_name=SALON_NAME,
            date=instance.scheduled_at.strftime('%d %b %Y'),
            time=instance.scheduled_at.strftime('%I:%M %p'),
            stylist=stylist.get_full_name() or stylist.username,
        )
        WhatsAppNotification.objects.create(
            customer=customer,
            appointment=instance,
            notification_type='booking_confirm',
            phone_number=customer.phone,
            message_body=confirm_msg,
            status='pending',
            scheduled_at=now,
        )

        # Reminder 1 hour before appointment
        reminder_time = instance.scheduled_at - timedelta(hours=1)
        reminder_msg = REMINDER_1HR.format(
            name=customer.name,
            time=instance.scheduled_at.strftime('%I:%M %p'),
            stylist=stylist.get_full_name() or stylist.username,
        )
        WhatsAppNotification.objects.create(
            customer=customer,
            appointment=instance,
            notification_type='reminder_1hr',
            phone_number=customer.phone,
            message_body=reminder_msg,
            status='pending',
            scheduled_at=reminder_time,
        )
    except Exception as e:
        print(f"[Notifications] Failed to create appointment notifications: {e}")


def on_invoice_saved(sender, instance, created, **kwargs):
    """
    When an Invoice is created: create REVIEW_REQUEST notification
    scheduled 2 hours after billing (not immediate — give time to leave salon).
    """
    if not created:
        return
    try:
        from django.utils import timezone
        from apps.notifications.models import WhatsAppNotification
        from apps.notifications.constants import REVIEW_REQUEST, SALON_NAME

        customer = instance.customer
        review_msg = REVIEW_REQUEST.format(
            name=customer.name,
            salon_name=SALON_NAME,
        )
        WhatsAppNotification.objects.create(
            customer=customer,
            appointment=instance.appointment if hasattr(instance, 'appointment') else None,
            notification_type='review_request',
            phone_number=customer.phone,
            message_body=review_msg,
            status='pending',
            scheduled_at=timezone.now() + timedelta(hours=2),
        )
    except Exception as e:
        print(f"[Notifications] Failed to create review notification: {e}")


def connect_signals():
    """Register all signal handlers. Called from NotificationsConfig.ready()."""
    from django.db.models.signals import post_save
    # Lazy import to avoid circular dependency at module load time
    from apps.appointments.models import Appointment
    from apps.billing.models import Invoice

    post_save.connect(on_appointment_saved, sender=Appointment)
    post_save.connect(on_invoice_saved, sender=Invoice)
