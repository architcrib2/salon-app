"""Referral programme URL routing."""
from django.urls import path
from .referral_views import ReferralStatsView, CustomerReferralView

urlpatterns = [
    path('stats/', ReferralStatsView.as_view(), name='referral-stats'),
    path('customer/<int:customer_id>/', CustomerReferralView.as_view(), name='customer-referrals'),
]
