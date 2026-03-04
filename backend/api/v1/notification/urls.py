from django.urls import path
from api.v1.notification import views

urlpatterns = [
    path("", views.notification_list_api),                 # GET
    path("create/", views.notification_create_api),        # POST
    path("<int:notification_id>/read/", views.notification_mark_read_api),  # POST
    path("transaction/add-money/", views.add_money_api),
    path("transaction/user-transactions/", views.user_transactions_api),
    path("transaction/cashouts/", views.CashOutListAPI.as_view()),
]