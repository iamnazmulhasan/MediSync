from django.utils import timezone
from apps.prescription.models import Prechecked
from .serializers import PrecheckedSerializer, PrecheckedUpdateSerializer, ActiveMedicineTodaySerializer, PrescriptionWriteSerializer, PrescriptionReadSerializer, PrescriptionHistorySerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.db.models import Max, Count
from django.shortcuts import get_object_or_404
from apps.prescription.models import PrescribedMedicine, Prescription
from datetime import date
from datetime import timedelta
from rest_framework import status as http_status
from django.db.models import F, ExpressionWrapper, DateField, DurationField, IntegerField
from django.db.models.functions import Cast
from apps.prescription.models import PrescribedMedicine, Appointment
from apps.personal.models import Patient, Doctor
from datetime import timedelta
from django.utils import timezone
from django.db.models import F, Value, ExpressionWrapper, DateField, DurationField


class PrecheckedListCreateAPI(APIView):
    """
    GET  /api/prescription/prechecked/
    GET  /api/prescription/prechecked/?prescription_id=12
    POST /api/prescription/prechecked/
    """

    def get_queryset(self, request):
        qs = Prechecked.objects.all().select_related("prescription_id").order_by("-id")

        prescription_id = request.query_params.get("prescription_id")
        if prescription_id:
            qs = qs.filter(prescription_id_id=prescription_id)

        return qs

    def get(self, request):
        qs = self.get_queryset(request)
        serializer = PrecheckedSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PrecheckedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PrecheckedRetrieveAPI(APIView):
    """
    GET /api/prescription/prechecked/<id>/
    """
 
    def get(self, request, pk):
        obj = get_object_or_404(
            Prechecked.objects.select_related("prescription_id"),
            pk=pk,
        )
        serializer = PrecheckedSerializer(obj)
        return Response(serializer.data)


class PrecheckedUpdateByIdAPI(APIView):
    """
    PATCH /api/prescription/prechecked/<prechecked_id>/update/
    """

    def patch(self, request, prechecked_id):
        obj = get_object_or_404(Prechecked, pk=prechecked_id)
        serializer = PrecheckedSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PrecheckedUpdateByAppointmentAPI(APIView):
    """
    PATCH /api/prescription/appointment/<appointment_id>/prechecked/update/
    """

    def patch(self, request, appointment_id):
        # If you added appointment FK on Prechecked:
        obj = get_object_or_404(Prechecked, appointment_id=appointment_id)

        serializer = PrecheckedSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
     
    
