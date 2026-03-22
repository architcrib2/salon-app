"""Membership serializers."""
from rest_framework import serializers
from .models import MembershipPlan, CustomerMembership, MembershipRedemption
from apps.services.serializers import ServiceSerializer


class MembershipPlanSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    service_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = MembershipPlan
        fields = [
            'id', 'name', 'description', 'plan_type',
            'services', 'service_ids',
            'total_sessions', 'total_credit_amount',
            'validity_days', 'price', 'is_active',
        ]

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
    plan_type = serializers.CharField(source='plan.plan_type', read_only=True)
    progress_pct = serializers.SerializerMethodField()
    bonus_amount = serializers.SerializerMethodField()

    class Meta:
        model = CustomerMembership
        fields = [
            'id', 'customer', 'customer_name', 'plan', 'plan_name', 'plan_type',
            'purchased_at', 'valid_until',
            'sessions_total', 'sessions_used', 'sessions_remaining',
            'amount_paid', 'total_credit_amount', 'amount_used', 'amount_remaining',
            'bonus_amount', 'progress_pct',
            'payment_method', 'status', 'notes',
        ]

    def get_progress_pct(self, obj):
        if obj.plan.plan_type == 'amount':
            if not obj.total_credit_amount or float(obj.total_credit_amount) == 0:
                return 0
            return round(float(obj.amount_used or 0) / float(obj.total_credit_amount) * 100)
        if not obj.sessions_total:
            return 0
        return round((obj.sessions_used / obj.sessions_total) * 100)

    def get_bonus_amount(self, obj):
        if obj.plan.plan_type == 'amount' and obj.total_credit_amount and obj.amount_paid:
            bonus = float(obj.total_credit_amount) - float(obj.amount_paid)
            return round(bonus, 2) if bonus > 0 else 0
        return 0


class MembershipRedemptionSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    stylist_name = serializers.CharField(source='redeemed_by.full_name', read_only=True)

    class Meta:
        model = MembershipRedemption
        fields = ['id', 'membership', 'appointment', 'service', 'service_name',
                  'stylist_name', 'redeemed_at', 'value_redeemed']
