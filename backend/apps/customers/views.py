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
from apps.core.filters import parse_filter_params, apply_date_filter


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

        # Standard filter params
        try:
            params = parse_filter_params(self.request)
            qs = apply_date_filter(qs, params, 'last_visit')
            if 'staff_id' in params:
                from apps.appointments.models import Appointment
                appt_qs = Appointment.objects.filter(stylist_id=params['staff_id'], status='completed')
                if 'start_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__gte=params['start_date'])
                if 'end_date' in params:
                    appt_qs = appt_qs.filter(scheduled_at__date__lte=params['end_date'])
                customer_ids = appt_qs.values_list('customer_id', flat=True)
                qs = qs.filter(id__in=customer_ids)
        except Exception:
            pass

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
