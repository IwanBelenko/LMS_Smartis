from django.conf import settings
from django.db import models

from apps.identity.models import Department


class Position(models.Model):
    name = models.CharField("Должность", max_length=160, unique=True)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Должность"
        verbose_name_plural = "Должности"

    def __str__(self):
        return self.name


class EmployeeProfile(models.Model):
    class Status(models.TextChoices):
        EMPLOYED = "employed", "Работает"
        PROBATION = "probation", "Испытательный срок"
        DISMISSED = "dismissed", "Уволен"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="employee_profile", on_delete=models.CASCADE)
    employee_number = models.CharField("Табельный номер", max_length=40, unique=True)
    position = models.ForeignKey(Position, related_name="employees", null=True, blank=True, on_delete=models.SET_NULL)
    grade = models.CharField("Грейд", max_length=80, blank=True)
    birth_date = models.DateField("Дата рождения", null=True, blank=True)
    hire_date = models.DateField("Дата выхода", null=True, blank=True)
    dismissal_date = models.DateField("Дата увольнения", null=True, blank=True)
    education = models.CharField("Образование", max_length=240, blank=True)
    competencies = models.TextField("Компетенции", blank=True)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.EMPLOYED)
    checklist_score = models.PositiveSmallIntegerField("Чек-лист, %", default=0)
    development_progress = models.PositiveSmallIntegerField("План развития, %", default=0)
    salary_base = models.DecimalField("Оклад", max_digits=12, decimal_places=2, null=True, blank=True)
    monthly_bonus = models.DecimalField("Месячная премия", max_digits=12, decimal_places=2, null=True, blank=True)
    quarterly_bonus = models.DecimalField("Квартальная премия", max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]
        verbose_name = "Карточка сотрудника"
        verbose_name_plural = "Карточки сотрудников"

    def __str__(self):
        return str(self.user)


class CandidateStage(models.Model):
    name = models.CharField("Этап", max_length=120, unique=True)
    position = models.PositiveSmallIntegerField("Порядок", default=0)
    is_terminal = models.BooleanField("Финальный", default=False)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "Этап подбора"
        verbose_name_plural = "Этапы подбора"

    def __str__(self):
        return self.name


class Candidate(models.Model):
    full_name = models.CharField("ФИО", max_length=240)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    desired_position = models.CharField("Позиция", max_length=180)
    desired_salary = models.DecimalField("Ожидания по зарплате", max_digits=12, decimal_places=2, null=True, blank=True)
    skills = models.TextField("Навыки", blank=True)
    source = models.CharField("Источник", max_length=120, blank=True)
    stage = models.ForeignKey(CandidateStage, related_name="candidates", on_delete=models.PROTECT)
    department = models.ForeignKey(Department, related_name="candidates", null=True, blank=True, on_delete=models.SET_NULL)
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="recruiting_candidates",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    next_action_at = models.DateTimeField("Следующее действие", null=True, blank=True)
    comment = models.TextField("Комментарий", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Кандидат"
        verbose_name_plural = "Кандидаты"

    def __str__(self):
        return self.full_name


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    action = models.CharField(max_length=80)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
