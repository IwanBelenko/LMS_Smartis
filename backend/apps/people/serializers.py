from datetime import date

from rest_framework import serializers

from apps.identity.models import User
from .models import Candidate, CandidateStage, EmployeeProfile, Position


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
            "id", "user", "full_name", "email", "employee_number", "department", "department_name",
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
