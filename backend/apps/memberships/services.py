"""
Membership business logic.
MembershipService handles purchase and session/amount redemption with full validation.
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
        For amount-based plans: copies total_credit_amount from the plan.
        Returns CustomerMembership instance.
        """
        from apps.memberships.models import CustomerMembership
        from django.utils import timezone

        today = date.today()
        valid_until = today + timedelta(days=plan.validity_days)
        paid = amount_paid if amount_paid is not None else plan.price

        kwargs = dict(
            customer=customer,
            plan=plan,
            valid_until=valid_until,
            amount_paid=paid,
            payment_method=payment_method,
            status='active',
            notes=notes,
        )

        if plan.plan_type == 'amount':
            credit = plan.total_credit_amount or paid
            kwargs.update(
                total_credit_amount=credit,
                amount_used=Decimal('0.00'),
                amount_remaining=credit,
                sessions_total=None,
                sessions_used=0,
                sessions_remaining=None,
            )
        else:
            kwargs.update(
                sessions_total=plan.total_sessions,
                sessions_used=0,
                sessions_remaining=plan.total_sessions,
                total_credit_amount=None,
                amount_remaining=None,
            )

        membership = CustomerMembership.objects.create(**kwargs)

        # Notify customer via WhatsApp
        try:
            from apps.notifications.models import WhatsAppNotification
            from apps.notifications.constants import SALON_NAME
            if plan.plan_type == 'amount':
                msg = (
                    f"Hi {customer.name}! 🎉 Your {plan.name} membership at {SALON_NAME} "
                    f"is now active. You have ₹{credit} credit to use, valid until "
                    f"{valid_until.strftime('%d %b %Y')}. Visit us soon!"
                )
            else:
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
    def redeem(membership, appointment, service, staff, amount_override=None):
        """
        Redeem a service from a membership.

        Session plans: decrements sessions_remaining by 1.
        Amount plans:  deducts value_redeemed (service.price or amount_override)
                       from amount_remaining; marks exhausted when balance hits 0.

        Returns MembershipRedemption instance.
        """
        from apps.memberships.models import MembershipRedemption

        if membership.status != 'active':
            raise ValueError(f'Cannot redeem — membership is {membership.status}')

        today = date.today()
        if membership.valid_until < today:
            membership.status = 'expired'
            membership.save(update_fields=['status'])
            raise ValueError('Membership has expired')

        # Validate service is included in the plan (if any services are restricted)
        if membership.plan.services.exists() and not membership.plan.services.filter(id=service.id).exists():
            raise ValueError(f'"{service.name}" is not included in this membership plan')

        value = amount_override if amount_override is not None else service.price

        if membership.plan.plan_type == 'amount':
            if membership.amount_remaining is None or membership.amount_remaining <= 0:
                raise ValueError('No credit remaining in this membership')
            if value > membership.amount_remaining:
                raise ValueError(
                    f'Service costs ₹{value} but only ₹{membership.amount_remaining} credit remains'
                )

            redemption = MembershipRedemption.objects.create(
                membership=membership,
                appointment=appointment,
                service=service,
                redeemed_by=staff,
                value_redeemed=value,
            )

            membership.amount_used = (membership.amount_used or Decimal('0')) + value
            membership.amount_remaining = membership.amount_remaining - value
            membership.sessions_used += 1  # track visit count even on amount plans
            if membership.amount_remaining <= 0:
                membership.status = 'exhausted'
            membership.save(update_fields=['amount_used', 'amount_remaining', 'sessions_used', 'status'])

        else:
            if membership.sessions_remaining is None or membership.sessions_remaining <= 0:
                raise ValueError('No sessions remaining in this membership')

            redemption = MembershipRedemption.objects.create(
                membership=membership,
                appointment=appointment,
                service=service,
                redeemed_by=staff,
                value_redeemed=value,
            )

            membership.sessions_used += 1
            membership.sessions_remaining -= 1
            if membership.sessions_remaining == 0:
                membership.status = 'exhausted'
            membership.save(update_fields=['sessions_used', 'sessions_remaining', 'status'])

        return redemption
