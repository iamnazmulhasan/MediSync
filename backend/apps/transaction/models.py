from django.db import models


class Transaction(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    sender_id = models.IntegerField(null=True, blank=True)
    sender_type = models.ForeignKey(
        "core.UserType",
        on_delete=models.PROTECT,
        related_name="sent_transactions",
        db_column="sender_type",
        null=True,
        blank=True,
    )

    receiver_id = models.IntegerField(null=True, blank=True)
    receiver_type = models.ForeignKey(
        "core.UserType",
        on_delete=models.PROTECT,
        related_name="received_transactions",
        db_column="receiver_type",
        null=True,
        blank=True,
    )
 
    transactor_id = models.IntegerField(null=True, blank=True)
    transactor_type = models.ForeignKey(
        "core.UserType",
        on_delete=models.PROTECT,
        related_name="transacted_transactions",
        db_column="transactor_type",
        null=True,
        blank=True,
    ) 

    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "Transaction"
        indexes = [
            models.Index(fields=["sender_id", "sender_type"], name="txn_sender_idx"),
            models.Index(fields=["receiver_id", "receiver_type"], name="txn_receiver_idx"),
        ]

    def __str__(self):
        return f"Txn #{self.pk} amount={self.amount}"


def default_pending_status_id():
    from core.models import StatusCode
    return StatusCode.objects.get(name="pending").id

class CashOut(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    requester_id = models.IntegerField(null=True, blank=True)
    requester_type = models.ForeignKey(
        "core.UserType",
        on_delete=models.PROTECT,
        related_name="cashout_requests_new",
        null=True,
        blank=True, 
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    status = models.ForeignKey(
        "core.StatusCode",
        on_delete=models.PROTECT,
        related_name="cashout_status_new",
        default=default_pending_status_id,
    )

    officer_id = models.IntegerField(null=True, blank=True)
    officer_type = models.ForeignKey(
        "core.UserType",
        on_delete=models.PROTECT,
        related_name="cashout_processed_new",
        null=True,
        blank=True,
    )

    processed_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "CashOut"

    def __str__(self):
        return f"CashOut #{self.pk} - {self.amount}"