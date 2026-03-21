"""Admin for campaigns."""
from django.contrib import admin
from .models import Campaign, CampaignRecipient

class RecipientInline(admin.TabularInline):
    model = CampaignRecipient
    extra = 0

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['name', 'target_segment', 'status', 'total_recipients', 'sent_at']
    inlines = [RecipientInline]
