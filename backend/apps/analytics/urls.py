"""Analytics URL routing."""
from django.urls import path
from .views import (
    RevenueAnalyticsView,
    TopServicesView,
    StaffPerformanceView,
    CustomerRetentionView,
    HeatmapView,
    RevenueBreakdownView,
    MembershipStatsView,
    ReferralAnalyticsView,
    # Phase 3 — Customer Intelligence
    ChurnRiskView,
    NextVisitPredictionsView,
    VIPRankingView,
    RebookingOpportunitiesView,
    SendRebookingNudgeView,
    # Phase 4 — Staff & Inventory Intelligence
    StaffIntelligenceView,
    InventoryIntelligenceView,
)

urlpatterns = [
    path('revenue/', RevenueAnalyticsView.as_view(), name='analytics-revenue'),
    path('top-services/', TopServicesView.as_view(), name='analytics-top-services'),
    path('staff-performance/', StaffPerformanceView.as_view(), name='analytics-staff-performance'),
    path('customer-retention/', CustomerRetentionView.as_view(), name='analytics-customer-retention'),
    # Phase 2 enhanced analytics
    path('heatmap/', HeatmapView.as_view(), name='analytics-heatmap'),
    path('revenue-breakdown/', RevenueBreakdownView.as_view(), name='analytics-revenue-breakdown'),
    path('membership-stats/', MembershipStatsView.as_view(), name='analytics-membership-stats'),
    path('referral-stats/', ReferralAnalyticsView.as_view(), name='analytics-referral-stats'),
    # Phase 3 — Customer Intelligence
    path('churn-risk/', ChurnRiskView.as_view(), name='analytics-churn-risk'),
    path('next-visit-predictions/', NextVisitPredictionsView.as_view(), name='analytics-next-visit'),
    path('vip-ranking/', VIPRankingView.as_view(), name='analytics-vip-ranking'),
    path('rebooking-opportunities/', RebookingOpportunitiesView.as_view(), name='analytics-rebooking'),
    path('send-rebooking-nudge/', SendRebookingNudgeView.as_view(), name='analytics-send-nudge'),
    # Phase 4 — Staff & Inventory Intelligence
    path('staff-intelligence/', StaffIntelligenceView.as_view(), name='analytics-staff-intelligence'),
    path('inventory-intelligence/', InventoryIntelligenceView.as_view(), name='analytics-inventory-intelligence'),
]
