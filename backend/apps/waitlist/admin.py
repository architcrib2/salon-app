"""Admin for waitlist."""
from django.contrib import admin
from .models import WaitlistEntry

@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'status', 'position', 'estimated_wait_minutes', 'added_at']
    list_filter = ['status']
