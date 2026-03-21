"""
Appointments app models.
Handles booking, scheduling and status tracking for salon visits.
Each appointment can include multiple services and blocks calendar slots.
"""
from django.db import models
from apps.accounts.models import StaffMember
from apps.customers.models import Customer
from apps.services.models import Service


class Appointment(models.Model):
    """
    Core booking record.
    services: M2M because a customer may book multiple services in one visit.
    duration_minutes: pre-calculated sum of selected services for slot blocking.
    created_by: receptionist or owner who made the booking.
    """

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='appointments')
    stylist = models.ForeignKey(StaffMember, on_delete=models.PROTECT, related_name='appointments')
    services = models.ManyToManyField(Service)
    scheduled_at = models.DateTimeField()
    # Total duration = sum of all selected services' duration_minutes
    duration_minutes = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        StaffMember, on_delete=models.SET_NULL, null=True, related_name='created_appointments'
    )

    class Meta:
        ordering = ['-scheduled_at']
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'

    def __str__(self):
        return f"{self.customer.name} @ {self.scheduled_at.strftime('%d %b %Y %H:%M')} — {self.status}"

    @property
    def end_time(self):
        """Calculate appointment end time based on start + duration."""
        from datetime import timedelta
        return self.scheduled_at + timedelta(minutes=self.duration_minutes)


class PublicBookingRequest(models.Model):
    """
    Online booking requests submitted via the public /book page (no auth required).
    A receptionist reviews and converts to a real Appointment or rejects.
    service_ids: comma-separated service PKs (denormalised for simplicity — no auth context).
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('rejected', 'Rejected'),
    ]

    # Customer contact info (may not exist in system yet)
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=15)
    customer_email = models.EmailField(blank=True)
    # Selected services (JSON list of service IDs)
    service_ids = models.JSONField(default=list)
    # Preferred stylist (nullable — "any stylist" option)
    preferred_stylist = models.ForeignKey(
        StaffMember, on_delete=models.SET_NULL, null=True, blank=True, related_name='booking_requests'
    )
    preferred_date = models.DateField()
    preferred_time = models.TimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    # Set when receptionist confirms and creates real appointment
    appointment = models.OneToOneField(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='booking_request'
    )
    reviewed_by = models.ForeignKey(
        StaffMember, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_bookings'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Public Booking Request'
        verbose_name_plural = 'Public Booking Requests'

    def __str__(self):
        return f"{self.customer_name} ({self.customer_phone}) — {self.preferred_date} [{self.status}]"
