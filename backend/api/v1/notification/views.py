from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.core.models import UserType
from apps.notification.models import Notification
from api.v1.notification.serializers import NotificationSerializer


@api_view(["POST"])
def notification_create_api(request):
    """
    POST /api/notification/
    body:
    {
      "receiver_id": 1,
      "receiver_type": 5,   # UserType id
      "details": "Your cashout is accepted"
    }
    """
    receiver_id = request.data.get("receiver_id")
    receiver_type = request.data.get("receiver_type")
    details = request.data.get("details", "")

    if receiver_id in (None, ""):
        return Response({"detail": "receiver_id is required"}, status=http_status.HTTP_400_BAD_REQUEST)

    if receiver_type in (None, ""):
        return Response({"detail": "receiver_type is required"}, status=http_status.HTTP_400_BAD_REQUEST)

    obj = Notification.objects.create(
        receiver_id=int(receiver_id),
        receiver_type=UserType.objects.get(pk=int(receiver_type)),
        details=details,
    )
    return Response(NotificationSerializer(obj).data, status=http_status.HTTP_201_CREATED)


@api_view(["GET"])
def notification_list_api(request):
    """
    GET /api/notification/?receiver_id=1&receiver_type=5&is_read=false
    """
    receiver_id = request.query_params.get("receiver_id")
    receiver_type = request.query_params.get("receiver_type")
    is_read = request.query_params.get("is_read")  # "true" / "false" optional

    qs = Notification.objects.select_related("receiver_type").order_by("-id")

    if receiver_id not in (None, ""):
        qs = qs.filter(receiver_id=int(receiver_id))

    if receiver_type not in (None, ""):
        qs = qs.filter(receiver_type_id=int(receiver_type))

    if is_read is not None:
        v = str(is_read).lower().strip()
        if v in ("true", "1", "yes"):
            qs = qs.filter(is_read=True)
        elif v in ("false", "0", "no"):
            qs = qs.filter(is_read=False)

    return Response(NotificationSerializer(qs, many=True).data)


@api_view(["POST"])
def notification_mark_read_api(request, notification_id: int):
    """
    POST /api/notification/<id>/read/
    """
    obj = Notification.objects.filter(pk=notification_id).first()
    if not obj:
        return Response({"detail": "Notification not found"}, status=http_status.HTTP_404_NOT_FOUND)

    if not obj.is_read:
        obj.is_read = True
        obj.read_at = timezone.now()
        obj.save(update_fields=["is_read", "read_at"])

    return Response(NotificationSerializer(obj).data)


from decimal import Decimal
from django.db import transaction as db_transaction
from rest_framework.exceptions import ValidationError

from apps.core.models import UserType
from apps.notification.models import Notification
from apps.transaction.models import Transaction
from apps.personal.models import Doctor, Patient
from apps.business.models import Laboratory, Pharmacy


BALANCE_MODELS = {
    "doctor": Doctor,
    "patient": Patient,
    "laboratory": Laboratory,
    "pharmacy": Pharmacy,
}


def _notify(user_id: int, user_type: UserType, details: str):
    Notification.objects.create(
        receiver_id=user_id,
        receiver_type=user_type,
        details=details,
    )


@db_transaction.atomic
def add_money_to_user(*, user_id: int, user_type: UserType, amount: Decimal, note: str = "", officer_id=None, officer_type=None):
    if amount is None or amount <= 0:
        raise ValidationError("Amount must be > 0")

    role = (user_type.name or "").lower()
    Model = BALANCE_MODELS.get(role)
    if not Model:
        raise ValidationError("This user_type cannot receive money")

    # lock row for safe update
    obj = Model.objects.select_for_update().get(pk=user_id)

    if obj.balance is None:
        obj.balance = Decimal("0.00")

    obj.balance = obj.balance + amount
    obj.save(update_fields=["balance"])

    # transaction ledger (officer -> user)
    Transaction.objects.create(
        sender_id=officer_id,
        sender_type=officer_type,
        receiver_id=user_id,
        receiver_type=user_type,
        transactor_id=officer_id,
        transactor_type=officer_type,
        amount=amount,
    )

    # notify user
    msg = f"৳{amount} added to your account."
    if note:
        msg += f" Note: {note}"
    _notify(user_id, user_type, msg)

    # notify officer (optional)
    if officer_id and officer_type:
        _notify(officer_id, officer_type, f"You added ৳{amount} to {role}#{user_id}.")

    return obj


