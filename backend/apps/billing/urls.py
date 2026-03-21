"""Billing URL routing — invoices CRUD and daily summary."""
from django.urls import path
from .views import InvoiceViewSet, DailySummaryView, WalkinSummaryView

invoice_list = InvoiceViewSet.as_view({'get': 'list', 'post': 'create'})
invoice_detail = InvoiceViewSet.as_view({'get': 'retrieve'})

urlpatterns = [
    path('invoices/', invoice_list, name='invoice-list'),
    path('invoices/<int:pk>/', invoice_detail, name='invoice-detail'),
    path('invoices/walkin-summary/', WalkinSummaryView.as_view(), name='invoice-walkin-summary'),
    path('daily-summary/', DailySummaryView.as_view(), name='daily-summary'),
]
