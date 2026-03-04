from django.db.models import Q
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import status as http_status
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from apps.core.models import StatusCode, DoctorType, CommonSymptomp, DoctorsAdvice, BusinessInformation, Medicine, MedicineGeneric, Test, UserType
from rest_framework.response import Response
from rest_framework import status as http_status
from rest_framework.response import Response
from apps.personal.models import Patient, Doctor, Receptionist, Officer
from apps.business.models import Laboratory, Pharmacy
from apps.core.models import MedicineGeneric, Medicine
from apps.business.models import Test 
from apps.core.models import MedicineGeneric
from .serializers import MedicineGenericSerializer
from rest_framework.response import Response
from rest_framework import status as http_status
from apps.personal.models import Person, Patient, Doctor, Officer, Receptionist
from apps.business.models import Laboratory, Pharmacy
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.personal.models import Doctor, Patient
from apps.business.models import Laboratory, Pharmacy
from apps.notification.models import Notification
from apps.transaction.models import CashOut, Transaction
from api.v1.profile.serializers import PersonUpdateSerializer, PersonSerializer
from api.v1.profile.serializers import PatientUpdateSerializer, PatientSerializer
from api.v1.profile.serializers import DoctorUpdateSerializer, DoctorSerializer
from api.v1.profile.serializers import OfficerSerializer, ReceptionistSerializer
from api.v1.laboratory.serializers import LaboratoryUpdateSerializer, LaboratorySerializer
from api.v1.pharmacy.serializers import PharmacyUpdateSerializer, PharmacySerializer
from .serializers import (
    DoctorTypeSerializer,
    CommonSymptompSerializer,
    DoctorsAdviceSerializer,
    BusinessInformationPercentagesSerializer,
    MedicineSerializer,
    MedicineGenericSerializer,
    TestSerializer,
    CashOutSerializer
)

class DoctorTypeListView(generics.ListAPIView):
    queryset = DoctorType.objects.all().order_by("id")
    serializer_class = DoctorTypeSerializer


class CommonSymptompByDoctorTypeView(generics.ListAPIView):
    serializer_class = CommonSymptompSerializer

    def get_queryset(self):
        doctor_type_id = self.kwargs["doctor_type_id"]
        return CommonSymptomp.objects.filter(doctor_type_id=doctor_type_id).order_by("id")


class DoctorsAdviceByDoctorTypeView(generics.ListAPIView):
    serializer_class = DoctorsAdviceSerializer

    def get_queryset(self):
        doctor_type_id = self.kwargs["doctor_type_id"]
        return DoctorsAdvice.objects.filter(doctor_type_id=doctor_type_id).order_by("id")

    
