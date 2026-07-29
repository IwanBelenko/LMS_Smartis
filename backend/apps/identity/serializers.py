from django.contrib.auth import authenticate, password_validation
from django.utils.text import slugify
from rest_framework import serializers

from .models import Department, Invitation, User


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
            "department",
            "department_name",
            "date_joined",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "department"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        user = User.objects.create_user(password=None, **validated_data)
        user.set_unusable_password()
        user.save(update_fields=["password"])
        Invitation.objects.create(user=user, created_by=self.context["request"].user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(email=attrs["email"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Неверный email или пароль")
        if user.status == User.Status.INVITED:
            raise serializers.ValidationError("Сначала активируйте учётную запись по ссылке из письма")
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


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
