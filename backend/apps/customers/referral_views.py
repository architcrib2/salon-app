"""
Referral programme views.
Provides per-customer referral info and overall referral analytics.
"""
from django.db.models import Count, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Customer


class CustomerReferralView(APIView):
    """
    GET /api/referrals/customer/{id}/
    Returns customer's referral code + list of customers they referred.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id):
        try:
            customer = Customer.objects.get(pk=customer_id)
            referrals = Customer.objects.filter(referred_by=customer).values(
                'id', 'name', 'phone', 'created_at', 'loyalty_points'
            )
            return Response({
                'success': True,
                'data': {
                    'referral_code': customer.referral_code,
                    'referral_points_earned': customer.referral_points_earned,
                    'referrals': list(referrals),
                    'total_referrals': len(referrals),
                },
            })
        except Customer.DoesNotExist:
            return Response({'success': False, 'message': 'Customer not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class ReferralStatsView(APIView):
    """
    GET /api/referrals/stats/
    Aggregate referral stats for the analytics dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            total_referrals = Customer.objects.filter(referred_by__isnull=False).count()
            top_referrers = (
                Customer.objects
                .annotate(ref_count=Count('referrals'))
                .filter(ref_count__gt=0)
                .order_by('-ref_count')[:5]
                .values('id', 'name', 'phone', 'ref_count', 'referral_points_earned')
            )
            return Response({
                'success': True,
                'data': {
                    'total_referred_customers': total_referrals,
                    'top_referrers': list(top_referrers),
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
