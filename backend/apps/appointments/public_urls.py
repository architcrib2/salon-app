"""Public booking request URLs — no authentication required."""
from django.urls import path
from .public_views import (
    PublicServicesView,
    PublicStylistsView,
    PublicBookingRequestView,
    BookingRequestListView,
    BookingRequestActionView,
)

urlpatterns = [
    # Public (no auth)
    path('services/', PublicServicesView.as_view(), name='public-services'),
    path('stylists/', PublicStylistsView.as_view(), name='public-stylists'),
    path('book/', PublicBookingRequestView.as_view(), name='public-book'),
    # Authenticated — receptionist views
    path('booking-requests/', BookingRequestListView.as_view(), name='booking-requests-list'),
    path('booking-requests/<int:pk>/<str:action>/', BookingRequestActionView.as_view(), name='booking-request-action'),
]
