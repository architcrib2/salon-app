"""
Memberships app models.
Enables pre-paid session packages for loyal customers.
MembershipPlan defines the package; CustomerMembership tracks per-customer usage;
MembershipRedemption logs each session used.
"""
from decimal import Decimal
from django.db import models


class MembershipPlan(models.Model):
    """
    Template for a membership package (e.g. 'Hair Care Monthly — 10 sessions in 30 days').
    services M2M defines which services can be redeemed under this plan.
    """

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    services = models.ManyToManyField('services.Service', blank=True)
    total_sessions = models.IntegerField()
    validity_days = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Membership Plan'
        verbose_name_plural = 'Membership Plans'

    def __str__(self):
        return f"{self.name} ({self.total_sessions} sessions / {self.validity_days} days)"


class CustomerMembership(models.Model):
    """
    A customer's purchase of a membership plan.
    sessions_remaining is decremented by MembershipRedemption records.
    valid_until = purchased_at + validity_days (set in MembershipService.purchase).
    """

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('exhausted', 'Exhausted'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'), ('upi', 'UPI'), ('card', 'Card'),
    ]

    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='memberships')
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT, related_name='subscriptions')
    purchased_at = models.DateField(auto_now_add=True)
    valid_until = models.DateField()
    sessions_total = models.IntegerField()
    sessions_used = models.IntegerField(default=0)
    sessions_remaining = models.IntegerField()
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='cash')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-purchased_at']
        verbose_name = 'Customer Membership'
        verbose_name_plural = 'Customer Memberships'

    def __str__(self):
        return f"{self.customer.name} — {self.plan.name} ({self.sessions_remaining}/{self.sessions_total} left)"


class MembershipRedemption(models.Model):
    """
    Records each time a customer uses a session from their membership.
    value_redeemed is a snapshot of the service price at redemption time.
    """

    membership = models.ForeignKey(CustomerMembership, on_delete=models.CASCADE, related_name='redemptions')
    appointment = models.ForeignKey('appointments.Appointment', on_delete=models.PROTECT)
    service = models.ForeignKey('services.Service', on_delete=models.PROTECT)
    redeemed_at = models.DateTimeField(auto_now_add=True)
    redeemed_by = models.ForeignKey('accounts.StaffMember', on_delete=models.PROTECT)
    value_redeemed = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ['-redeemed_at']
        verbose_name = 'Membership Redemption'
        verbose_name_plural = 'Membership Redemptions'

    def __str__(self):
        return f"{self.membership.customer.name} redeemed {self.service.name}"
