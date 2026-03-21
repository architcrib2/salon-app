"""
Public booking views — no authentication for customer-facing endpoints.
Staff-facing booking request management requires IsAuthenticated.
"""
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.services.models import Service, ServiceCategory
from apps.accounts.models import StaffMember
from .models import PublicBookingRequest, Appointment


class PublicServicesView(APIView):
    """GET /api/public/services/ — service catalogue for the booking wizard (no auth)."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            categories = ServiceCategory.objects.prefetch_related('services').all()
            data = []
            for cat in categories:
                services = cat.services.filter(is_active=True).values(
                    'id', 'name', 'duration_minutes', 'price', 'gst_rate'
                )
                if services:
                    data.append({
                        'category': cat.name,
                        'gender': cat.gender,
                        'services': list(services),
                    })
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class PublicStylistsView(APIView):
    """GET /api/public/stylists/ — active stylists for the booking wizard (no auth)."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            stylists = StaffMember.objects.filter(
                role='stylist', is_active_staff=True
            ).values('id', 'first_name', 'last_name')
            data = [
                {'id': s['id'], 'name': f"{s['first_name']} {s['last_name']}".strip()}
                for s in stylists
            ]
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class PublicBookingRequestView(APIView):
    """POST /api/public/book/ — submit a booking request (no auth)."""
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            d = request.data
            # Basic validation
            required = ['customer_name', 'customer_phone', 'service_ids', 'preferred_date', 'preferred_time']
            for field in required:
                if not d.get(field):
                    return Response({'success': False, 'message': f'{field} is required'}, status=400)

            preferred_stylist = None
            stylist_id = d.get('preferred_stylist_id')
            if stylist_id:
                try:
                    preferred_stylist = StaffMember.objects.get(pk=stylist_id, role='stylist')
                except StaffMember.DoesNotExist:
                    pass

            br = PublicBookingRequest.objects.create(
                customer_name=d['customer_name'].strip(),
                customer_phone=d['customer_phone'].strip(),
                customer_email=d.get('customer_email', '').strip(),
                service_ids=d['service_ids'],
                preferred_stylist=preferred_stylist,
                preferred_date=d['preferred_date'],
                preferred_time=d['preferred_time'],
                notes=d.get('notes', '').strip(),
            )
            return Response({
                'success': True,
                'message': 'Booking request submitted! We\'ll confirm via WhatsApp shortly.',
                'data': {'id': br.id, 'status': br.status},
            }, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class BookingRequestListView(APIView):
    """GET /api/public/booking-requests/ — list requests, filter by status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            status_filter = request.query_params.get('status', 'pending')
            qs = PublicBookingRequest.objects.all()
            if status_filter != 'all':
                qs = qs.filter(status=status_filter)

            data = []
            for br in qs:
                # Resolve service names
                service_names = list(
                    Service.objects.filter(pk__in=br.service_ids).values_list('name', flat=True)
                )
                data.append({
                    'id': br.id,
                    'customer_name': br.customer_name,
                    'customer_phone': br.customer_phone,
                    'customer_email': br.customer_email,
                    'service_names': service_names,
                    'service_ids': br.service_ids,
                    'preferred_stylist': br.preferred_stylist.full_name if br.preferred_stylist else None,
                    'preferred_date': str(br.preferred_date),
                    'preferred_time': str(br.preferred_time)[:5],
                    'notes': br.notes,
                    'status': br.status,
                    'rejection_reason': br.rejection_reason,
                    'created_at': br.created_at.isoformat(),
                })

            return Response({'success': True, 'data': data, 'count': len(data)})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class BookingRequestActionView(APIView):
    """
    POST /api/public/booking-requests/{pk}/confirm/
    POST /api/public/booking-requests/{pk}/reject/
    Confirm creates a real Appointment; reject stores reason.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        try:
            br = PublicBookingRequest.objects.get(pk=pk)
            if br.status != 'pending':
                return Response({'success': False, 'message': 'Request already processed'}, status=400)

            if action == 'reject':
                br.status = 'rejected'
                br.rejection_reason = request.data.get('reason', '')
                br.reviewed_by = request.user
                br.reviewed_at = timezone.now()
                br.save()
                return Response({'success': True, 'message': 'Booking request rejected'})

            elif action == 'confirm':
                from apps.customers.models import Customer
                from datetime import datetime, timedelta
                import pytz
                IST = pytz.timezone('Asia/Kolkata')

                # Get or create customer
                customer, _ = Customer.objects.get_or_create(
                    phone=br.customer_phone,
                    defaults={
                        'name': br.customer_name,
                        'email': br.customer_email,
                        'gender': 'other',
                    }
                )

                # Combine preferred_date + preferred_time into datetime
                dt_naive = datetime.combine(br.preferred_date, br.preferred_time)
                scheduled_at = IST.localize(dt_naive)

                # Resolve stylist
                stylist = br.preferred_stylist
                if not stylist:
                    stylist = StaffMember.objects.filter(role='stylist', is_active_staff=True).first()
                    if not stylist:
                        return Response({'success': False, 'message': 'No active stylist available'}, status=400)

                # Calculate duration
                services = Service.objects.filter(pk__in=br.service_ids)
                duration = sum(s.duration_minutes for s in services)

                appt = Appointment.objects.create(
                    customer=customer,
                    stylist=stylist,
                    scheduled_at=scheduled_at,
                    duration_minutes=duration or 30,
                    created_by=request.user,
                    notes=br.notes,
                )
                appt.services.set(services)

                br.status = 'confirmed'
                br.appointment = appt
                br.reviewed_by = request.user
                br.reviewed_at = timezone.now()
                br.save()

                return Response({
                    'success': True,
                    'message': f'Appointment created for {customer.name}',
                    'data': {'appointment_id': appt.id},
                })
            else:
                return Response({'success': False, 'message': 'Unknown action'}, status=400)

        except PublicBookingRequest.DoesNotExist:
            return Response({'success': False, 'message': 'Booking request not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)
