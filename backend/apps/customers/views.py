"""
Customer views.
Provides CRUD operations and appointment history per customer.
Search by name or phone is supported via query params.
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Customer
from .serializers import (
    CustomerCreateUpdateSerializer,
    CustomerDetailSerializer,
    CustomerListSerializer,
)


class CustomerViewSet(ModelViewSet):
    """
    Full CRUD for customers with search and appointment history.
    GET /api/customers/?search=<name_or_phone>
    GET /api/customers/{id}/appointments/
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Support searching by name or phone."""
        qs = Customer.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(phone__icontains=search)
        return qs.distinct()

    def get_serializer_class(self):
        if self.action in ('list',):
            return CustomerListSerializer
        if self.action in ('create', 'partial_update', 'update'):
            return CustomerCreateUpdateSerializer
        return CustomerDetailSerializer

    def list(self, request, *args, **kwargs):
        try:
            qs = self.get_queryset()
            serializer = CustomerListSerializer(qs, many=True)
            return Response({'success': True, 'data': serializer.data, 'count': qs.count()})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def retrieve(self, request, *args, **kwargs):
        try:
            customer = self.get_object()
            serializer = CustomerDetailSerializer(customer)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def create(self, request, *args, **kwargs):
        try:
            serializer = CustomerCreateUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            customer = serializer.save()
            return Response(
                {'success': True, 'data': CustomerDetailSerializer(customer).data, 'message': 'Customer created'},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = CustomerCreateUpdateSerializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({'success': True, 'data': CustomerDetailSerializer(instance).data, 'message': 'Updated'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    @action(detail=True, methods=['get'], url_path='appointments')
    def appointments(self, request, pk=None):
        """GET /api/customers/{id}/appointments/ — full visit history for a customer."""
        try:
            from apps.appointments.models import Appointment
            from apps.appointments.serializers import AppointmentListSerializer
            customer = self.get_object()
            appts = Appointment.objects.filter(customer=customer).order_by('-scheduled_at')
            serializer = AppointmentListSerializer(appts, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
