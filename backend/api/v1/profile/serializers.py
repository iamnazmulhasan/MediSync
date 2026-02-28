from rest_framework import serializers
from django.contrib.auth.hashers import make_password

from apps.business.models import (
    Laboratory, Pharmacy, PharmacyMedicineAvailability, LaboratoryTestAvailability
)
from apps.core.models import (
    BusinessInformation, UserType, StatusCode, WeekDay, Test, MedicineGeneric, Medicine
)
from apps.notification.models import Notification
from apps.personal.models import (
    Person, Patient, Doctor, DoctorAvailability, DoctorOffDay, Receptionist, Officer, DoctorAvailability, DoctorOffDay
)
from apps.prescription.models import (
    Appointment, Prescription, PrescribedMedicine, PrescribedTest, TestReport
)
from apps.transaction.models import Transaction, CashOut


# =========================================================
# PERSON
# =========================================================

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "nid", "name", "dob", "address", "email", "mobile", "gender"]
 

class PersonCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Person
        fields = ["id", "nid", "name", "dob", "address", "email", "mobile", "password", "gender"]

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)


class PersonUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["nid", "name", "dob", "address", "email", "mobile"]


# =========================================================
# PATIENT
# =========================================================

class PatientSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)

    class Meta:
        model = Patient
        fields = ["id", "person", "chronic_diseases", "balance", "active"]


class PatientCreateSerializer(serializers.ModelSerializer):
    # you link existing Person
    person_id = serializers.IntegerField(write_only=True)
 
    class Meta:
        model = Patient
        fields = ["id", "person_id", "chronic_diseases", "active"]

    def validate_person_id(self, person_id):
        if not Person.objects.filter(id=person_id).exists():
            raise serializers.ValidationError("User not found.")
        if Patient.objects.filter(person_id=person_id).exists():
            raise serializers.ValidationError("Patient profile already exists for this user.")
        return person_id

    def create(self, validated_data):
        person_id = validated_data.pop("person_id")
        return Patient.objects.create(person_id=person_id, **validated_data)


class PatientUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ["chronic_diseases", "active", "balance"]


# =========================================================
# DOCTOR
# =========================================================

class DoctorSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)

    class Meta:
        model = Doctor
        fields = [
            "id", "person", "department", "designation", "education", "location", "average_time",
            "appointment_fee", "daily_patient_limit", "balance", "active"
        ]


class DoctorCreateSerializer(serializers.ModelSerializer):
    person_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Doctor
        fields = [ 
            "id", "person_id", "department", "designation", "education", "location", "average_time",
            "appointment_fee", "daily_patient_limit"
        ]

    def validate_person_id(self, person_id):
        if not Person.objects.filter(id=person_id).exists():
            raise serializers.ValidationError("User not found.")
        if Doctor.objects.filter(person_id=person_id).exists():
            raise serializers.ValidationError("Doctor profile already exists for this user.")
        return person_id

    def create(self, validated_data):
        person_id = validated_data.pop("person_id")
        return Doctor.objects.create(person_id=person_id, **validated_data)


class DoctorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = [
            "department", "designation", "education", "location", "average_time",
            "appointment_fee", "daily_patient_limit", "active", "balance"
        ]
         
        
class DoctorOffDaySerializer(serializers.ModelSerializer):
    doctor_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = DoctorOffDay
        fields = ["id", "doctor_id", "doctor", "date"]
        read_only_fields = ["id", "doctor"]

    def validate(self, attrs):
        doctor_id = attrs.get("doctor_id")
        date = attrs.get("date")

        if doctor_id and date:
            exists = DoctorOffDay.objects.filter(doctor_id=doctor_id, date=date).exists()
            if exists:
                raise serializers.ValidationError("Off day already exists for this doctor on this date.")
        return attrs

    def create(self, validated_data):
        doctor_id = validated_data.pop("doctor_id")
        return DoctorOffDay.objects.create(doctor_id=doctor_id, **validated_data)

# =========================================================
# LABORATORY (business)
# =========================================================
 
class LaboratorySerializer(serializers.ModelSerializer):
    owner = PersonSerializer(source="owner_id", read_only=True)

    class Meta:
        model = Laboratory
        fields = ["id", "name", "email", "mobile", "owner", "balance", "active"]


class LaboratoryCreateSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Laboratory
        fields = ["id", "name", "email", "mobile", "owner_id", "password", "active"]

    def validate_owner_id(self, owner_id):
        if not Person.objects.filter(id=owner_id).exists():
            raise serializers.ValidationError("Owner person not found.")
        return owner_id

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)


class LaboratoryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Laboratory
        fields = ["name", "email", "mobile", "active", "balance"]


# =========================================================
# PHARMACY (business)
# =========================================================

class PharmacySerializer(serializers.ModelSerializer):
    owner = PersonSerializer(source="owner_id", read_only=True)

    class Meta:
        model = Pharmacy
        fields = [
            "id", "name", "email", "mobile", "address", "owner",
            "balance", "discount_percentage", "active"
        ]


class PharmacyCreateSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Pharmacy
        fields = [
            "id", "name", "email", "mobile", "address", "owner_id",
            "discount_percentage", "password", "active"
        ]

    def validate_owner_id(self, owner_id):
        if not Person.objects.filter(id=owner_id).exists():
            raise serializers.ValidationError("Owner person not found.")
        return owner_id

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)


class PharmacyUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pharmacy
        fields = ["name", "email", "mobile", "address", "discount_percentage", "active", "balance"]
# =========================================================
# RECEPTIONIST / OFFICER (personal roles)
# =========================================================

class ReceptionistSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)

    class Meta:
        model = Receptionist
        fields = ["id", "person", "active"]


class OfficerSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)

    class Meta:
        model = Officer
        fields = ["id", "person", "active"]
        
        
class DoctorAvailabilityReadSerializer(serializers.ModelSerializer):
    week_day_id = serializers.IntegerField(source="week_day.id")
    week_day = serializers.CharField(source="week_day.name")

    class Meta:
        model = DoctorAvailability
        fields = ["week_day_id", "week_day", "start_time", "end_time"]


class DoctorAvailabilityBulkItemSerializer(serializers.Serializer):
    week_day_id = serializers.IntegerField()
    start_time = serializers.TimeField(allow_null=True, required=False)
    end_time = serializers.TimeField(allow_null=True, required=False)

    def validate(self, attrs):
        start = attrs.get("start_time", None)
        end = attrs.get("end_time", None)

        if (start is None) != (end is None):
            raise serializers.ValidationError("Both start_time and end_time must be set or both null.")

        if start is not None and end is not None and start >= end:
            raise serializers.ValidationError("start_time must be earlier than end_time.")

        return attrs


class DoctorAvailabilityBulkUpdateSerializer(serializers.Serializer):
    availabilities = DoctorAvailabilityBulkItemSerializer(many=True)

    def validate_availabilities(self, items):
        seen = set()
        for it in items:
            wd = it["week_day_id"]
            if wd in seen:
                raise serializers.ValidationError(f"Duplicate week_day_id in request: {wd}")
            seen.add(wd)
        return items
   
     
class DoctorDetailSerializer(serializers.ModelSerializer):
    # Person fields
    person_id = serializers.IntegerField(source="person.id", read_only=True)
    nid = serializers.CharField(source="person.nid", read_only=True)
    name = serializers.CharField(source="person.name", read_only=True)
    gender = serializers.CharField(source="person.gender", read_only=True)
    dob = serializers.DateField(source="person.dob", read_only=True)
    address = serializers.CharField(source="person.address", read_only=True)
    email = serializers.CharField(source="person.email", read_only=True)
    mobile = serializers.CharField(source="person.mobile", read_only=True)

    # Department
    department_id = serializers.IntegerField(source="department.id", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta: 
        model = Doctor
        fields = [
            "id",                # doctor_id
            "person_id",
            "nid", "name", "gender", "dob", "address", "email", "mobile",
            "department_id", "department_name",
            "designation",
            "location",
            "education",
            "average_time",
            "appointment_fee",
            "daily_patient_limit",
            "balance",
            "active",
        ]
        

class PatientDetailSerializer(serializers.ModelSerializer):
    # Person fields
    person_id = serializers.IntegerField(source="person.id", read_only=True)
    nid = serializers.CharField(source="person.nid", read_only=True)
    name = serializers.CharField(source="person.name", read_only=True)
    gender = serializers.CharField(source="person.gender", read_only=True)
    dob = serializers.DateField(source="person.dob", read_only=True)
    address = serializers.CharField(source="person.address", read_only=True)
    email = serializers.CharField(source="person.email", read_only=True)
    mobile = serializers.CharField(source="person.mobile", read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id",                # patient_id
            "person_id",
            "nid", "name", "gender", "dob", "address", "email", "mobile",
            "chronic_diseases",
            "balance",
            "active",
        ]
        
class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ["id", "nid", "name", "gender", "dob", "address", "email", "mobile"]
        
class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    week_day_name = serializers.CharField(source="week_day.name", read_only=True)

    class Meta:
        model = DoctorAvailability
        fields = ["id", "week_day", "week_day_name", "start_time", "end_time"]
        
        
class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = [
            "id",
            "nid",
            "name",
            "gender",
            "dob",
            "address",
            "email",
            "mobile",
            "password",
        ]
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.contrib.auth.hashers import make_password

        password = validated_data.pop("password", None)
        if password:
            instance.password = make_password(password)

        return super().update(instance, validated_data)
        

class ProfileSearchResultSerializer(serializers.Serializer):
    person = serializers.DictField()
    roles = serializers.ListField(child=serializers.CharField())
    profiles = serializers.DictField()
    
    

