from django.contrib import admin
from .models import StatusCode, DoctorsAdvice, DoctorType, WeekDay

# Register your models here.
admin.site.register(StatusCode)
admin.site.register(DoctorsAdvice)
admin.site.register(DoctorType)
admin.site.register(WeekDay)