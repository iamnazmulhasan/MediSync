from django.urls import path
from .views import (
    ExpectedAppointmentTime, 
    MakeAppointment, 
    AvailableDoctorAPIView, 
    PreviousPatientsOfDoctorAPIView, 
    DoctorAppointmentsByDateAPIView,
    DoctorCancelPendingByDateAPIView,
    PatientUpcomingAppointmentsAPI,
    PatientPreviousAppointmentsAPI,
    AppointmentDeleteAPIView,
    AppointmentUpdateAPIView,
    ConsultationFeeByAppointmentAPI,
)
 
 
urlpatterns = [
    path("get-expected-time/", ExpectedAppointmentTime.as_view()),
    path("make-appointment/", MakeAppointment.as_view()),
    path("doctors/available/", AvailableDoctorAPIView.as_view()),
    path("doctors/<int:doctor_id>/previous-patients/",
        PreviousPatientsOfDoctorAPIView.as_view()
    ), 
    path("doctors/<int:doctor_id>/appointments/",
        DoctorAppointmentsByDateAPIView.as_view()
    ),
    path("doctors/<int:doctor_id>/appointments/",
        DoctorAppointmentsByDateAPIView.as_view()
    ),
    path(
        "doctor/cancel-pending-by-date/",
        DoctorCancelPendingByDateAPIView.as_view(),
    ),
    path("patient/upcoming/", PatientUpcomingAppointmentsAPI.as_view()),
    path("patient/previous/", PatientPreviousAppointmentsAPI.as_view()),
    path(
        "delete-appointment/<int:pk>/",
        AppointmentDeleteAPIView.as_view(),
        name="appointment-delete",
    ),
    path("<int:pk>/", 
        AppointmentUpdateAPIView.as_view(), 
        name="appointment-update"
    ),
    path(
        "<int:appointment_id>/info/",
        ConsultationFeeByAppointmentAPI.as_view(),
        name="consultation-fee-by-appointment",
    ),
] 