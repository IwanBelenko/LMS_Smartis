from datetime import date
import hashlib
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from apps.identity.models import Department, Invitation, User
from .models import (
    AbsenceRequest,
    Candidate,
    CandidateOffer,
    CandidateStage,
    Competency,
    DailyTranscript,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Interview,
    InterviewFeedback,
    Position,
    StaffPosition,
    Vacancy,
    OnboardingPlan,
    OnboardingTemplate,
    PerformanceCycle,
    PerformanceReview,
    PerformanceScore,
    ProductUpdate,
)


def years_between(start, end):
    if not start:
        return None
    return end.year - start.year - ((end.month, end.day) < (start.month, start.day))


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ["id", "name", "is_active"]


class OrganizationDepartmentSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    manager_name = serializers.CharField(source="manager.get_full_name", read_only=True)
    employee_count = serializers.SerializerMethodField()
    child_count = serializers.IntegerField(source="children.count", read_only=True)
    planned_headcount = serializers.SerializerMethodField()
    vacancies = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "parent", "parent_name", "manager", "manager_name",
            "employee_count", "child_count", "planned_headcount", "vacancies", "is_active",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {"code": {"required": False, "allow_blank": True}}

    def validate_parent(self, value):
        if not self.instance or value is None:
            return value
        visited = set()
        current = value
        while current:
            if current.pk == self.instance.pk:
                raise serializers.ValidationError("Подразделение нельзя вложить само в себя")
            if current.pk in visited:
                break
            visited.add(current.pk)
            current = current.parent
        return value

    def validate_manager(self, value):
        if value and not value.is_active:
            raise serializers.ValidationError("Руководитель должен быть активным пользователем")
        return value

    def create(self, validated_data):
        if not validated_data.get("code"):
            base = slugify(validated_data["name"], allow_unicode=False) or "department"
            candidate = base
            suffix = 2
            while Department.objects.filter(code=candidate).exists():
                candidate = f"{base}-{suffix}"
                suffix += 1
            validated_data["code"] = candidate
        return super().create(validated_data)

    def get_employee_count(self, obj):
        return obj.members.filter(employee_profile__status__in=[
            EmployeeProfile.Status.EMPLOYED,
            EmployeeProfile.Status.PROBATION,
        ]).count()

    def get_planned_headcount(self, obj):
        return sum(obj.staff_positions.filter(is_active=True).values_list("headcount", flat=True))

    def get_vacancies(self, obj):
        return sum(max(item.headcount - item.filled_count, 0) for item in self._staff_rows(obj))

    def _staff_rows(self, obj):
        rows = list(obj.staff_positions.filter(is_active=True).select_related("position"))
        for row in rows:
            row.filled_count = EmployeeProfile.objects.filter(
                user__department=obj,
                position=row.position,
                status__in=[EmployeeProfile.Status.EMPLOYED, EmployeeProfile.Status.PROBATION],
            ).count()
        return rows


class StaffPositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_name = serializers.CharField(source="position.name", read_only=True)
    filled_count = serializers.SerializerMethodField()
    vacancies = serializers.SerializerMethodField()
    open_vacancy_count = serializers.SerializerMethodField()

    class Meta:
        model = StaffPosition
        fields = [
            "id", "department", "department_name", "position", "position_name",
            "headcount", "filled_count", "vacancies", "open_vacancy_count", "note", "is_active",
        ]
        read_only_fields = ["id"]

    def get_filled_count(self, obj):
        return EmployeeProfile.objects.filter(
            user__department=obj.department,
            position=obj.position,
            status__in=[EmployeeProfile.Status.EMPLOYED, EmployeeProfile.Status.PROBATION],
        ).count()

    def get_vacancies(self, obj):
        return max(obj.headcount - self.get_filled_count(obj), 0)

    def get_open_vacancy_count(self, obj):
        return obj.vacancies.filter(status=Vacancy.Status.OPEN).count()


class EmployeeProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    department = serializers.IntegerField(source="user.department_id", read_only=True)
    department_name = serializers.CharField(source="user.department.name", read_only=True)
    position_name = serializers.CharField(source="position.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    age = serializers.SerializerMethodField()
    tenure_years = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeProfile
        fields = [
            "id", "user", "full_name", "first_name", "last_name", "email", "employee_number", "department", "department_name",
            "position", "position_name", "grade", "birth_date", "age", "hire_date", "tenure_years",
            "education", "competencies", "status", "status_label", "checklist_score",
            "development_progress", "salary_base", "monthly_bonus", "quarterly_bonus", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def get_age(self, obj):
        return years_between(obj.birth_date, date.today())

    def get_tenure_years(self, obj):
        return years_between(obj.hire_date, obj.dismissal_date or date.today())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        can_view_salary = bool(
            request
            and (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR})
        )
        if not can_view_salary:
            for field in ("salary_base", "monthly_bonus", "quarterly_bonus"):
                data.pop(field, None)
        return data


class EmployeeProfileWriteSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name", max_length=150)
    last_name = serializers.CharField(source="user.last_name", max_length=150)
    department = serializers.PrimaryKeyRelatedField(
        source="user.department",
        queryset=Department.objects.filter(is_active=True),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = EmployeeProfile
        fields = [
            "email", "first_name", "last_name", "employee_number", "department", "position",
            "grade", "birth_date", "hire_date", "education", "competencies", "status",
            "checklist_score", "development_progress", "salary_base", "monthly_bonus", "quarterly_bonus",
        ]

    def validate_email(self, value):
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.user_id)
        if queryset.exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует")
        return value

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop("user")
        user = User.objects.create_user(
            password=None,
            role=User.Role.EMPLOYEE,
            status=User.Status.INVITED,
            **user_data,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        Invitation.objects.create(user=user, created_by=self.context["request"].user)
        return EmployeeProfile.objects.create(user=user, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        old_department = instance.user.department
        old_position = instance.position
        user_data = validated_data.pop("user", {})
        for field, value in user_data.items():
            setattr(instance.user, field, value)
        if user_data:
            instance.user.save(update_fields=list(user_data))
        instance = super().update(instance, validated_data)
        actor = self.context.get("request").user if self.context.get("request") else None
        today = date.today()
        new_department = instance.user.department
        if old_department != new_department:
            EmploymentEvent.objects.create(
                employee=instance,
                event_type=EmploymentEvent.Type.TRANSFER,
                title=f"Перевод: {old_department or 'Без отдела'} → {new_department or 'Без отдела'}",
                effective_date=today,
                created_by=actor,
            )
        if old_position != instance.position:
            EmploymentEvent.objects.create(
                employee=instance,
                event_type=EmploymentEvent.Type.PROMOTION,
                title=f"Смена должности: {old_position or 'Не указана'} → {instance.position or 'Не указана'}",
                effective_date=today,
                created_by=actor,
            )
        return instance


class EmployeeGoalSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    progress = serializers.IntegerField(min_value=0, max_value=100)

    class Meta:
        model = EmployeeGoal
        fields = ["id", "employee", "title", "description", "due_date", "progress", "status", "status_label", "created_at", "updated_at"]
        read_only_fields = ["id", "employee", "created_at", "updated_at"]


class EmploymentEventSerializer(serializers.ModelSerializer):
    event_type_label = serializers.CharField(source="get_event_type_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = EmploymentEvent
        fields = ["id", "employee", "event_type", "event_type_label", "title", "note", "effective_date", "created_by", "created_by_name", "created_at"]
        read_only_fields = ["id", "employee", "created_by", "created_at"]


class EmployeeLearningSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    course_minutes = serializers.IntegerField(source="course.estimated_minutes", read_only=True)
    course_version = serializers.IntegerField(source="course.version", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    progress = serializers.IntegerField(min_value=0, max_value=100)
    score = serializers.IntegerField(min_value=0, max_value=100, allow_null=True, required=False)

    class Meta:
        model = EmployeeLearning
        fields = [
            "id", "employee", "course", "course_title", "course_minutes", "course_version", "status", "status_label",
            "progress", "score", "assigned_at", "completed_at",
        ]
        read_only_fields = ["id", "employee", "assigned_at"]


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(read_only=True)
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_email = serializers.CharField(source="employee.user.email", read_only=True)
    department_name = serializers.CharField(source="employee.user.department.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)
    file = serializers.FileField(write_only=True, required=False)
    has_file = serializers.SerializerMethodField()
    can_sign = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeDocument
        fields = [
            "id", "employee", "employee_name", "employee_email", "department_name",
            "title", "document_type", "number", "issue_date", "expires_at", "file",
            "file_original_name", "file_size", "file_sha256", "has_file",
            "requires_signature", "status", "status_label", "uploaded_by",
            "uploaded_by_name", "sent_at", "signed_at", "decision_comment",
            "can_sign", "can_manage", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "file_original_name", "file_size", "file_sha256", "status",
            "uploaded_by", "sent_at", "signed_at", "decision_comment", "created_at", "updated_at",
        ]

    def get_has_file(self, obj):
        return bool(obj.file)

    def get_can_sign(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and obj.employee.user_id == request.user.id
            and obj.status == EmployeeDocument.Status.AWAITING
        )

    def get_can_manage(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and (
                request.user.is_superuser
                or request.user.role in {User.Role.ADMIN, User.Role.HR}
            )
        )

    def validate_file(self, value):
        if value.size > settings.MAX_HR_DOCUMENT_UPLOAD_SIZE:
            raise serializers.ValidationError("Файл превышает допустимый размер 20 МБ")
        allowed = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"}
        if Path(value.name).suffix.lower() not in allowed:
            raise serializers.ValidationError("Поддерживаются PDF, Word, Excel, JPG и PNG")
        return value

    def create(self, validated_data):
        uploaded = validated_data.get("file")
        if uploaded:
            digest = hashlib.sha256()
            for chunk in uploaded.chunks():
                digest.update(chunk)
            uploaded.seek(0)
            validated_data["file_original_name"] = Path(uploaded.name).name
            validated_data["file_size"] = uploaded.size
            validated_data["file_sha256"] = digest.hexdigest()
        return super().create(validated_data)


class AbsenceRequestSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeProfile.objects.select_related("user"),
        required=False,
    )
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_email = serializers.CharField(source="employee.user.email", read_only=True)
    department_name = serializers.CharField(source="employee.user.department.name", read_only=True)
    absence_type_label = serializers.CharField(source="get_absence_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.get_full_name", read_only=True)
    days = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = AbsenceRequest
        fields = [
            "id", "employee", "employee_name", "employee_email", "department_name",
            "absence_type", "absence_type_label", "start_date", "end_date", "days",
            "comment", "status", "status_label", "reviewer", "reviewer_name",
            "decision_note", "reviewed_at", "can_review", "can_cancel", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "reviewer", "decision_note", "reviewed_at",
            "created_at", "updated_at",
        ]

    def get_days(self, obj):
        return (obj.end_date - obj.start_date).days + 1

    def _request_user(self):
        request = self.context.get("request")
        return request.user if request else None

    def get_can_review(self, obj):
        user = self._request_user()
        if not user or obj.status != AbsenceRequest.Status.PENDING:
            return False
        if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}:
            return True
        return (
            user.role == User.Role.LEADER
            and user.department_id
            and user.department_id == obj.employee.user.department_id
        )

    def get_can_cancel(self, obj):
        user = self._request_user()
        return bool(
            user
            and obj.status == AbsenceRequest.Status.PENDING
            and obj.employee.user_id == user.id
        )

    def validate_employee(self, value):
        user = self._request_user()
        if user and (user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}):
            return value
        if not user or value.user_id != user.id:
            raise serializers.ValidationError("Можно создать заявку только для себя")
        return value

    def validate(self, attrs):
        user = self._request_user()
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        employee = attrs.get("employee", getattr(self.instance, "employee", None))
        if (
            not self.instance
            and user
            and (user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR})
            and not employee
        ):
            raise serializers.ValidationError({"employee": "Выберите сотрудника"})
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Дата окончания должна быть не раньше даты начала")
        if employee and start_date and end_date:
            overlaps = AbsenceRequest.objects.filter(
                employee=employee,
                status__in=[AbsenceRequest.Status.PENDING, AbsenceRequest.Status.APPROVED],
                start_date__lte=end_date,
                end_date__gte=start_date,
            )
            if self.instance:
                overlaps = overlaps.exclude(pk=self.instance.pk)
            if overlaps.exists():
                raise serializers.ValidationError("На эти даты уже есть активная заявка")
        return attrs


class CompetencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Competency
        fields = ["id", "name", "category", "description", "is_active"]


class PerformanceCycleSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    review_count = serializers.IntegerField(source="reviews.count", read_only=True)
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceCycle
        fields = [
            "id", "title", "start_date", "end_date", "status", "status_label",
            "review_count", "completed_count", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "created_by", "created_at", "updated_at"]

    def get_completed_count(self, obj):
        return obj.reviews.filter(status=PerformanceReview.Status.COMPLETED).count()

    def validate(self, attrs):
        if attrs.get("start_date") and attrs.get("end_date") and attrs["start_date"] > attrs["end_date"]:
            raise serializers.ValidationError("Дата окончания должна быть не раньше даты начала")
        return attrs


class PerformanceScoreSerializer(serializers.ModelSerializer):
    competency_name = serializers.CharField(source="competency.name", read_only=True)
    competency_category = serializers.CharField(source="competency.category", read_only=True)
    competency_description = serializers.CharField(source="competency.description", read_only=True)

    class Meta:
        model = PerformanceScore
        fields = [
            "id", "competency", "competency_name", "competency_category", "competency_description",
            "self_score", "manager_score", "self_comment", "manager_comment",
        ]


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_email = serializers.CharField(source="employee.user.email", read_only=True)
    department_name = serializers.CharField(source="employee.user.department.name", read_only=True)
    position_name = serializers.CharField(source="employee.position.name", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.get_full_name", read_only=True)
    cycle_title = serializers.CharField(source="cycle.title", read_only=True)
    cycle_end_date = serializers.DateField(source="cycle.end_date", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    scores = PerformanceScoreSerializer(many=True, read_only=True)
    self_average = serializers.SerializerMethodField()
    manager_average = serializers.SerializerMethodField()
    can_self_submit = serializers.SerializerMethodField()
    can_manager_submit = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceReview
        fields = [
            "id", "cycle", "cycle_title", "cycle_end_date", "employee", "employee_name",
            "employee_email", "department_name", "position_name", "reviewer", "reviewer_name",
            "status", "status_label", "self_summary", "manager_summary", "development_plan",
            "self_submitted_at", "completed_at", "scores", "self_average", "manager_average",
            "can_self_submit", "can_manager_submit", "created_at", "updated_at",
        ]

    def _average(self, values):
        numbers = [value for value in values if value is not None]
        return round(sum(numbers) / len(numbers), 1) if numbers else None

    def get_self_average(self, obj):
        return self._average(score.self_score for score in obj.scores.all())

    def get_manager_average(self, obj):
        return self._average(score.manager_score for score in obj.scores.all())

    def get_can_self_submit(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and obj.employee.user_id == request.user.id
            and obj.status == PerformanceReview.Status.SELF
        )

    def get_can_manager_submit(self, obj):
        request = self.context.get("request")
        if not request or obj.status != PerformanceReview.Status.MANAGER:
            return False
        return bool(
            request.user.is_superuser
            or request.user.role in {User.Role.ADMIN, User.Role.HR}
            or obj.reviewer_id == request.user.id
        )


class PerformanceSubmissionSerializer(serializers.Serializer):
    scores = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    summary = serializers.CharField(required=False, allow_blank=True)
    development_plan = serializers.CharField(required=False, allow_blank=True)

    def validate_scores(self, value):
        for item in value:
            if not item.get("competency") or not isinstance(item.get("score"), int) or not 1 <= item["score"] <= 5:
                raise serializers.ValidationError("Для каждой компетенции укажите оценку от 1 до 5")
        return value


class DailyTranscriptSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    source_label = serializers.CharField(source="get_source_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    text_preview = serializers.SerializerMethodField()

    class Meta:
        model = DailyTranscript
        fields = [
            "id", "title", "meeting_date", "department", "department_name", "source",
            "source_label", "original_filename", "raw_text", "text_preview", "analysis",
            "coverage_percent", "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "source", "original_filename", "analysis", "coverage_percent",
            "created_by", "created_at", "updated_at",
        ]
        extra_kwargs = {"raw_text": {"write_only": True}}

    def get_text_preview(self, obj):
        compact = " ".join(obj.raw_text.split())
        return compact[:220] + ("…" if len(compact) > 220 else "")


class ProductUpdateSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    affected_courses = serializers.SerializerMethodField()

    class Meta:
        model = ProductUpdate
        fields = [
            "id", "title", "description", "effective_date", "status", "status_label",
            "analysis", "affected_courses", "applied_targets", "created_by",
            "created_by_name", "applied_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "analysis", "applied_targets", "created_by",
            "applied_at", "created_at", "updated_at",
        ]

    def get_affected_courses(self, obj):
        return len(obj.analysis.get("targets", [])) if isinstance(obj.analysis, dict) else 0


class OnboardingTemplateSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_name = serializers.CharField(source="position.name", read_only=True)
    learning_path_name = serializers.CharField(source="learning_path.title", read_only=True)
    responsible_name = serializers.CharField(source="responsible.get_full_name", read_only=True)

    class Meta:
        model = OnboardingTemplate
        fields = [
            "id", "name", "department", "department_name", "position", "position_name",
            "learning_path", "learning_path_name", "responsible", "responsible_name",
            "duration_days", "checklist", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_checklist(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Чек-лист должен быть списком")
        return value


class OnboardingPlanSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source="template.name", read_only=True)
    learning_path_name = serializers.CharField(source="learning_path.title", read_only=True)
    responsible_name = serializers.CharField(source="responsible.get_full_name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = OnboardingPlan
        fields = [
            "id", "employee", "template", "template_name", "learning_path", "learning_path_name",
            "responsible", "responsible_name", "checklist", "status", "status_label",
            "progress", "start_date", "due_date", "completed_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "employee", "template", "learning_path", "responsible", "status_label",
            "progress", "start_date", "due_date", "completed_at", "created_at", "updated_at",
        ]

    def get_progress(self, obj):
        if not obj.checklist:
            return 0
        return round(sum(bool(item.get("done")) for item in obj.checklist) / len(obj.checklist) * 100)

    def validate_checklist(self, value):
        if not isinstance(value, list) or any(not isinstance(item, dict) or not item.get("title") for item in value):
            raise serializers.ValidationError("Некорректный чек-лист")
        return value

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.checklist and all(item.get("done") for item in instance.checklist):
            instance.status = OnboardingPlan.Status.COMPLETED
            instance.completed_at = timezone.now()
            instance.save(update_fields=["status", "completed_at", "updated_at"])
        elif instance.status == OnboardingPlan.Status.COMPLETED:
            instance.status = OnboardingPlan.Status.ACTIVE
            instance.completed_at = None
            instance.save(update_fields=["status", "completed_at", "updated_at"])
        return instance


class CandidateStageSerializer(serializers.ModelSerializer):
    candidates_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CandidateStage
        fields = ["id", "name", "position", "is_terminal", "candidates_count"]


class VacancySerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_name = serializers.CharField(source="position.name", read_only=True)
    recruiter_name = serializers.CharField(source="recruiter.get_full_name", read_only=True)
    candidates_count = serializers.IntegerField(source="candidates.count", read_only=True)
    hired_count = serializers.SerializerMethodField()

    class Meta:
        model = Vacancy
        fields = [
            "id", "title", "staff_position", "department", "department_name", "position",
            "position_name", "openings", "status", "status_label", "description",
            "requirements", "deadline", "recruiter", "recruiter_name", "candidates_count",
            "hired_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "recruiter", "created_at", "updated_at"]

    def validate(self, attrs):
        staff_position = attrs.get("staff_position", getattr(self.instance, "staff_position", None))
        department = attrs.get("department", getattr(self.instance, "department", None))
        position = attrs.get("position", getattr(self.instance, "position", None))
        if staff_position and (
            staff_position.department_id != getattr(department, "pk", None)
            or staff_position.position_id != getattr(position, "pk", None)
        ):
            raise serializers.ValidationError("Вакансия должна соответствовать выбранной штатной позиции")
        status = attrs.get("status", getattr(self.instance, "status", Vacancy.Status.OPEN))
        if staff_position and status == Vacancy.Status.OPEN:
            existing = Vacancy.objects.filter(staff_position=staff_position, status=Vacancy.Status.OPEN)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError("Для этой штатной позиции уже открыта вакансия")
        return attrs

    def get_hired_count(self, obj):
        return obj.candidates.filter(hired_employee__isnull=False).count()


class CandidateSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    recruiter_name = serializers.CharField(source="recruiter.get_full_name", read_only=True)
    vacancy_title = serializers.CharField(source="vacancy.title", read_only=True)
    hired_employee_name = serializers.CharField(source="hired_employee.user.get_full_name", read_only=True)

    class Meta:
        model = Candidate
        fields = [
            "id", "full_name", "email", "phone", "telegram", "desired_position", "desired_salary",
            "vacancy", "vacancy_title",
            "skills", "source", "stage", "stage_name", "department", "department_name",
            "recruiter", "recruiter_name", "hired_employee", "hired_employee_name", "hired_at",
            "next_action_at", "comment", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "recruiter", "hired_employee", "hired_at"]

    def validate(self, attrs):
        vacancy = attrs.get("vacancy", getattr(self.instance, "vacancy", None))
        if vacancy:
            attrs["department"] = vacancy.department
            attrs["desired_position"] = vacancy.position.name
        return attrs


class CandidateOfferSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source="candidate.full_name", read_only=True)
    vacancy_title = serializers.CharField(source="candidate.vacancy.title", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    work_format_label = serializers.CharField(source="get_work_format_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CandidateOffer
        fields = [
            "id", "candidate", "candidate_name", "vacancy_title", "position_title", "salary",
            "start_date", "valid_until", "probation_months", "work_format", "work_format_label",
            "conditions", "file", "file_url", "file_original_name", "status", "status_label",
            "created_by", "created_by_name", "approved_by", "approved_by_name", "approved_at",
            "responded_at", "decision_comment", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "file_url", "file_original_name", "status", "created_by", "approved_by",
            "approved_at", "responded_at", "decision_comment", "created_at", "updated_at",
        ]
        extra_kwargs = {"file": {"write_only": True, "required": False}}

    def get_file_url(self, obj):
        if not obj.file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url

    def validate_file(self, value):
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Файл оффера не должен превышать 10 МБ")
        if Path(value.name).suffix.lower() not in {".pdf", ".doc", ".docx"}:
            raise serializers.ValidationError("Поддерживаются PDF, DOC и DOCX")
        return value

    def validate(self, attrs):
        candidate = attrs.get("candidate", getattr(self.instance, "candidate", None))
        if candidate and candidate.hired_employee_id:
            raise serializers.ValidationError("Кандидат уже оформлен как сотрудник")
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        valid_until = attrs.get("valid_until", getattr(self.instance, "valid_until", None))
        if start_date and valid_until and valid_until > start_date:
            raise serializers.ValidationError("Срок ответа на оффер должен быть не позже даты выхода")
        return attrs

    def create(self, validated_data):
        uploaded = validated_data.get("file")
        if uploaded:
            validated_data["file_original_name"] = uploaded.name[:255]
        return super().create(validated_data)

    def update(self, instance, validated_data):
        uploaded = validated_data.get("file")
        if uploaded:
            validated_data["file_original_name"] = uploaded.name[:255]
        return super().update(instance, validated_data)


class InterviewFeedbackSerializer(serializers.ModelSerializer):
    participant_name = serializers.SerializerMethodField()
    recommendation_label = serializers.CharField(source="get_recommendation_display", read_only=True)

    class Meta:
        model = InterviewFeedback
        fields = [
            "id", "interview", "participant", "participant_name", "answers",
            "overall_score", "recommendation", "recommendation_label", "comment", "submitted_at",
        ]
        read_only_fields = ["id", "interview", "participant", "submitted_at"]

    def get_participant_name(self, obj):
        return obj.participant.get_full_name() or obj.participant.email

    def validate_overall_score(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Общая оценка должна быть от 1 до 5")
        return value

    def validate(self, attrs):
        interview = self.context["interview"]
        answers = attrs.get("answers", [])
        if not isinstance(answers, list) or len(answers) != len(interview.questions):
            raise serializers.ValidationError({"answers": "Оцените каждый вопрос сценария"})
        for index, answer in enumerate(answers):
            if not isinstance(answer, dict) or not 1 <= int(answer.get("score", 0)) <= 5:
                raise serializers.ValidationError({"answers": f"Оценка вопроса {index + 1} должна быть от 1 до 5"})
            answer["question"] = interview.questions[index]
            answer["score"] = int(answer["score"])
            answer["note"] = str(answer.get("note", "")).strip()
        attrs["answers"] = answers
        return attrs


class InterviewSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source="candidate.full_name", read_only=True)
    vacancy_title = serializers.CharField(source="candidate.vacancy.title", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    format_label = serializers.CharField(source="get_format_display", read_only=True)
    decision_label = serializers.CharField(source="get_decision_display", read_only=True)
    participant_names = serializers.SerializerMethodField()
    feedback = InterviewFeedbackSerializer(many=True, read_only=True)
    average_score = serializers.SerializerMethodField()
    can_submit_feedback = serializers.SerializerMethodField()
    my_feedback_id = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            "id", "candidate", "candidate_name", "vacancy_title", "title", "scheduled_at",
            "duration_minutes", "format", "format_label", "location", "meeting_url",
            "participants", "participant_names", "questions", "status", "status_label",
            "decision", "decision_label", "summary", "feedback", "average_score",
            "can_submit_feedback", "my_feedback_id", "created_by", "completed_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "decision", "summary", "created_by", "completed_at",
            "created_at", "updated_at",
        ]

    def get_participant_names(self, obj):
        return [
            participant.get_full_name() or participant.email
            for participant in obj.participants.all()
        ]

    def get_average_score(self, obj):
        scores = [item.overall_score for item in obj.feedback.all()]
        return round(sum(scores) / len(scores), 1) if scores else None

    def get_can_submit_feedback(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or obj.status in {Interview.Status.COMPLETED, Interview.Status.CANCELLED}:
            return False
        return (
            user.is_superuser
            or user.role in {User.Role.ADMIN, User.Role.HR}
            or obj.participants.filter(pk=user.pk).exists()
        )

    def get_my_feedback_id(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user:
            return None
        feedback = next((item for item in obj.feedback.all() if item.participant_id == user.pk), None)
        return feedback.pk if feedback else None

    def validate_questions(self, value):
        if not isinstance(value, list) or not 1 <= len(value) <= 20:
            raise serializers.ValidationError("Добавьте от 1 до 20 вопросов")
        questions = [str(question).strip() for question in value]
        if any(not question for question in questions):
            raise serializers.ValidationError("Вопросы не должны быть пустыми")
        return questions

    def validate_participants(self, value):
        if not value:
            raise serializers.ValidationError("Добавьте хотя бы одного участника")
        return value


class CandidateHireSerializer(serializers.Serializer):
    corporate_email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    employee_number = serializers.CharField(max_length=40)
    hire_date = serializers.DateField(default=date.today)
    grade = serializers.CharField(max_length=80, required=False, allow_blank=True)

    def validate_corporate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с такой почтой уже существует")
        return value

    def validate_employee_number(self, value):
        if EmployeeProfile.objects.filter(employee_number=value).exists():
            raise serializers.ValidationError("Такой табельный номер уже используется")
        return value

    def validate(self, attrs):
        candidate = self.context["candidate"]
        if candidate.hired_employee_id:
            raise serializers.ValidationError("Кандидат уже оформлен")
        if not candidate.vacancy_id:
            raise serializers.ValidationError("Для оформления привяжите кандидата к вакансии")
        if not candidate.stage.is_terminal:
            raise serializers.ValidationError("Оформление доступно только на финальном этапе")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        candidate = self.context["candidate"]
        actor = self.context["request"].user
        vacancy = candidate.vacancy
        user = User.objects.create_user(
            email=validated_data["corporate_email"],
            password=None,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=User.Role.EMPLOYEE,
            status=User.Status.INVITED,
            department=vacancy.department,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        Invitation.objects.create(user=user, created_by=actor)
        profile = EmployeeProfile.objects.create(
            user=user,
            employee_number=validated_data["employee_number"],
            position=vacancy.position,
            grade=validated_data.get("grade", ""),
            hire_date=validated_data["hire_date"],
            status=EmployeeProfile.Status.EMPLOYED,
        )
        EmploymentEvent.objects.create(
            employee=profile,
            event_type=EmploymentEvent.Type.HIRED,
            title=f"Принят на должность «{vacancy.position.name}»",
            note=f"Оформлен из вакансии «{vacancy.title}»",
            effective_date=validated_data["hire_date"],
            created_by=actor,
        )
        candidate.hired_employee = profile
        candidate.hired_at = timezone.now()
        candidate.save(update_fields=["hired_employee", "hired_at", "updated_at"])
        from .services import assign_onboarding
        assign_onboarding(profile)
        if vacancy.candidates.filter(hired_employee__isnull=False).count() >= vacancy.openings:
            vacancy.status = Vacancy.Status.CLOSED
            vacancy.save(update_fields=["status", "updated_at"])
        return profile
