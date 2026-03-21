"""AppConfig for notifications app — connects post_save signals on ready()."""
from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    name = 'apps.notifications'
    verbose_name = 'Notifications'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        from apps.notifications.signals import connect_signals
        connect_signals()
