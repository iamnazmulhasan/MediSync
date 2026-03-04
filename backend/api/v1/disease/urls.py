
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalConditionViewSet

router = DefaultRouter()
router.register(r"medical-conditions", MedicalConditionViewSet, basename="medical-conditions")

urlpatterns = [
    path("", include(router.urls)),
] 