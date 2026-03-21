"""
Membership business logic.
MembershipService handles purchase and session redemption with full validation.
"""
from datetime import date, timedelta
from decimal import Decimal


class MembershipService:
    """Handles membership purchase and redemption business logic."""

    @staticmethod
    def purchase(customer, plan, payment_method, amount_paid=None, notes=''):
        """
        Purchase a membership plan for a customer.
        Sets valid_until = today + validity_days.
        Sends a WhatsApp notification to the customer.
        Returns CustomerMembership instance.
        """
        from apps.memberships.models import CustomerMembership
        from django.utils import timezone

        today = date.today()
        valid_until = today + timedelta(days=plan.validity_days)
        paid = amount_paid if amount_paid is not None else plan.price

        membership = CustomerMembership.objects.create(
            customer=customer,
            plan=plan,
            valid_until=valid_until,
            sessions_total=plan.total_sessions,
            sessions_used=0,
            sessions_remaining=plan.total_sessions,
            amount_paid=paid,
            payment_method=payment_method,
            status='active',
            notes=notes,
        )

        # Notify customer via WhatsApp
        try:
            from apps.notifications.models import WhatsAppNotification
            from apps.notifications.constants import SALON_NAME
            msg = (
                f"Hi {customer.name}! 🎉 Your {plan.name} membership at {SALON_NAME} "
                f"is now active. Enjoy {plan.total_sessions} sessions valid until "
                f"{valid_until.strftime('%d %b %Y')}. Book your first session today!"
            )
            WhatsAppNotification.objects.create(
                customer=customer,
                notification_type='booking_confirm',
                phone_number=customer.phone,
                message_body=msg,
                status='pending',
                scheduled_at=timezone.now(),
            )
        except Exception:
            pass  # Notification failure should not roll back membership purchase

        return membership

    @staticmethod
    def redeem(membership, appointment, service, staff):
        """
        Redeem a session from a membership.
        Validates: active status, not expired, sessions remaining, service in plan.
        Decrements sessions_remaining; marks exhausted if last session.
        Returns MembershipRedemption instance.
        """
        from apps.memberships.models import MembershipRedemption

        # Validate membership status
        if membership.status != 'active':
            raise ValueError(f'Cannot redeem — membership is {membership.status}')

        today = date.today()
        if membership.valid_until < today:
            membership.status = 'expired'
            membership.save(update_fields=['status'])
            raise ValueError('Membership has expired')

        if membership.sessions_remaining <= 0:
            raise ValueError('No sessions remaining in this membership')

        # Validate service is included in the plan
        if not membership.plan.services.filter(id=service.id).exists():
            raise ValueError(f'"{service.name}" is not included in this membership plan')

        redemption = MembershipRedemption.objects.create(
            membership=membership,
            appointment=appointment,
            service=service,
            redeemed_by=staff,
            value_redeemed=service.price,
        )

        # Decrement session count
        membership.sessions_used += 1
        membership.sessions_remaining -= 1
        if membership.sessions_remaining == 0:
            membership.status = 'exhausted'
        membership.save(update_fields=['sessions_used', 'sessions_remaining', 'status'])

        return redemption
