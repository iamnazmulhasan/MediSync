from django.urls import path
from .views import (
    PatientMedicineUsedAPIView,
    PrecheckedListCreateAPI,
    PrecheckedRetrieveAPI,
    PrecheckedUpdateByIdAPI,
    PrecheckedUpdateByAppointmentAPI,
    patient_active_medicines_today_api,
    PrecheckedByAppointmentAPIView,
    PrescriptionCreateAPI, 
    PrescriptionDetailAPI,
    PrecheckedIdByAppointmentAPI,
    DoctorPreviousPrescriptionsAPI,
    PatientPreviousPrescriptionsAPI,
    PatientPrescriptionListAPI,
    PrescriptionMedicinesAPI,
)
 
urlpatterns = [
    # all + filter by prescription_id + create
    path("prechecked/", 
        PrecheckedListCreateAPI.as_view()),

    # retrieve by prechecked id (like ViewSet retrieve)
    path("prechecked/<int:pk>/",  
        PrecheckedRetrieveAPI.as_view()),

    # update by Prechecked id (your custom endpoint)
    path("prechecked/<int:prechecked_id>/update/", 
        PrecheckedUpdateByIdAPI.as_view()),

    # update by Appointment id (your custom endpoint)
    path("appointment/<int:appointment_id>/prechecked/update/", 
        PrecheckedUpdateByAppointmentAPI.as_view()),
    
    path(
        "patients/<int:patient_id>/medicine-used/",
        PatientMedicineUsedAPIView.as_view(),
    ),
    path( 
        "patients/<int:patient_id>/active-medicines-today/",
        patient_active_medicines_today_api, 
        name="patient-active-medicines-today",
    ),
    path(
        "prechecked/by-appointment/<int:appointment_id>/",
        PrecheckedByAppointmentAPIView.as_view(),
        name="prechecked-by-appointment",
    ),
    path("", PrescriptionCreateAPI.as_view(), name="prescription-create"),
    path("<int:pk>/", PrescriptionDetailAPI.as_view(), name="prescription-detail"),
    path(
        "prechecked/by-appointment/<int:appointment_id>/",
        PrecheckedIdByAppointmentAPI.as_view(),
        name="prechecked-by-appointment",
    ),
    path(
        "doctors/<int:doctor_id>/previous-prescriptions/",
        DoctorPreviousPrescriptionsAPI.as_view(),
        name="doctor-previous-prescriptions",
    ),
    path(
        "patients/<int:patient_id>/previous-prescriptions/",
        PatientPreviousPrescriptionsAPI.as_view(),
        name="patient-previous-prescriptions",
    ),
    path("patients/<int:patient_id>/prescriptions/", PatientPrescriptionListAPI.as_view()),
    path("<int:prescription_id>/medicines/", PrescriptionMedicinesAPI.as_view()),
]