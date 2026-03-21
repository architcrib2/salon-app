"""
Services app models.
ServiceCategory groups services (Hair, Skin, Nails, etc.).
Service stores pricing, duration, and GST rate for billing calculations.
"""
from django.db import models


class ServiceCategory(models.Model):
    """
    Top-level grouping for services.
    gender allows filtering: Male-only (Beard), Female-only (Bridal), or Unisex.
    """

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('unisex', 'Unisex'),
    ]

    name = models.CharField(max_length=50)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='unisex')

    class Meta:
        ordering = ['name']
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'

    def __str__(self):
        return f"{self.name} ({self.get_gender_display()})"


class Service(models.Model):
    """
    Individual salon service offered.
    duration_minutes is used to block calendar slots when creating appointments.
    gst_rate: GST is applied at the line-item level during invoice generation.
    price: base price in INR before GST.
    """

    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    # GST percentage — typically 18% for salon services in India
    gst_rate = models.DecimalField(max_digits=4, decimal_places=2, default=18.00)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Service'
        verbose_name_plural = 'Services'

    def __str__(self):
        return f"{self.name} (₹{self.price})"

    @property
    def price_with_gst(self):
        """Calculate final price including GST: price * (1 + gst_rate/100)."""
        return self.price * (1 + self.gst_rate / 100)
