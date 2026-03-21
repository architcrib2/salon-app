"""Services serializers — categories with nested services and standalone service."""
from rest_framework import serializers
from .models import Service, ServiceCategory


class ServiceSerializer(serializers.ModelSerializer):
    """Full service representation including computed price_with_gst."""

    price_with_gst = serializers.ReadOnlyField()
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'category', 'category_name', 'name', 'description',
            'duration_minutes', 'price', 'gst_rate', 'price_with_gst', 'is_active',
        ]


class ServiceCategorySerializer(serializers.ModelSerializer):
    """Category with all its nested services."""

    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'gender', 'services']
