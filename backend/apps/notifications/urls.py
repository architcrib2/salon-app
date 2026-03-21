"""Notification URL routing."""
from django.urls import path
from .views import NotificationListView, NotificationResendView, NotificationStatsView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('resend/<int:pk>/', NotificationResendView.as_view(), name='notification-resend'),
    path('stats/', NotificationStatsView.as_view(), name='notification-stats'),
]
