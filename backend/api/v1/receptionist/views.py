from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.shortcuts import get_object_or_404
from datetime import date
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.personal.models import Person, Patient, Doctor, DoctorOffDay
from apps.prescription.models import Appointment  # adjust import path if needed
from .serializers import UpcomingAppointmentSerializer, DoctorOffDaySerializer



from apps.personal.models import Receptionist
from .serializers import ReceptionistSerializer, DoctorUpcomingAppointmentSerializer


class ReceptionistDetailAPI(APIView):

    def get_object(self, pk):
        return get_object_or_404(
            Receptionist.objects.select_related("person"),
            pk=pk
        )

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(ReceptionistSerializer(obj).data, status=http_status.HTTP_200_OK)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = ReceptionistSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # ✅ THIS was missing
        obj = serializer.save()

        # ✅ ensure response contains updated related person
        obj = Receptionist.objects.select_related("person").get(pk=obj.pk)

        return Response(ReceptionistSerializer(obj).data, status=http_status.HTTP_200_OK)

    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = ReceptionistSerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        obj = Receptionist.objects.select_related("person").get(pk=obj.pk)
        return Response(ReceptionistSerializer(obj).data, status=http_status.HTTP_200_OK)
    
    
    
class PatientUpcomingAppointmentsByEmailAPI(APIView):
    """
    GET /api/receptionist/patient/upcoming-appointments/?email=someone@example.com
    """

    def get(self, request):
        email = request.query_params.get("email")
        if not email:
            return Response({"detail": "email query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Find person by email, then patient
        person = get_object_or_404(Person, email=email)
        patient = get_object_or_404(Patient, person=person)

        today = date.today()

        qs = (
            Appointment.objects
            .select_related("doctor__person", "status", "patient__person")
            .filter(patient=patient, appointment_date__gte=today)
            .order_by("appointment_date", "time", "id")
        )

        return Response(
            {
                "patient_id": patient.id,
                "person_id": person.id,
                "patient_name": person.name,
                "email": person.email,
                "upcoming_appointments": UpcomingAppointmentSerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK
        )
        

class DoctorUpcomingAppointmentsByEmailAPI(APIView):
    """
    GET /api/receptionist/doctor/upcoming-appointments/?email=doctor@example.com
    """

    def get(self, request):
        email = request.query_params.get("email")
        if not email:
            return Response({"detail": "email query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        person = get_object_or_404(Person, email=email)
        doctor = get_object_or_404(Doctor, person=person)

        today = date.today()

        qs = (
            Appointment.objects
            .select_related("patient__person", "doctor__person", "status")
            .filter(doctor=doctor, appointment_date__gte=today)
            .order_by("appointment_date", "time", "id")
        )

        return Response(
            {
                "doctor_id": doctor.id,
                "person_id": person.id,
                "doctor_name": person.name,
                "email": person.email,
                "appointment_fee": str(doctor.appointment_fee) if doctor.appointment_fee is not None else None,
                "upcoming_appointments": DoctorUpcomingAppointmentSerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK
        )
        
        
        
class DoctorNextOffDaysAPI(APIView):
    """
    GET /api/receptionist/doctor/<doctor_id>/next-offdays/
    """

    def get(self, request, doctor_id: int):
        doctor = get_object_or_404(Doctor, pk=doctor_id)

        today = date.today()

        qs = (
            DoctorOffDay.objects
            .filter(doctor=doctor, date__gte=today)
            .order_by("date")
        )

        return Response(
            {
                "doctor_id": doctor.id,
                "doctor_name": doctor.person.name,
                "today": str(today),
                "next_offdays": DoctorOffDaySerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK
        )