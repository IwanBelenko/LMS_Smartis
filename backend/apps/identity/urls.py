from django.urls import path
from .views import DepartmentListCreateView, LoginView, LogoutView, MeView, UserListCreateView

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("departments/", DepartmentListCreateView.as_view(), name="departments"),
    path("users/", UserListCreateView.as_view(), name="users"),
]
