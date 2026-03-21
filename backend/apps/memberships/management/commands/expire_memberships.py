"""
Management command: python manage.py expire_memberships
Marks CustomerMemberships where valid_until < today and status=active as expired.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Mark expired memberships as expired'

    def handle(self, *args, **options):
        from datetime import date
        from apps.memberships.models import CustomerMembership

        today = date.today()
        expired_count = CustomerMembership.objects.filter(
            valid_until__lt=today,
            status='active',
        ).update(status='expired')

        self.stdout.write(
            self.style.SUCCESS(f'Marked {expired_count} membership(s) as expired.')
        )
