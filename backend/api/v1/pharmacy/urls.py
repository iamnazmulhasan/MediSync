from django.urls import path
from .views import SelfAvailableTestsView, SelfAvailableTestRemoveView, PharmacyRegisterAPI, PharmacyLoginAPI, PharmacyDetailAPI, PharmacyListAPI, PharmacyMeAPI, PharmacyMedicineAvailabilityListAPI, SelfPharmacyMedicinesAPI, SelfPharmacyMedicineUpdateAPI

urlpatterns = [
    path("", PharmacyListAPI.as_view()),
    path("lab/self/tests/", SelfAvailableTestsView.as_view(), name="self-available-tests"),
    path("lab/self/tests/<int:availability_id>/", SelfAvailableTestRemoveView.as_view(), name="self-available-tests-remove"),
    path("register/", PharmacyRegisterAPI.as_view()),
    path("login/", PharmacyLoginAPI.as_view()),
    path("<int:pharmacy_id>/", PharmacyDetailAPI.as_view()),
    path("me/<int:pharmacy_id>/", PharmacyMeAPI.as_view()),
    path(
        "<int:pharmacy_id>/medicine-availability/",
        PharmacyMedicineAvailabilityListAPI.as_view()
    ),
    path("<int:pharmacy_id>/self/medicines/", SelfPharmacyMedicinesAPI.as_view()),
    path("<int:pharmacy_id>/self/medicines/<int:availability_id>/", SelfPharmacyMedicineUpdateAPI.as_view()),
] 