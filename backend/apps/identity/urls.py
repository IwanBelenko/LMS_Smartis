from django.urls import path
from .views import (
    DepartmentListCreateView,
    InvitationAcceptView,
    InvitationResendView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    UserBlockView,
    UserDetailView,
    UserListCreateView,
    UserRestoreView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/invitations/<uuid:token>/", InvitationAcceptView.as_view(), name="invitation-accept"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("auth/password-reset/<str:uid>/<str:token>/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("departments/", DepartmentListCreateView.as_view(), name="departments"),
    path("users/", UserListCreateView.as_view(), name="users"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/block/", UserBlockView.as_view(), name="user-block"),
    path("users/<int:pk>/restore/", UserRestoreView.as_view(), name="user-restore"),
    path("users/<int:pk>/resend-invitation/", InvitationResendView.as_view(), name="invitation-resend"),
]
