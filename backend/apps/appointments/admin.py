"""Admin registration for Appointment model."""
from django.contrib import admin
from .models import Appointment

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['customer', 'stylist', 'scheduled_at', 'duration_minutes', 'status']
    list_filter = ['status', 'stylist']
    search_fields = ['customer__name', 'customer__phone']
    date_hierarchy = 'scheduled_at'
