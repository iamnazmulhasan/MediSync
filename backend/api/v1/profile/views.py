from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.contrib.auth.hashers import check_password
from apps.core.models import WeekDay
from datetime import time
from rest_framework.decorators import api_view

from apps.personal.models import (
    Person, 
    Patient, 
    Doctor, 
    Receptionist, 
    Officer, 
    DoctorOffDay,
    DoctorAvailability,
)
from apps.business.models import Laboratory, Pharmacy
from api.v1.profile.serializers import (
    # response serializers
    PersonSerializer,
    PatientSerializer,
    DoctorSerializer,
    PharmacySerializer,
    LaboratorySerializer,
    ReceptionistSerializer,
    OfficerSerializer,
    # update serializers
    PersonUpdateSerializer,
    PatientUpdateSerializer,
    DoctorUpdateSerializer,
    PharmacyUpdateSerializer,
    LaboratoryUpdateSerializer,
    # 
    PersonCreateSerializer,
    PatientCreateSerializer,
    DoctorCreateSerializer,
    PharmacyCreateSerializer,
    LaboratoryCreateSerializer,
    
    DoctorOffDaySerializer,
    DoctorAvailabilityReadSerializer,
    DoctorAvailabilityBulkUpdateSerializer,
    
    DoctorDetailSerializer,
    PatientDetailSerializer,
)

