"""Admin registration for services."""
from django.contrib import admin
from .models import Service, ServiceCategory

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'gender']

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'duration_minutes', 'price', 'gst_rate', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name']
