# apps/core/views.py
from rest_framework import viewsets
from apps.disease.models import MedicalCondition
from .serializers import MedicalConditionSerializer

class MedicalConditionViewSet(viewsets.ModelViewSet):
    queryset = MedicalCondition.objects.all().order_by("id")
    serializer_class = MedicalConditionSerializer