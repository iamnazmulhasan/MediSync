from django.db import models
from apps.core.models import Test, Medicine
from apps.personal.models import Person

  
class Laboratory(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    email = models.CharField(max_length=100, unique=True, null=True, blank=True)
    mobile = models.CharField(max_length=15, unique=True, null=True, blank=True)
    owner = models.ForeignKey(
        Person,
        on_delete=models.PROTECT,
        related_name="owned_laboratories",
        db_column="owner_id",
        null=True,
        blank=True,
    )  
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    password = models.CharField(max_length=128, null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "Laboratory"
        indexes = [
            models.Index(fields=["owner"], name="laboratory_owner_idx"),
        ]

    def __str__(self):
        return self.name or f"Laboratory #{self.pk}"


class Pharmacy(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    email = models.CharField(max_length=100, unique=True, null=True, blank=True)
    mobile = models.CharField(max_length=20, unique=True, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    owner = models.ForeignKey(
        Person,
        on_delete=models.PROTECT,
        related_name="owned_pharmacies",
        db_column="owner_id",
        null=True,
        blank=True,
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    password = models.CharField(max_length=128, null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "Pharmacy"
        indexes = [
            models.Index(fields=["owner"], name="pharmacy_owner_idx"),
        ]

    def __str__(self):
        return self.name or f"Pharmacy #{self.pk}"


class PharmacyMedicineAvailability(models.Model):
    medicine = models.ForeignKey(Medicine, on_delete=models.PROTECT, related_name="pharmacy_availabilities")
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.PROTECT, related_name="medicine_availabilities")
    amount = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "PharmacyMedicineAvailability"
        constraints = [
            models.UniqueConstraint(fields=["medicine", "pharmacy"], name="pk_pharmmedavail_medicine_pharmacy")
        ]

    def __str__(self):
        return f"{self.pharmacy_id} has {self.medicine_id}"


class LaboratoryTestAvailability(models.Model):
    lab = models.ForeignKey(Laboratory, on_delete=models.PROTECT, related_name="test_availabilities", db_column="lab_id")
    test = models.ForeignKey(Test, on_delete=models.PROTECT, related_name="lab_availabilities", db_column="test_id")
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "LaboratoryTestAvailability"
        constraints = [
            models.UniqueConstraint(fields=["lab", "test"], name="pk_labtestavail_lab_test")
        ]

    def __str__(self):
        return f"{self.lab_id} offers {self.test_id}"

 