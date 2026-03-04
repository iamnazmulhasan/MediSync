from django.db import models


class Notification(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    receiver_id = models.IntegerField(null=True, blank=True)
    receiver_type = models.ForeignKey(
        "core.UserType",
        on_delete=models.PROTECT,
        related_name="notifications",
        null=True,
        blank=True,
    ) 
  
    details = models.TextField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "Notification"
        indexes = [
            models.Index(fields=["receiver_id", "receiver_type"], name="notif_receiver_idx"),
        ]

    def __str__(self):
        return f"Notification #{self.pk}"
