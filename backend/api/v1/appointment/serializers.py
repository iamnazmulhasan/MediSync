from rest_framework import serializers
from apps.personal.models import Doctor, Patient
from datetime import date
from apps.prescription.models import Appointment, Prescription  
from apps.core.models import StatusCode

class ExpectedAppointmentTimeSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    date = serializers.DateField()              #YYYY-MM-DD
    
    
class AppointmentSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    patient_id = serializers.IntegerField()
    date = serializers.DateField()              #YYYY-MM-DD
    time = serializers.TimeField()
    type = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Optional appointment type, e.g., 'Report Analysis, New Patient, Follow-up'"
    ) 
    
    
class AppointmentUpdateSerializer(serializers.ModelSerializer):
    status = serializers.PrimaryKeyRelatedField(
        queryset=StatusCode.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "doctor",
            "appointment_date",
            "time",
            "status",
            "type",
        ]
        read_only_fields = ["id", "patient", "doctor"]
    
    
class AvailableDoctorSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="person.name", read_only=True)

    class Meta:
        model = Doctor
        fields = [
            "id",
            "doctor_name",
            "department",
            "designation",
            "location",
            "education",
            "average_time",
            "appointment_fee",
            "daily_patient_limit"
        ]   


class PreviousPatientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="person.name", read_only=True)
    mobile = serializers.CharField(source="person.mobile", read_only=True)
    gender = serializers.CharField(source="person.gender", read_only=True)
    dob = serializers.DateField(source="person.dob", read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",
            "name",
            "mobile",
            "gender",
            "dob",
            "chronic_diseases",
            "active",
        ]


class DoctorAppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.person.name", read_only=True)
    patient_dob = serializers.DateField(source="patient.person.dob", read_only=True)
    appointment_status = serializers.SerializerMethodField()
    prechecked = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "time",
            "patient_name",
            "patient_dob",
            "prechecked",
            "appointment_status",
            "type",
        ]

    def get_prechecked(self, obj):
        # Prescription linked by appointment -> prescriptions
        # If multiple prescriptions exist, take latest one.
        pres = obj.prescriptions.order_by("-id").first()
        return pres.prechecked if pres else False

    def get_appointment_status(self, obj):
        """
        Convert StatusCode.name to pending/completed/cancelled.
        Customize mapping based on your stored StatusCode names.
        """
        if not obj.status_id or not obj.status:
            return "pending"

        name = (obj.status.name or "").strip().lower()

        # Adjust these if your StatusCode values differ
        if name in ["completed", "done", "visited"]:
            return "completed"
        if name in ["cancelled", "canceled"]:
            return "cancelled"

        return "pending"

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Compute age from dob
        dob = instance.patient.person.dob
        if dob:
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        else:
            age = None

        data["patient_age"] = age
        data.pop("patient_dob")  # optional: remove dob, keep only age
        return data


class DoctorAppointmentByDateSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(source="patient.id", read_only=True)
    patient_name = serializers.CharField(source="patient.person.name", read_only=True)
    patient_age = serializers.SerializerMethodField()
    status = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "time",
            "patient_id",    
            "patient_name",
            "patient_age",
            "status",
            "type",
        ]

    def get_patient_age(self, obj):
        dob = obj.patient.person.dob
        if not dob:
            return None

        today = date.today()
        return today.year - dob.year - (
            (today.month, today.day) < (dob.month, dob.day)
        )
        
    
class DoctorCancelPendingByDateSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    date = serializers.DateField()
    
    
class UpcomingAppointmentSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source="status.name", read_only=True)

    doctor_name = serializers.CharField(source="doctor.person.name", read_only=True)
    doctor_mobile = serializers.CharField(source="doctor.person.mobile", read_only=True)

    doctor_department = serializers.CharField(source="doctor.department.name", read_only=True)

    doctor_location = serializers.CharField(source="doctor.location", read_only=True)
    appointment_fee = serializers.DecimalField(
        source="doctor.appointment_fee",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "time",
            "status",
            "doctor_name",
            "doctor_mobile",
            "doctor_department",
            "doctor_location",
            "appointment_fee",
        ]
    
        
class AppointmentListSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    doctor_name = serializers.CharField(source="doctor.person.name", read_only=True)
    doctor_mobile = serializers.CharField(source="doctor.person.mobile", read_only=True)
    doctor_department = serializers.CharField(source="doctor.department.name", read_only=True)
    doctor_location = serializers.CharField(source="doctor.location", read_only=True)

    appointment_fee = serializers.DecimalField(
        source="doctor.appointment_fee",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "time",
            "status",
            "doctor_name",
            "doctor_mobile",
            "doctor_department",
            "doctor_location",
            "appointment_fee",
        ]

    def get_status(self, obj):
        return obj.status.name if obj.status else None