class BusinessPercentagesView(APIView):
    """
    GET  /api/business/percentages/   -> returns 3 percentages
    PATCH /api/business/percentages/  -> updates any subset
    """

    def get_object(self):
        obj = BusinessInformation.objects.order_by("-id").first()
        if not obj:
            # auto-create if missing
            obj = BusinessInformation.objects.create()
        return obj

    def get(self, request):
        obj = self.get_object()
        serializer = BusinessInformationPercentagesSerializer(obj)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        obj = self.get_object()
        serializer = BusinessInformationPercentagesSerializer(
            obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    

# 1) API: list all generics
class MedicineGenericListView(generics.ListCreateAPIView):
    queryset = MedicineGeneric.objects.all().order_by("name")
    serializer_class = MedicineGenericSerializer


# 2) API: list medicines for a specific generic_id
class MedicinesByGenericView(generics.ListAPIView):
    serializer_class = MedicineSerializer

    def get_queryset(self):
        generic_id = self.kwargs["generic_id"]
        # validate generic exists (nice error instead of empty list)
        get_object_or_404(MedicineGeneric, id=generic_id)
        return Medicine.objects.filter(generic_id=generic_id).order_by("name")
    
    
@api_view(["GET"])
def test_list(request):
    tests = Test.objects.all()
    serializer = TestSerializer(tests, many=True)
    return Response(serializer.data)    
    

class MedicineCreateAPI(APIView):
    """
    GET  api/core/medicines/     → list all medicines
    POST api/core/medicines/     → create new medicine
    """
    def get(self, request):
        medicines = Medicine.objects.select_related("generic").all().order_by("id")
        serializer = MedicineSerializer(medicines, many=True)
        return Response(serializer.data, status=http_status.HTTP_200_OK)
    
    def post(self, request):
        serializer = MedicineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(MedicineSerializer(obj).data, status=http_status.HTTP_201_CREATED)


class MedicineDetailAPI(APIView):
    """
    GET    api/core/medicines/<id>/
    PATCH  api/core/medicines/<id>/
    PUT    api/core/medicines/<id>/
    DELETE api/core/medicines/<id>/
    """

    def get_object(self, pk):
        return get_object_or_404(Medicine.objects.select_related("generic"), pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(MedicineSerializer(obj).data, status=http_status.HTTP_200_OK)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = MedicineSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        obj = Medicine.objects.select_related("generic").get(pk=obj.pk)  # refresh
        return Response(MedicineSerializer(obj).data, status=http_status.HTTP_200_OK)

    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = MedicineSerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        obj = Medicine.objects.select_related("generic").get(pk=obj.pk)  # refresh
        return Response(MedicineSerializer(obj).data, status=http_status.HTTP_200_OK)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)
    
    
class TestAPI(APIView):
    """
    GET  /api/core/tests/?q=blood
    POST /api/core/tests/
    """

    def get(self, request):
        """
        List all tests
        Optional search: ?q=
        """
        q = (request.query_params.get("q") or "").strip()

        qs = Test.objects.all().order_by("id")

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(warnings__icontains=q)
            )

        serializer = TestSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create new test
        """
        serializer = TestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # prevent duplicate name (case-insensitive)
        name = serializer.validated_data.get("name")
        if name and Test.objects.filter(name__iexact=name).exists():
            return Response(
                {"detail": "Test with this name already exists"},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        obj = serializer.save()
        return Response(TestSerializer(obj).data, status=http_status.HTTP_201_CREATED)


class TestDetailAPI(APIView):
    """
    GET    /api/core/tests/<id>/
    PATCH  /api/core/tests/<id>/
    PUT    /api/core/tests/<id>/
    DELETE /api/core/tests/<id>/
    """
    def get_object(self, pk):
        return get_object_or_404(Test, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(TestSerializer(obj).data, status=http_status.HTTP_200_OK)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = TestSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(TestSerializer(obj).data, status=http_status.HTTP_200_OK)

    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = TestSerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(TestSerializer(obj).data, status=http_status.HTTP_200_OK)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)
    
    
@api_view(["GET"])
def lab_tests_list_api(request):
    qs = Test.objects.all().order_by("id")
    serializer = TestSerializer(qs, many=True)
    return Response(serializer.data)



REQUESTER_MODELS = {
    "doctor": Doctor,
    "patient": Patient,
    "laboratory": Laboratory,
    "pharmacy": Pharmacy,
}

def get_status(name: str):
    return StatusCode.objects.get(name=name.lower())

def notify(receiver_id, receiver_type, details: str):
    Notification.objects.create(
        receiver_id=receiver_id,
        receiver_type=receiver_type,
        details=details,
    )

def lock_requester(user_type_name: str, user_id: int):
    Model = REQUESTER_MODELS.get((user_type_name or "").lower())
    if not Model:
        raise ValidationError(f"Invalid requester type: {user_type_name}")
    return Model.objects.select_for_update().get(pk=user_id)

@transaction.atomic
def create_cashout_request(*, requester_id: int, requester_type, amount: Decimal, note=None):
    if amount is None or amount <= 0:
        raise ValidationError("Amount must be greater than 0")

    requester = lock_requester(requester_type.name, requester_id)
 
    if requester.balance is None or requester.balance < amount:
        raise ValidationError("Insufficient balance")

    # # deduct immediately
    # requester.balance = requester.balance - amount
    requester.save(update_fields=["balance"])

    req = CashOut.objects.create(
        requester_id=requester_id,
        requester_type=requester_type,
        amount=amount,
        status=get_status("pending"),
        note=note,
    )

    # # optional ledger record
    # Transaction.objects.create(
    #     sender_id=requester_id,
    #     sender_type=requester_type,
    #     receiver_id=None,
    #     receiver_type=None,
    #     transactor_id=requester_id,
    #     transactor_type=requester_type,
    #     amount=amount,
    # )

    notify(requester_id, requester_type, f"Cash-out request #{req.pk} created (pending).")
    return req

@transaction.atomic
def accept_cashout_request(*, request_id: int, officer_id: int, officer_type):
    req = CashOut.objects.select_for_update().select_related("status", "requester_type").get(pk=request_id)

    if req.status is None or req.status.name != "pending":
        raise ValidationError("Only pending requests can be accepted")

    req.status = get_status("accepted")
    req.officer_id = officer_id
    req.officer_type = officer_type
    req.processed_at = timezone.now()
    req.save(update_fields=["status", "officer_id", "officer_type", "processed_at"])

    # ✅ CREATE TRANSACTION HERE
    Transaction.objects.create(
        sender_id=req.requester_id,
        sender_type=req.requester_type,
        receiver_id=None,  # platform or external bank
        receiver_type=None,
        transactor_id=officer_id,
        transactor_type=officer_type,
        amount=req.amount,
    )

    notify(req.requester_id, req.requester_type, f"Your cash-out request #{req.pk} has been accepted.")
    notify(officer_id, officer_type, f"You accepted cash-out request #{req.pk} (amount {req.amount}).")

    return req

@transaction.atomic
def cancel_cashout_request(*, request_id: int, officer_id: int, officer_type, reason=None):
    req = CashOut.objects.select_for_update().select_related("status", "requester_type").get(pk=request_id)

    if req.status is None or req.status.name != "pending":
        raise ValidationError("Only pending requests can be cancelled")

    requester = lock_requester(req.requester_type.name, req.requester_id)

    requester.balance = requester.balance + req.amount
    requester.save(update_fields=["balance"])

    req.status = get_status("cancelled")
    req.officer_id = officer_id
    req.officer_type = officer_type
    req.processed_at = timezone.now()
    if reason:
        req.note = reason
    req.save(update_fields=["status", "officer_id", "officer_type", "processed_at", "note"])

    notify(req.requester_id, req.requester_type, f"Your cash-out request #{req.pk} was cancelled. Money refunded.")
    notify(officer_id, officer_type, f"You cancelled cash-out request #{req.pk} (refunded {req.amount}).")

    return req


@api_view(["POST"])
def cashout_create_api(request):
    # body: { "requester_id": 1, "requester_type": 2, "amount": "500.00", "note": "..." }
    requester_id = int(request.data.get("requester_id"))
    requester_type = UserType.objects.get(pk=int(request.data.get("requester_type")))
    amount = Decimal(str(request.data.get("amount")))
    note = request.data.get("note")

    req = create_cashout_request(
        requester_id=requester_id,
        requester_type=requester_type,
        amount=amount, 
        note=note,
    ) 
    return Response(CashOutSerializer(req).data, status=status.HTTP_201_CREATED)

@api_view(["GET"])
def cashout_pending_list_api(request):
    pending = StatusCode.objects.get(name="pending")
    qs = (
        CashOut.objects
        .select_related("status", "requester_type")
        .filter(status=pending)
        .order_by("-id")
    )
    return Response(CashOutSerializer(qs, many=True).data)

@api_view(["POST"])
def cashout_accept_api(request, request_id):
    # body: { "officer_id": 10, "officer_type": 5 }
    officer_id = int(request.data.get("officer_id"))
    officer_type = UserType.objects.get(pk=int(request.data.get("officer_type")))

    req = accept_cashout_request(
        request_id=int(request_id),
        officer_id=officer_id,
        officer_type=officer_type,
    )   
    return Response(CashOutSerializer(req).data)

@api_view(["POST"])
def cashout_cancel_api(request, request_id):
    # body: { "officer_id": 10, "officer_type": 5, "reason": "..." }
    officer_id = int(request.data.get("officer_id"))
    officer_type = UserType.objects.get(pk=int(request.data.get("officer_type")))
    reason = request.data.get("reason")

    req = cancel_cashout_request(
        request_id=int(request_id),
        officer_id=officer_id,
        officer_type=officer_type,
        reason=reason,
    )
    return Response(CashOutSerializer(req).data)


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import UserType
from api.v1.core.serializers import UserTypeSerializer


@api_view(["GET"])
def user_type_list_api(request):
    """
    GET /api/core/user-types/
    """
    qs = UserType.objects.all().order_by("id")
    serializer = UserTypeSerializer(qs, many=True)
    return Response(serializer.data)





@api_view(["GET", "POST"])
def medicine_generic_list_create_api(request):
    """
    GET  /api/core/medicine-generic/?q=para
    POST /api/core/medicine-generic/
      body: { "name": "Paracetamol" }
    """

    if request.method == "GET":
        q = (request.query_params.get("q") or "").strip()
        qs = MedicineGeneric.objects.all().order_by("name")
        if q:
            qs = qs.filter(name__icontains=q)
        return Response(MedicineGenericSerializer(qs, many=True).data)

    # POST
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"detail": "name is required"}, status=http_status.HTTP_400_BAD_REQUEST)

    # prevent duplicates (case-insensitive)
    obj = MedicineGeneric.objects.filter(name__iexact=name).first()
    if obj:
        return Response(MedicineGenericSerializer(obj).data, status=http_status.HTTP_200_OK)

    obj = MedicineGeneric.objects.create(name=name)
    return Response(MedicineGenericSerializer(obj).data, status=http_status.HTTP_201_CREATED)




@api_view(["GET"])
def dashboard_counts_api(request):
    """
    GET /api/core/dashboard-counts/
    """
    data = {
        "patients": Patient.objects.count(),
        "doctors": Doctor.objects.count(),
        "laboratories": Laboratory.objects.count(),
        "pharmacies": Pharmacy.objects.count(),
        "tests": Test.objects.count(),
        "medicine_generics": MedicineGeneric.objects.count(),
        "medicines": Medicine.objects.count(),

        # optional (remove if not needed)
        "receptionists": Receptionist.objects.count(),
        "officers": Officer.objects.count(),
    }
    return Response(data)



TYPE_CONFIG = {
    "person": {
        "model": Person,
        "serializer": PersonSerializer,
        "update_serializer": PersonUpdateSerializer,
        "select_related": None,
        "search_fields": ["name", "email", "mobile", "nid"],
        "has_active": False,
    },
    "patient": {
        "model": Patient,
        "serializer": PatientSerializer,
        "update_serializer": PatientUpdateSerializer,
        "select_related": "person",
        "search_fields": ["person__name", "person__email", "person__mobile", "person__nid"],
        "has_active": True,
    },
    "doctor": {
        "model": Doctor,
        "serializer": DoctorSerializer,
        "update_serializer": DoctorUpdateSerializer,
        "select_related": "person",
        "search_fields": ["person__name", "person__email", "person__mobile", "person__nid"],
        "has_active": True,
    },
    "laboratory": {
        "model": Laboratory,
        "serializer": LaboratorySerializer,
        "update_serializer": LaboratoryUpdateSerializer,
        "select_related": "owner",
        "search_fields": ["name", "email", "mobile"],
        "has_active": True,
    },
    "pharmacy": {
        "model": Pharmacy,
        "serializer": PharmacySerializer,
        "update_serializer": PharmacyUpdateSerializer,
        "select_related": "owner",
        "search_fields": ["name", "email", "mobile", "address"],
        "has_active": True,
    },
    "officer": {
        "model": Officer,
        "serializer": OfficerSerializer,
        "update_serializer": OfficerSerializer,   # uses custom update
        "select_related": "person",
        "search_fields": ["person__name", "person__email", "person__mobile", "person__nid"],
        "has_active": True,
    },
    "receptionist": {
        "model": Receptionist,
        "serializer": ReceptionistSerializer,
        "update_serializer": ReceptionistSerializer,  # uses custom update
        "select_related": "person",
        "search_fields": ["person__name", "person__email", "person__mobile", "person__nid"],
        "has_active": True,
    },
}


@api_view(["GET"])
def profile_list_any_type_api(request):
    """
    GET /api/core/profile/all/?type=doctor&q=rahim&active=true
    """
    t = (request.query_params.get("type") or "").strip().lower()
    q = (request.query_params.get("q") or "").strip()
    active = request.query_params.get("active")

    if not t:
        return Response({"detail": "type is required"}, status=http_status.HTTP_400_BAD_REQUEST)

    cfg = TYPE_CONFIG.get(t)
    if not cfg:
        return Response({"detail": "Invalid type"}, status=http_status.HTTP_400_BAD_REQUEST)

    Model = cfg["model"]
    Serializer = cfg["serializer"]

    qs = Model.objects.all().order_by("-id")

    if cfg["select_related"]:
        qs = qs.select_related(cfg["select_related"])

    # search
    if q:
        cond = Q()
        for f in cfg["search_fields"]:
            cond |= Q(**{f"{f}__icontains": q})
        qs = qs.filter(cond)

    # active filter
    if active is not None and cfg["has_active"]:
        v = str(active).lower().strip()
        if v in ("true", "1", "yes"):
            qs = qs.filter(active=True)
        elif v in ("false", "0", "no"):
            qs = qs.filter(active=False)

    return Response({
        "type": t,
        "count": qs.count(),
        "results": Serializer(qs, many=True).data
    })


@api_view(["PATCH"])
def profile_update_any_type_api(request):
    """
    PATCH /api/core/profile/update/
    body:
    {
      "type": "doctor",
      "id": 5,
      "data": { ... }
    }
    """
    t = (request.data.get("type") or "").strip().lower()
    obj_id = request.data.get("id")
    data = request.data.get("data") or {}

    if not t or not obj_id:
        return Response({"detail": "type and id are required"}, status=http_status.HTTP_400_BAD_REQUEST)

    cfg = TYPE_CONFIG.get(t)
    if not cfg:
        return Response({"detail": "Invalid type"}, status=http_status.HTTP_400_BAD_REQUEST)

    Model = cfg["model"]
    UpdateSerializer = cfg["update_serializer"]

    obj = get_object_or_404(Model, pk=int(obj_id))

    # ✅ Special case: update nested person for doctor/patient via normal update serializer
    # If you want nested person updates for doctor/patient too,
    # do it manually here:
    if t in ("doctor", "patient") and "person" in data:
        person_data = data.pop("person") or {}
        ps = PersonUpdateSerializer(obj.person, data=person_data, partial=True)
        ps.is_valid(raise_exception=True)
        ps.save()

    serializer = UpdateSerializer(obj, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    obj = serializer.save()

    # return full updated output using read serializer
    out = cfg["serializer"](obj).data
    return Response({"detail": "Updated successfully", "result": out})