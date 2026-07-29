from datetime import timedelta
import uuid

from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.audit import record_audit
from .emails import send_invitation_email, send_password_reset_email
from .models import Department, Invitation, User
from .permissions import IsAdministrator
from .serializers import (
    DepartmentSerializer,
    LoginSerializer,
    PasswordPairSerializer,
    PasswordResetRequestSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserSerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        permission_classes = [IsAuthenticated] if self.request.method == "GET" else [IsAdministrator]
        return [permission() for permission in permission_classes]


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.select_related("department").order_by("last_name", "first_name", "email")
    permission_classes = [IsAdministrator]

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == "POST" else UserSerializer

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            send_invitation_email(user.invitation)
            record_audit(
                actor=request.user,
                entity_type="user",
                entity_id=user.pk,
                action="created",
                changes={"email": user.email, "role": user.role, "department_id": user.department_id},
                request=request,
            )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.select_related("department")
    permission_classes = [IsAdministrator]

    def get_serializer_class(self):
        return UserSerializer if self.request.method == "GET" else UserUpdateSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        user = self.get_object()
        before = {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "department_id": user.department_id,
        }
        serializer = self.get_serializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        after = {
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "department_id": user.department_id,
        }
        record_audit(
            actor=request.user,
            entity_type="user",
            entity_id=user.pk,
            action="updated",
            changes={
                key: {"before": before[key], "after": value}
                for key, value in after.items()
                if before[key] != value
            },
            request=request,
        )
        return Response(UserSerializer(user).data)


class UserBlockView(APIView):
    permission_classes = [IsAdministrator]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user.pk == request.user.pk:
            return Response(
                {"detail": "Нельзя заблокировать собственную учётную запись"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            user.role == User.Role.ADMIN
            and user.status == User.Status.ACTIVE
            and not User.objects.filter(
                role=User.Role.ADMIN,
                status=User.Status.ACTIVE,
            ).exclude(pk=user.pk).exists()
        ):
            return Response(
                {"detail": "В системе должен остаться хотя бы один активный администратор"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.status = User.Status.BLOCKED
        user.save(update_fields=["status"])
        Token.objects.filter(user=user).delete()
        record_audit(
            actor=request.user,
            entity_type="user",
            entity_id=user.pk,
            action="blocked",
            changes={"email": user.email, "role": user.role},
            request=request,
        )
        return Response(UserSerializer(user).data)


class UserRestoreView(APIView):
    permission_classes = [IsAdministrator]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        profile = getattr(user, "employee_profile", None)
        if profile and profile.status == profile.Status.DISMISSED:
            return Response(
                {"detail": "Сначала измените кадровый статус уволенного сотрудника"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.status = User.Status.ACTIVE if user.has_usable_password() else User.Status.INVITED
        user.save(update_fields=["status"])
        record_audit(
            actor=request.user,
            entity_type="user",
            entity_id=user.pk,
            action="restored",
            changes={"email": user.email, "status": user.status},
            request=request,
        )
        return Response(UserSerializer(user).data)


def _active_invitation(token):
    return get_object_or_404(
        Invitation.objects.select_related("user"),
        token=token,
        accepted_at__isnull=True,
        expires_at__gt=timezone.now(),
        user__status=User.Status.INVITED,
    )


class InvitationAcceptView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation"

    def get(self, request, token):
        invitation = _active_invitation(token)
        return Response({
            "email": invitation.user.email,
            "full_name": invitation.user.get_full_name(),
            "expires_at": invitation.expires_at,
        })

    @transaction.atomic
    def post(self, request, token):
        invitation = _active_invitation(token)
        serializer = PasswordPairSerializer(
            data=request.data,
            context={"user": invitation.user},
        )
        serializer.is_valid(raise_exception=True)
        user = invitation.user
        user.set_password(serializer.validated_data["password"])
        user.status = User.Status.ACTIVE
        user.save(update_fields=["password", "status"])
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        Token.objects.filter(user=user).delete()
        record_audit(
            actor=user,
            entity_type="user",
            entity_id=user.pk,
            action="invitation_accepted",
            changes={"email": user.email},
            request=request,
        )
        return Response({"detail": "Учётная запись активирована"})


class InvitationResendView(APIView):
    permission_classes = [IsAdministrator]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user.status != User.Status.INVITED:
            return Response(
                {"detail": "Повторное приглашение доступно только для пользователей со статусом «Приглашён»"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invitation, _ = Invitation.objects.get_or_create(
            user=user,
            defaults={"created_by": request.user},
        )
        invitation.token = uuid.uuid4()
        invitation.created_by = request.user
        invitation.created_at = timezone.now()
        invitation.expires_at = timezone.now() + timedelta(days=7)
        invitation.accepted_at = None
        invitation.save()
        send_invitation_email(invitation)
        record_audit(
            actor=request.user,
            entity_type="user",
            entity_id=user.pk,
            action="invitation_resent",
            changes={"email": user.email},
            request=request,
        )
        return Response({"detail": "Приглашение отправлено повторно"})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        user = User.objects.filter(email__iexact=email, status=User.Status.ACTIVE).first()
        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            send_password_reset_email(user, uid, token)
        return Response({
            "detail": "Если активная учётная запись найдена, письмо для восстановления отправлено",
        })


def _password_reset_user(uid, token):
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, status=User.Status.ACTIVE)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None
    return user if default_token_generator.check_token(user, token) else None


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def get(self, request, uid, token):
        user = _password_reset_user(uid, token)
        if not user:
            return Response({"detail": "Ссылка недействительна или устарела"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"email": user.email})

    def post(self, request, uid, token):
        user = _password_reset_user(uid, token)
        if not user:
            return Response({"detail": "Ссылка недействительна или устарела"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PasswordPairSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        record_audit(
            actor=user,
            entity_type="user",
            entity_id=user.pk,
            action="password_reset",
            changes={},
            request=request,
        )
        return Response({"detail": "Пароль изменён"})
