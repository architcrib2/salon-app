"""
Customers app models.
Customer profiles with Indian-market specifics: phone as primary ID, loyalty points,
stylist notes for preferences/allergies.
"""
from django.db import models


class Customer(models.Model):
    """
    Represents a salon customer.
    phone is the primary identifier used in India (most customers don't use email).
    loyalty_points: 1 point per ₹100 spent, redeemable at ₹1 per point.
    last_visit: updated automatically when an appointment is marked completed.
    """

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    date_of_birth = models.DateField(null=True, blank=True)
    # Stylist notes: allergies, preferred products, style preferences
    notes = models.TextField(blank=True)
    loyalty_points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    # Updated when an appointment is marked completed via billing
    last_visit = models.DateField(null=True, blank=True)
    # Referral programme — unique 8-char code auto-generated on save
    referral_code = models.CharField(max_length=10, unique=True, null=True, blank=True)
    # Self-referential FK: who referred this customer
    referred_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals'
    )
    referral_points_earned = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'

    def __str__(self):
        return f"{self.name} ({self.phone})"
