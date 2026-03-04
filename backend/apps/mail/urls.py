from django.urls import path
from .views import send_test_email

urlpatterns = [
    path("send-mail/", send_test_email),
]