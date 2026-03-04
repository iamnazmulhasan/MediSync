from django.db import models


class Person(models.Model):
    nid = models.CharField(max_length=20, unique=True, null=True, blank=True)
    name = models.CharField(max_length=100)
    gender = models.CharField(null=True,max_length=20)
    dob = models.DateField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    email = models.CharField(max_length=100, unique=True, null=True, blank=True)
    mobile = models.CharField(max_length=20, unique=True, null=True, blank=True)
    password = models.CharField(max_length=128)
 
    class Meta:
        db_table = "Person"

    def __str__(self):
        return self.name


class Patient(models.Model):
    person = models.OneToOneField(
        Person, 
        on_delete=models.PROTECT,
        related_name="patient",
        db_column="person_id",
    )
    chronic_diseases = models.TextField(null=True, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "Patient"

    def __str__(self):
        return f"Patient({self.person_id})"


class Doctor(models.Model):
    person = models.OneToOneField(
        Person,
        on_delete=models.PROTECT,
        related_name="doctor",
        db_column="person_id",
    ) 
    department = models.ForeignKey(
        "core.DoctorType",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )  
    designation = models.CharField(null=True, max_length=255)
    location = models.CharField(null=True, max_length=255, blank=True)
    education = models.TextField(null=True, blank=True)
    average_time = models.IntegerField(null=True, blank=True)
    appointment_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    daily_patient_limit = models.IntegerField(null=True, blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=False)

    class Meta:
        db_table = "Doctor"
        indexes = [
            models.Index(fields=["person"], name="doctor_person_idx"),
        ]

    def __str__(self):
        return f"Dr. {self.person.name}"
 

class DoctorAvailability(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="availabilities")
    week_day = models.ForeignKey("core.WeekDay", on_delete=models.PROTECT, related_name="doctor_availabilities")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    class Meta:
        db_table = "DoctorAvailability"
        constraints = [
            models.UniqueConstraint(fields=["doctor", "week_day"], name="pk_doctoravailability_doctor_weekday")
        ] 

    def __str__(self):
        return f"{self.doctor_id} - {self.week_day_id}"


class DoctorOffDay(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.PROTECT, related_name="off_days")
    date = models.DateField()

    class Meta:
        db_table = "DoctorOffDay"
        constraints = [
            models.UniqueConstraint(fields=["doctor", "date"], name="pk_doctoroffday_doctor_date")
        ]

    def __str__(self):
        return f"{self.doctor_id} off {self.date}"

 
class Receptionist(models.Model):
    person = models.ForeignKey(
        Person,
        on_delete=models.PROTECT,
        related_name="receptionist_roles",
        db_column="person_id",
        null=True,
        blank=True,
    )
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "Receptionist"
        indexes = [
            models.Index(fields=["person"], name="receptionist_person_idx"),
        ]

    def __str__(self):
        return f"Receptionist({self.person_id})"


class Officer(models.Model):
    person = models.ForeignKey(
        Person,
        on_delete=models.PROTECT,
        related_name="officer_roles",
        db_column="person_id",
        null=True,
        blank=True, 
    )
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "Officer"
        indexes = [
            models.Index(fields=["person"], name="officer_person_idx"),
        ]

    def __str__(self):
        return f"Officer({self.person_id})"
