from rest_framework import serializers
from apps.business.models import LaboratoryTestAvailability
from django.contrib.auth.hashers import make_password
from apps.personal.models import Person
from apps.business.models import Laboratory, Pharmacy  

class LabSupportSerializer(serializers.ModelSerializer):
    lab_name = serializers.CharField(source="lab.name", read_only=True)
    lab_email = serializers.CharField(source="lab.email", read_only=True)
    lab_mobile = serializers.CharField(source="lab.mobile", read_only=True)

    test_name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = LaboratoryTestAvailability
        fields = [
            "lab", "lab_name", "lab_email", "lab_mobile",
            "test", "test_name",
            "price",
        ]
        
class LaboratoryRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    owner = serializers.PrimaryKeyRelatedField(queryset=Person.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Laboratory
        fields = ["id", "name", "email", "mobile", "owner", "password"]

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        validated_data["password"] = make_password(raw_password)
        return super().create(validated_data)

class LaboratorySerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.name", read_only=True)

    class Meta:
        model = Laboratory
        fields = [
            "id",
            "name",
            "email",
            "mobile",
            "owner",       # owner_id
            "owner_name",
            "balance",
            "active",
        ]


class LaboratoryForTestSerializer(serializers.ModelSerializer):
    lab_name = serializers.CharField(source="lab.name", read_only=True)  # adjust if lab has different field
    lab_id = serializers.IntegerField(source="lab.id", read_only=True)

    test_name = serializers.CharField(source="test.name", read_only=True)
    test_id = serializers.IntegerField(source="test.id", read_only=True)

    class Meta:
        model = LaboratoryTestAvailability
        fields = ["lab_id", "lab_name", "test_id", "test_name", "price"]
        
        
class LaboratoryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Laboratory
        fields = [
            "name",
            "email",
            "mobile",
            "owner",    # optional (can be removed if you don't want changing owner)
            "active",
            "balance",
        ]
        
        
from rest_framework import serializers
from apps.core.models import Test, StatusCode
from apps.prescription.models import PrescribedTest
from apps.business.models import LaboratoryTestAvailability
from apps.prescription.models import TestReport


# 1) Prescription -> tests list
class PrescriptionTestListSerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source="test.id", read_only=True)
    test_name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = PrescribedTest 
        fields = ["id", "test_id", "test_name"]


# 2) Confirm lab test
class ConfirmLabTestSerializer(serializers.Serializer):
    prescribed_test_id = serializers.IntegerField()
    lab_id = serializers.IntegerField()

    def validate(self, attrs):
        # existence checks happen in view with get_object_or_404
        return attrs


# 3) Update TestReport
class TestReportUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestReport
        fields = ["result", "status"]   # allow status change too (optional)


# 5) Lab availability list
class LabTestAvailabilityListSerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source="test.id", read_only=True)
    test_name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = LaboratoryTestAvailability
        fields = ["id", "lab", "test_id", "test_name", "price"]


class LabTestAvailabilityCreateSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    
class LabPatientTestReportSerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source="prescribed_test.test_id", read_only=True)
    test_name = serializers.CharField(source="prescribed_test.test.name", read_only=True)

    prescription_id = serializers.IntegerField(
        source="prescribed_test.prescription_id",
        read_only=True
    )
    appointment_id = serializers.IntegerField(
        source="prescribed_test.prescription.appointment_id",
        read_only=True
    )

    lab_id = serializers.IntegerField(source="created_by_id", read_only=True)
    lab_name = serializers.CharField(source="created_by.name", read_only=True)

    # ✅ FIXED
    status_id = serializers.IntegerField(read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = TestReport
        fields = [
            "id",
            "lab_id", "lab_name",
            "appointment_id",
            "prescription_id",
            "test_id", "test_name",
            "result",
            "status_id", "status_name",
        ]