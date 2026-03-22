"""
Memberships app models.
Supports two plan types:
  - 'session': classic pre-paid session pack (e.g. 10 haircuts for ₹5,000)
  - 'amount':  pre-paid credit wallet with optional bonus
               (e.g. pay ₹35,000 → get ₹45,000 credit; each service deducts from balance)
"""
from decimal import Decimal
from django.db import models


class MembershipPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('session', 'Session-based'),
        ('amount',  'Amount-based'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    services = models.ManyToManyField('services.Service', blank=True)
    plan_type = models.CharField(max_length=10, choices=PLAN_TYPE_CHOICES, default='session')
    # Session-based fields (only used when plan_type='session')
    total_sessions = models.IntegerField(null=True, blank=True)
    # Amount-based fields (only used when plan_type='amount')
    # total_credit_amount: the value the customer gets to spend (can be > price, i.e. a bonus)
    total_credit_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    validity_days = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Membership Plan'
        verbose_name_plural = 'Membership Plans'

    def __str__(self):
        if self.plan_type == 'amount':
            return f"{self.name} (₹{self.price} → ₹{self.total_credit_amount} credit / {self.validity_days} days)"
        return f"{self.name} ({self.total_sessions} sessions / {self.validity_days} days)"


class CustomerMembership(models.Model):
    STATUS_CHOICES = [
        ('active',    'Active'),
        ('expired',   'Expired'),
        ('exhausted', 'Exhausted'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'), ('upi', 'UPI'), ('card', 'Card'),
    ]

    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='memberships')
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT, related_name='subscriptions')
    purchased_at = models.DateField(auto_now_add=True)
    valid_until = models.DateField()
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='cash')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)

    # ── Session-based tracking (plan_type='session') ──────────────────────────
    sessions_total = models.IntegerField(null=True, blank=True)
    sessions_used = models.IntegerField(default=0)
    sessions_remaining = models.IntegerField(null=True, blank=True)

    # ── Amount-based tracking (plan_type='amount') ────────────────────────────
    # total_credit_amount: total credit the customer can spend (may exceed amount_paid due to bonus)
    total_credit_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_used = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    amount_remaining = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-purchased_at']
        verbose_name = 'Customer Membership'
        verbose_name_plural = 'Customer Memberships'

    def __str__(self):
        if self.plan.plan_type == 'amount':
            return f"{self.customer.name} — {self.plan.name} (₹{self.amount_remaining} remaining)"
        return f"{self.customer.name} — {self.plan.name} ({self.sessions_remaining}/{self.sessions_total} left)"


class MembershipRedemption(models.Model):
    """
    Records each use of a membership.
    For session plans: one redemption = one session used.
    For amount plans:  value_redeemed is deducted from amount_remaining.
    """

    membership = models.ForeignKey(CustomerMembership, on_delete=models.CASCADE, related_name='redemptions')
    appointment = models.ForeignKey('appointments.Appointment', on_delete=models.PROTECT, null=True, blank=True)
    service = models.ForeignKey('services.Service', on_delete=models.PROTECT)
    redeemed_at = models.DateTimeField(auto_now_add=True)
    redeemed_by = models.ForeignKey('accounts.StaffMember', on_delete=models.PROTECT, null=True, blank=True)
    value_redeemed = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ['-redeemed_at']
        verbose_name = 'Membership Redemption'
        verbose_name_plural = 'Membership Redemptions'

    def __str__(self):
        return f"{self.membership.customer.name} redeemed {self.service.name} (₹{self.value_redeemed})"
