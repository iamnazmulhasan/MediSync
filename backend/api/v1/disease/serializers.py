# apps/core/serializers.py
from rest_framework import serializers
from apps.disease.models import MedicalCondition

class MedicalConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalCondition
        fields = ["id", "name"] 