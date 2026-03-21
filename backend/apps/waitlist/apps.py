"""AppConfig for waitlist app."""
from django.apps import AppConfig

class WaitlistConfig(AppConfig):
    name = 'apps.waitlist'
    verbose_name = 'Waitlist'
    default_auto_field = 'django.db.models.BigAutoField'
