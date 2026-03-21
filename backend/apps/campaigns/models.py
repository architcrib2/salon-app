"""
Campaigns app models.
Campaign defines a bulk WhatsApp outreach; CampaignRecipient tracks per-customer delivery.
"""
from django.db import models


class Campaign(models.Model):
    """
    A targeted WhatsApp campaign sent to a customer segment.
    message_template supports {name}, {last_visit}, {offer} placeholders.
    status changes from draft → sent when Campaign.send() is executed.
    """

    SEGMENT_CHOICES = [
        ('lapsed_60', 'Lapsed 60+ Days'),
        ('lapsed_30', 'Lapsed 30+ Days'),
        ('loyalty_low', 'Low Loyalty Points (< 50)'),
        ('new_customers', 'New Customers (last 30 days)'),
        ('all', 'All Customers'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
    ]

    name = models.CharField(max_length=100)
    message_template = models.TextField()
    target_segment = models.CharField(max_length=20, choices=SEGMENT_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    sent_at = models.DateTimeField(null=True, blank=True)
    total_recipients = models.IntegerField(default=0)
    created_by = models.ForeignKey('accounts.StaffMember', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Campaign'
        verbose_name_plural = 'Campaigns'

    def __str__(self):
        return f"{self.name} [{self.status}] → {self.get_target_segment_display()}"


class CampaignRecipient(models.Model):
    """
    One customer's record within a campaign delivery.
    personalised_message stores the rendered (per-customer) version of the template.
    """

    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='recipients')
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=15)
    personalised_message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='sent')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Campaign Recipient'
        verbose_name_plural = 'Campaign Recipients'

    def __str__(self):
        return f"{self.campaign.name} → {self.customer.name}"