class PatientMedicineUsedAPIView(APIView):
    """
    Check if a patient ever used (was prescribed) a medicine.

    GET /api/prescription/patients/<patient_id>/medicine-used/?medicine=<medicine_id>
    """

    def get(self, request, patient_id: int):
        medicine_id = request.query_params.get("medicine")
        generic_id = request.query_params.get("generic")

        if not medicine_id and not generic_id:
            return Response(
                {"detail": "Provide medicine or generic. Example: ?medicine=12 or ?generic=3"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = PrescribedMedicine.objects.filter(
            prescription__appointment__patient_id=patient_id
        )

        if medicine_id:
            qs = qs.filter(medicine_id=medicine_id)

        if generic_id:
            qs = qs.filter(medicine__generic_id=generic_id)

        agg = qs.aggregate(
            total_times=Count("id"),
            last_used=Max("prescription__appointment__appointment_date"),
        )

        used = agg["total_times"] > 0

        return Response(
            {
                "patient_id": patient_id,
                "medicine_id": int(medicine_id) if medicine_id else None,
                "generic_id": int(generic_id) if generic_id else None,
                "used": used,
                "total_times": agg["total_times"],
                "last_used": agg["last_used"],  # date or null
            },
            status=status.HTTP_200_OK,
        )
        
        

def active_medicines_today(patient_id):
    today = timezone.localdate()

    start_date = F("prescription__appointment__appointment_date")

    # end_date = start_date + (duration - 1) days
    end_date = ExpressionWrapper(
        start_date + ExpressionWrapper(
            (F("duration") - Value(1)) * Value(timedelta(days=1)),
            output_field=DurationField(),
        ),
        output_field=DateField()
    )

    qs = (
        PrescribedMedicine.objects
        .select_related("medicine", "prescription__appointment")
        .filter(
            prescription__appointment__patient_id=patient_id,
            duration__isnull=False,
            duration__gt=0,
            prescription__appointment__appointment_date__isnull=False,
        )
        .annotate(
            start_date=start_date,
            end_date=end_date,
        )
        .filter(
            start_date__lte=today,
            end_date__gte=today,
        )
        .order_by("-start_date", "medicine__name")
    )
    return qs


@api_view(["GET"])
def patient_active_medicines_today_api(request, patient_id):
    qs = active_medicines_today(patient_id)
    serializer = ActiveMedicineTodaySerializer(qs, many=True)
    return Response(serializer.data, status=http_status.HTTP_200_OK)


class PrecheckedByAppointmentAPIView(APIView):
    def get(self, request, appointment_id: int):
        # 404 if appointment doesn't exist
        get_object_or_404(Appointment, pk=appointment_id)

        qs = Prechecked.objects.filter(appointment_id=appointment_id).order_by("-id")
        serializer = PrecheckedSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK) 
    
    
class PrescriptionCreateAPI(APIView):
    """
    POST /api/prescription/
    """
    def post(self, request):
        serializer = PrescriptionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()

        # return read serializer (✅ avoids int() error)
        return Response(
            PrescriptionReadSerializer(obj).data,
            status=http_status.HTTP_201_CREATED
        )


class PrescriptionDetailAPI(APIView):
    """
    GET/PATCH/PUT /api/prescription/<id>/
    """
    def get(self, request, pk):
        obj = get_object_or_404(Prescription, pk=pk)
        return Response(PrescriptionReadSerializer(obj).data)

    def patch(self, request, pk):
        obj = get_object_or_404(Prescription, pk=pk)
        serializer = PrescriptionWriteSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(PrescriptionReadSerializer(obj).data)

    def put(self, request, pk):
        obj = get_object_or_404(Prescription, pk=pk)
        serializer = PrescriptionWriteSerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(PrescriptionReadSerializer(obj).data)
    
    

class PrecheckedIdByAppointmentAPI(APIView):
    """
    GET /api/prescription/prechecked/by-appointment/<appointment_id>/
    """

    def get(self, request, appointment_id: int):
        # ensure appointment exists
        get_object_or_404(Appointment, pk=appointment_id)

        # get first prechecked record
        obj = (
            Prechecked.objects
            .filter(appointment_id=appointment_id)
            .order_by("id")
            .first()
        )

        if not obj:
            return Response(
                {
                    "appointment_id": appointment_id,
                    "prechecked_id": None,
                    "message": "No prechecked record found."
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                "appointment_id": appointment_id,
                "prechecked_id": obj.id
            },
            status=status.HTTP_200_OK
        )
        
class DoctorPreviousPrescriptionsAPI(APIView):
    """
    GET /api/prescription/doctors/<doctor_id>/previous-prescriptions/
    """

    def get(self, request, doctor_id: int):
        get_object_or_404(Doctor, pk=doctor_id)
        today = date.today()

        qs = (
            Prescription.objects
            .select_related(
                "appointment",
                "appointment__doctor__person",
                "appointment__patient__person",
                "prechecked_id",
            )
            .prefetch_related(
                "medicines__medicine__generic",
                "tests__test",
            )
            .filter(appointment__doctor_id=doctor_id, appointment__appointment_date__lte=today)
            .order_by("-appointment__appointment_date", "-id")
        )

        return Response(
            {
                "doctor_id": doctor_id,
                "today": str(today),
                "count": qs.count(),
                "previous_prescriptions": PrescriptionHistorySerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK
        )
        
class PatientPreviousPrescriptionsAPI(APIView):
    """
    GET /api/prescription/patients/<patient_id>/previous-prescriptions/
    """

    def get(self, request, patient_id: int):
        get_object_or_404(Patient, pk=patient_id)
        today = date.today()

        qs = (
            Prescription.objects
            .select_related(
                "appointment",
                "appointment__doctor__person",
                "appointment__patient__person",
                "prechecked_id",
            )
            .prefetch_related(
                "medicines__medicine__generic",
                "tests__test",
            )
            .filter(appointment__patient_id=patient_id, appointment__appointment_date__lte=today)
            .order_by("-appointment__appointment_date", "-id")
        )

        return Response(
            {
                "patient_id": patient_id,
                "today": str(today),
                "count": qs.count(),
                "previous_prescriptions": PrescriptionHistorySerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK
        )
        
    
from .serializers import PatientPrescriptionListSerializer

class PatientPrescriptionListAPI(APIView):
    """
    GET /api/prescription/patients/<patient_id>/prescriptions/
    """

    def get(self, request, patient_id: int):
        qs = (
            Prescription.objects
            .select_related("appointment", "appointment__doctor", "appointment__doctor__person")
            .filter(appointment__patient_id=patient_id)
            .order_by("-appointment__appointment_date", "-id")
        )

        return Response(PatientPrescriptionListSerializer(qs, many=True).data, status=http_status.HTTP_200_OK)
    

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from apps.prescription.models import PrescribedMedicine
from .serializers import PrescriptionMedicineListSerializer

class PrescriptionMedicinesAPI(APIView):
    """
    GET /api/prescription/<prescription_id>/medicines/
    """
    
    def get(self, request, prescription_id: int):
        qs = (
            PrescribedMedicine.objects
            .select_related("medicine", "medicine__generic")
            .filter(prescription_id=prescription_id)
            .order_by("id")
        )

        return Response(PrescriptionMedicineListSerializer(qs, many=True).data, status=http_status.HTTP_200_OK)