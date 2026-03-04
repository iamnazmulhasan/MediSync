from django.db import models


class BusinessInformation(models.Model):
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    appointment_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    laboratory_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pharmacy_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "BusinessInformation"


class StatusCode(models.Model):
    name = models.CharField(max_length=20, unique=True)

    class Meta:
        db_table = "StatusCode"

    def __str__(self):
        return self.name


class WeekDay(models.Model):
    name = models.CharField(max_length=10)

    class Meta:
        db_table = "WeekDay"

    def __str__(self):
        return self.name


class Test(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    warnings = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "Test"

    def __str__(self):
        return self.name or f"Test #{self.pk}"


class MedicineGeneric(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        db_table = "MedicineGeneric"

    def __str__(self):
        return self.name


class Medicine(models.Model):
    name = models.CharField(max_length=100)
    generic = models.ForeignKey(
        MedicineGeneric,
        on_delete=models.PROTECT,
        related_name="medicines",
        db_column="generic_id",
        null=True,
        blank=True,
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    warnings = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "Medicine"

    def __str__(self):
        return self.name
 

class DoctorType(models.Model):
    name = models.CharField(max_length=255, unique=True, db_index=True)

    def __str__(self): 
        return self.name 
    
    class Meta:
        db_table = "DoctorType" 
         
        
class CommonSymptomp(models.Model):
    doctor_type_id = models.IntegerField()
    name = models.CharField(max_length=255, unique=True, db_index=True)
    
    def __str__(self):
        return self.name 
    
    class Meta:
        db_table = "CommonSymptomp" 
        
class DoctorsAdvice(models.Model):
    doctor_type_id = models.ForeignKey(
        "core.DoctorType",
        on_delete=models.PROTECT,
        related_name="advices",
        db_column="doctor_type_id",
    )
    name = models.CharField(max_length=255, db_index=True)
    
    def __str__(self):
        return self.name 
    
    class Meta:
        db_table = "DoctorsAdvice" 


class UserType(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "UserType"

    def __str__(self):
        return self.name