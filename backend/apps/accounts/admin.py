"""Admin registration for StaffMember model."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import StaffMember


@admin.register(StaffMember)
class StaffMemberAdmin(UserAdmin):
    list_display = ['username', 'full_name', 'role', 'phone', 'is_active_staff']
    list_filter = ['role', 'is_active_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Salon Info', {'fields': ('role', 'phone', 'commission_rate', 'is_active_staff')}),
    )
