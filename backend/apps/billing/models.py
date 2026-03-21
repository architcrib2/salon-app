"""
Billing app models.
Invoice and InvoiceItem handle GST-compliant billing for Indian salon services.
Invoice number format: INV-YYYYMM-XXXX (auto-generated).
Loyalty points: earned at 1 pt per ₹100 spent, redeemable at ₹1 per point.
"""
from django.db import models
from apps.accounts.models import StaffMember
from apps.customers.models import Customer
from apps.appointments.models import Appointment
from apps.services.models import Service


class Invoice(models.Model):
    """
    Invoice for a completed appointment.
    GST calculation: gst_amount = sum(item.price * item.gst_rate / 100) for all items.
    total_amount = subtotal + gst_amount - discount_amount - (loyalty_points_used * 1).
    """

    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('upi', 'UPI'),
        ('card', 'Card'),
        ('mixed', 'Mixed'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending'),
    ]

    appointment = models.ForeignKey(Appointment, on_delete=models.PROTECT, null=True, blank=True, related_name='invoices')
    # Auto-generated invoice number: INV-YYYYMM-XXXX
    invoice_number = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # 1 loyalty point = ₹1 discount; points used is also deducted from customer.loyalty_points
    loyalty_points_used = models.IntegerField(default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='paid')
    tip_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    is_walkin = models.BooleanField(default=False)
    # Not auto_now_add so the seed can set historical dates
    created_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'

    def save(self, *args, **kwargs):
        if self.appointment is not None and self.customer is None:
            self.customer = self.appointment.customer
        if self.appointment is None:
            self.is_walkin = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} — {self.customer.name} — ₹{self.total_amount}"


class InvoiceItem(models.Model):
    """
    Line item in an invoice — one per service rendered.
    price and gst_rate are snapshots at time of billing (in case service prices change later).
    gst_amount = price * gst_rate / 100
    """

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    stylist = models.ForeignKey(StaffMember, on_delete=models.PROTECT)
    # Snapshot of price at time of billing — important for historical accuracy
    price = models.DecimalField(max_digits=8, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=4, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        verbose_name = 'Invoice Item'
        verbose_name_plural = 'Invoice Items'

    def __str__(self):
        return f"{self.service.name} — ₹{self.price}"
