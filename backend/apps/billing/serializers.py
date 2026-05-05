"""Billing serializers — invoice creation, list, and detail with nested items."""
from rest_framework import serializers
from .models import Invoice, InvoiceItem
from apps.services.serializers import ServiceSerializer
from apps.accounts.serializers import StaffMemberSerializer


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Nested line item for invoice detail view."""

    service_name = serializers.SerializerMethodField()
    stylist_name = serializers.CharField(source='stylist.full_name', read_only=True)

    def get_service_name(self, obj):
        if obj.service:
            return obj.service.name
        return obj.description or 'Service'

    class Meta:
        model = InvoiceItem
        fields = ['id', 'service', 'service_name', 'description', 'stylist', 'stylist_name', 'price', 'gst_rate', 'gst_amount']


class InvoiceListSerializer(serializers.ModelSerializer):
    """Compact invoice for list views."""

    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name',
            'total_amount', 'payment_method', 'payment_status', 'created_at',
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Full invoice with nested items — for invoice detail/print view."""

    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        extra_fields = ['customer_name', 'customer_phone', 'items']


class InvoiceCreateSerializer(serializers.Serializer):
    """
    Input for invoice creation — accepts appointment + payment details.
    Backend calculates subtotal, GST, and generates invoice number.
    """

    appointment_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=['cash', 'upi', 'card', 'mixed'])
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    loyalty_points_used = serializers.IntegerField(default=0)
    tip_amount = serializers.DecimalField(max_digits=8, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
