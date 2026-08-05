from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.people.models import EmployeeProfile, Position
from .models import Department, Invitation, User
from .passwords import generate_temporary_password
from .validators import validate_corporate_email


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "code", "is_active"]
        read_only_fields = ["id"]

    def validate_code(self, value):
        return slugify(value)


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    employee_profile_id = serializers.SerializerMethodField()
    employee_number = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()
    position_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_label",
            "status",
            "status_label",
            "can_view_compensation",
            "department",
            "department_name",
            "employee_profile_id",
            "employee_number",
            "position",
            "position_name",
            "date_joined",
        ]

    def _profile(self, obj):
        try:
            return obj.employee_profile
        except EmployeeProfile.DoesNotExist:
            return None

    def get_employee_profile_id(self, obj):
        profile = self._profile(obj)
        return profile.pk if profile else None

    def get_employee_number(self, obj):
        profile = self._profile(obj)
        return profile.employee_number if profile else ""

    def get_position(self, obj):
        profile = self._profile(obj)
        return profile.position_id if profile else None

    def get_position_name(self, obj):
        profile = self._profile(obj)
        return profile.position.name if profile and profile.position else ""


def _automatic_employee_number(user):
    base = f"AUTO-{user.pk:06d}"
    candidate = base
    suffix = 2
    while EmployeeProfile.objects.filter(employee_number=candidate).exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _save_employee_profile(user, position_marker, employee_number):
    if position_marker is serializers.empty and not employee_number:
        return
    try:
        profile = user.employee_profile
    except EmployeeProfile.DoesNotExist:
        if position_marker in {serializers.empty, None} and not employee_number:
            return
        profile = EmployeeProfile(user=user, employee_number=employee_number or _automatic_employee_number(user))
    if position_marker is not serializers.empty:
        profile.position = position_marker
    if employee_number:
        profile.employee_number = employee_number
    profile.save()


class UserCreateSerializer(serializers.ModelSerializer):
    generate_password = serializers.BooleanField(write_only=True, required=False, default=False)
    position = serializers.PrimaryKeyRelatedField(
        queryset=Position.objects.filter(is_active=True), allow_null=True, required=False, write_only=True,
    )
    employee_number = serializers.CharField(max_length=40, allow_blank=True, required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role", "department",
            "can_view_compensation", "generate_password",
            "position", "employee_number",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        return validate_corporate_email(value)

    def validate(self, attrs):
        role = attrs.get("role", User.Role.EMPLOYEE)
        attrs["can_view_compensation"] = bool(
            role == User.Role.ADMIN
            or (role in {User.Role.HR, User.Role.LEADER} and attrs.get("can_view_compensation", False))
        )
        return attrs

    def validate_employee_number(self, value):
        value = value.strip()
        if value and EmployeeProfile.objects.filter(employee_number=value).exists():
            raise serializers.ValidationError("Такой табельный номер уже используется")
        return value

    @transaction.atomic
    def create(self, validated_data):
        should_generate = validated_data.pop("generate_password", False)
        position = validated_data.pop("position", serializers.empty)
        employee_number = validated_data.pop("employee_number", "")
        temporary_password = generate_temporary_password() if should_generate else None
        user = User.objects.create_user(
            password=temporary_password,
            status=User.Status.ACTIVE if temporary_password else User.Status.INVITED,
            **validated_data,
        )
        if temporary_password:
            user.temporary_password = temporary_password
        else:
            user.set_unusable_password()
            user.save(update_fields=["password"])
            Invitation.objects.create(user=user, created_by=self.context["request"].user)
        _save_employee_profile(user, position, employee_number)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    position = serializers.PrimaryKeyRelatedField(
        queryset=Position.objects.filter(is_active=True), allow_null=True, required=False, write_only=True,
    )
    employee_number = serializers.CharField(max_length=40, allow_blank=True, required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "email", "first_name", "last_name", "role", "department", "can_view_compensation",
            "position", "employee_number",
        ]

    def validate_email(self, value):
        value = validate_corporate_email(value)
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует")
        return value

    def validate_role(self, value):
        request = self.context["request"]
        if self.instance.pk == request.user.pk and value != User.Role.ADMIN:
            raise serializers.ValidationError("Нельзя снять роль администратора у собственной учётной записи")
        if (
            self.instance.role == User.Role.ADMIN
            and value != User.Role.ADMIN
            and self.instance.status == User.Status.ACTIVE
            and not User.objects.filter(
                role=User.Role.ADMIN,
                status=User.Status.ACTIVE,
            ).exclude(pk=self.instance.pk).exists()
        ):
            raise serializers.ValidationError("В системе должен остаться хотя бы один активный администратор")
        return value

    def validate_employee_number(self, value):
        value = value.strip()
        queryset = EmployeeProfile.objects.filter(employee_number=value)
        if hasattr(self.instance, "employee_profile"):
            queryset = queryset.exclude(pk=self.instance.employee_profile.pk)
        if value and queryset.exists():
            raise serializers.ValidationError("Такой табельный номер уже используется")
        return value

    def validate(self, attrs):
        role = attrs.get("role", self.instance.role)
        requested = attrs.get("can_view_compensation", self.instance.can_view_compensation)
        attrs["can_view_compensation"] = bool(
            role == User.Role.ADMIN
            or (role in {User.Role.HR, User.Role.LEADER} and requested)
        )
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        position = validated_data.pop("position", serializers.empty)
        employee_number = validated_data.pop("employee_number", "")
        user = super().update(instance, validated_data)
        _save_employee_profile(user, position, employee_number)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(email=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Неверный email или пароль")
        if user.status == User.Status.INVITED:
            raise serializers.ValidationError("Пароль ещё не назначен. Обратитесь к администратору")
        if user.status == User.Status.BLOCKED:
            raise serializers.ValidationError("Учётная запись заблокирована")
        attrs["user"] = user
        return attrs


class PasswordPairSerializer(serializers.Serializer):
    password = serializers.CharField(trim_whitespace=False, write_only=True)
    password_confirm = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Пароли не совпадают"})
        password_validation.validate_password(attrs["password"], self.context.get("user"))
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False, write_only=True)
    password = serializers.CharField(trim_whitespace=False, write_only=True)
    password_confirm = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_current_password(self, value):
        if not self.context["user"].check_password(value):
            raise serializers.ValidationError("Текущий пароль указан неверно")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Пароли не совпадают"})
        password_validation.validate_password(attrs["password"], self.context["user"])
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
