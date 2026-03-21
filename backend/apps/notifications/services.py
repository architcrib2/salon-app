"""
WhatsApp mock sender service.
In production this would call the WhatsApp Business API.
For demo: prints to console and marks notification as sent.
"""
from django.utils import timezone


class WhatsAppService:
    """Mock WhatsApp sender — no real API call, prints to console."""

    @staticmethod
    def send(notification):
        """
        Mark notification as sent and print to console.
        Args:
            notification: WhatsAppNotification instance
        """
        print(f"[WhatsApp Mock] ──────────────────────────────")
        print(f"  To:      {notification.phone_number}")
        print(f"  Type:    {notification.notification_type}")
        print(f"  Message: {notification.message_body}")
        print(f"──────────────────────────────────────────────")

        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.save(update_fields=['status', 'sent_at'])