class ProfileCreateView(APIView):
    """
    POST /profile/
    {
      "type": "user|patient|doctor|laboratory|pharmacy",
      "data": { ... }
    }

    Notes: 
    - user: creates Person
    - patient/doctor: requires person_id (existing Person)
    - laboratory/pharmacy: requires owner_id (existing Person)
    """
    permission_classes = []  # AllowAny

    def post(self, request):
        user_type = (request.data.get("type") or "").strip().lower()
        data = request.data.get("data") or {}

        if not user_type:
            return Response(
                {"error": "type is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(data, dict):
            return Response(
                {"error": "data must be an object"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # -----------------------
        # USER (Person)
        # ----------------------- 
        if user_type == "user":
            serializer = PersonCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            person = serializer.save()
            return Response(
                {"user": PersonSerializer(person).data},
                status=status.HTTP_201_CREATED
            )

        # -----------------------
        # PATIENT
        # -----------------------
        if user_type == "patient":
            # expects: person_id, chronic_diseases?, active?
            serializer = PatientCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            patient = serializer.save()
            return Response(
                {"patient": PatientSerializer(patient).data},
                status=status.HTTP_201_CREATED
            )

        # -----------------------
        # DOCTOR
        # -----------------------
        if user_type == "doctor":
            # expects: person_id, department, designation, ...
            serializer = DoctorCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            doctor = serializer.save()

            # ✅ Default availability: 09:00 AM – 09:00 PM for all weekdays
            default_start_time = time(9, 0)   # 09:00 AM
            default_end_time = time(21, 0)    # 09:00 PM

            weekdays = WeekDay.objects.all().order_by("id")

            DoctorAvailability.objects.bulk_create(
                [
                    DoctorAvailability(
                        doctor=doctor,
                        week_day=wd,
                        start_time=default_start_time,
                        end_time=default_end_time,
                    )
                    for wd in weekdays
                ],
                ignore_conflicts=True,
            )

            return Response(
                {"doctor": DoctorSerializer(doctor).data},
                status=status.HTTP_201_CREATED
            )

        # -----------------------
        # LABORATORY
        # -----------------------
        if user_type == "laboratory":
            # expects: owner_id, name, email, mobile, password, active?
            serializer = LaboratoryCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            lab = serializer.save()
            
            # Hotfix: map the int field to object instance to avoid Serializer crashes
            if isinstance(getattr(lab, 'owner_id', None), int):
                lab.owner_id = Person.objects.filter(id=lab.owner_id).first()
                
            return Response(
                {"laboratory": LaboratorySerializer(lab).data},
                status=status.HTTP_201_CREATED
            )

        # -----------------------
        # PHARMACY
        # -----------------------
        if user_type == "pharmacy":
            # expects: owner_id, name, email, mobile, password, address?, discount_percentage?, active?
            serializer = PharmacyCreateSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            pharmacy = serializer.save()
            
            # Hotfix: map the int field to object instance to avoid Serializer crashes
            if isinstance(getattr(pharmacy, 'owner_id', None), int):
                pharmacy.owner_id = Person.objects.filter(id=pharmacy.owner_id).first()
                
            return Response(
                {"pharmacy": PharmacySerializer(pharmacy).data},
                status=status.HTTP_201_CREATED
            )

        return Response(
            {"error": "Invalid User Type"},
            status=status.HTTP_400_BAD_REQUEST
        )
        

class CheckAvailableProfileView(APIView):
    """
    GET api/profile/available-profile/?type=patient&email=adnj@gmail.com

    Response:
      { "exists": false } 200
    OR
      { "exists": true, "<type>": <object> } 200

    Note: GET should use query params, not JSON body.
    """
    permission_classes = []  # AllowAny (or IsAuthenticated if you want)

    def get(self, request):
        profile_type = (request.query_params.get("type") or "").strip().lower()
        email = (request.query_params.get("email") or "").strip().lower()

        allowed = {"user", "patient", "doctor", "pharmacy", "laboratory", "receptionist", "officer"}

        if not profile_type:
            return Response({"error": "type is required"}, status=status.HTTP_400_BAD_REQUEST)

        if profile_type not in allowed:
            return Response({"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST)

        if not email:
            return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

        person = Person.objects.filter(email=email).first()
 
        # If no Person exists, then only "laboratory" or "pharmacy" might still exist,
        # because those tables have their own email fields.
        if not person:
            if profile_type == "laboratory":
                lab = Laboratory.objects.filter(email=email).first()
                if not lab:
                    return Response({"exists": False}, status=status.HTTP_200_OK)
                if isinstance(getattr(lab, 'owner_id', None), int):
                    lab.owner_id = Person.objects.filter(id=lab.owner_id).first()
                return Response({"exists": True, "laboratory": LaboratorySerializer(lab).data}, status=status.HTTP_200_OK)

            if profile_type == "pharmacy":
                pharmacy = Pharmacy.objects.filter(email=email).first()
                if not pharmacy:
                    return Response({"exists": False}, status=status.HTTP_200_OK)
                if isinstance(getattr(pharmacy, 'owner_id', None), int):
                    pharmacy.owner_id = Person.objects.filter(id=pharmacy.owner_id).first()
                return Response({"exists": True, "pharmacy": PharmacySerializer(pharmacy).data}, status=status.HTTP_200_OK)

            # user/patient/doctor/receptionist/officer depend on Person
            return Response({"exists": False}, status=status.HTTP_200_OK)

        # type=user means: does Person exist?
        if profile_type == "user":
            return Response(
                {"exists": True, "user": PersonSerializer(person).data},
                status=status.HTTP_200_OK
            )

        if profile_type == "patient":
            patient = Patient.objects.filter(person=person).first()
            if not patient:
                return Response({"exists": False}, status=status.HTTP_200_OK)
            return Response({"exists": True, "patient": PatientSerializer(patient).data}, status=status.HTTP_200_OK)

        if profile_type == "doctor":
            doctor = Doctor.objects.filter(person=person).first()
            if not doctor:
                return Response({"exists": False}, status=status.HTTP_200_OK)
            return Response({"exists": True, "doctor": DoctorSerializer(doctor).data}, status=status.HTTP_200_OK)

        if profile_type == "receptionist":
            receptionist = Receptionist.objects.filter(person=person).first()
            if not receptionist:
                return Response({"exists": False}, status=status.HTTP_200_OK)
            return Response({"exists": True, "receptionist": ReceptionistSerializer(receptionist).data}, status=status.HTTP_200_OK)

        if profile_type == "officer":
            officer = Officer.objects.filter(person=person).first()
            if not officer:
                return Response({"exists": False}, status=status.HTTP_200_OK)
            return Response({"exists": True, "officer": OfficerSerializer(officer).data}, status=status.HTTP_200_OK)

        # business profiles tied to person too (optional behavior)
        if profile_type == "laboratory":
            lab = Laboratory.objects.filter(owner_id=person.id).first() or Laboratory.objects.filter(email=email).first()
            if not lab:
                return Response({"exists": False}, status=status.HTTP_200_OK)
            if isinstance(getattr(lab, 'owner_id', None), int):
                lab.owner_id = Person.objects.filter(id=lab.owner_id).first()
            return Response({"exists": True, "laboratory": LaboratorySerializer(lab).data}, status=status.HTTP_200_OK)

        if profile_type == "pharmacy":
            pharmacy = Pharmacy.objects.filter(owner_id=person.id).first() or Pharmacy.objects.filter(email=email).first()
            if not pharmacy:
                return Response({"exists": False}, status=status.HTTP_200_OK)
            if isinstance(getattr(pharmacy, 'owner_id', None), int):
                pharmacy.owner_id = Person.objects.filter(id=pharmacy.owner_id).first()
            return Response({"exists": True, "pharmacy": PharmacySerializer(pharmacy).data}, status=status.HTTP_200_OK)

        return Response({"exists": False}, status=status.HTTP_200_OK)



class ProfileUpdateView(APIView):
    """
    PATCH: Update Profiles (User/Patient/Doctor/Pharmacy/Laboratory/Receptionist/Officer)

    PATCH profile/update/
    {
        "type": "doctor",
        "id": 34,
        "data": { ... }
    }
    """
    permission_classes = []  # AllowAny (change to IsAuthenticated if needed)

    @transaction.atomic
    def patch(self, request):
        user_type = (request.data.get("type") or "").strip().lower()
        obj_id = request.data.get("id")
        data = request.data.get("data") or {}

        if user_type == "":
            return Response(
                {"error": "type is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not obj_id:
            return Response(
                {"error": "id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(data, dict):
            return Response(
                {"error": "data must be an object"},
                status=status.HTTP_400_BAD_REQUEST
            )

        else:
            # -----------------------
            # USER (Person)
            # -----------------------
            if user_type == "user":
                person = get_object_or_404(Person, id=obj_id)

                serializer = PersonUpdateSerializer(person, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                person = serializer.save()

                return Response(
                    {"user": PersonSerializer(person).data},
                    status=status.HTTP_200_OK
                )

            # -----------------------
            # PATIENT
            # -----------------------
            elif user_type == "patient":
                patient = get_object_or_404(Patient, id=obj_id)

                person_serializer = PersonUpdateSerializer(patient.person, data=data, partial=True)
                person_serializer.is_valid(raise_exception=True)
                person_serializer.save()

                patient_serializer = PatientUpdateSerializer(patient, data=data, partial=True)
                patient_serializer.is_valid(raise_exception=True)
                patient = patient_serializer.save()

                return Response(
                    {"patient": PatientSerializer(patient).data},
                    status=status.HTTP_200_OK
                )

            # -----------------------
            # DOCTOR
            # -----------------------
            elif user_type == "doctor":
                doctor = get_object_or_404(Doctor, id=obj_id)

                person_serializer = PersonUpdateSerializer(doctor.person, data=data, partial=True)
                person_serializer.is_valid(raise_exception=True)
                person_serializer.save()

                doctor_serializer = DoctorUpdateSerializer(doctor, data=data, partial=True)
                doctor_serializer.is_valid(raise_exception=True)
                doctor = doctor_serializer.save()

                return Response(
                    {"doctor": DoctorSerializer(doctor).data},
                    status=status.HTTP_200_OK
                )

            # -----------------------
            # PHARMACY (Business)
            # -----------------------
            elif user_type == "pharmacy":
                pharmacy = get_object_or_404(Pharmacy, id=obj_id)

                pharmacy_serializer = PharmacyUpdateSerializer(pharmacy, data=data, partial=True)
                pharmacy_serializer.is_valid(raise_exception=True)
                pharmacy = pharmacy_serializer.save()

                if isinstance(getattr(pharmacy, 'owner_id', None), int):
                    pharmacy.owner_id = Person.objects.filter(id=pharmacy.owner_id).first()

                return Response(
                    {"pharmacy": PharmacySerializer(pharmacy).data},
                    status=status.HTTP_200_OK
                )

            # -----------------------
            # LABORATORY (Business)
            # -----------------------
            elif user_type == "laboratory":
                laboratory = get_object_or_404(Laboratory, id=obj_id)

                laboratory_serializer = LaboratoryUpdateSerializer(laboratory, data=data, partial=True)
                laboratory_serializer.is_valid(raise_exception=True)
                laboratory = laboratory_serializer.save()

                if isinstance(getattr(laboratory, 'owner_id', None), int):
                    laboratory.owner_id = Person.objects.filter(id=laboratory.owner_id).first()

                return Response(
                    {"laboratory": LaboratorySerializer(laboratory).data},
                    status=status.HTTP_200_OK
                )

            # -----------------------
            # RECEPTIONIST
            # -----------------------
            elif user_type == "receptionist":
                receptionist = get_object_or_404(Receptionist, id=obj_id)

                # If you allow updating Person fields too (optional)
                if receptionist.person_id:
                    person_serializer = PersonUpdateSerializer(receptionist.person, data=data, partial=True)
                    person_serializer.is_valid(raise_exception=True)
                    person_serializer.save()

                # Receptionist only has "active" in your model; update it directly from data if present
                if "active" in data:
                    receptionist.active = data.get("active")
                    receptionist.save(update_fields=["active"])

                return Response(
                    {"receptionist": ReceptionistSerializer(receptionist).data},
                    status=status.HTTP_200_OK
                )

            # -----------------------
            # OFFICER
            # -----------------------
            elif user_type == "officer":
                officer = get_object_or_404(Officer, id=obj_id)

                # If you allow updating Person fields too (optional)
                if officer.person_id:
                    person_serializer = PersonUpdateSerializer(officer.person, data=data, partial=True)
                    person_serializer.is_valid(raise_exception=True)
                    person_serializer.save()

                # Officer only has "active" in your model; update it directly from data if present
                if "active" in data:
                    officer.active = data.get("active")
                    officer.save(update_fields=["active"])

                return Response(
                    {"officer": OfficerSerializer(officer).data},
                    status=status.HTTP_200_OK
                )

            else:
                return Response(
                    {"error": "Invalid User Type"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
                
class ProfileListAPIView(APIView):
    """
    GET api/profile/all-profile/
    {
      "type": "user|patient|doctor|laboratory|pharmacy",
    }

    Notes:
    - Return ALL the profiles of the types
    """
    permission_classes = []  # AllowAny

    def get(self, request):
        user_type = (request.data.get("type") or "").strip().lower()

        if not user_type:
            return Response(
                {"error": "type is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_type not in {"patient","doctor","laboratory","pharmacy","user"}:
            return Response(
                {"error": f"User Type : {user_type} is invalid!"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # -----------------------
        # USER (Person)
        # -----------------------
        if user_type == "user":
            qs = Person.objects.all()
            data = PersonSerializer(qs, many=True).data
            return Response({"type": "user", "count": qs.count(), "results": data}, status=status.HTTP_200_OK)

        # -----------------------
        # PATIENT
        # -----------------------
        if user_type == "patient":
            qs = Patient.objects.select_related("person").all()
            data = PatientSerializer(qs, many=True).data
            return Response({"type": "patient", "count": qs.count(), "results": data}, status=status.HTTP_200_OK)

        # ----------------------- 
        # DOCTOR
        # -----------------------
        if user_type == "doctor":
            qs = Doctor.objects.select_related("person").all()
            data = DoctorSerializer(qs, many=True).data
            return Response({"type": "doctor", "count": qs.count(), "results": data}, status=status.HTTP_200_OK)

        # -----------------------
        # LABORATORY
        # -----------------------
        if user_type == "laboratory":
            qs = list(Laboratory.objects.all())
            # Convert ints to actual Model instances without triggering N+1 queries
            person_ids = [lab.owner_id for lab in qs if isinstance(getattr(lab, 'owner_id', None), int)]
            if person_ids:
                persons = {p.id: p for p in Person.objects.filter(id__in=person_ids)}
                for lab in qs:
                    if isinstance(getattr(lab, 'owner_id', None), int):
                        lab.owner_id = persons.get(lab.owner_id)
                        
            data = LaboratorySerializer(qs, many=True).data
            return Response({"type": "laboratory", "count": len(qs), "results": data}, status=status.HTTP_200_OK)

        # -----------------------
        # PHARMACY
        # -----------------------
        if user_type == "pharmacy":
            qs = list(Pharmacy.objects.all())
            # Convert ints to actual Model instances without triggering N+1 queries
            person_ids = [pharmacy.owner_id for pharmacy in qs if isinstance(getattr(pharmacy, 'owner_id', None), int)]
            if person_ids:
                persons = {p.id: p for p in Person.objects.filter(id__in=person_ids)}
                for pharmacy in qs:
                    if isinstance(getattr(pharmacy, 'owner_id', None), int):
                        pharmacy.owner_id = persons.get(pharmacy.owner_id)
                        
            data = PharmacySerializer(qs, many=True).data
            return Response({"type": "pharmacy", "count": len(qs), "results": data}, status=status.HTTP_200_OK)

        # (This is unreachable because of allowed check, but kept safe)
        return Response({"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST)
    
    
    
class AllDoctorOfType(APIView):
    """
    GET api/profile/all-doctor-of-type/
    {
      "type": "user|patient|doctor|laboratory|pharmacy",
      "date": date
    }

    Notes:
    - Return ALL the profiles of the types
    """
    permission_classes = []  # AllowAny

    def get(self, request):
        doctor_type = (request.data.get("type") or "").strip().lower()

        # get all doctor type
        # Return all doctor of that type
        
        
class DoctorOffDayListCreateAPIView(generics.ListCreateAPIView):
    queryset = DoctorOffDay.objects.select_related("doctor", "doctor__person").all()
    serializer_class = DoctorOffDaySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        doctor_id = self.request.query_params.get("doctor_id")
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        return qs
 

class DoctorOffDayDeleteAPIView(generics.DestroyAPIView):
    queryset = DoctorOffDay.objects.all()
    serializer_class = DoctorOffDaySerializer
 
 

class DoctorAvailabilityBulkAPIView(APIView):
    """
    GET  /api/profile/doctors/<doctor_id>/availabilities/bulk/
    PUT  /api/profile/doctors/<doctor_id>/availabilities/bulk/
    """

    def get(self, request, doctor_id):
        get_object_or_404(Doctor, pk=doctor_id)

        qs = (
            DoctorAvailability.objects
            .filter(doctor_id=doctor_id)
            .select_related("week_day")
            .order_by("week_day_id")
        )

        data = DoctorAvailabilityReadSerializer(qs, many=True).data
        return Response(
            {"doctor_id": doctor_id, "availabilities": data},
            status=status.HTTP_200_OK
        )

    @transaction.atomic
    def put(self, request, doctor_id):
        get_object_or_404(Doctor, pk=doctor_id)

        serializer = DoctorAvailabilityBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["availabilities"]
        week_day_ids = [it["week_day_id"] for it in items]

        existing_qs = (
            DoctorAvailability.objects
            .select_for_update()
            .filter(doctor_id=doctor_id, week_day_id__in=week_day_ids)
        )
        existing_map = {a.week_day_id: a for a in existing_qs}

        missing = [wd for wd in week_day_ids if wd not in existing_map]
        if missing:
            return Response(
                {"error": "Availability row missing for some weekdays", "missing_week_day_ids": missing},
                status=status.HTTP_404_NOT_FOUND
            )

        to_update = []
        for it in items:
            obj = existing_map[it["week_day_id"]]
            obj.start_time = it.get("start_time", None)
            obj.end_time = it.get("end_time", None)
            to_update.append(obj)

        DoctorAvailability.objects.bulk_update(to_update, ["start_time", "end_time"])

        # return updated (or return full 7 days if you want)
        updated_qs = (
            DoctorAvailability.objects
            .filter(doctor_id=doctor_id)
            .select_related("week_day")
            .order_by("week_day_id")
        )
        data = DoctorAvailabilityReadSerializer(updated_qs, many=True).data

        return Response(
            {"doctor_id": doctor_id, "updated": len(items), "availabilities": data},
            status=status.HTTP_200_OK
        )
        

class PersonRolesAPIView(APIView):
    """
    GET /profiles/by-person/<person_id>/

    Response:
    {
      "person_id": 10,
      "doctor_id": 5,
      "patient_id": null,
      "receptionist_id": 9,
      "officer_id": null
    }
    """

    def get(self, request, person_id):
        # Ensure person exists
        get_object_or_404(Person, pk=person_id)

        doctor_id = (
            Doctor.objects.filter(person_id=person_id)
            .values_list("id", flat=True)
            .first()
        )

        patient_id = (
            Patient.objects.filter(person_id=person_id)
            .values_list("id", flat=True)
            .first()
        )

        receptionist_id = (
            Receptionist.objects.filter(person_id=person_id)
            .values_list("id", flat=True)
            .first()
        )

        officer_id = (
            Officer.objects.filter(person_id=person_id)
            .values_list("id", flat=True)
            .first()
        )

        return Response(
            {
                "person_id": person_id,
                "doctor_id": doctor_id,
                "patient_id": patient_id,
                "receptionist_id": receptionist_id,
                "officer_id": officer_id,
            },
            status=status.HTTP_200_OK,
        )
        
class DoctorDetailsAPI(APIView):

    def post(self, request):
        lookup_type = request.data.get("type")
        lookup_id = request.data.get("id")

        if not lookup_type or not lookup_id:
            return Response(
                {"error": "Both 'type' and 'id' are required"},
                status=400
            )

        try:
            if lookup_type == "doctor_id":
                doctor = Doctor.objects.select_related(
                    "person", "department"
                ).get(id=lookup_id)

            elif lookup_type == "person_id":
                doctor = Doctor.objects.select_related(
                    "person", "department"
                ).get(person_id=lookup_id)

            else:
                return Response(
                    {"error": "Invalid type. Use 'doctor_id' or 'person_id'"},
                    status=400
                )

        except Doctor.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=404)

        return Response(DoctorDetailSerializer(doctor).data)
    
class PatientDetailsAPI(APIView):

    def post(self, request):
        lookup_type = request.data.get("type")
        lookup_id = request.data.get("id")

        if not lookup_type or not lookup_id:
            return Response({"error": "Both 'type' and 'id' are required"}, status=400)

        try:
            if lookup_type == "patient_id":
                patient = Patient.objects.select_related("person").get(id=lookup_id)

            elif lookup_type == "person_id":
                patient = Patient.objects.select_related("person").get(person_id=lookup_id)

            else:
                return Response(
                    {"error": "Invalid type. Use 'patient_id' or 'person_id'"},
                    status=400
                )

        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=404)

        return Response(PatientDetailSerializer(patient).data)
    
    
    
@api_view(["GET"])
# remove if you don't use auth
def doctors_list_api(request):
    qs = (
        Doctor.objects
        .select_related("person")          # <-- adjust if relation name differs
        .prefetch_related("availabilities", "availabilities__week_day")
        .order_by("id")
    )
    return Response(DoctorSerializer(qs, many=True).data)


from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as http_status
from apps.personal.models import Person, Doctor, Patient, Officer
from apps.business.models import Laboratory, Pharmacy


@api_view(["GET"])
def profile_search_by_email_api(request):
    """
    GET /api/profile/search-by-email/?email=someone@example.com
    """
    email = (request.query_params.get("email") or "").strip().lower()
    if not email:
        return Response({"detail": "email query param is required"}, status=http_status.HTTP_400_BAD_REQUEST)

    person = Person.objects.filter(email__iexact=email).first()
    if not person:
        return Response({"detail": "No profile found with this email"}, status=http_status.HTTP_404_NOT_FOUND)

    roles = []
    profiles = {}

    doctor = Doctor.objects.filter(person=person).select_related("person").first()
    if doctor:
        roles.append("doctor")
        profiles["doctor"] = {
            "id": doctor.id,
            "designation": doctor.designation,
            "location": doctor.location,
            "education": doctor.education,
            "appointment_fee": str(doctor.appointment_fee) if doctor.appointment_fee is not None else None,
            "daily_patient_limit": doctor.daily_patient_limit,
            "balance": str(doctor.balance),
            "active": doctor.active,
        }

    patient = Patient.objects.filter(person=person).select_related("person").first()
    if patient:
        roles.append("patient")
        profiles["patient"] = {
            "id": patient.id,
            "chronic_diseases": patient.chronic_diseases,
            "balance": str(patient.balance),
            "active": patient.active,
        }

    lab = Laboratory.objects.filter(email__iexact=email).first()
    if lab:
        roles.append("laboratory")
        profiles["laboratory"] = {
            "id": lab.id,
            "name": lab.name,
            "email": lab.email,
            "mobile": lab.mobile,
            "balance": str(lab.balance),
            "active": lab.active,
            "owner_id": lab.owner_id,
        }

    pharmacy = Pharmacy.objects.filter(email__iexact=email).first()
    if pharmacy:
        roles.append("pharmacy")
        profiles["pharmacy"] = {
            "id": pharmacy.id,
            "name": pharmacy.name,
            "email": pharmacy.email,
            "mobile": pharmacy.mobile,
            "balance": str(pharmacy.balance),
            "discount_percentage": str(pharmacy.discount_percentage) if pharmacy.discount_percentage is not None else None,
            "active": pharmacy.active,
            "owner_id": pharmacy.owner_id,
        }

    officer = Officer.objects.filter(person=person).first()
    if officer:
        roles.append("officer")
        profiles["officer"] = {
            "id": officer.id,
            "person_id": officer.person_id,
            "active": officer.active,
        }

    # Basic Person info
    person_data = {
        "id": person.id,
        "nid": person.nid,
        "name": person.name,
        "gender": person.gender,
        "dob": str(person.dob) if person.dob else None,
        "address": person.address,
        "email": person.email,
        "mobile": person.mobile,
    }

    return Response({
        "person": person_data,
        "roles": roles,
        "profiles": profiles,
    })