from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.core.models import UserType


@api_view(["POST"])
def add_money_api(request):
    """
    POST /api/transaction/add-money/
    body:
    {
      "user_id": 5,
      "user_type": 1,
      "amount": "500.00",
      "note": "Top up",
      "officer_id": 1,
      "officer_type": 5
    }
    """
    user_id = request.data.get("user_id")
    user_type_id = request.data.get("user_type")
    amount = request.data.get("amount")
    note = request.data.get("note", "")

    officer_id = request.data.get("officer_id")
    officer_type_id = request.data.get("officer_type")

    if user_id in (None, ""):
        return Response({"detail": "user_id is required"}, status=http_status.HTTP_400_BAD_REQUEST)
    if user_type_id in (None, ""):
        return Response({"detail": "user_type is required"}, status=http_status.HTTP_400_BAD_REQUEST)
    if amount in (None, ""):
        return Response({"detail": "amount is required"}, status=http_status.HTTP_400_BAD_REQUEST)

    user_type = UserType.objects.get(pk=int(user_type_id))

    officer_type = None
    if officer_type_id not in (None, ""):
        officer_type = UserType.objects.get(pk=int(officer_type_id))

    obj = add_money_to_user(
        user_id=int(user_id),
        user_type=user_type,
        amount=Decimal(str(amount)),
        note=note,
        officer_id=int(officer_id) if officer_id not in (None, "") else None,
        officer_type=officer_type,
    )

    return Response(
        {
            "detail": "Money added successfully",
            "user_type": user_type.name,
            "user_id": int(user_id),
            "new_balance": str(obj.balance),
        },
        status=http_status.HTTP_200_OK,
    )
    


from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.core.models import UserType
from apps.transaction.models import Transaction
from .serializers import TransactionSerializer


@api_view(["GET"])
def user_transactions_api(request):
    """
    GET /api/transaction/user-transactions/?user_id=5&user_type=doctor
    """
    user_id = request.query_params.get("user_id")
    user_type = request.query_params.get("user_type")  # name like "doctor" OR id like "1"
    role = (request.query_params.get("role") or "any").lower()
    limit = int(request.query_params.get("limit") or 50)
    offset = int(request.query_params.get("offset") or 0)

    if not user_id:
        return Response({"detail": "user_id is required"}, status=http_status.HTTP_400_BAD_REQUEST)
    if not user_type:
        return Response({"detail": "user_type is required (name or id)"}, status=http_status.HTTP_400_BAD_REQUEST)

    # user_type can be id or name
    if str(user_type).isdigit():
        ut = UserType.objects.filter(pk=int(user_type)).first()
    else:
        ut = UserType.objects.filter(name=str(user_type).lower()).first()

    if not ut:
        return Response({"detail": "Invalid user_type"}, status=http_status.HTTP_400_BAD_REQUEST)

    uid = int(user_id)

    qs = Transaction.objects.select_related("sender_type", "receiver_type", "transactor_type").order_by("-id")

    if role == "sender":
        qs = qs.filter(sender_id=uid, sender_type=ut)
    elif role == "receiver":
        qs = qs.filter(receiver_id=uid, receiver_type=ut)
    elif role == "transactor":
        qs = qs.filter(transactor_id=uid, transactor_type=ut)
    else:
        qs = qs.filter(
            Q(sender_id=uid, sender_type=ut) |
            Q(receiver_id=uid, receiver_type=ut) |
            Q(transactor_id=uid, transactor_type=ut)
        )

    total = qs.count()
    qs = qs[offset:offset + limit]

    return Response({
        "user_id": uid,
        "user_type": ut.name,
        "role": role,
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": TransactionSerializer(qs, many=True).data
    })
    

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db.models import Q

from apps.transaction.models import CashOut
from .serializers import CashOutListSerializer


class CashOutListAPI(APIView):
    """
    GET /api/cashouts/
    Optional:
        ?status=accepted
        ?status=cancelled
        ?status=pending
        ?status=all
    """

    def get(self, request):
        status_param = (request.query_params.get("status") or "").strip().lower()

        qs = CashOut.objects.select_related(
            "requester_type",
            "officer_type",
            "status"
        ).order_by("-id")

        if status_param and status_param != "all":
            qs = qs.filter(status__name__iexact=status_param)

        return Response({
            "count": qs.count(),
            "results": CashOutListSerializer(qs, many=True).data
        }, status=http_status.HTTP_200_OK)