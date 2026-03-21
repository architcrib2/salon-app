"""
Services views.
Provides service and category management with filtering by category and gender.
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from .models import Service, ServiceCategory
from .serializers import ServiceCategorySerializer, ServiceSerializer


class ServiceCategoryView(APIView):
    """GET /api/services/categories/ — list all categories with nested services."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            categories = ServiceCategory.objects.all()
            serializer = ServiceCategorySerializer(categories, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class ServiceViewSet(ModelViewSet):
    """
    CRUD for individual services.
    Supports filtering: ?category=<id>, ?gender=<male|female|unisex>, ?active=true
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ServiceSerializer

    def get_queryset(self):
        qs = Service.objects.select_related('category').all()
        category_id = self.request.query_params.get('category')
        gender = self.request.query_params.get('gender')
        active = self.request.query_params.get('active')
        if category_id:
            qs = qs.filter(category_id=category_id)
        if gender:
            qs = qs.filter(category__gender__in=[gender, 'unisex'])
        if active and active.lower() == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def list(self, request, *args, **kwargs):
        try:
            qs = self.get_queryset()
            serializer = ServiceSerializer(qs, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def create(self, request, *args, **kwargs):
        try:
            serializer = ServiceSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            service = serializer.save()
            return Response({'success': True, 'data': ServiceSerializer(service).data, 'message': 'Service created'}, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = ServiceSerializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({'success': True, 'data': serializer.data, 'message': 'Updated'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)
