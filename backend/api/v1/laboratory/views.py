from django.shortcuts import render
from rest_framework.decorators import api_view
from django.contrib.auth.hashers import check_password
from rest_framework import status as http_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from apps.business.models import Laboratory
from apps.core.models import Test
from apps.business.models import LaboratoryTestAvailability, LaboratoryTestAvailability
from .serializers import LabSupportSerializer, LaboratoryRegisterSerializer, LaboratorySerializer, LaboratoryForTestSerializer, LaboratoryUpdateSerializer
from api.v1.authentication.serializers import LoginSerializer


class LaboratoriesByTestAPI(APIView):
    """
    GET /api/tests/<test_id>/laboratories/
    """

    def get(self, request, test_id: int):
        # 404 if test doesn't exist
        get_object_or_404(Test, pk=test_id)

        qs = (
            LaboratoryTestAvailability.objects
            .select_related("lab", "test")
            .filter(test_id=test_id, lab__active=True)  # remove lab__active if you want inactive labs too
            .order_by("lab__name", "lab_id")
        )

        return Response(LabSupportSerializer(qs, many=True).data, status=status.HTTP_200_OK)
    
    
class LaboratoryRegisterAPI(APIView):
    """
    POST /api/laboratory/register/
    """
    def post(self, request):
        serializer = LaboratoryRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(LaboratorySerializer(obj).data, status=http_status.HTTP_201_CREATED)


class LaboratoryLoginAPI(APIView):
    """
    POST /api/laboratory/login/
    body: { "login": "<email-or-mobile>", "password": "..." }
    """
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login = serializer.validated_data["login"]
        password = serializer.validated_data["password"]

        lab = (
            Laboratory.objects
            .filter(email=login).first()
            or Laboratory.objects.filter(mobile=login).first()
        )

        if not lab or not lab.password or not check_password(password, lab.password):
            return Response({"detail": "Invalid credentials."}, status=http_status.HTTP_401_UNAUTHORIZED)

        if not lab.active:
            return Response({"detail": "Account inactive."}, status=http_status.HTTP_403_FORBIDDEN)

        # simple response (no token)
        return Response(
            {
                "lab_id": lab.id,
                "name": lab.name,
                "email": lab.email,
                "mobile": lab.mobile,
            },
            status=http_status.HTTP_200_OK
        )


class LaboratoryUpdateAPI(APIView):
    """
    GET/PATCH/PUT /api/laboratory/<id>/
    """
    def get_object(self, pk):
        return get_object_or_404(Laboratory, pk=pk)

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(LaboratorySerializer(obj).data)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = LaboratorySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(LaboratorySerializer(obj).data)

    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = LaboratorySerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(LaboratorySerializer(obj).data)
    
    
@api_view(["GET"])
def laboratories_by_test_api(request, test_id):
    qs = (
        LaboratoryTestAvailability.objects
        .select_related("lab", "test")
        .filter(test_id=test_id)
        .order_by("lab_id")
    )
    return Response(LaboratoryForTestSerializer(qs, many=True).data)
 

from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.business.models import Laboratory
from .serializers import LaboratorySerializer


class LaboratoryListAPI(APIView):
    """
    GET /api/laboratory/?q=city&active=true
    """

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        active = request.query_params.get("active")  # optional: true/false

        qs = Laboratory.objects.select_related("owner").order_by("-id")

        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(email__icontains=q) |
                Q(mobile__icontains=q) |
                Q(owner__name__icontains=q)
            )

        if active is not None:
            v = str(active).lower().strip()
            if v in ("true", "1", "yes"):
                qs = qs.filter(active=True)
            elif v in ("false", "0", "no"):
                qs = qs.filter(active=False)

        return Response(LaboratorySerializer(qs, many=True).data)


class LaboratoryDetailAPI(APIView):
    """
    GET/PATCH/PUT /api/laboratory/<id>/
    """

    def get_object(self, laboratory_id: int):
        return get_object_or_404(Laboratory, pk=laboratory_id)

    def get(self, request, laboratory_id: int):
        obj = self.get_object(laboratory_id)
        return Response(LaboratorySerializer(obj).data)

    def patch(self, request, laboratory_id: int):
        obj = self.get_object(laboratory_id)
        serializer = LaboratorySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(LaboratorySerializer(obj).data)

    def put(self, request, laboratory_id: int):
        obj = self.get_object(laboratory_id)
        serializer = LaboratorySerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(LaboratorySerializer(obj).data)
    
    def delete(self, request, laboratory_id: int):
        obj = get_object_or_404(Laboratory, pk=laboratory_id)
        obj.delete()
        return Response({"detail": "Laboratory deleted successfully"}, status=200)
    

