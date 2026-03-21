"""Inventory serializers with computed is_low_stock field."""
from rest_framework import serializers
from .models import Product, InventoryTransaction


class ProductSerializer(serializers.ModelSerializer):
    """Full product representation including low-stock indicator."""

    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'


class InventoryTransactionSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True)
    type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            'id', 'transaction_type', 'type_display', 'quantity_change',
            'quantity_before', 'quantity_after', 'unit_cost', 'total_cost',
            'notes', 'performed_by', 'performed_by_name', 'created_at',
        ]
