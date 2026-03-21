"""
Accounts serializers.
Handles serialization of StaffMember for auth responses and staff management endpoints.
"""
from rest_framework import serializers
from .models import StaffMember


class StaffMemberSerializer(serializers.ModelSerializer):
    """Full staff member representation — used in staff management endpoints."""

    full_name = serializers.ReadOnlyField()

    class Meta:
        model = StaffMember
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'role', 'commission_rate', 'is_active_staff',
        ]


class StaffMemberCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new staff — handles password hashing."""

    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = StaffMember
        fields = [
            'username', 'first_name', 'last_name', 'email',
            'phone', 'role', 'commission_rate', 'password',
        ]

    def create(self, validated_data):
        """Hash password before saving."""
        password = validated_data.pop('password')
        staff = StaffMember(**validated_data)
        staff.set_password(password)
        staff.save()
        return staff


class MeSerializer(serializers.ModelSerializer):
    """Minimal current-user info returned on /api/auth/me/."""

    full_name = serializers.ReadOnlyField()

    class Meta:
        model = StaffMember
        fields = ['id', 'username', 'full_name', 'email', 'phone', 'role']
