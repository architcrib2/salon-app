"""Campaigns URL routing."""
from django.urls import path
from .views import SegmentPreviewView, CampaignListView, CampaignDetailView, CampaignSendView, CampaignRecipientsView

urlpatterns = [
    path('segments/preview/', SegmentPreviewView.as_view(), name='segment-preview'),
    path('', CampaignListView.as_view(), name='campaign-list'),
    path('<int:pk>/', CampaignDetailView.as_view(), name='campaign-detail'),
    path('<int:pk>/send/', CampaignSendView.as_view(), name='campaign-send'),
    path('<int:pk>/recipients/', CampaignRecipientsView.as_view(), name='campaign-recipients'),
]
