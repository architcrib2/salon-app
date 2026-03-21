"""Inventory URL routing."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    ProductTransactionHistoryView,
    RestockProductView,
    AdjustProductView,
    LowStockAlertsView,
    ServiceProductUsageView,
    ServiceProductUsageDetailView,
    ConsumptionReportView,
)

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='inventory')

urlpatterns = [
    path('low-stock-alerts/', LowStockAlertsView.as_view(), name='inventory-low-stock-alerts'),
    path('service-product-usages/', ServiceProductUsageView.as_view(), name='service-product-usages'),
    path('service-product-usages/<int:pk>/', ServiceProductUsageDetailView.as_view(), name='service-product-usage-detail'),
    path('consumption-report/', ConsumptionReportView.as_view(), name='inventory-consumption-report'),
    path('<int:pk>/transactions/', ProductTransactionHistoryView.as_view(), name='product-transactions'),
    path('<int:pk>/restock/', RestockProductView.as_view(), name='product-restock'),
    path('<int:pk>/adjust/', AdjustProductView.as_view(), name='product-adjust'),
    path('', include(router.urls)),
]
