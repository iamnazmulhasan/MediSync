from django.urls import path, include
from api.v1.appointment import urls as appointment_urls
from api.v1.authentication import urls as authentication_urls
from api.v1.core import urls as core_urls
from api.v1.disease import urls as disease_urls
from api.v1.laboratory import urls as laboratory_urls
from api.v1.notification import urls as notification_urls
from api.v1.officer import urls as officer_urls
from api.v1.pharmacy import urls as pharmacy_urls
from api.v1.prescription import urls as prescription_urls
from api.v1.profile import urls as profile_urls
from api.v1.receptionist import urls as receptionist_urls


urlpatterns = [
    path('appointment/', include(appointment_urls)),
    path('auth/', include(authentication_urls)),
    path('core/', include(core_urls)),
    path('disease/', include(disease_urls)),
    path('laboratory/', include(laboratory_urls)),
    path('notification/', include(notification_urls)),
    path('officer/', include(officer_urls)),
    path('pharmacy/', include(pharmacy_urls)),
    path('prescription/', include(prescription_urls)),
    path('profile/', include(profile_urls)),
    path('receptionist/', include(receptionist_urls)),
]
