from django.db import transaction
from datetime import datetime, date, timedelta
from django.db.models import Count, Q, F, Max
from django.utils import timezone
from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request 
from rest_framework.response import Response  
from django.shortcuts import get_object_or_404
from rest_framework import status as http_status
from apps.personal.models import Doctor, Patient, DoctorAvailability, DoctorOffDay
from apps.prescription.models import Appointment, Prescription
from apps.core.models import StatusCode, WeekDay
from .serializers import (
    ExpectedAppointmentTimeSerializer, 
    AppointmentSerializer, 
    AvailableDoctorSerializer, 
    PreviousPatientSerializer,
    DoctorAppointmentSerializer,
    DoctorAppointmentByDateSerializer,
    DoctorCancelPendingByDateSerializer,
    UpcomingAppointmentSerializer,
    AppointmentListSerializer,
    AppointmentUpdateSerializer,
)


def get_weekday(date):
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    return date_obj.strftime("%A").lower()


class ExpectedAppointmentTime(APIView):
    """
    GET /api/appointment/get-expected-time/?doctor_id=1&date=2026-02-10
        Response:
        {
            "time": "HH:MM:SS"
        } 
    """
    def get(self, request):
        serializer = ExpectedAppointmentTimeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        doctor_id = serializer.validated_data["doctor_id"]
        appt_date = serializer.validated_data["date"]

        # Fetch required doctor fields
        doctor = get_object_or_404(
            Doctor.objects.only("average_time"),
            id=doctor_id
        )

        average_time = doctor.average_time  # minutes per patient
        if average_time is None:
            return Response(
                {"detail": "Doctor average_time is not set."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Determine weekday name from date
        # Python: Monday=0 ... Sunday=6
        weekday_name = appt_date.strftime("%A")  # "Monday", "Tuesday", ...

        # ✅ Match WeekDay row (assuming WeekDay.name stores "Sunday", "Monday", etc.)
        week_day = WeekDay.objects.filter(name__iexact=weekday_name).first()
        if not week_day:
            return Response(
                {"detail": f"WeekDay '{weekday_name}' not found in WeekDay table."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Get doctor's availability for that weekday
        availability = DoctorAvailability.objects.filter(
            doctor_id=doctor_id,
            week_day_id=week_day.id
        ).select_related("week_day").first()

        if not availability or availability.start_time is None:
            return Response(
                {"detail": f"Doctor is not available on {weekday_name} (start_time not set)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # NEW: Check for off-day on this specific date
        if DoctorOffDay.objects.filter(doctor_id=doctor_id, date=appt_date).exists():
            return Response(
                {
                    "detail": f"Doctor is not available on {appt_date} (Off-day).",
                    "weekday": weekday_name,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        start_time = availability.start_time
        end_time = availability.end_time  # optional use

        # Count appointments for that doctor/date
        total_patient = Appointment.objects.filter(
            doctor_id=doctor_id,
            appointment_date=appt_date
        ).count()

        expected_dt = datetime.combine(appt_date, start_time) + timedelta(
            minutes=total_patient * average_time
        )

        # ✅ Optional: if end_time exists, prevent expected time going beyond end_time
        if end_time is not None and expected_dt.time() > end_time:
            return Response(
                {
                    "detail": "No more slots available for this day (exceeds doctor's end_time).",
                    "weekday": weekday_name,
                    "start_time": start_time.strftime("%H:%M:%S"),
                    "end_time": end_time.strftime("%H:%M:%S"),
                },
                status=status.HTTP_409_CONFLICT
            )

        return Response(
            {
                "doctor_id": doctor_id,
                "date": str(appt_date),
                "weekday": weekday_name,
                "total_patient": total_patient,
                "average_time_minutes": average_time,
                "start_time": start_time.strftime("%H:%M:%S"),
                "end_time": end_time.strftime("%H:%M:%S") if end_time else None,
                "expected_time": expected_dt.time().strftime("%H:%M:%S"),
            },
            status=status.HTTP_200_OK
        )
   
        
class MakeAppointment(APIView):
    """
    POST /api/appointment/make-appointment/
    {
        "doctor_id": 1,
        "patient_id": 5,
        "date": "2026-02-10",
        "time": "10:30",
        "type": "Report Analysis"
    } 
    """
    def post(self, request: Request) -> Response:
        serializer = AppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doctor_id = serializer.validated_data["doctor_id"]
        patient_id = serializer.validated_data["patient_id"]
        date = serializer.validated_data["date"]
        time = serializer.validated_data["time"]
        appointment_type = serializer.validated_data.get("type")  # None if not sent

        doctor = get_object_or_404(Doctor, id=doctor_id)
        patient = get_object_or_404(Patient, id=patient_id)

        if date < timezone.localdate():
            return Response(
                {"detail": "Cannot book appointment in the past"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Appointment.objects.filter(
            doctor=doctor,
            appointment_date=date,
            time=time
        ).exists():
            return Response(
                {"detail": "This appointment slot is already booked"},
                status=status.HTTP_409_CONFLICT
            )
        
        pending_status = StatusCode.objects.filter(name="pending").first()
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            appointment_date=date,
            time=time,
            status=pending_status,
            type=appointment_type  # Saves the type (or null)
        )
        return Response(
            {
                "appointment_id": appointment.id,
                "doctor_id": doctor.id,
                "patient_id": patient.id,
                "date": str(date),
                "time": time.strftime("%H:%M:%S"),
                "type": appointment.type,  # Returns stored type or null
                "status": pending_status.name if pending_status else None, 
                "message": "Appointment booked successfully"
            },
            status=status.HTTP_201_CREATED
        )
        
 
class AvailableDoctorAPIView(APIView):
    """
    GET /api/appointment/doctors/available/?department=<id>&date=YYYY-MM-DD
    """
    def get(self, request):
        department_id = request.query_params.get("department")
        date_str = request.query_params.get("date")

        # ----------------------------
        # Validate query params
        # ----------------------------
        if not department_id or not date_str:
            return Response(
                {
                    "detail": "department and date are required.",
                    "example": "/api/doctors/available/?department=3&date=2026-02-08",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------
        # Validate date format
        # ----------------------------
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------
        # WeekDay ID (Mon=1 ... Sun=7)
        # ----------------------------
        week_day_id = target_date.weekday() + 1

        # ----------------------------
        # Step 1: Filter doctors
        # ----------------------------
        doctors = (
            Doctor.objects.filter(
                department_id=department_id, #change 1
                active=True,
            )   
            .select_related("person", "department")
        )

        # ----------------------------
        # Step 2: Must have availability that weekday with valid (non-NULL) times
        # ----------------------------
        doctors = doctors.filter(
            availabilities__week_day_id=week_day_id,
            availabilities__start_time__isnull=False,
            availabilities__end_time__isnull=False
        )

        # ----------------------------
        # Step 3: Must NOT be off that date
        # ----------------------------
        doctors = doctors.exclude(
            off_days__date=target_date
        )

        # ----------------------------
        # Step 4: Daily patient limit check
        # ----------------------------
        doctors = doctors.annotate(
            daily_appt_count=Count(
                "appointments",
                filter=Q(appointments__appointment_date=target_date),
            )
        )

        # Exclude doctors who reached limit
        doctors = doctors.exclude(
            Q(daily_patient_limit__isnull=False)
            & Q(daily_appt_count__gte=F("daily_patient_limit"))
        )

        # ----------------------------
        # Final ordering
        # ----------------------------
        doctors = doctors.distinct().order_by("person__name")

        # Serialize
        serializer = AvailableDoctorSerializer(doctors, many=True)

        return Response(
            {
                "date": date_str,
                "department": int(department_id),
                "week_day_id": week_day_id,
                "count": doctors.count(),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
        
        
class PreviousPatientsOfDoctorAPIView(APIView):
    """
    GET /api/doctors/<doctor_id>/previous-patients/
    Returns unique patients who had appointments with this doctor, newest first.
    """

    def get(self, request, doctor_id: int):
        # patient ids ordered by last visit (appointment_date)
        patient_rows = (
            Appointment.objects.filter(doctor_id=doctor_id)
            .values("patient_id")
            .annotate(last_visit=Max("appointment_date"))
            .order_by("-last_visit")
        )

        patient_ids = [row["patient_id"] for row in patient_rows]

        patients_qs = (
            Patient.objects.filter(id__in=patient_ids)
            .select_related("person")
        )

        # Keep ordering as per appointment last_visit ordering
        patient_map = {p.id: p for p in patients_qs}
        ordered_patients = [patient_map[p_id] for p_id in patient_ids if p_id in patient_map]

        serializer = PreviousPatientSerializer(ordered_patients, many=True)

        return Response(
            {
                "doctor_id": doctor_id,
                "count": len(serializer.data),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
        
        
class DoctorAppointmentsByDateAPIView(APIView):
    """
    GET /api/appointment/doctors/<doctor_id>/appointments/?date=YYYY-MM-DD
    """

    def get(self, request, doctor_id: int):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"detail": "date is required. Example: ?date=2026-02-08"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            Appointment.objects.filter(doctor_id=doctor_id, appointment_date=target_date)
            .select_related("patient__person", "status")
            .prefetch_related("prescriptions")  # for prechecked
            .order_by("time", "id")
        )

        serializer = DoctorAppointmentSerializer(qs, many=True)

        return Response(
            {
                "doctor_id": doctor_id,
                "date": date_str,
                "count": qs.count(),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )



class DoctorAppointmentsByDateAPIView(APIView):
    """
    GET /api/appointment/doctors/<doctor_id>/appointments/?date=YYYY-MM-DD
    """

    def get(self, request, doctor_id: int):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response(
                {"detail": "date is required. Example: ?date=2026-02-08"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            Appointment.objects.filter(doctor_id=doctor_id, appointment_date=target_date)
            .select_related("patient__person", "status")
            .order_by("time", "id")
        )

        return Response(
            {
                "doctor_id": doctor_id,
                "date": date_str,
                "count": qs.count(),
                "results": DoctorAppointmentByDateSerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
        

class DoctorCancelPendingByDateAPIView(APIView):
    """
    POST /api/doctor/appointments/cancel-pending-by-date/
    Cancels only PENDING appointments for a given doctor on a specific date.
    """

    @transaction.atomic
    def post(self, request):
        serializer = DoctorCancelPendingByDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doctor_id = serializer.validated_data["doctor_id"]
        appt_date = serializer.validated_data["date"]

        get_object_or_404(Doctor, id=doctor_id)

        pending = get_object_or_404(StatusCode, name="PENDING")
        cancelled = get_object_or_404(StatusCode, name="CANCELLED")

        qs = Appointment.objects.select_for_update().filter(
            doctor_id=doctor_id,
            appointment_date=appt_date,
            status=pending
        )

        cancelled_count = qs.update(status=cancelled)

        return Response(
            {
                "doctor_id": doctor_id,
                "date": str(appt_date),
                "cancelled_count": cancelled_count,
                "message": "Pending appointments cancelled successfully"
                if cancelled_count else "No pending appointments found for this date"
            },
            status=status.HTTP_200_OK
        )
        
class PatientUpcomingAppointmentsAPI(APIView):

    def get(self, request):
        today = timezone.localdate()
        now_time = timezone.localtime().time()

        person_id = request.query_params.get("person_id")
        if not person_id:
            return Response({"error": "person_id is required"}, status=400)

        try:
            patient = Patient.objects.get(person_id=person_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=404)

        qs = (
            Appointment.objects
            .select_related("status", "doctor__person", "doctor__department")
            .filter(patient=patient)
            .filter(
                Q(appointment_date__gt=today) |
                Q(appointment_date=today, time__isnull=False, time__gte=now_time)
            )
            .order_by("appointment_date", "time")
        )

        return Response({
            "count": qs.count(),
            "results": UpcomingAppointmentSerializer(qs, many=True).data
        })
        

class PatientPreviousAppointmentsAPI(APIView):

    def get(self, request):
        today = timezone.localdate()
        now_time = timezone.localtime().time()

        person_id = request.query_params.get("person_id")
        if not person_id:
            return Response({"error": "person_id is required"}, status=400)

        try:
            patient = Patient.objects.get(person_id=person_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=404)

        qs = (
            Appointment.objects
            .select_related("status", "doctor__person", "doctor__department")
            .filter(patient=patient)
            .filter(
                Q(appointment_date__lt=today) |
                Q(appointment_date=today, time__isnull=False, time__lt=now_time)
            )
            .order_by("-appointment_date", "-time")
        )

        return Response({
            "count": qs.count(),
            "results": AppointmentListSerializer(qs, many=True).data
        })
        




class AppointmentDeleteAPIView(APIView):
    """
    DELETE /api/appointment/delete-appointment/<id>/
    Allowed only when appointment.status.name is pending or prechecked.
    """

    # ✅ Class-level constant
    ALLOWED_DELETE_STATUSES = {"pending", "prechecked"}

    @transaction.atomic
    def delete(self, request, pk):

        deleted_count, _ = Appointment.objects.filter(
            pk=pk,
            status__name__in=self.ALLOWED_DELETE_STATUSES  # ✅ joins StatusCode table
        ).delete()

        if deleted_count == 1:
            return Response(
                {"detail": "Appointment deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )

        # Appointment exists but status not allowed
        if Appointment.objects.filter(pk=pk).exists():
            return Response(
                {
                    "detail": "Cannot delete appointment. Status must be pending or prechecked.",
                    "allowed_statuses": list(self.ALLOWED_DELETE_STATUSES),
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return Response(
            {"detail": "Appointment not found."},
            status=status.HTTP_404_NOT_FOUND
        )
        

class AppointmentUpdateAPIView(APIView):
    """
    GET  /api/appointment/<id>/  -> Retrieve
    PUT  /api/appointment/<id>/   -> full update
    PATCH /api/appointment/<id>/  -> partial update (recommended)
    """

    def get_object(self, pk: int) -> Appointment:
        return get_object_or_404(Appointment.objects.select_related("status"), pk=pk)
    
    def get(self, request, pk):
        appt = self.get_object(pk)
        serializer = AppointmentUpdateSerializer(appt)
        return Response(serializer.data, status=http_status.HTTP_200_OK)

    def patch(self, request, pk: int):
        appt = self.get_object(pk)
        serializer = AppointmentUpdateSerializer(appt, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=http_status.HTTP_200_OK)

    def put(self, request, pk: int):
        appt = self.get_object(pk)
        serializer = AppointmentUpdateSerializer(appt, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=http_status.HTTP_200_OK)       
        
        
class ConsultationFeeByAppointmentAPI(APIView):
    """
    GET /api/appointment/<appointment_id>/info/
    """

    def get(self, request, appointment_id: int):

        # Get appointment with doctor
        appt = get_object_or_404(
            Appointment.objects.select_related("doctor"),
            pk=appointment_id
        )

        # Get prescription linked to appointment (if exists)
        prescription = (
            Prescription.objects
            .filter(appointment_id=appointment_id)
            .select_related("prechecked_id")
            .first()
        )

        return Response(
            {
                "appointment_id": appt.id,
                "doctor_id": appt.doctor_id,
                "consultation_fee": (
                    str(appt.doctor.appointment_fee)
                    if appt.doctor.appointment_fee is not None
                    else None
                ),
                "prescription_id": prescription.id if prescription else None,
                "prechecked_id": (
                    prescription.prechecked_id_id
                    if prescription and prescription.prechecked_id
                    else None
                ),
            },
            status=status.HTTP_200_OK
        )