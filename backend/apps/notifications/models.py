"""
Notifications app models.
WhatsAppNotification records every outbound WhatsApp message — pending, sent, or failed.
Used for booking confirmations, reminders, review requests, campaigns, and referral alerts.
"""
from django.db import models
from apps.customers.models import Customer


class WhatsAppNotification(models.Model):
    """
    Represents a single WhatsApp message to be (or already) sent.
    status lifecycle: pending → sent | failed
    scheduled_at controls when send_pending_notifications will dispatch it.
    """

    TYPE_CHOICES = [
        ('booking_confirm', 'Booking Confirmation'),
        ('reminder_1hr', 'Reminder (1 Hour)'),
        ('review_request', 'Review Request'),
        ('campaign', 'Campaign'),
        ('referral_welcome', 'Referral Welcome'),
        ('rebooking_nudge', 'Rebooking Nudge'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='notifications')
    # Appointment is nullable — review_request, campaign, referral_welcome have no appointment
    appointment = models.ForeignKey(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    # Snapshot of phone at send time so historical records stay accurate
    phone_number = models.CharField(max_length=15)
    message_body = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'WhatsApp Notification'
        verbose_name_plural = 'WhatsApp Notifications'

    def __str__(self):
        return f"{self.get_notification_type_display()} → {self.phone_number} [{self.status}]"
