from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "receiver_id", "receiver_type", "is_read", "created_at", "read_at")
    list_filter = ("is_read", "receiver_type")
    search_fields = ("id", "receiver_id", "details")
    ordering = ("-created_at",)