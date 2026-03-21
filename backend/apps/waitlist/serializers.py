"""Waitlist serializers."""
from rest_framework import serializers
from .models import WaitlistEntry
from apps.services.serializers import ServiceSerializer


class WaitlistEntrySerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    display_phone = serializers.ReadOnlyField()
    customer_name = serializers.CharField(source='customer.name', read_only=True, default=None)
    stylist_name = serializers.CharField(source='preferred_stylist.full_name', read_only=True, default=None)
    service_names = serializers.SerializerMethodField()
    service_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = WaitlistEntry
        fields = [
            'id', 'customer', 'customer_name', 'walk_in_name', 'walk_in_phone',
            'display_name', 'display_phone',
            'service_ids', 'service_names',
            'preferred_stylist', 'stylist_name',
            'status', 'position', 'estimated_wait_minutes',
            'added_at', 'called_at', 'completed_at', 'notes',
        ]

    def get_service_names(self, obj):
        return [s.name for s in obj.requested_services.all()]

    def create(self, validated_data):
        service_ids = validated_data.pop('service_ids', [])
        entry = WaitlistEntry.objects.create(**validated_data)
        if service_ids:
            entry.requested_services.set(service_ids)
            entry.save()  # trigger recalculate
        return entry
