"""Campaign serializers."""
from rest_framework import serializers
from .models import Campaign, CampaignRecipient


class CampaignRecipientSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = CampaignRecipient
        fields = ['id', 'customer', 'customer_name', 'phone_number', 'personalised_message', 'status', 'sent_at']


class CampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    failed_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'message_template', 'target_segment', 'status',
            'sent_at', 'total_recipients', 'created_by', 'created_by_name',
            'created_at', 'failed_count',
        ]

    def get_failed_count(self, obj):
        return obj.recipients.filter(status='failed').count()
