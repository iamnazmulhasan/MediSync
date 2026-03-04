from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password, make_password
from apps.personal.models import Person
from apps.business.models import Laboratory, Pharmacy
from .serializers import ChangePasswordSerializer


class PersonalProfileLoginView(APIView):
    """
    POST: Login for personal profile 
    POST /auth/login/
    {
        "email": "x@y.com",
        "password": "****"
    } 
    Response:
    {
        "user_id": 2
    }
    """
    permission_classes = []  # AllowAny

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""

        if email == "":
            return Response(
                {"error": "email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password == "":
            return Response( 
                {"error": "password is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = Person.objects.filter(email=email).first()

        if not person:
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not check_password(password, person.password):
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response(
            {"user_id": person.id},
            status=status.HTTP_200_OK
        )
        
 
class ChangePasswordAPIView(APIView): 
    """
    POST /auth/change-password/
    {
      "type": "person|laboratory|pharmacy",
      "id": 1,
      "new_password": "newStrongPass"
    }
    """
    permission_classes = []  

    MODEL_MAP = {
        "person": Person,
        "laboratory": Laboratory,
        "pharmacy": Pharmacy,
    }

    def post(self, request):
        # 1) check type first
        obj_type = (request.data.get("type") or "").strip().lower()
        if not obj_type:
            return Response({"error": "type is required."}, status=status.HTTP_400_BAD_REQUEST)

        if obj_type not in self.MODEL_MAP:
            return Response(
                {"error": f"Invalid type '{obj_type}'. Allowed: {list(self.MODEL_MAP.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2) validate input
        ser = ChangePasswordSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        obj_id = ser.validated_data["id"]
        new_password = ser.validated_data["new_password"]

        Model = self.MODEL_MAP[obj_type]

        # 3) fetch object
        try:
            obj = Model.objects.get(id=obj_id)
        except Model.DoesNotExist:
            return Response({"error": f"{obj_type} not found."}, status=status.HTTP_404_NOT_FOUND)

        # 4) update password (hashed)
        obj.password = make_password(new_password)
        obj.save(update_fields=["password"])

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)