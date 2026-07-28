import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class Department(models.Model):
    name = models.CharField("Название", max_length=150, unique=True)
    code = models.SlugField("Код", max_length=80, unique=True)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Отдел"
        verbose_name_plural = "Отделы"

    def __str__(self) -> str:
        return self.name


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email обязателен")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("status", User.Status.ACTIVE)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Администратор"
        HR = "hr", "HR-менеджер"
        AUTHOR = "author", "Автор"
        LEADER = "leader", "Руководитель"
        EMPLOYEE = "employee", "Сотрудник"

    class Status(models.TextChoices):
        INVITED = "invited", "Приглашён"
        ACTIVE = "active", "Активен"
        BLOCKED = "blocked", "Заблокирован"

    username = None
    email = models.EmailField("Email", unique=True)
    role = models.CharField("Роль", max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.INVITED)
    department = models.ForeignKey(
        Department,
        verbose_name="Отдел",
        related_name="members",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self) -> str:
        return self.get_full_name() or self.email


class Invitation(models.Model):
    user = models.OneToOneField(User, related_name="invitation", on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_by = models.ForeignKey(
        User,
        related_name="created_invitations",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
