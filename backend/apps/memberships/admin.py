"""Admin for memberships."""
from django.contrib import admin
from .models import MembershipPlan, CustomerMembership, MembershipRedemption

class RedemptionInline(admin.TabularInline):
    model = MembershipRedemption
    extra = 0

@admin.register(MembershipPlan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'total_sessions', 'validity_days', 'price', 'is_active']

@admin.register(CustomerMembership)
class CustomerMembershipAdmin(admin.ModelAdmin):
    list_display = ['customer', 'plan', 'sessions_remaining', 'valid_until', 'status']
    list_filter = ['status']
    inlines = [RedemptionInline]
