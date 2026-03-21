"""
Management command: python manage.py send_pending_notifications
Dispatches all pending notifications whose scheduled_at <= now.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Send all pending WhatsApp notifications that are due'

    def handle(self, *args, **options):
        from apps.notifications.models import WhatsAppNotification
        from apps.notifications.services import WhatsAppService

        now = timezone.now()
        pending = WhatsAppNotification.objects.filter(
            status='pending',
            scheduled_at__lte=now,
        )

        total = pending.count()
        self.stdout.write(f'Found {total} pending notification(s) to send...')

        sent = 0
        failed = 0
        for notif in pending:
            try:
                WhatsAppService.send(notif)
                sent += 1
            except Exception as e:
                notif.status = 'failed'
                notif.error_message = str(e)
                notif.save(update_fields=['status', 'error_message'])
                failed += 1
                self.stderr.write(f'  FAILED: {notif.id} — {e}')

        self.stdout.write(self.style.SUCCESS(f'Done — Sent: {sent}, Failed: {failed}'))
