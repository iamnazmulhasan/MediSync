from django.db import models


class Appointment(models.Model):
    patient = models.ForeignKey("personal.Patient", on_delete=models.PROTECT, related_name="appointments")
    doctor = models.ForeignKey("personal.Doctor", on_delete=models.PROTECT, related_name="appointments")
    appointment_date = models.DateField()
    time = models.TimeField(null=True)
    status = models.ForeignKey("core.StatusCode", on_delete=models.PROTECT, null=True, blank=True)
    type = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Appointment afspraak type, e.g., Report Analysis, Follow-up, New Patient"
    ) 
    class Meta: 
        db_table = "Appointment"
 
    def __str__(self):
        return f"Appt #{self.pk} ({self.appointment_date})"


class Prescription(models.Model):
    appointment = models.ForeignKey(
        "prescription.Appointment",
        on_delete=models.PROTECT,
        related_name="prescriptions",
        null=True,
        blank=True,
    )
    dx = models.TextField(null=True, blank=True)
    cc = models.TextField(null=True, blank=True)
    prechecked = models.BooleanField(default=False)
    prechecked_id = models.ForeignKey(
        "prescription.Prechecked",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    suggestions = models.TextField(blank=True, null=True)
    next_visit = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = "Prescription"

    def __str__(self):
        return f"Prescription #{self.pk}"
    
    
class Prechecked(models.Model):
    appointment = models.ForeignKey(
        "prescription.Appointment",
        on_delete=models.PROTECT,
        related_name="prechecked_records",
        null=True,
        blank=True,
        db_column="appointment_id",
    ) 
    prescription_id = models.ForeignKey(
        "prescription.Prescription",
        on_delete=models.PROTECT,
        related_name="prescriptions",
        null=True,
        blank=True,
        db_column="prescription_id",
    ) 
    bp = models.TextField(null=True, blank=True)
    pulse = models.TextField(null=True, blank=True)
    weight = models.TextField(null=True, blank=True)
    height = models.TextField(null=True, blank=True)
    temperature = models.TextField(null=True, blank=True)
    spo2 = models.TextField(null=True, blank=True)
    heart = models.TextField(null=True, blank=True)
    lungs = models.TextField(null=True, blank=True)
    abd = models.TextField(null=True, blank=True)
    anemia = models.TextField(null=True, blank=True)
    jaundice = models.TextField(null=True, blank=True)
    cyanosis = models.TextField(null=True, blank=True)
    rbs = models.TextField(null=True, blank=True)
    bmi = models.TextField(null=True, blank=True)
    bmr = models.TextField(null=True, blank=True)
    family_disease_history = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = "Prechecked"
        


class PrescribedMedicine(models.Model):
    prescription = models.ForeignKey("prescription.Prescription", on_delete=models.PROTECT, related_name="medicines")
    medicine = models.ForeignKey("core.Medicine", on_delete=models.PROTECT, related_name="prescriptions")
    uses_process = models.TextField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "PrescribedMedicine"
        indexes = [
            models.Index(fields=["prescription"], name="prescmed_prescription_idx"),
        ]
 
    def __str__(self):
        return f"{self.prescription_id} -> {self.medicine_id}"


class PrescribedTest(models.Model):
    prescription = models.ForeignKey(
        "prescription.Prescription",
        on_delete=models.PROTECT,
        related_name="tests",
        db_index=True,
        null=True,
        blank=True,
    )
    test = models.ForeignKey("core.Test", on_delete=models.PROTECT, related_name="prescribed_tests")

    class Meta:
        db_table = "PrescribedTest"

    def __str__(self):
        return f"{self.prescription_id} -> {self.test_id}"


class TestReport(models.Model):
    prescribed_test = models.OneToOneField(
        "prescription.PrescribedTest",
        on_delete=models.PROTECT,
        related_name="report",
        db_column="prescribed_test_id",
    )
    result = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey("business.Laboratory", on_delete=models.PROTECT, related_name="test_reports")
    status = models.ForeignKey("core.StatusCode", on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        db_table = "TestReport"

    def __str__(self):
        return f"Report for prescribed_test={self.prescribed_test_id}"

