"""
Memberships views.
Handles plan management, customer membership tracking, purchase, and redemption.
"""
from datetime import date, timedelta
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MembershipPlan, CustomerMembership, MembershipRedemption
from .serializers import MembershipPlanSerializer, CustomerMembershipSerializer
from .services import MembershipService


class MembershipPlanView(APIView):
    """GET/POST /api/memberships/plans/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plans = MembershipPlan.objects.prefetch_related('services').filter(is_active=True)
            serializer = MembershipPlanSerializer(plans, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def post(self, request):
        try:
            serializer = MembershipPlanSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            plan = serializer.save()
            return Response({'success': True, 'data': MembershipPlanSerializer(plan).data, 'message': 'Plan created'}, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class MembershipPlanDetailView(APIView):
    """PATCH /api/memberships/plans/{id}/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            plan = MembershipPlan.objects.get(pk=pk)
            serializer = MembershipPlanSerializer(plan, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({'success': True, 'data': serializer.data, 'message': 'Updated'})
        except MembershipPlan.DoesNotExist:
            return Response({'success': False, 'message': 'Plan not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class CustomerMembershipView(APIView):
    """GET /api/memberships/customer/{customer_id}/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id):
        try:
            memberships = CustomerMembership.objects.filter(customer_id=customer_id).select_related('plan', 'customer')
            serializer = CustomerMembershipSerializer(memberships, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class PurchaseMembershipView(APIView):
    """POST /api/memberships/purchase/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            customer_id = request.data.get('customer_id')
            plan_id = request.data.get('plan_id')
            payment_method = request.data.get('payment_method', 'cash')

            from apps.customers.models import Customer
            customer = Customer.objects.get(pk=customer_id)
            plan = MembershipPlan.objects.get(pk=plan_id)

            membership = MembershipService.purchase(customer, plan, payment_method)
            return Response({
                'success': True,
                'data': CustomerMembershipSerializer(membership).data,
                'message': f'Membership "{plan.name}" activated for {customer.name}',
            }, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class RedeemMembershipView(APIView):
    """POST /api/memberships/redeem/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            membership_id = request.data.get('membership_id')
            appointment_id = request.data.get('appointment_id')
            service_id = request.data.get('service_id')

            from apps.appointments.models import Appointment
            from apps.services.models import Service
            membership = CustomerMembership.objects.get(pk=membership_id)
            appointment = Appointment.objects.get(pk=appointment_id)
            service = Service.objects.get(pk=service_id)

            redemption = MembershipService.redeem(membership, appointment, service, request.user)
            return Response({
                'success': True,
                'message': f'Session redeemed for {service.name}. {membership.sessions_remaining} sessions remaining.',
            }, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class ActiveMembershipsView(APIView):
    """GET /api/memberships/active/ — all active memberships."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            memberships = CustomerMembership.objects.filter(
                status='active'
            ).select_related('customer', 'plan').order_by('valid_until')
            serializer = CustomerMembershipSerializer(memberships, many=True)
            return Response({'success': True, 'data': serializer.data, 'count': memberships.count()})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class ExpiringSoonView(APIView):
    """GET /api/memberships/expiring-soon/ — memberships expiring within 7 days."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            today = date.today()
            cutoff = today + timedelta(days=7)
            memberships = CustomerMembership.objects.filter(
                valid_until__lte=cutoff,
                valid_until__gte=today,
                status='active',
            ).select_related('customer', 'plan')
            serializer = CustomerMembershipSerializer(memberships, many=True)
            return Response({'success': True, 'data': serializer.data, 'count': memberships.count()})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
