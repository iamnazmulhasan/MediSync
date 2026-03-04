"""
    To update API's version, we will just need to import urls from api.vn instead of api.v1
"""
from django.contrib import admin
from django.urls import path, include
from api.v1 import urls as api_urls
from apps.mail import urls as mail_urls

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_urls)),
    path('mail/', include(mail_urls)),
    path('__debug__/', include('debug_toolbar.urls')),
]
