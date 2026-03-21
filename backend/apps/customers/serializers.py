"""Customer serializers — list, detail, and nested appointment history."""
from rest_framework import serializers
from .models import Customer


class CustomerListSerializer(serializers.ModelSerializer):
    """Compact representation for list views and dropdowns."""

    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'gender', 'loyalty_points', 'last_visit']


class CustomerDetailSerializer(serializers.ModelSerializer):
    """Full customer profile including all fields."""

    class Meta:
        model = Customer
        fields = '__all__'


class CustomerCreateUpdateSerializer(serializers.ModelSerializer):
    """Used for POST and PATCH operations."""

    class Meta:
        model = Customer
        fields = ['name', 'phone', 'email', 'gender', 'date_of_birth', 'notes']
