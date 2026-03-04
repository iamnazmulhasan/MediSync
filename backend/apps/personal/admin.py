from django.contrib import admin
from apps.personal.models import Receptionist, Officer, Person, Doctor, Patient, DoctorAvailability

admin.site.register(Patient)
admin.site.register(Doctor)
admin.site.register(DoctorAvailability)

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "mobile")
    search_fields = ("name", "email", "mobile")
    
    
@admin.register(Receptionist)
class ReceptionistAdmin(admin.ModelAdmin):
    autocomplete_fields = ("person",) 
    list_display = ("id", "person", "person_email", "active")
    search_fields = ("id", "person__name", "person__email", "person__mobile")

    @admin.display(description="Email")
    def person_email(self, obj):
        return obj.person.email if obj.person else ""
  
    
@admin.register(Officer)
class OfficerAdmin(admin.ModelAdmin):
    autocomplete_fields = ("person",) 
    list_display = ("id", "person", "person_email", "active")
    search_fields = ("id", "person__name", "person__email", "person__mobile")

    @admin.display(description="Email")
    def person_email(self, obj):
        return obj.person.email if obj.person else ""
    
