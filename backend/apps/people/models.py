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


class StaffPosition(models.Model):
    department = models.ForeignKey(Department, related_name="staff_positions", on_delete=models.CASCADE)
    position = models.ForeignKey(Position, related_name="staff_positions", on_delete=models.PROTECT)
    headcount = models.PositiveIntegerField("Штатных единиц", default=1)
    note = models.CharField("Комментарий", max_length=240, blank=True)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        ordering = ["department__name", "position__name"]
        constraints = [
            models.UniqueConstraint(fields=["department", "position"], name="unique_department_staff_position"),
        ]
        verbose_name = "Штатная позиция"
        verbose_name_plural = "Штатные позиции"

    def __str__(self):
        return f"{self.department}: {self.position}"


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


class EmployeeGoal(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Запланирована"
        IN_PROGRESS = "in_progress", "В работе"
        COMPLETED = "completed", "Выполнена"

    employee = models.ForeignKey(EmployeeProfile, related_name="goals", on_delete=models.CASCADE)
    title = models.CharField("Цель", max_length=220)
    description = models.TextField("Описание", blank=True)
    due_date = models.DateField("Срок", null=True, blank=True)
    progress = models.PositiveSmallIntegerField("Прогресс, %", default=0)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.PLANNED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "due_date", "-created_at"]
        verbose_name = "Цель развития"
        verbose_name_plural = "Цели развития"


class EmploymentEvent(models.Model):
    class Type(models.TextChoices):
        HIRED = "hired", "Приём"
        TRANSFER = "transfer", "Перевод"
        PROMOTION = "promotion", "Повышение"
        REVIEW = "review", "Оценка"
        OTHER = "other", "Другое"

    employee = models.ForeignKey(EmployeeProfile, related_name="employment_events", on_delete=models.CASCADE)
    event_type = models.CharField("Тип", max_length=20, choices=Type.choices, default=Type.OTHER)
    title = models.CharField("Событие", max_length=220)
    note = models.TextField("Комментарий", blank=True)
    effective_date = models.DateField("Дата")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_employment_events",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-effective_date", "-created_at"]
        verbose_name = "Кадровое событие"
        verbose_name_plural = "Кадровые события"


class EmployeeLearning(models.Model):
    class Status(models.TextChoices):
        ASSIGNED = "assigned", "Назначен"
        IN_PROGRESS = "in_progress", "Проходит"
        COMPLETED = "completed", "Завершён"

    employee = models.ForeignKey(EmployeeProfile, related_name="learning_assignments", on_delete=models.CASCADE)
    course = models.ForeignKey("learning.Course", related_name="employee_assignments", on_delete=models.CASCADE)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.ASSIGNED)
    progress = models.PositiveSmallIntegerField("Прогресс, %", default=0)
    score = models.PositiveSmallIntegerField("Результат, %", null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["status", "-assigned_at"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "course"], name="unique_employee_course_assignment"),
        ]
        verbose_name = "Назначение обучения"
        verbose_name_plural = "Назначения обучения"


class EmployeeDocument(models.Model):
    employee = models.ForeignKey(EmployeeProfile, related_name="documents", on_delete=models.CASCADE)
    title = models.CharField("Документ", max_length=220)
    document_type = models.CharField("Тип", max_length=120, blank=True)
    number = models.CharField("Номер", max_length=120, blank=True)
    issue_date = models.DateField("Дата выдачи", null=True, blank=True)
    expires_at = models.DateField("Действует до", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]
        verbose_name = "Документ сотрудника"
        verbose_name_plural = "Документы сотрудников"


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
