from django.urls import path
from .views import ReceptionistDetailAPI, PatientUpcomingAppointmentsByEmailAPI, DoctorUpcomingAppointmentsByEmailAPI, DoctorNextOffDaysAPI


urlpatterns = [
    path("<int:pk>/", ReceptionistDetailAPI.as_view(), name="receptionist-detail"),
    path(
        "patient/upcoming-appointments/",
        PatientUpcomingAppointmentsByEmailAPI.as_view(),
        name="patient-upcoming-appointments-by-email",
    ),
    path(
        "doctor/upcoming-appointments/",
        DoctorUpcomingAppointmentsByEmailAPI.as_view(),
        name="doctor-upcoming-appointments-by-email",
    ),
    path(
    "doctor/<int:doctor_id>/next-offdays/",
    DoctorNextOffDaysAPI.as_view(),
    name="doctor-next-offdays",
),
]