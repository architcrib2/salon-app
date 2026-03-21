"""Appointment serializers — list, detail with nested customer/stylist/services."""
from rest_framework import serializers
from .models import Appointment
from apps.accounts.serializers import StaffMemberSerializer
from apps.customers.serializers import CustomerListSerializer
from apps.services.serializers import ServiceSerializer


class AppointmentListSerializer(serializers.ModelSerializer):
    """Compact view for calendar/list pages."""

    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    stylist_name = serializers.CharField(source='stylist.full_name', read_only=True)
    service_names = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone',
            'stylist', 'stylist_name', 'service_names',
            'scheduled_at', 'duration_minutes', 'status', 'notes', 'created_at',
        ]

    def get_service_names(self, obj):
        return [s.name for s in obj.services.all()]


class AppointmentDetailSerializer(serializers.ModelSerializer):
    """Full detail with nested objects — for appointment detail page."""

    customer = CustomerListSerializer(read_only=True)
    stylist = StaffMemberSerializer(read_only=True)
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Write serializer — accepts IDs for FK/M2M fields."""

    service_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)

    class Meta:
        model = Appointment
        fields = [
            'customer', 'stylist', 'service_ids',
            'scheduled_at', 'duration_minutes', 'notes',
        ]

    def create(self, validated_data):
        """Extract service_ids, create appointment, then set M2M services."""
        service_ids = validated_data.pop('service_ids')
        appointment = Appointment.objects.create(**validated_data)
        appointment.services.set(service_ids)
        return appointment
