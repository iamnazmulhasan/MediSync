from django.contrib import admin
from apps.business.models import Laboratory, Pharmacy

# Register your models here.
@admin.register(Laboratory)
class LaboratoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "mobile", "owner", "active", "balance")
    list_filter = ("active",)
    search_fields = ("name", "email", "mobile", "owner__name", "owner__email", "owner__mobile", "owner__nid")

    autocomplete_fields = ("owner",)  # ✅ search Person by email/nid/mobile when selecting owner


@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "mobile", "owner", "active", "balance", "discount_percentage")
    list_filter = ("active",)
    search_fields = ("name", "email", "mobile", "owner__name", "owner__email", "owner__mobile", "owner__nid")

    autocomplete_fields = ("owner",)  # ✅ search Person by email/nid/mobile when selecting owner