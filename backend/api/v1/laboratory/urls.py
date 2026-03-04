from django.urls import path, include 
from .views import LabPatientTestReportsAPI, LaboratoriesByTestAPI, LaboratoryRegisterAPI, LaboratoryLoginAPI, LaboratoryMeAPI, laboratories_by_test_api, LaboratoryListAPI, LaboratoryDetailAPI, PrescriptionTestsAPI, ConfirmLabTestAPI, TestReportUpdateAPI, PatientTestsInLabAPI, LabAvailableTestsAPI, LabAvailableTestRemoveAPI

urlpatterns = [
    path("test/<int:test_id>/laboratories/", LaboratoriesByTestAPI.as_view(), name="labs-by-test"),
    path("register/", LaboratoryRegisterAPI.as_view()),
    path("login/", LaboratoryLoginAPI.as_view()),
    path("tests/<int:test_id>/laboratories/", laboratories_by_test_api, name="laboratories_by_test_api"),
    path("", LaboratoryListAPI.as_view()),
    path("<int:laboratory_id>/", LaboratoryDetailAPI.as_view()),
    path("me/<int:laboratory_id>/", LaboratoryMeAPI.as_view()),
    path("prescription/<int:prescription_id>/tests/", PrescriptionTestsAPI.as_view()),
    path("confirm-test/", ConfirmLabTestAPI.as_view()),
    path("test-reports/<int:test_report_id>/", TestReportUpdateAPI.as_view()),
    path("<int:lab_id>/patients/<int:patient_id>/tests/", PatientTestsInLabAPI.as_view()),
    path("<int:lab_id>/available-tests/", LabAvailableTestsAPI.as_view()),
    path("labs/<int:lab_id>/available-tests/<int:test_id>/", LabAvailableTestRemoveAPI.as_view()),
    path(
        "labs/<int:lab_id>/patients/<int:patient_id>/test-reports/",
        LabPatientTestReportsAPI.as_view(),
        name="lab-patient-test-reports",
    ),
] 