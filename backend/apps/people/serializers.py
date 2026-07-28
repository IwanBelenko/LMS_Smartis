from datetime import date

from django.db import transaction
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
)


def years_between(start, end):
    if not start:
        return None
    return end.year - start.year - ((end.month, end.day) < (start.month, start.day))


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ["id", "name", "is_active"]


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
        user_data = validated_data.pop("user", {})
        for field, value in user_data.items():
            setattr(instance.user, field, value)
        if user_data:
            instance.user.save(update_fields=list(user_data))
        return super().update(instance, validated_data)


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


class CandidateSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    recruiter_name = serializers.CharField(source="recruiter.get_full_name", read_only=True)

    class Meta:
        model = Candidate
        fields = [
            "id", "full_name", "email", "phone", "telegram", "desired_position", "desired_salary",
            "skills", "source", "stage", "stage_name", "department", "department_name",
            "recruiter", "recruiter_name", "next_action_at", "comment", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "recruiter"]
