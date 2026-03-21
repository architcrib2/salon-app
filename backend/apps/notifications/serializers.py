"""Notification serializers."""
from rest_framework import serializers
from .models import WhatsAppNotification


class NotificationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = WhatsAppNotification
        fields = [
            'id', 'customer', 'customer_name', 'notification_type', 'type_display',
            'phone_number', 'message_body', 'status', 'scheduled_at', 'sent_at',
            'error_message', 'created_at',
        ]
