from rest_framework import serializers
from apps.core.models import DoctorType, CommonSymptomp, DoctorsAdvice, BusinessInformation, Medicine, MedicineGeneric, Test
from apps.transaction.models import CashOut
from apps.core.models import UserType

class DoctorTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorType
        fields = ["id", "name"]

class CommonSymptompSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommonSymptomp
        fields = ["id", "doctor_type_id", "name"]


class DoctorsAdviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorsAdvice
        fields = ["id", "doctor_type_id", "name"]


class BusinessInformationPercentagesSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessInformation
        fields = ["appointment_percentage", "laboratory_percentage", "pharmacy_percentage"]

    def validate(self, attrs):
        # Optional: ensure all percentages are between 0 and 100
        for k, v in attrs.items():
            if v is None:
                continue
            if v < 0 or v > 100:
                raise serializers.ValidationError({k: "Percentage must be between 0 and 100"})
        return attrs
    

class MedicineGenericSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineGeneric
        fields = ["id", "name"]


class MedicineSerializer(serializers.ModelSerializer):
    # read-only output
    generic_id = serializers.IntegerField(source="generic.id", read_only=True)
    generic_name = serializers.CharField(source="generic.name", read_only=True)

    # write-only input
    generic = serializers.PrimaryKeyRelatedField(
        queryset=MedicineGeneric.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Medicine
        fields = [
            "id",
            "name",
            "generic",        # input
            "generic_id",     # output
            "generic_name",   # output
            "price",
            "warnings"
        ]
        read_only_fields = ["id"]
        
              
class TestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Test
        fields = ["id", "name", "warnings"]
        
        
class CashOutSerializer(serializers.ModelSerializer):
    status_name = serializers.CharField(source="status.name", read_only=True)
    requester_type_name = serializers.CharField(source="requester_type.name", read_only=True)
    officer_type_name = serializers.CharField(source="officer_type.name", read_only=True)

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
        

class UserTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserType
        fields = ["id", "name"]