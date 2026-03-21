"""Membership URL routing."""
from django.urls import path
from .views import (
    MembershipPlanView, MembershipPlanDetailView,
    CustomerMembershipView, PurchaseMembershipView,
    RedeemMembershipView, ExpiringSoonView, ActiveMembershipsView,
)

urlpatterns = [
    path('plans/', MembershipPlanView.as_view(), name='membership-plans'),
    path('plans/<int:pk>/', MembershipPlanDetailView.as_view(), name='membership-plan-detail'),
    path('active/', ActiveMembershipsView.as_view(), name='memberships-active'),
    path('customer/<int:customer_id>/', CustomerMembershipView.as_view(), name='customer-memberships'),
    path('purchase/', PurchaseMembershipView.as_view(), name='membership-purchase'),
    path('redeem/', RedeemMembershipView.as_view(), name='membership-redeem'),
    path('expiring-soon/', ExpiringSoonView.as_view(), name='memberships-expiring-soon'),
]
