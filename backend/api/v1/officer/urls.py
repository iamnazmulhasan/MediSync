from django.urls import path
from .views import OfficerDetailAPI, toggle_active_api

urlpatterns = [
    path("<int:pk>/", OfficerDetailAPI.as_view(), name="officer-detail"),
    path("toggle-active/", toggle_active_api),
]