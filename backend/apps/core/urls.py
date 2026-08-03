from django.urls import path
from .views import DashboardView, HealthView, SystemSettingsView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("system-settings/", SystemSettingsView.as_view(), name="system-settings"),
]
