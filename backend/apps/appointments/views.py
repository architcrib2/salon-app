"""
Appointments views.
Provides booking CRUD, calendar day view, and stylist availability checks.
"""
from datetime import datetime, timedelta, date
import pytz

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import Appointment
from .serializers import (
    AppointmentCreateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
)
from apps.core.filters import parse_filter_params, apply_date_filter

IST = pytz.timezone('Asia/Kolkata')


class AppointmentViewSet(ModelViewSet):
    """
    Appointment CRUD with day-view calendar and availability checks.
    Filters: ?date=YYYY-MM-DD, ?stylist=<id>, ?status=scheduled
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Appointment.objects.select_related('customer', 'stylist').prefetch_related('services')
        date_str = self.request.query_params.get('date')
        stylist_id = self.request.query_params.get('stylist')
        appt_status = self.request.query_params.get('status')

        if date_str:
            try:
                day = datetime.strptime(date_str, '%Y-%m-%d').date()
                # Filter by IST date range
                start = IST.localize(datetime.combine(day, datetime.min.time()))
                end = IST.localize(datetime.combine(day, datetime.max.time()))
                qs = qs.filter(scheduled_at__range=(start, end))
            except ValueError:
                pass
        if stylist_id:
            qs = qs.filter(stylist_id=stylist_id)
        if appt_status:
            qs = qs.filter(status=appt_status)

        # Standard filter params (start_date/end_date/staff_id/status list)
        try:
            params = parse_filter_params(self.request)
            qs = apply_date_filter(qs, params, 'scheduled_at')
            if 'staff_id' in params:
                qs = qs.filter(stylist_id=params['staff_id'])
            if 'status' in params:
                qs = qs.filter(status__in=params['status'])
        except Exception:
            pass

        return qs.order_by('scheduled_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return AppointmentCreateSerializer
        if self.action in ('retrieve',):
            return AppointmentDetailSerializer
        return AppointmentListSerializer

    def list(self, request, *args, **kwargs):
        try:
            qs = self.get_queryset()
            serializer = AppointmentListSerializer(qs, many=True)
            return Response({'success': True, 'data': serializer.data, 'count': qs.count()})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def retrieve(self, request, *args, **kwargs):
        try:
            appt = self.get_object()
            serializer = AppointmentDetailSerializer(appt)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def create(self, request, *args, **kwargs):
        try:
            serializer = AppointmentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            appt = serializer.save(created_by=request.user)
            return Response(
                {'success': True, 'data': AppointmentListSerializer(appt).data, 'message': 'Appointment booked'},
                status=201,
            )
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    def partial_update(self, request, *args, **kwargs):
        """PATCH /api/appointments/{id}/ — update status or notes."""
        try:
            appt = self.get_object()
            old_status = appt.status
            appt.status = request.data.get('status', appt.status)
            appt.notes = request.data.get('notes', appt.notes)
            appt.save()

            # When completed, update customer's last_visit date
            if appt.status == 'completed' and old_status != 'completed':
                from django.utils.timezone import localdate
                appt.customer.last_visit = localdate()
                appt.customer.save(update_fields=['last_visit'])

            return Response({'success': True, 'data': AppointmentListSerializer(appt).data, 'message': 'Updated'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        """
        GET /api/appointments/calendar/?date=YYYY-MM-DD
        Returns all appointments for the day grouped by stylist for the calendar view.
        """
        try:
            date_str = request.query_params.get('date', date.today().strftime('%Y-%m-%d'))
            day = datetime.strptime(date_str, '%Y-%m-%d').date()
            start = IST.localize(datetime.combine(day, datetime.min.time()))
            end = IST.localize(datetime.combine(day, datetime.max.time()))

            appts = Appointment.objects.filter(
                scheduled_at__range=(start, end)
            ).select_related('customer', 'stylist').prefetch_related('services').order_by('scheduled_at')

            # Apply staff_id filter if provided
            try:
                params = parse_filter_params(request)
                if 'staff_id' in params:
                    appts = appts.filter(stylist_id=params['staff_id'])
            except Exception:
                pass

            serializer = AppointmentListSerializer(appts, many=True)
            return Response({'success': True, 'data': serializer.data, 'date': date_str})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    @action(detail=False, methods=['get'], url_path='availability')
    def availability(self, request):
        """
        GET /api/appointments/availability/?stylist_id=&date=YYYY-MM-DD
        Returns list of 30-min free slots from 9AM to 9PM for the stylist.
        """
        try:
            stylist_id = request.query_params.get('stylist_id')
            date_str = request.query_params.get('date', date.today().strftime('%Y-%m-%d'))
            day = datetime.strptime(date_str, '%Y-%m-%d').date()

            # Build all 30-min slots from 9AM to 9PM
            slots = []
            slot_start = IST.localize(datetime.combine(day, datetime.min.time().replace(hour=9)))
            slot_end = IST.localize(datetime.combine(day, datetime.min.time().replace(hour=21)))

            # Get booked appointments for this stylist
            booked = Appointment.objects.filter(
                stylist_id=stylist_id,
                scheduled_at__date=day,
                status__in=['scheduled', 'in_progress'],
            )

            # Build blocked time ranges from booked appointments
            blocked = []
            for appt in booked:
                blocked.append((appt.scheduled_at, appt.end_time))

            current = slot_start
            while current < slot_end:
                next_slot = current + timedelta(minutes=30)
                # Check if this slot overlaps with any blocked range
                is_free = not any(
                    b_start < next_slot and b_end > current
                    for b_start, b_end in blocked
                )
                slots.append({
                    'time': current.strftime('%H:%M'),
                    'datetime': current.isoformat(),
                    'available': is_free,
                })
                current = next_slot

            return Response({'success': True, 'data': slots})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
