"""Admin for notifications."""
from django.contrib import admin
from .models import WhatsAppNotification

@admin.register(WhatsAppNotification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['customer', 'notification_type', 'phone_number', 'status', 'scheduled_at', 'sent_at']
    list_filter = ['status', 'notification_type']
    search_fields = ['customer__name', 'phone_number']
