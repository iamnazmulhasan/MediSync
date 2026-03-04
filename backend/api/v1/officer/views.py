from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.shortcuts import get_object_or_404

from apps.personal.models import Officer
from .serializers import OfficerSerializer


class OfficerDetailAPI(APIView):
    """
    GET   /api/officer/<id>/
    PATCH /api/officer/<id>/
    PUT   /api/officer/<id>/
    """

    def get_object(self, pk):
        return get_object_or_404(
            Officer.objects.select_related("person"),
            pk=pk
        )

    def get(self, request, pk):
        obj = self.get_object(pk)
        return Response(OfficerSerializer(obj).data, status=http_status.HTTP_200_OK)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = OfficerSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()

        # ✅ reload so person_name is updated in response
        obj = Officer.objects.select_related("person").get(pk=obj.pk)

        return Response(OfficerSerializer(obj).data, status=http_status.HTTP_200_OK)

    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = OfficerSerializer(obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        obj = Officer.objects.select_related("person").get(pk=obj.pk)
        return Response(OfficerSerializer(obj).data, status=http_status.HTTP_200_OK)
    
    
    
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from apps.personal.models import Doctor, Patient 
from apps.business.models import Laboratory, Pharmacy


MODEL_MAP = {
    "doctor": Doctor,
    "patient": Patient,
    "laboratory": Laboratory,
    "pharmacy": Pharmacy,
}


@api_view(["PATCH"])
def toggle_active_api(request):
    """
    PATCH /api/officer/toggle-active/

    body:
    {
        "user_type": "doctor",
        "user_id": 5,
        "active": true
    }
    """

    user_type = (request.data.get("user_type") or "").lower()
    user_id = request.data.get("user_id")
    active = request.data.get("active")

    if not user_type or not user_id:
        return Response(
            {"detail": "user_type and user_id are required"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    if user_type not in MODEL_MAP:
        return Response(
            {"detail": "Invalid user_type"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    if active is None:
        return Response(
            {"detail": "active (true/false) is required"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )

    Model = MODEL_MAP[user_type]
    obj = Model.objects.filter(pk=int(user_id)).first()

    if not obj:
        return Response(
            {"detail": f"{user_type.capitalize()} not found"},
            status=http_status.HTTP_404_NOT_FOUND,
        )

    obj.active = bool(active)
    obj.save(update_fields=["active"])

    return Response(
        {
            "detail": f"{user_type.capitalize()} updated successfully",
            "id": obj.id,
            "active": obj.active,
        }
    )