class LaboratoryMeAPI(APIView):
    """
    GET/PATCH /api/laboratory/me/<id>/
    """

    def get_object(self, laboratory_id: int):
        return get_object_or_404(Laboratory.objects.select_related("owner"), pk=laboratory_id)

    def get(self, request, laboratory_id: int):
        obj = self.get_object(laboratory_id)
        return Response(LaboratorySerializer(obj).data)

    def patch(self, request, laboratory_id: int):
        obj = self.get_object(laboratory_id)

        # ✅ extra protection (optional): block name update if someone still sends it
        # if "name" in request.data:
        #     return Response(
        #         {"detail": "You cannot update laboratory name."},
        #         status=http_status.HTTP_400_BAD_REQUEST
        #     )

        # ✅ block nid_of_owner attempts (optional)
        if "nid_of_owner" in request.data:
            return Response(
                {"detail": "You cannot update owner's NID."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        serializer = LaboratoryUpdateSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()

        return Response(LaboratorySerializer(obj).data, status=http_status.HTTP_200_OK)
    
    
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.core.models import StatusCode, Test
from apps.personal.models import Patient
from apps.business.models import Laboratory, LaboratoryTestAvailability
from apps.prescription.models import PrescribedTest, TestReport, Prescription

from .serializers import (
    PrescriptionTestListSerializer,
    ConfirmLabTestSerializer,
    TestReportUpdateSerializer,
    LabTestAvailabilityListSerializer,
    LabTestAvailabilityCreateSerializer,
)


# ---------------------------------------------------------
# 1) API: see specific prescription tests (prescription_pk)
# GET /api/prescription/<prescription_id>/tests/
# ---------------------------------------------------------
class PrescriptionTestsAPI(APIView):
    def get(self, request, prescription_id: int):
        qs = (
            PrescribedTest.objects
            .select_related("test")
            .filter(prescription_id=prescription_id)
            .order_by("id")
        ) 
        return Response(PrescriptionTestListSerializer(qs, many=True).data, status=http_status.HTTP_200_OK)


# ---------------------------------------------------------
# 2) API: confirm lab test to be done here
# POST /api/labs/confirm-test/
# body: { "prescribed_test_id": 1, "lab_id": 2 }
#
# - creates/updates TestReport
# - auto status = pending
# ---------------------------------------------------------
class ConfirmLabTestAPI(APIView):
    @transaction.atomic
    def post(self, request):
        serializer = ConfirmLabTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        prescribed_test_id = serializer.validated_data["prescribed_test_id"]
        lab_id = serializer.validated_data["lab_id"]

        prescribed_test = get_object_or_404(PrescribedTest, pk=prescribed_test_id)
        lab = get_object_or_404(Laboratory, pk=lab_id)

        pending = StatusCode.objects.filter(name="pending").first()
        if not pending:
            return Response(
                {"detail": "StatusCode 'pending' not found. Create it first."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        # If report exists -> set created_by + status pending
        report, created = TestReport.objects.get_or_create(
            prescribed_test=prescribed_test,
            defaults={
                "created_by": lab,
                "status": pending,
            }
        )

        if not created:
            report.created_by = lab
            report.status = pending
            report.save(update_fields=["created_by", "status"])

        return Response(
            {
                "created": created,
                "test_report_id": report.id,
                "prescribed_test_id": prescribed_test.id,
                "lab_id": lab.id,
                "status": report.status.name if report.status else None,
            },
            status=http_status.HTTP_201_CREATED if created else http_status.HTTP_200_OK
        )


# ---------------------------------------------------------
# 3) API: update lab test report
# PATCH /api/labs/test-reports/<test_report_id>/
# body: { "result": "...", "status": <status_id> }
# ---------------------------------------------------------
class TestReportUpdateAPI(APIView):
    def patch(self, request, test_report_id: int):
        obj = get_object_or_404(TestReport, pk=test_report_id)
        serializer = TestReportUpdateSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(
            {
                "id": obj.id,
                "prescribed_test_id": obj.prescribed_test_id,
                "lab_id": obj.created_by_id,
                "result": obj.result,
                "status": obj.status.name if obj.status else None,
            },
            status=http_status.HTTP_200_OK
        )


# ---------------------------------------------------------
# 4) API: check a patient's all tests here (patient_pk, lab_pk)
# GET /api/labs/<lab_id>/patients/<patient_id>/tests/
# ---------------------------------------------------------
class PatientTestsInLabAPI(APIView):
    def get(self, request, lab_id: int, patient_id: int):
        # ensure lab & patient exist
        get_object_or_404(Laboratory, pk=lab_id)
        get_object_or_404(Patient, pk=patient_id)

        qs = (
            TestReport.objects
            .select_related(
                "prescribed_test",
                "prescribed_test__test",
                "prescribed_test__prescription",
                "prescribed_test__prescription__appointment",
            )
            .filter(
                created_by_id=lab_id,
                prescribed_test__prescription__appointment__patient_id=patient_id
            )
            .order_by("-id")
        )

        data = []
        for r in qs:
            data.append({
                "test_report_id": r.id,
                "prescribed_test_id": r.prescribed_test_id,
                "test_id": r.prescribed_test.test_id if r.prescribed_test else None,
                "test_name": r.prescribed_test.test.name if r.prescribed_test and r.prescribed_test.test else None,
                "prescription_id": r.prescribed_test.prescription_id if r.prescribed_test else None,
                "appointment_id": (
                    r.prescribed_test.prescription.appointment_id
                    if r.prescribed_test and r.prescribed_test.prescription else None
                ),
                "appointment_date": (
                    r.prescribed_test.prescription.appointment.appointment_date
                    if r.prescribed_test and r.prescribed_test.prescription and r.prescribed_test.prescription.appointment else None
                ),
                "status": r.status.name if r.status else None,
                "result": r.result,
            })

        return Response(data, status=http_status.HTTP_200_OK)


# ---------------------------------------------------------
# 5) Lab self-available tests (lab_pk)
# GET    /api/labs/<lab_id>/available-tests/
# POST   /api/labs/<lab_id>/available-tests/     body { "test_id": 1, "price": 500 }
# DELETE /api/labs/<lab_id>/available-tests/<test_id>/
# ---------------------------------------------------------
class LabAvailableTestsAPI(APIView):
    def get(self, request, lab_id: int):
        get_object_or_404(Laboratory, pk=lab_id)

        qs = (
            LaboratoryTestAvailability.objects
            .select_related("test")
            .filter(lab_id=lab_id)
            .order_by("id")
        )
        return Response(LabTestAvailabilityListSerializer(qs, many=True).data, status=http_status.HTTP_200_OK)

    def post(self, request, lab_id: int):
        get_object_or_404(Laboratory, pk=lab_id)

        serializer = LabTestAvailabilityCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        test_id = serializer.validated_data["test_id"]
        price = serializer.validated_data.get("price")

        test = get_object_or_404(Test, pk=test_id)

        try:
            obj = LaboratoryTestAvailability.objects.create(lab_id=lab_id, test=test, price=price)
        except IntegrityError:
            return Response(
                {"detail": "This test is already added for this lab."},
                status=http_status.HTTP_409_CONFLICT
            )

        return Response(
            LabTestAvailabilityListSerializer(obj).data,
            status=http_status.HTTP_201_CREATED
        )


class LabAvailableTestRemoveAPI(APIView):
    def delete(self, request, lab_id: int, test_id: int):
        get_object_or_404(Laboratory, pk=lab_id)

        obj = get_object_or_404(LaboratoryTestAvailability, lab_id=lab_id, test_id=test_id)
        obj.delete()
        return Response({"detail": "Test removed successfully"}, status=http_status.HTTP_200_OK)
    
  
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.personal.models import Patient
from apps.business.models import Laboratory
from apps.prescription.models import TestReport
from .serializers import LabPatientTestReportSerializer  
    
class LabPatientTestReportsAPI(APIView):
    """
    GET /api/labs/<lab_id>/patients/<patient_id>/test-reports/
    """

    def get(self, request, lab_id: int, patient_id: int):
        get_object_or_404(Laboratory, pk=lab_id)
        get_object_or_404(Patient, pk=patient_id)

        qs = (
            TestReport.objects
            .select_related(
                "created_by",
                "status",
                "prescribed_test__test",
                "prescribed_test__prescription__appointment",
            )
            .filter(
                created_by_id=lab_id,
                prescribed_test__prescription__appointment__patient_id=patient_id,
            )
            .order_by("-id")
        )

        return Response(
            {
                "lab_id": lab_id,
                "patient_id": patient_id,
                "count": qs.count(),
                "test_reports": LabPatientTestReportSerializer(qs, many=True).data,
            },
            status=status.HTTP_200_OK
        )