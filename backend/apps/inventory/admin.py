"""Admin for inventory."""
from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'quantity_in_stock', 'unit', 'reorder_level', 'is_low_stock']
    list_filter = ['category']
    search_fields = ['name', 'brand']
