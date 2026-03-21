"""
Notifications views.
List/filter notifications, resend failed ones, and get stats.
"""
from datetime import date
from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WhatsAppNotification
from .serializers import NotificationSerializer
from .services import WhatsAppService


class NotificationListView(APIView):
    """GET /api/notifications/ — list with optional filters."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            qs = WhatsAppNotification.objects.select_related('customer').all()
            status_filter = request.query_params.get('status')
            type_filter = request.query_params.get('notification_type')
            date_filter = request.query_params.get('date')

            if status_filter:
                qs = qs.filter(status=status_filter)
            if type_filter:
                qs = qs.filter(notification_type=type_filter)
            if date_filter:
                qs = qs.filter(created_at__date=date_filter)

            serializer = NotificationSerializer(qs[:200], many=True)
            return Response({'success': True, 'data': serializer.data, 'count': qs.count()})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class NotificationResendView(APIView):
    """POST /api/notifications/resend/{id}/ — resend a failed notification."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = WhatsAppNotification.objects.get(pk=pk)
            notif.status = 'pending'
            notif.error_message = ''
            notif.save(update_fields=['status', 'error_message'])
            WhatsAppService.send(notif)
            return Response({'success': True, 'message': 'Notification resent successfully'})
        except WhatsAppNotification.DoesNotExist:
            return Response({'success': False, 'message': 'Notification not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class NotificationStatsView(APIView):
    """GET /api/notifications/stats/ — counts by type and status."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            today = date.today()
            by_status = WhatsAppNotification.objects.values('status').annotate(count=Count('id'))
            by_type = WhatsAppNotification.objects.values('notification_type').annotate(count=Count('id'))
            sent_today = WhatsAppNotification.objects.filter(sent_at__date=today).count()
            pending = WhatsAppNotification.objects.filter(status='pending').count()
            failed = WhatsAppNotification.objects.filter(status='failed').count()

            total = WhatsAppNotification.objects.count()
            sent = WhatsAppNotification.objects.filter(status='sent').count()
            return Response({
                'success': True,
                'data': {
                    'total': total,
                    'sent': sent,
                    'sent_today': sent_today,
                    'pending': pending,
                    'failed': failed,
                    'by_status': list(by_status),
                    'by_type': list(by_type),
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
