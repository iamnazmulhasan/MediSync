from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from api.v1.authentication.serializers import LoginSerializer
from apps.business.models import Laboratory, LaboratoryTestAvailability, Pharmacy
from apps.core.models import Test
from django.contrib.auth.hashers import make_password
from apps.personal.models import Person
from django.contrib.auth.hashers import check_password
from apps.business.models import Laboratory, Pharmacy, PharmacyMedicineAvailability
from rest_framework import status as http_status 
from .serializers import (
    SelfLabTestAvailabilityListSerializer,
    SelfLabTestAvailabilityCreateSerializer,
    PharmacyRegisterSerializer,
    PharmacySerializer,
    PharmacyUpdateSerializer,
    PharmacyMedicineAvailabilitySerializer,
    SelfPharmacyMedicineAvailabilityCreateSerializer,
    SelfPharmacyMedicineAvailabilitySerializer,
    SelfPharmacyMedicineAvailabilityPatchSerializer
) 


class SelfAvailableTestsView(APIView):
    """
    GET    /api/lab/self/tests/        -> Get Self Available Tests
    POST   /api/lab/self/tests/        -> Add Self Available Tests
    DELETE /api/lab/self/tests/{id}/   -> Remove Self Available Tests (by availability id)
    """

    def get_my_lab(self, request) -> Laboratory:
        # ✅ change this line based on your project auth structure
        try:
            return request.user.laboratory
        except AttributeError:
            return None

    # 1) Get Self Available Tests
    def get(self, request):
        lab = self.get_my_lab(request)
        if not lab:
            return Response({"detail": "Laboratory profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        qs = LaboratoryTestAvailability.objects.filter(lab=lab).select_related("test").order_by("id")
        data = SelfLabTestAvailabilityListSerializer(qs, many=True).data
        return Response(data, status=status.HTTP_200_OK)

    # 2) Add Self Available Tests
    def post(self, request):
        lab = self.get_my_lab(request)
        if not lab:
            return Response({"detail": "Laboratory profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SelfLabTestAvailabilityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        test = get_object_or_404(Test, id=serializer.validated_data["test_id"])
        price = serializer.validated_data.get("price", None)

        try:
            obj = LaboratoryTestAvailability.objects.create(lab=lab, test=test, price=price)
        except IntegrityError:
            return Response(
                {"detail": "This test is already added for your lab."},
                status=status.HTTP_409_CONFLICT
            )

        return Response(
            {
                "id": obj.id,
                "lab_id": lab.id,
                "test_id": test.id,
                "price": str(obj.price) if obj.price is not None else None,
                "message": "Test added successfully"
            },
            status=status.HTTP_201_CREATED
        )


class SelfAvailableTestRemoveView(APIView):
    """
    DELETE /api/lab/self/tests/{availability_id}/  -> Remove Self Available Tests
    """

    def get_my_lab(self, request):
        try:
            return request.user.laboratory
        except AttributeError:
            return None

    def delete(self, request, availability_id: int):
        lab = self.get_my_lab(request)
        if not lab:
            return Response({"detail": "Laboratory profile not found"}, status=status.HTTP_400_BAD_REQUEST)

        obj = get_object_or_404(LaboratoryTestAvailability, id=availability_id, lab=lab)
        obj.delete()
        return Response({"message": "Test removed successfully"}, status=status.HTTP_200_OK)
    
    
    

class PharmacyRegisterAPI(APIView):
    """
    POST /api/pharmacy/register/
    """
    def post(self, request):
        serializer = PharmacyRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(PharmacySerializer(obj).data, status=http_status.HTTP_201_CREATED)


class PharmacyLoginAPI(APIView):
    """
    POST /api/pharmacy/login/
    body: { "login": "<email-or-mobile>", "password": "..." }
    """
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login = serializer.validated_data["login"]
        password = serializer.validated_data["password"]

        ph = (
            Pharmacy.objects
            .filter(email=login).first()
            or Pharmacy.objects.filter(mobile=login).first()
        )

        if not ph or not ph.password or not check_password(password, ph.password):
            return Response({"detail": "Invalid credentials."}, status=http_status.HTTP_401_UNAUTHORIZED)

        if not ph.active:
            return Response({"detail": "Account inactive."}, status=http_status.HTTP_403_FORBIDDEN)

        return Response(
            {
                "pharmacy_id": ph.id,
                "name": ph.name,
                "email": ph.email,
                "mobile": ph.mobile,
            },
            status=http_status.HTTP_200_OK
        )
    
    
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db.models import Q

from apps.business.models import Pharmacy
from .serializers import PharmacySerializer


class PharmacyListAPI(APIView):
    """
    GET /api/pharmacies/?q=city&active=true
    """

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        active = request.query_params.get("active")  # optional: true/false

        qs = Pharmacy.objects.select_related("owner").order_by("-id")

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(email__icontains=q) |
                Q(mobile__icontains=q) |
                Q(address__icontains=q) |
                Q(owner__name__icontains=q)
            )

        if active is not None:
            v = str(active).lower().strip()
            if v in ("true", "1", "yes"):
                qs = qs.filter(active=True)
            elif v in ("false", "0", "no"):
                qs = qs.filter(active=False)

        return Response(PharmacySerializer(qs, many=True).data)

class PharmacyDetailAPI(APIView):
    """
    GET/PATCH/PUT/DELETE /api/pharmacies/<id>/
    """

    def get_object(self, pharmacy_id: int):
        return get_object_or_404(Pharmacy, pk=pharmacy_id)

    def get(self, request, pharmacy_id: int):
        obj = self.get_object(pharmacy_id)
        return Response(PharmacySerializer(obj).data)

    def patch(self, request, pharmacy_id: int):
        obj = self.get_object(pharmacy_id)
        serializer = PharmacySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(PharmacySerializer(obj).data)

    def put(self, request, pharmacy_id: int):
        obj = self.get_object(pharmacy_id)
        serializer = PharmacySerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(PharmacySerializer(obj).data)

    def delete(self, request, pharmacy_id: int):
        obj = self.get_object(pharmacy_id)
        obj.delete()
        return Response({"detail": "Pharmacy deleted successfully"}, status=http_status.HTTP_200_OK)
    
class PharmacyMeAPI(APIView):
    """
    GET/PATCH /api/pharmacy/me/<id>/
    """

    def get_object(self, pharmacy_id: int):
        return get_object_or_404(Pharmacy.objects.select_related("owner"), pk=pharmacy_id)

    def get(self, request, pharmacy_id: int):
        obj = self.get_object(pharmacy_id)
        return Response(PharmacySerializer(obj).data)

    def patch(self, request, pharmacy_id: int):
        obj = self.get_object(pharmacy_id)

        # ✅ OPTIONAL: block name update (remove if you want name editable)
        # if "name" in request.data:
        #     return Response(
        #         {"detail": "You cannot update pharmacy name."},
        #         status=http_status.HTTP_400_BAD_REQUEST
        #     )

        # ✅ OPTIONAL: block nid_of_owner attempts
        if "nid_of_owner" in request.data:
            return Response(
                {"detail": "You cannot update owner's NID."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        serializer = PharmacyUpdateSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()

        return Response(PharmacySerializer(obj).data, status=http_status.HTTP_200_OK)
    
    
class PharmacyMedicineAvailabilityListAPI(APIView):
    """
    GET /api/pharmacy/<pharmacy_id>/medicine-availability/
    Optional:
      ?q=para   (search by medicine name)
      ?in_stock=true  (only amount > 0)
    """

    def get(self, request, pharmacy_id: int):
        q = (request.query_params.get("q") or "").strip()
        in_stock = (request.query_params.get("in_stock") or "").strip().lower()

        qs = PharmacyMedicineAvailability.objects.filter(pharmacy_id=pharmacy_id).select_related(
            "medicine", "pharmacy"
        ).order_by("medicine_id")

        if q:
            qs = qs.filter(medicine__name__icontains=q)

        if in_stock in ("true", "1", "yes"):
            qs = qs.filter(amount__gt=0)

        return Response({
            "pharmacy_id": pharmacy_id,
            "count": qs.count(),
            "results": PharmacyMedicineAvailabilitySerializer(qs, many=True).data
        }, status=http_status.HTTP_200_OK)
        
        
class SelfPharmacyMedicinesAPI(APIView):
    """
    GET  /api/pharmacy/<pharmacy_id>/self/medicines/
    POST /api/pharmacy/<pharmacy_id>/self/medicines/   (add or upsert)
    """

    def get_pharmacy(self, pharmacy_id: int):
        return get_object_or_404(Pharmacy, id=pharmacy_id)

    def get(self, request, pharmacy_id: int):
        self.get_pharmacy(pharmacy_id)  # ensures pharmacy exists

        q = (request.query_params.get("q") or "").strip()
        in_stock = (request.query_params.get("in_stock") or "").strip().lower()

        qs = PharmacyMedicineAvailability.objects.filter(pharmacy_id=pharmacy_id).select_related(
            "medicine"
        ).order_by("id")

        if q:
            qs = qs.filter(medicine__name__icontains=q)

        if in_stock in ("true", "1", "yes"):
            qs = qs.filter(amount__gt=0)

        return Response(SelfPharmacyMedicineAvailabilitySerializer(qs, many=True).data, status=http_status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, pharmacy_id: int):
        """
        Add medicine to pharmacy or update if already exists (UPSERT).
        Body:
        {
          "medicine_id": 12,
          "amount": 50
        }
        """
        self.get_pharmacy(pharmacy_id)

        serializer = SelfPharmacyMedicineAvailabilityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        medicine_id = serializer.validated_data["medicine_id"]
        amount = serializer.validated_data.get("amount")

        # UPSERT (unique constraint medicine + pharmacy)
        obj, created = PharmacyMedicineAvailability.objects.get_or_create(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine_id,
            defaults={"amount": amount},
        )

        if not created:
            obj.amount = amount
            obj.save(update_fields=["amount"])

        return Response(
            {
                "created": created,
                "result": SelfPharmacyMedicineAvailabilitySerializer(obj).data
            },
            status=http_status.HTTP_201_CREATED if created else http_status.HTTP_200_OK
        )


class SelfPharmacyMedicineUpdateAPI(APIView):
    """
    PATCH /api/pharmacy/<pharmacy_id>/self/medicines/<availability_id>/
    """

    def patch(self, request, pharmacy_id: int, availability_id: int):
        obj = get_object_or_404(
            PharmacyMedicineAvailability,
            id=availability_id,
            pharmacy_id=pharmacy_id
        )

        serializer = SelfPharmacyMedicineAvailabilityPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if "amount" in serializer.validated_data:
            obj.amount = serializer.validated_data["amount"]
            obj.save(update_fields=["amount"])

        return Response(SelfPharmacyMedicineAvailabilitySerializer(obj).data, status=http_status.HTTP_200_OK)