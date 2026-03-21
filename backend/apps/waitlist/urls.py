"""Waitlist URL routing."""
from django.urls import path
from .views import WaitlistTodayView, WaitlistCreateView, WaitlistStatusUpdateView, WaitlistDeleteView, WaitlistStatsView

urlpatterns = [
    path('today/', WaitlistTodayView.as_view(), name='waitlist-today'),
    path('', WaitlistCreateView.as_view(), name='waitlist-create'),
    path('<int:pk>/status/', WaitlistStatusUpdateView.as_view(), name='waitlist-status'),
    path('<int:pk>/', WaitlistDeleteView.as_view(), name='waitlist-delete'),
    path('stats/', WaitlistStatsView.as_view(), name='waitlist-stats'),
]
