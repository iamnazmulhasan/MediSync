from rest_framework import serializers
from apps.notification.models import Notification
from apps.transaction.models import CashOut


class NotificationSerializer(serializers.ModelSerializer):
    receiver_type_name = serializers.CharField(source="receiver_type.name", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "created_at",
            "receiver_id",
            "receiver_type",
            "receiver_type_name",
            "details",
            "is_read",
            "read_at",
        ]
        

from apps.transaction.models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    sender_type_name = serializers.CharField(source="sender_type.name", read_only=True)
    receiver_type_name = serializers.CharField(source="receiver_type.name", read_only=True)
    transactor_type_name = serializers.CharField(source="transactor_type.name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "created_at",
            "sender_id",
            "sender_type",
            "sender_type_name",
            "receiver_id",
            "receiver_type",
            "receiver_type_name",
            "transactor_id",
            "transactor_type",
            "transactor_type_name",
            "amount",
        ]
        
class CashOutListSerializer(serializers.ModelSerializer):
    requester_type_name = serializers.CharField(source="requester_type.name", read_only=True)
    officer_type_name = serializers.CharField(source="officer_type.name", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = CashOut
        fields = [
            "id",
            "created_at",
            "requester_id",
            "requester_type",
            "requester_type_name",
            "amount",
            "status",
            "status_name",
            "officer_id",
            "officer_type",
            "officer_type_name",
            "processed_at",
            "note",
        ]