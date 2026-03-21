"""
Accounts app models.
Defines StaffMember which extends Django's AbstractUser with salon-specific fields
like role, phone number, and commission rate.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class StaffMember(AbstractUser):
    """
    Custom user model representing a salon staff member.
    Roles: owner (full access), stylist (appointments/billing), receptionist (bookings only).
    commission_rate is stored as a percentage (e.g. 15.00 = 15%).
    """

    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('stylist', 'Stylist'),
        ('receptionist', 'Receptionist'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='stylist')
    phone = models.CharField(max_length=15, blank=True)
    # Commission percentage earned per service rendered
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_active_staff = models.BooleanField(default=True)

    class Meta:
        ordering = ['first_name', 'last_name']
        verbose_name = 'Staff Member'
        verbose_name_plural = 'Staff Members'

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def full_name(self):
        return self.get_full_name() or self.username
