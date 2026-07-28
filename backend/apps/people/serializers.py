from datetime import date

from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.identity.models import Department, Invitation, User
from .models import (
    Candidate,
    CandidateStage,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Position,
    StaffPosition,
    Vacancy,
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
    class Meta:
        model = EmployeeDocument
        fields = ["id", "employee", "title", "document_type", "number", "issue_date", "expires_at", "created_at"]
        read_only_fields = ["id", "employee", "created_at"]


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
        terminal_stages = CandidateStage.objects.filter(is_terminal=True)
        return obj.candidates.filter(stage__in=terminal_stages).count()


class CandidateSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    recruiter_name = serializers.CharField(source="recruiter.get_full_name", read_only=True)
    vacancy_title = serializers.CharField(source="vacancy.title", read_only=True)

    class Meta:
        model = Candidate
        fields = [
            "id", "full_name", "email", "phone", "telegram", "desired_position", "desired_salary",
            "vacancy", "vacancy_title",
            "skills", "source", "stage", "stage_name", "department", "department_name",
            "recruiter", "recruiter_name", "next_action_at", "comment", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "recruiter"]

    def validate(self, attrs):
        vacancy = attrs.get("vacancy", getattr(self.instance, "vacancy", None))
        if vacancy:
            attrs["department"] = vacancy.department
            attrs["desired_position"] = vacancy.position.name
        return attrs
