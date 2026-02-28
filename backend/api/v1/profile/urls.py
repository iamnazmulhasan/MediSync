from django.urls import path, include
from api.v1.profile.views import(
    ProfileCreateView, 
    CheckAvailableProfileView, 
    ProfileUpdateView, 
    ProfileListAPIView, 
    AllDoctorOfType,
    DoctorOffDayListCreateAPIView,
    DoctorOffDayDeleteAPIView,
    DoctorAvailabilityBulkAPIView,
    PersonRolesAPIView,
    DoctorDetailsAPI,
    PatientDetailsAPI,
    doctors_list_api,
    profile_search_by_email_api,
)

urlpatterns = [
    path("", ProfileCreateView.as_view()),
    path("available-profile/", CheckAvailableProfileView.as_view()),
    path("update/", ProfileUpdateView.as_view()),
    path("all-profile/", ProfileListAPIView.as_view()),  
    path("all-doctor-of-type/", AllDoctorOfType.as_view()),  
    path("doctor/offday/",  DoctorOffDayListCreateAPIView.as_view()),  
    path("doctor/offday/<int:pk>/",  DoctorOffDayDeleteAPIView.as_view()), 
    path(
        "doctors/<int:doctor_id>/availabilities/bulk/",
        DoctorAvailabilityBulkAPIView.as_view()
    ),
    path("profiles/by-person/<int:person_id>/", PersonRolesAPIView.as_view()),
    path("doctor/details/", DoctorDetailsAPI.as_view()),
    path("patient/details/", PatientDetailsAPI.as_view()),
    path("doctors/", doctors_list_api, name="doctors_list_api"),
    path("search-by-email/", profile_search_by_email_api),
] 
  