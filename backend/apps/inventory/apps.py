"""AppConfig for inventory app."""
from django.apps import AppConfig


class InventoryConfig(AppConfig):
    name = 'apps.inventory'
    verbose_name = 'Inventory'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        from apps.inventory.signals import connect_signals
        connect_signals()
