from django.urls import path, include
from api.v1.authentication.views import PersonalProfileLoginView, ChangePasswordAPIView

urlpatterns = [
    path("login/", PersonalProfileLoginView.as_view()),
    path("change-password/", ChangePasswordAPIView.as_view()),
]
  