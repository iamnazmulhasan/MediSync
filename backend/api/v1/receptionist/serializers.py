from rest_framework import serializers
from apps.personal.models import Receptionist, Person, DoctorOffDay
from apps.prescription.models import Appointment  


class ReceptionistSerializer(serializers.ModelSerializer):
    # maps to person.name for both read & write
    person_name = serializers.CharField(source="person.name", required=False)

    person_email = serializers.CharField(source="person.email", read_only=True)
    person_mobile = serializers.CharField(source="person.mobile", read_only=True)
    person_nid = serializers.CharField(source="person.nid", read_only=True)

    person = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Receptionist
        fields = ["id", "person", "person_name", "person_email", "person_mobile", "person_nid", "active"]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        # ✅ because of source="person.name", person_name arrives here:
        person_data = validated_data.pop("person", None)

        # update receptionist fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # update person name if provided
        if person_data and "name" in person_data and instance.person_id:
            instance.person.name = person_data["name"]
            instance.person.save(update_fields=["name"])

        return instance
    
class UpcomingAppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.person.name", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "time",
            "type",
            "doctor",
            "doctor_name",
            "status",
            "status_name",
        ]
        
        
class DoctorUpcomingAppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.person.name", read_only=True)
    patient_email = serializers.CharField(source="patient.person.email", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_date",
            "time",
            "type",
            "status",
            "status_name",
            "patient",
            "patient_name",
            "patient_email",
        ]
        

class DoctorOffDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorOffDay
        fields = ["id", "doctor", "date"]
        
