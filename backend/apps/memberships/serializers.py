"""Membership serializers."""
from rest_framework import serializers
from .models import MembershipPlan, CustomerMembership, MembershipRedemption
from apps.services.serializers import ServiceSerializer


class MembershipPlanSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    service_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = MembershipPlan
        fields = ['id', 'name', 'description', 'services', 'service_ids', 'total_sessions', 'validity_days', 'price', 'is_active']

    def create(self, validated_data):
        service_ids = validated_data.pop('service_ids', [])
        plan = MembershipPlan.objects.create(**validated_data)
        if service_ids:
            plan.services.set(service_ids)
        return plan

    def update(self, instance, validated_data):
        service_ids = validated_data.pop('service_ids', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if service_ids is not None:
            instance.services.set(service_ids)
        return instance


class CustomerMembershipSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    progress_pct = serializers.SerializerMethodField()

    class Meta:
        model = CustomerMembership
        fields = [
            'id', 'customer', 'customer_name', 'plan', 'plan_name',
            'purchased_at', 'valid_until', 'sessions_total', 'sessions_used',
            'sessions_remaining', 'progress_pct', 'amount_paid', 'payment_method',
            'status', 'notes',
        ]

    def get_progress_pct(self, obj):
        if obj.sessions_total == 0:
            return 0
        return round((obj.sessions_used / obj.sessions_total) * 100)


class MembershipRedemptionSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    stylist_name = serializers.CharField(source='redeemed_by.full_name', read_only=True)

    class Meta:
        model = MembershipRedemption
        fields = ['id', 'membership', 'appointment', 'service', 'service_name', 'stylist_name', 'redeemed_at', 'value_redeemed']
