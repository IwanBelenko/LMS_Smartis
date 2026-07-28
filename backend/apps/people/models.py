from django.conf import settings
from django.db import models
from pathlib import Path
from uuid import uuid4

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


def employee_document_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"people/{instance.employee_id}/documents/{uuid4().hex}{suffix}"


class EmployeeDocument(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        AWAITING = "awaiting", "Ожидает подтверждения"
        SIGNED = "signed", "Подтверждён"
        DECLINED = "declined", "Отклонён"
        ARCHIVED = "archived", "В архиве"

    employee = models.ForeignKey(EmployeeProfile, related_name="documents", on_delete=models.CASCADE)
    title = models.CharField("Документ", max_length=220)
    document_type = models.CharField("Тип", max_length=120, blank=True)
    number = models.CharField("Номер", max_length=120, blank=True)
    issue_date = models.DateField("Дата выдачи", null=True, blank=True)
    expires_at = models.DateField("Действует до", null=True, blank=True)
    file = models.FileField("Файл", upload_to=employee_document_path, blank=True)
    file_original_name = models.CharField("Исходное имя файла", max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField("Размер файла", default=0)
    file_sha256 = models.CharField("Контрольная сумма", max_length=64, blank=True)
    requires_signature = models.BooleanField("Требует подтверждения", default=False)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.DRAFT)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="uploaded_employee_documents",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    sent_at = models.DateTimeField("Отправлен", null=True, blank=True)
    signed_at = models.DateTimeField("Подтверждён", null=True, blank=True)
    decision_comment = models.TextField("Комментарий сотрудника", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issue_date", "-created_at"]
        verbose_name = "Документ сотрудника"
        verbose_name_plural = "Документы сотрудников"


class AbsenceRequest(models.Model):
    class Type(models.TextChoices):
        VACATION = "vacation", "Отпуск"
        SICK = "sick", "Больничный"
        REMOTE = "remote", "Удалённая работа"
        UNPAID = "unpaid", "За свой счёт"
        OTHER = "other", "Другое"

    class Status(models.TextChoices):
        PENDING = "pending", "На согласовании"
        APPROVED = "approved", "Согласовано"
        REJECTED = "rejected", "Отклонено"
        CANCELLED = "cancelled", "Отменено"

    employee = models.ForeignKey(EmployeeProfile, related_name="absence_requests", on_delete=models.CASCADE)
    absence_type = models.CharField("Тип отсутствия", max_length=20, choices=Type.choices)
    start_date = models.DateField("Начало")
    end_date = models.DateField("Окончание")
    comment = models.TextField("Комментарий", blank=True)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reviewed_absence_requests",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    decision_note = models.TextField("Комментарий согласующего", blank=True)
    reviewed_at = models.DateTimeField("Рассмотрено", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]
        verbose_name = "Заявка на отсутствие"
        verbose_name_plural = "Заявки на отсутствие"

    def __str__(self):
        return f"{self.employee}: {self.get_absence_type_display()}"


class PerformanceCycle(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        ACTIVE = "active", "Идёт оценка"
        COMPLETED = "completed", "Завершён"

    title = models.CharField("Название", max_length=180)
    start_date = models.DateField("Начало")
    end_date = models.DateField("Окончание")
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_performance_cycles",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]
        verbose_name = "Цикл оценки"
        verbose_name_plural = "Циклы оценки"

    def __str__(self):
        return self.title


class Competency(models.Model):
    name = models.CharField("Компетенция", max_length=160, unique=True)
    category = models.CharField("Категория", max_length=120, blank=True)
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        ordering = ["category", "name"]
        verbose_name = "Компетенция"
        verbose_name_plural = "Компетенции"

    def __str__(self):
        return self.name


class PerformanceReview(models.Model):
    class Status(models.TextChoices):
        SELF = "self", "Ожидает самооценки"
        MANAGER = "manager", "Ожидает руководителя"
        COMPLETED = "completed", "Завершена"

    cycle = models.ForeignKey(PerformanceCycle, related_name="reviews", on_delete=models.CASCADE)
    employee = models.ForeignKey(EmployeeProfile, related_name="performance_reviews", on_delete=models.CASCADE)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="performance_reviews",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.SELF)
    self_summary = models.TextField("Итоги сотрудника", blank=True)
    manager_summary = models.TextField("Итоги руководителя", blank=True)
    development_plan = models.TextField("План развития", blank=True)
    self_submitted_at = models.DateTimeField("Самооценка завершена", null=True, blank=True)
    completed_at = models.DateTimeField("Завершена", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["cycle", "employee"], name="unique_cycle_employee_review"),
        ]
        verbose_name = "Оценка сотрудника"
        verbose_name_plural = "Оценки сотрудников"


class PerformanceScore(models.Model):
    review = models.ForeignKey(PerformanceReview, related_name="scores", on_delete=models.CASCADE)
    competency = models.ForeignKey(Competency, related_name="scores", on_delete=models.PROTECT)
    self_score = models.PositiveSmallIntegerField("Самооценка", null=True, blank=True)
    manager_score = models.PositiveSmallIntegerField("Оценка руководителя", null=True, blank=True)
    self_comment = models.TextField("Комментарий сотрудника", blank=True)
    manager_comment = models.TextField("Комментарий руководителя", blank=True)

    class Meta:
        ordering = ["competency__category", "competency__name"]
        constraints = [
            models.UniqueConstraint(fields=["review", "competency"], name="unique_review_competency"),
        ]
        verbose_name = "Оценка компетенции"
        verbose_name_plural = "Оценки компетенций"


class DailyTranscript(models.Model):
    class Source(models.TextChoices):
        PASTE = "paste", "Вставлен текст"
        FILE = "file", "Загружен файл"
        API = "api", "Получено по API"

    title = models.CharField("Название", max_length=220)
    meeting_date = models.DateField("Дата дэйлика")
    department = models.ForeignKey(
        Department,
        related_name="daily_transcripts",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    source = models.CharField("Источник", max_length=20, choices=Source.choices, default=Source.PASTE)
    original_filename = models.CharField("Имя файла", max_length=255, blank=True)
    raw_text = models.TextField("Расшифровка")
    analysis = models.JSONField("Результат анализа", default=dict, blank=True)
    coverage_percent = models.PositiveSmallIntegerField("Покрытие курсами, %", default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="daily_transcripts",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-meeting_date", "-created_at"]
        verbose_name = "Расшифровка дэйлика"
        verbose_name_plural = "Расшифровки дэйликов"

    def __str__(self):
        return self.title


class OnboardingTemplate(models.Model):
    name = models.CharField("Название", max_length=180)
    department = models.ForeignKey(
        Department,
        related_name="onboarding_templates",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    position = models.ForeignKey(
        Position,
        related_name="onboarding_templates",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    learning_path = models.ForeignKey(
        "learning.LearningPath",
        related_name="onboarding_templates",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="onboarding_templates",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    duration_days = models.PositiveSmallIntegerField("Срок адаптации, дней", default=30)
    checklist = models.JSONField("Чек-лист", default=list, blank=True)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Шаблон онбординга"
        verbose_name_plural = "Шаблоны онбординга"

    def __str__(self):
        return self.name


class OnboardingPlan(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "В процессе"
        COMPLETED = "completed", "Завершён"
        CANCELLED = "cancelled", "Отменён"

    employee = models.ForeignKey(EmployeeProfile, related_name="onboarding_plans", on_delete=models.CASCADE)
    template = models.ForeignKey(
        OnboardingTemplate,
        related_name="plans",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    learning_path = models.ForeignKey(
        "learning.LearningPath",
        related_name="onboarding_plans",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="responsible_onboarding_plans",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    checklist = models.JSONField("Чек-лист", default=list, blank=True)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.ACTIVE)
    start_date = models.DateField("Начало")
    due_date = models.DateField("Плановое завершение")
    completed_at = models.DateTimeField("Завершён", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "План онбординга"
        verbose_name_plural = "Планы онбординга"


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


class Vacancy(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Открыта"
        PAUSED = "paused", "Приостановлена"
        CLOSED = "closed", "Закрыта"

    title = models.CharField("Название", max_length=180)
    staff_position = models.ForeignKey(
        StaffPosition,
        related_name="vacancies",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    department = models.ForeignKey(Department, related_name="vacancies", on_delete=models.PROTECT)
    position = models.ForeignKey(Position, related_name="vacancies", on_delete=models.PROTECT)
    openings = models.PositiveIntegerField("Количество мест", default=1)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.OPEN)
    description = models.TextField("Описание", blank=True)
    requirements = models.TextField("Требования", blank=True)
    deadline = models.DateField("Плановая дата закрытия", null=True, blank=True)
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="managed_vacancies",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "-updated_at"]
        verbose_name = "Вакансия"
        verbose_name_plural = "Вакансии"

    def __str__(self):
        return self.title


class Candidate(models.Model):
    full_name = models.CharField("ФИО", max_length=240)
    email = models.EmailField("Email", blank=True)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    desired_position = models.CharField("Позиция", max_length=180)
    desired_salary = models.DecimalField("Ожидания по зарплате", max_digits=12, decimal_places=2, null=True, blank=True)
    vacancy = models.ForeignKey(
        Vacancy,
        related_name="candidates",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
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
    hired_employee = models.OneToOneField(
        EmployeeProfile,
        verbose_name="Оформленный сотрудник",
        related_name="source_candidate",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    hired_at = models.DateTimeField("Оформлен", null=True, blank=True)
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
