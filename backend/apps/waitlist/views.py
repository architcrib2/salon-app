"""
Waitlist views.
today/ endpoint has no auth (for display screens).
All mutation endpoints require auth.
"""
from datetime import date
from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import WaitlistEntry
from .serializers import WaitlistEntrySerializer


class WaitlistTodayView(APIView):
    """
    GET /api/waitlist/today/ — NO AUTH REQUIRED.
    Returns all entries for today ordered by position, for the display screen.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            today = date.today()
            entries = WaitlistEntry.objects.filter(
                added_at__date=today
            ).prefetch_related('requested_services').select_related('customer', 'preferred_stylist').order_by('position', 'added_at')
            serializer = WaitlistEntrySerializer(entries, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class WaitlistCreateView(APIView):
    """POST /api/waitlist/ — add entry to queue."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = WaitlistEntrySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            entry = serializer.save()
            return Response({
                'success': True,
                'data': WaitlistEntrySerializer(entry).data,
                'message': f'Added to queue at position {entry.position}',
            }, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class WaitlistStatusUpdateView(APIView):
    """PATCH /api/waitlist/{id}/status/ — update entry status."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            entry = WaitlistEntry.objects.get(pk=pk)
            new_status = request.data.get('status')
            if new_status not in dict(WaitlistEntry.STATUS_CHOICES):
                return Response({'success': False, 'message': 'Invalid status'}, status=400)
            entry.status = new_status
            entry.save()
            return Response({'success': True, 'data': WaitlistEntrySerializer(entry).data, 'message': 'Status updated'})
        except WaitlistEntry.DoesNotExist:
            return Response({'success': False, 'message': 'Entry not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class WaitlistDeleteView(APIView):
    """DELETE /api/waitlist/{id}/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            entry = WaitlistEntry.objects.get(pk=pk)
            entry.delete()
            WaitlistEntry.recalculate_queue()
            return Response({'success': True, 'message': 'Removed from queue'})
        except WaitlistEntry.DoesNotExist:
            return Response({'success': False, 'message': 'Entry not found'}, status=404)


class WaitlistStatsView(APIView):
    """GET /api/waitlist/stats/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            today = date.today()
            today_entries = WaitlistEntry.objects.filter(added_at__date=today)
            currently_waiting = today_entries.filter(status='waiting').count()
            total_served = today_entries.filter(status='done').count()

            # Average wait = avg time from added_at to called_at for done entries today
            from django.db.models import F, ExpressionWrapper, fields as db_fields
            done_with_times = today_entries.filter(status='done', called_at__isnull=False)
            avg_wait = 0
            if done_with_times.exists():
                total_wait_mins = sum(
                    (e.called_at - e.added_at).seconds // 60
                    for e in done_with_times
                    if e.called_at and e.added_at
                )
                avg_wait = total_wait_mins // max(done_with_times.count(), 1)

            return Response({
                'success': True,
                'data': {
                    'currently_waiting': currently_waiting,
                    'avg_wait_today': avg_wait,
                    'total_served_today': total_served,
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
