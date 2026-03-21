"""Admin for billing models."""
from django.contrib import admin
from .models import Invoice, InvoiceItem

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'total_amount', 'payment_method', 'payment_status', 'created_at']
    list_filter = ['payment_method', 'payment_status']
    search_fields = ['invoice_number', 'customer__name']
    inlines = [InvoiceItemInline]
