from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
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
    note = models.TextField("Комментарий", blank=True)
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

    class Gender(models.TextChoices):
        FEMALE = "female", "Женский"
        MALE = "male", "Мужской"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="employee_profile",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    first_name = models.CharField("Имя", max_length=150, blank=True)
    last_name = models.CharField("Фамилия", max_length=150, blank=True)
    email = models.EmailField("Корпоративная почта", blank=True)
    department = models.ForeignKey(
        "identity.Department",
        verbose_name="Отдел",
        related_name="employee_profiles",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    employee_number = models.CharField("Табельный номер", max_length=40, unique=True, null=True, blank=True)
    position = models.ForeignKey(Position, related_name="employees", null=True, blank=True, on_delete=models.SET_NULL)
    grade = models.CharField("Грейд", max_length=80, blank=True)
    birth_date = models.DateField("Дата рождения", null=True, blank=True)
    hire_date = models.DateField("Дата выхода", null=True, blank=True)
    dismissal_date = models.DateField("Дата увольнения", null=True, blank=True)
    education = models.TextField("Образование", blank=True)
    competencies = models.TextField("Компетенции", blank=True)
    location = models.CharField("Локация", max_length=120, blank=True)
    legal_entity = models.CharField("Юридическое лицо", max_length=150, blank=True)
    gender = models.CharField("Пол", max_length=10, choices=Gender.choices, blank=True)
    telegram = models.CharField("Telegram", max_length=100, blank=True)
    dms_status = models.CharField("ДМС", max_length=80, blank=True)
    dms_details = models.CharField("Дополнительные сведения по ДМС", max_length=160, blank=True)
    electronic_employment_record = models.BooleanField("Электронная трудовая книжка", null=True, blank=True)
    time_off_balance = models.CharField("Отгулы", max_length=120, blank=True)
    participates_secret_santa = models.BooleanField("Участвует в Тайном Санте", null=True, blank=True)
    birthday_chat_member = models.BooleanField("Добавлен в чат дней рождения", null=True, blank=True)
    company_review_left = models.BooleanField("Оставил отзыв о компании", null=True, blank=True)
    survey_completed = models.BooleanField("Прошёл опрос", null=True, blank=True)
    personal_data_consent_kedo = models.BooleanField("Согласие на ПДн в КЭДО", null=True, blank=True)
    performance_rating = models.DecimalField("Оценка эффективности", max_digits=4, decimal_places=2, null=True, blank=True)
    performance_notes = models.TextField("Комментарий к оценке эффективности", blank=True)
    hr_notes = models.TextField("Заметки HR", blank=True)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.EMPLOYED)
    checklist_score = models.PositiveSmallIntegerField("Чек-лист, %", default=0)
    development_progress = models.PositiveSmallIntegerField("План развития, %", default=0)
    salary_base = models.DecimalField("Оклад", max_digits=12, decimal_places=2, null=True, blank=True)
    monthly_bonus = models.DecimalField("Месячная премия", max_digits=12, decimal_places=2, null=True, blank=True)
    quarterly_bonus = models.DecimalField("Квартальная премия", max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "Карточка сотрудника"
        verbose_name_plural = "Карточки сотрудников"

    def __str__(self):
        if self.user_id:
            return self.user.get_full_name() or self.user.email
        return f"{self.first_name} {self.last_name}".strip() or self.email or f"Сотрудник #{self.pk}"

    def save(self, *args, **kwargs):
        if self.user_id:
            self.first_name = self.user.first_name
            self.last_name = self.user.last_name
            self.email = self.user.email
            self.department = self.user.department
        super().save(*args, **kwargs)


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
        DISMISSED = "dismissed", "Увольнение"
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


class ProductUpdate(models.Model):
    class Status(models.TextChoices):
        ANALYZED = "analyzed", "Готово к проверке"
        APPLIED = "applied", "Применено"

    title = models.CharField("Название обновления", max_length=220)
    description = models.TextField("Описание изменения")
    effective_date = models.DateField("Дата вступления в силу")
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.ANALYZED)
    analysis = models.JSONField("Затронутые материалы", default=dict, blank=True)
    applied_targets = models.JSONField("Обновлённые материалы", default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="product_updates",
        null=True,
        on_delete=models.SET_NULL,
    )
    applied_at = models.DateTimeField("Применено", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-effective_date", "-created_at"]
        verbose_name = "Обновление продукта"
        verbose_name_plural = "Обновления продукта"

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


class CandidateExperience(models.Model):
    candidate = models.ForeignKey(Candidate, related_name="experiences", on_delete=models.CASCADE)
    company = models.CharField("Компания", max_length=180)
    position = models.CharField("Должность", max_length=180)
    started_on = models.DateField("Начало работы", null=True, blank=True)
    ended_on = models.DateField("Окончание работы", null=True, blank=True)
    description = models.TextField("Обязанности и результаты", blank=True)
    position_order = models.PositiveSmallIntegerField("Порядок", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position_order", "-started_on", "-id"]
        verbose_name = "Опыт кандидата"
        verbose_name_plural = "Опыт кандидатов"

    def __str__(self):
        return f"{self.candidate}: {self.company} — {self.position}"


class CandidateComment(models.Model):
    candidate = models.ForeignKey(Candidate, related_name="comments", on_delete=models.CASCADE)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="candidate_comments",
        null=True,
        on_delete=models.SET_NULL,
    )
    text = models.TextField("Комментарий")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Комментарий к кандидату"
        verbose_name_plural = "Комментарии к кандидатам"

    def __str__(self):
        return f"{self.candidate}: {self.text[:60]}"


class CandidateStageEvent(models.Model):
    candidate = models.ForeignKey(Candidate, related_name="stage_events", on_delete=models.CASCADE)
    from_stage = models.ForeignKey(
        CandidateStage,
        related_name="candidate_events_from",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    to_stage = models.ForeignKey(
        CandidateStage,
        related_name="candidate_events_to",
        on_delete=models.PROTECT,
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="candidate_stage_events",
        null=True,
        on_delete=models.SET_NULL,
    )
    note = models.CharField("Причина или примечание", max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Событие этапа кандидата"
        verbose_name_plural = "События этапов кандидатов"

    def __str__(self):
        return f"{self.candidate}: {self.from_stage or 'Создан'} → {self.to_stage}"


class CandidateAssignment(models.Model):
    candidate = models.OneToOneField(Candidate, related_name="assignment", on_delete=models.CASCADE)
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_candidates",
        on_delete=models.CASCADE,
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="candidate_assignments_created",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Назначение кандидата руководителю"
        verbose_name_plural = "Назначения кандидатов руководителям"

    def __str__(self):
        return f"{self.candidate} → {self.leader}"


def candidate_offer_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"recruitment/candidates/{instance.candidate_id}/offers/{uuid4().hex}{suffix}"


def candidate_resume_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"recruitment/candidates/{instance.candidate_id}/resumes/{uuid4().hex}{suffix}"


class CandidateResume(models.Model):
    candidate = models.ForeignKey(Candidate, related_name="resumes", on_delete=models.CASCADE)
    file = models.FileField("Файл резюме", upload_to=candidate_resume_path)
    file_original_name = models.CharField("Исходное имя файла", max_length=255)
    content_type = models.CharField("Тип файла", max_length=120, blank=True)
    file_size = models.PositiveBigIntegerField("Размер файла", default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="uploaded_candidate_resumes",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Резюме кандидата"
        verbose_name_plural = "Резюме кандидатов"

    def __str__(self):
        return f"{self.candidate}: {self.file_original_name}"


@receiver(post_delete, sender=CandidateResume)
def delete_candidate_resume_file(sender, instance, **kwargs):
    if instance.file:
        instance.file.delete(save=False)


class CandidateOffer(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PENDING = "pending", "На согласовании"
        APPROVED = "approved", "Согласован"
        ACCEPTED = "accepted", "Принят кандидатом"
        DECLINED = "declined", "Отклонён кандидатом"
        WITHDRAWN = "withdrawn", "Отозван"

    class WorkFormat(models.TextChoices):
        OFFICE = "office", "Офис"
        HYBRID = "hybrid", "Гибрид"
        REMOTE = "remote", "Удалённо"

    candidate = models.ForeignKey(Candidate, related_name="offers", on_delete=models.CASCADE)
    position_title = models.CharField("Должность", max_length=180)
    salary = models.DecimalField("Оклад", max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateField("Плановая дата выхода", null=True, blank=True)
    valid_until = models.DateField("Действует до", null=True, blank=True)
    probation_months = models.PositiveSmallIntegerField("Испытательный срок, месяцев", default=3)
    work_format = models.CharField("Формат работы", max_length=20, choices=WorkFormat.choices, default=WorkFormat.OFFICE)
    conditions = models.TextField("Условия", blank=True)
    file = models.FileField("Файл оффера", upload_to=candidate_offer_path, blank=True)
    file_original_name = models.CharField("Исходное имя файла", max_length=255, blank=True)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_candidate_offers",
        null=True,
        on_delete=models.SET_NULL,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="approved_candidate_offers",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    approved_at = models.DateTimeField("Согласован", null=True, blank=True)
    responded_at = models.DateTimeField("Ответ кандидата", null=True, blank=True)
    decision_comment = models.TextField("Комментарий к решению", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Оффер кандидату"
        verbose_name_plural = "Офферы кандидатам"

    def __str__(self):
        return f"{self.candidate}: {self.position_title}"


class Interview(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Запланировано"
        IN_PROGRESS = "in_progress", "Проводится"
        COMPLETED = "completed", "Завершено"
        CANCELLED = "cancelled", "Отменено"

    class Format(models.TextChoices):
        ONLINE = "online", "Онлайн"
        OFFICE = "office", "В офисе"
        PHONE = "phone", "Телефон"

    class Decision(models.TextChoices):
        PENDING = "pending", "Решение не принято"
        ADVANCE = "advance", "Перевести дальше"
        HOLD = "hold", "Резерв"
        REJECT = "reject", "Отказать"

    candidate = models.ForeignKey(Candidate, related_name="interviews", on_delete=models.CASCADE)
    title = models.CharField("Название", max_length=220)
    scheduled_at = models.DateTimeField("Дата и время")
    duration_minutes = models.PositiveSmallIntegerField("Продолжительность, минут", default=60)
    format = models.CharField("Формат", max_length=20, choices=Format.choices, default=Format.ONLINE)
    location = models.CharField("Место", max_length=240, blank=True)
    meeting_url = models.URLField("Ссылка на встречу", blank=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_interviews",
        blank=True,
    )
    questions = models.JSONField("Сценарий вопросов", default=list)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    decision = models.CharField("Решение", max_length=20, choices=Decision.choices, default=Decision.PENDING)
    summary = models.TextField("Итоговый комментарий", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_interviews",
        null=True,
        on_delete=models.SET_NULL,
    )
    completed_at = models.DateTimeField("Завершено", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at", "id"]
        verbose_name = "Собеседование"
        verbose_name_plural = "Собеседования"


class InterviewFeedback(models.Model):
    class Recommendation(models.TextChoices):
        ADVANCE = "advance", "Рекомендую дальше"
        HOLD = "hold", "Нужна дополнительная оценка"
        REJECT = "reject", "Не рекомендую"

    interview = models.ForeignKey(Interview, related_name="feedback", on_delete=models.CASCADE)
    participant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="interview_feedback",
        on_delete=models.CASCADE,
    )
    answers = models.JSONField("Оценки по вопросам", default=list)
    overall_score = models.PositiveSmallIntegerField("Общая оценка")
    recommendation = models.CharField("Рекомендация", max_length=20, choices=Recommendation.choices)
    comment = models.TextField("Комментарий", blank=True)
    submitted_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["interview", "participant"],
                name="unique_interview_feedback_participant",
            ),
        ]
        verbose_name = "Оценка собеседования"
        verbose_name_plural = "Оценки собеседований"


class HrImportBatch(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Ручной импорт"
        ONE_C = "one_c", "Выгрузка 1С"

    class Status(models.TextChoices):
        PREVIEW = "preview", "На проверке"
        COMPLETED = "completed", "Завершён"

    source = models.CharField("Источник", max_length=20, choices=Source.choices, default=Source.MANUAL)
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.PREVIEW)
    filename = models.CharField("Имя файла", max_length=255)
    file_sha256 = models.CharField("Хэш файла", max_length=64)
    payload_sha256 = models.CharField("Хэш данных", max_length=64)
    effective_date = models.DateField("Дата среза", null=True, blank=True)
    mapping = models.JSONField("Сопоставление колонок", default=dict, blank=True)
    total_rows = models.PositiveIntegerField("Всего строк", default=0)
    created_count = models.PositiveIntegerField("Создано", default=0)
    updated_count = models.PositiveIntegerField("Обновлено", default=0)
    error_count = models.PositiveIntegerField("Ошибок", default=0)
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="hr_import_batches",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Кадровый импорт"
        verbose_name_plural = "Кадровые импорты"


class LearningImportBatch(models.Model):
    class Source(models.TextChoices):
        ISPRING_FILE = "ispring_file", "Отчёт iSpring"
        ISPRING_API = "ispring_api", "API iSpring"

    class Status(models.TextChoices):
        PREVIEW = "preview", "На проверке"
        COMPLETED = "completed", "Завершён"

    source = models.CharField(
        "Источник",
        max_length=20,
        choices=Source.choices,
        default=Source.ISPRING_FILE,
    )
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.PREVIEW)
    filename = models.CharField("Имя файла", max_length=255)
    file_sha256 = models.CharField("Хэш файла", max_length=64)
    payload_sha256 = models.CharField("Хэш данных", max_length=64)
    mapping = models.JSONField("Сопоставление колонок", default=dict, blank=True)
    total_rows = models.PositiveIntegerField("Всего строк", default=0)
    created_count = models.PositiveIntegerField("Создано", default=0)
    updated_count = models.PositiveIntegerField("Обновлено", default=0)
    error_count = models.PositiveIntegerField("Ошибок", default=0)
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="learning_import_batches",
        null=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Импорт результатов обучения"
        verbose_name_plural = "Импорты результатов обучения"


class AuditEvent(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80)
    action = models.CharField(max_length=80)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class InboxItemState(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="inbox_item_states",
        on_delete=models.CASCADE,
    )
    item_id = models.CharField("Идентификатор уведомления", max_length=160)
    read_at = models.DateTimeField("Прочитано", null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "item_id"], name="unique_user_inbox_item_state"),
        ]
        verbose_name = "Состояние уведомления"
        verbose_name_plural = "Состояния уведомлений"
