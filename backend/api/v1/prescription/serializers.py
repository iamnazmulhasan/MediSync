from django.db import transaction
from rest_framework import serializers
from apps.core.models import Test, Medicine
from apps.prescription.models import Prechecked, PrescribedMedicine, PrescribedTest, Prescription, Appointment
from django.db.models import F, Value, ExpressionWrapper, IntegerField, DateField, DurationField
from django.utils import timezone
from datetime import timedelta

class PrecheckedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prechecked
        fields = "__all__"
     
     
class PrecheckedUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prechecked
        fields = [
            "bp", "pulse", "weight", "height", "temperature", "spo2",
            "heart", "lungs", "abd", "anemia", "jaundice", "cyanosis",
            "rbs", "bmi", "bmr", "family_disease_history",
        ]
        
class ActiveMedicineTodaySerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    appointment_date = serializers.DateField(
        source="prescription.appointment.appointment_date",
        read_only=True
    )

    class Meta:
        model = PrescribedMedicine
        fields = [
            "id",
            "medicine",        # id
            "medicine_name",
            "uses_process",
            "duration",        # int days (no calculation)
            "appointment_date" # today’s appointment date
        ]
        
        
class PrescribedMedicineWriteSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    uses_process = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    duration = serializers.IntegerField(required=False, allow_null=True)


class PrescribedTestWriteSerializer(serializers.Serializer):
    test_id = serializers.IntegerField()


class PrescriptionWriteSerializer(serializers.ModelSerializer):
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), required=False, allow_null=True
    )
    prechecked_id = serializers.PrimaryKeyRelatedField(
        queryset=Prechecked.objects.all(), required=False, allow_null=True
    )

    medicines = PrescribedMedicineWriteSerializer(many=True, required=False)
    tests = PrescribedTestWriteSerializer(many=True, required=False)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "appointment",
            "dx",
            "cc",
            "prechecked",
            "prechecked_id",
            "suggestions",
            "next_visit",
            "medicines",
            "tests",
        ]
        read_only_fields = ["id"]

    def validate_medicines(self, value):
        ids = [x["medicine_id"] for x in value]
        existing = set(Medicine.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = [i for i in ids if i not in existing]
        if missing:
            raise serializers.ValidationError(f"Invalid medicine_id(s): {missing}")
        return value

    def validate_tests(self, value):
        ids = [x["test_id"] for x in value]
        existing = set(Test.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = [i for i in ids if i not in existing]
        if missing:
            raise serializers.ValidationError(f"Invalid test_id(s): {missing}")
        return value

    @transaction.atomic
    def create(self, validated_data):
        medicines_data = validated_data.pop("medicines", [])
        tests_data = validated_data.pop("tests", [])

        prescription = Prescription.objects.create(**validated_data)

        if medicines_data:
            PrescribedMedicine.objects.bulk_create([
                PrescribedMedicine(
                    prescription=prescription,
                    medicine_id=item["medicine_id"],  # FK by id
                    uses_process=item.get("uses_process"),
                    duration=item.get("duration"),
                )
                for item in medicines_data
            ])

        if tests_data:
            PrescribedTest.objects.bulk_create([
                PrescribedTest(
                    prescription=prescription,
                    test_id=item["test_id"],  # FK by id
                )
                for item in tests_data
            ])

        return prescription

    @transaction.atomic
    def update(self, instance, validated_data):
        medicines_data = validated_data.pop("medicines", None)
        tests_data = validated_data.pop("tests", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if medicines_data is not None:
            PrescribedMedicine.objects.filter(prescription=instance).delete()
            if medicines_data:
                PrescribedMedicine.objects.bulk_create([
                    PrescribedMedicine(
                        prescription=instance,
                        medicine_id=item["medicine_id"],
                        uses_process=item.get("uses_process"),
                        duration=item.get("duration"),
                    )
                    for item in medicines_data
                ])

        if tests_data is not None:
            PrescribedTest.objects.filter(prescription=instance).delete()
            if tests_data:
                PrescribedTest.objects.bulk_create([
                    PrescribedTest(
                        prescription=instance,
                        test_id=item["test_id"],
                    )
                    for item in tests_data
                ])

        return instance


# ---------- OUTPUT (read) ----------
class PrescribedMedicineReadSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    generic_name = serializers.CharField(source="medicine.generic.name", read_only=True)

    class Meta:
        model = PrescribedMedicine
        fields = ["id", "medicine", "medicine_name", "generic_name", "uses_process", "duration"]


class PrescribedTestReadSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = PrescribedTest
        fields = ["id", "test", "test_name"]


class PrescriptionReadSerializer(serializers.ModelSerializer):
    medicines = PrescribedMedicineReadSerializer(many=True, read_only=True)
    tests = PrescribedTestReadSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "appointment",
            "dx",
            "cc",
            "prechecked",
            "prechecked_id",
            "suggestions",
            "next_visit",
            "medicines",
            "tests",
        ]
        
        
class PrescribedMedicineReadSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    generic_name = serializers.CharField(source="medicine.generic.name", read_only=True)

    class Meta:
        model = PrescribedMedicine
        fields = ["id", "medicine", "medicine_name", "generic_name", "uses_process", "duration"]


class PrescribedTestReadSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = PrescribedTest
        fields = ["id", "test", "test_name"]


class PrescriptionHistorySerializer(serializers.ModelSerializer):
    # appointment info
    appointment_date = serializers.DateField(source="appointment.appointment_date", read_only=True)
    appointment_time = serializers.TimeField(source="appointment.time", read_only=True)

    doctor_id = serializers.IntegerField(source="appointment.doctor_id", read_only=True)
    doctor_name = serializers.CharField(source="appointment.doctor.person.name", read_only=True)

    patient_id = serializers.IntegerField(source="appointment.patient_id", read_only=True)
    patient_name = serializers.CharField(source="appointment.patient.person.name", read_only=True)

    medicines = PrescribedMedicineReadSerializer(many=True, read_only=True)
    tests = PrescribedTestReadSerializer(many=True, read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "appointment",          # appointment id
            "appointment_date",
            "appointment_time",
            "doctor_id",
            "doctor_name",
            "patient_id",
            "patient_name",
            "dx",
            "cc",
            "prechecked",
            "prechecked_id",
            "suggestions",
            "next_visit",
            "medicines",
            "tests",
        ]
        

from apps.prescription.models import Prescription


class PatientPrescriptionListSerializer(serializers.ModelSerializer):
    appointment_id = serializers.IntegerField(source="appointment.id", read_only=True)
    appointment_date = serializers.DateField(source="appointment.appointment_date", read_only=True)
    doctor_id = serializers.IntegerField(source="appointment.doctor.id", read_only=True)
    doctor_name = serializers.CharField(source="appointment.doctor.person.name", read_only=True)

    class Meta:
        model = Prescription
        fields = [
            "id",
            "appointment_id",
            "appointment_date",
            "doctor_id",
            "doctor_name",
            "cc",
            "dx",
            "suggestions",
            "next_visit",
        ]
        

class PrescriptionMedicineListSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_price = serializers.DecimalField(source="medicine.price", max_digits=10, decimal_places=2, read_only=True)
    generic_name = serializers.CharField(source="medicine.generic.name", read_only=True, default=None)

    class Meta:
        model = PrescribedMedicine
        fields = [
            "id",
            "medicine",         # pk
            "medicine_name",
            "generic_name",
            "medicine_price",
            "uses_process",     # using procedure
            "duration",         # int days
        ]
        
