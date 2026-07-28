from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.identity.models import User
from .models import AuditEvent, Candidate, CandidateStage, EmployeeProfile, Position
from .permissions import IsHcmUser, IsRecruiter
from .serializers import CandidateSerializer, CandidateStageSerializer, EmployeeProfileSerializer, PositionSerializer


class EmployeeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsHcmUser]

    def get_queryset(self):
        queryset = EmployeeProfile.objects.select_related("user__department", "position")
        if self.request.user.role == User.Role.LEADER and not self.request.user.is_superuser:
            queryset = queryset.filter(user__department_id=self.request.user.department_id)
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(user__first_name__icontains=query)
                | Q(user__last_name__icontains=query)
                | Q(user__email__icontains=query)
                | Q(user__department__name__icontains=query)
                | Q(position__name__icontains=query)
            )
        return queryset

    def perform_create(self, serializer):
        profile = serializer.save()
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="employee", entity_id=str(profile.pk), action="created"
        )


class CandidateListCreateView(generics.ListCreateAPIView):
    serializer_class = CandidateSerializer
    permission_classes = [IsRecruiter]

    def get_queryset(self):
        queryset = Candidate.objects.select_related("stage", "department", "recruiter")
        stage = self.request.query_params.get("stage")
        return queryset.filter(stage_id=stage) if stage else queryset

    def perform_create(self, serializer):
        candidate = serializer.save(recruiter=self.request.user)
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="candidate", entity_id=str(candidate.pk), action="created"
        )


class CandidateStageListView(generics.ListAPIView):
    serializer_class = CandidateStageSerializer
    permission_classes = [IsRecruiter]
    queryset = CandidateStage.objects.annotate(candidates_count=Count("candidates")).order_by("position", "id")


class PositionListView(generics.ListAPIView):
    serializer_class = PositionSerializer
    permission_classes = [IsHcmUser]
    queryset = Position.objects.filter(is_active=True)


class HcmSummaryView(APIView):
    permission_classes = [IsHcmUser]

    def get(self, request):
        employees = EmployeeProfile.objects.all()
        if request.user.role == User.Role.LEADER and not request.user.is_superuser:
            employees = employees.filter(user__department_id=request.user.department_id)
        candidates = Candidate.objects.all()
        return Response(
            {
                "employees_total": employees.exclude(status=EmployeeProfile.Status.DISMISSED).count(),
                "on_probation": employees.filter(status=EmployeeProfile.Status.PROBATION).count(),
                "average_development_progress": round(
                    sum(employees.values_list("development_progress", flat=True)) / max(employees.count(), 1)
                ),
                "candidates_total": candidates.count() if request.user.role != User.Role.LEADER else 0,
                "open_positions": candidates.values("desired_position").distinct().count()
                if request.user.role != User.Role.LEADER
                else 0,
            }
        )
