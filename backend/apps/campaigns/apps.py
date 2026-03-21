"""AppConfig for campaigns app."""
from django.apps import AppConfig

class CampaignsConfig(AppConfig):
    name = 'apps.campaigns'
    verbose_name = 'Campaigns'
    default_auto_field = 'django.db.models.BigAutoField'
