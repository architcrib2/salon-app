"""Admin registration for Customer model."""
from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'gender', 'loyalty_points', 'last_visit']
    search_fields = ['name', 'phone', 'email']
    list_filter = ['gender']
