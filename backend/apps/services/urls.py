"""Services URL routing — categories endpoint + services CRUD."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceCategoryView, ServiceViewSet

router = DefaultRouter()
router.register(r'', ServiceViewSet, basename='services')

urlpatterns = [
    path('categories/', ServiceCategoryView.as_view(), name='service-categories'),
    path('', include(router.urls)),
]
