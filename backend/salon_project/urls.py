"""
Root URL configuration for the Salon Management application.
All API routes are prefixed with /api/ and versioned by app.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('apps.accounts.urls')),
    # Core modules
    path('api/customers/', include('apps.customers.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/staff/', include('apps.accounts.staff_urls')),
    # Phase 2 — Engagement modules
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/memberships/', include('apps.memberships.urls')),
    path('api/waitlist/', include('apps.waitlist.urls')),
    path('api/campaigns/', include('apps.campaigns.urls')),
    # Public routes (no auth)
    path('api/public/', include('apps.appointments.public_urls')),
    path('api/referrals/', include('apps.customers.referral_urls')),
]
