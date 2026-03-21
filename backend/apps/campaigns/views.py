"""
Campaigns views.
Handles campaign CRUD, segment preview, and campaign execution (bulk send).
"""
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Campaign, CampaignRecipient
from .serializers import CampaignSerializer, CampaignRecipientSerializer
from .segments import get_segment_queryset, render_message


class SegmentPreviewView(APIView):
    """GET /api/campaigns/segments/preview/?segment=lapsed_60"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            segment = request.query_params.get('segment', 'all')
            qs = get_segment_queryset(segment)
            count = qs.count()
            sample_names = list(qs.values_list('name', flat=True)[:5])
            return Response({'success': True, 'data': {'count': count, 'sample_names': sample_names}})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class CampaignListView(APIView):
    """GET/POST /api/campaigns/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            campaigns = Campaign.objects.all()
            serializer = CampaignSerializer(campaigns, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def post(self, request):
        try:
            data = request.data.copy()
            serializer = CampaignSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            campaign = serializer.save(created_by=request.user)
            return Response({'success': True, 'data': CampaignSerializer(campaign).data, 'message': 'Campaign created as draft'}, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class CampaignDetailView(APIView):
    """GET /api/campaigns/{id}/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            campaign = Campaign.objects.get(pk=pk)
            serializer = CampaignSerializer(campaign)
            return Response({'success': True, 'data': serializer.data})
        except Campaign.DoesNotExist:
            return Response({'success': False, 'message': 'Not found'}, status=404)


class CampaignSendView(APIView):
    """
    POST /api/campaigns/{id}/send/
    Renders template per customer, creates CampaignRecipient rows, calls mock sender.
    Marks campaign as sent.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            campaign = Campaign.objects.get(pk=pk)
            if campaign.status == 'sent':
                return Response({'success': False, 'message': 'Campaign already sent'}, status=400)

            customers = get_segment_queryset(campaign.target_segment)
            count = 0
            failed = 0

            for customer in customers:
                try:
                    msg = render_message(campaign.message_template, customer)
                    recipient = CampaignRecipient.objects.create(
                        campaign=campaign,
                        customer=customer,
                        phone_number=customer.phone,
                        personalised_message=msg,
                        status='sent',
                    )
                    # Mock send: print to console
                    from apps.notifications.services import WhatsAppService
                    # Create a notification object for the WhatsApp mock
                    from apps.notifications.models import WhatsAppNotification
                    notif = WhatsAppNotification.objects.create(
                        customer=customer,
                        notification_type='campaign',
                        phone_number=customer.phone,
                        message_body=msg,
                        status='pending',
                        scheduled_at=timezone.now(),
                    )
                    WhatsAppService.send(notif)
                    count += 1
                except Exception as e:
                    failed += 1

            campaign.status = 'sent'
            campaign.sent_at = timezone.now()
            campaign.total_recipients = count
            campaign.save(update_fields=['status', 'sent_at', 'total_recipients'])

            return Response({
                'success': True,
                'message': f'Campaign sent to {count} customers ({failed} failed)',
                'data': CampaignSerializer(campaign).data,
            })
        except Campaign.DoesNotExist:
            return Response({'success': False, 'message': 'Campaign not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class CampaignRecipientsView(APIView):
    """GET /api/campaigns/{id}/recipients/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            campaign = Campaign.objects.get(pk=pk)
            recipients = campaign.recipients.select_related('customer').all()
            serializer = CampaignRecipientSerializer(recipients, many=True)
            return Response({'success': True, 'data': serializer.data, 'count': recipients.count()})
        except Campaign.DoesNotExist:
            return Response({'success': False, 'message': 'Not found'}, status=404)
