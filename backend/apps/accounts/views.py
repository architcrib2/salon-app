"""
Accounts views.
Provides /me/ endpoint for current user info and staff CRUD operations.
"""
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import StaffMember
from .serializers import StaffMemberSerializer, StaffMemberCreateSerializer, MeSerializer


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns profile info of the currently authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response({'success': True, 'data': serializer.data})


class StaffViewSet(ModelViewSet):
    """
    Staff management CRUD.
    Only owners should be able to create/update/delete staff (enforced in frontend via role check).
    """

    queryset = StaffMember.objects.filter(is_active_staff=True)
    serializer_class = StaffMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffMemberCreateSerializer
        return StaffMemberSerializer

    def list(self, request, *args, **kwargs):
        """GET /api/staff/ — list active staff members."""
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        """POST /api/staff/ — create a new staff member."""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            staff = serializer.save()
            return Response(
                {'success': True, 'data': StaffMemberSerializer(staff).data, 'message': 'Staff member created successfully'},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        """PATCH /api/staff/{id}/ — update staff details."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({'success': True, 'data': serializer.data, 'message': 'Updated successfully'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
