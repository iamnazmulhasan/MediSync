from rest_framework import serializers
from apps.business.models import LaboratoryTestAvailability, Test
from django.contrib.auth.hashers import make_password

from apps.personal.models import Person
from apps.business.models import Laboratory, Pharmacy, PharmacyMedicineAvailability
from apps.business.models import PharmacyMedicineAvailability
from apps.core.models import Medicine



class SelfLabTestAvailabilityListSerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source="test.id", read_only=True)
    test_name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = LaboratoryTestAvailability
        fields = ["id", "test_id", "test_name", "price"]

 
class SelfLabTestAvailabilityCreateSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
     
    
class PharmacyRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    owner = serializers.PrimaryKeyRelatedField(queryset=Person.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Pharmacy
        fields = ["id", "name", "email", "mobile", "address", "discount_percentage", "owner", "password"]

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        validated_data["password"] = make_password(raw_password)
        return super().create(validated_data)
    
class PharmacySerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True)

    class Meta:
        model = Pharmacy
        fields = [
            "id",
            "name",
            "email",
            "mobile",
            "address",
            "owner",       # owner_id
            "owner_name",
            "balance",
            "discount_percentage",
            "active",
        ]
        
class PharmacyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pharmacy
        fields = [
            "name",
            "email",
            "mobile",
            "address",
            "owner",                # optional (remove if you don't want changing owner)
            "discount_percentage",
            "active",
            "balance",
        ] 
        
class PharmacyMedicineAvailabilitySerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    generic_name = serializers.CharField(source="medicine.generic.name", read_only=True)

    class Meta:
        model = PharmacyMedicineAvailability
        fields = [
            "id",
            "pharmacy",
            "medicine",
            "medicine_name",
            "generic_name",
            "amount",
        ]
        
        
class SelfPharmacyMedicineAvailabilitySerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    generic_name = serializers.CharField(source="medicine.generic.name", read_only=True, default=None)

    class Meta:
        model = PharmacyMedicineAvailability
        fields = [
            "id",
            "pharmacy",
            "medicine",
            "medicine_name",
            "generic_name",
            "amount",
        ]


class SelfPharmacyMedicineAvailabilityCreateSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    amount = serializers.IntegerField(required=False, allow_null=True)

    def validate_medicine_id(self, value):
        if not Medicine.objects.filter(id=value).exists():
            raise serializers.ValidationError("Medicine not found.")
        return value

    def validate_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("amount cannot be negative")
        return value


class SelfPharmacyMedicineAvailabilityPatchSerializer(serializers.Serializer):
    amount = serializers.IntegerField(required=False, allow_null=True)

    def validate_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("amount cannot be negative")
        return value
    
 
 
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.business.models import Pharmacy, PharmacyMedicineAvailability
from apps.core.models import Medicine   
from .serializers import (
    SelfPharmacyMedicineAvailabilitySerializer,
    SelfPharmacyMedicineAvailabilityCreateSerializer,
    SelfPharmacyMedicineAvailabilityPatchSerializer,
)


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