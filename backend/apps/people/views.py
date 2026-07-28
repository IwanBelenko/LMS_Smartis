from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AuditEvent,
    Candidate,
    CandidateStage,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Position,
)
from .permissions import IsHcmUser, IsRecruiter
from .serializers import (
    CandidateSerializer,
    CandidateStageSerializer,
    EmployeeDocumentSerializer,
    EmployeeGoalSerializer,
    EmployeeLearningSerializer,
    EmployeeProfileSerializer,
    EmployeeProfileWriteSerializer,
    EmploymentEventSerializer,
    PositionSerializer,
)


class EmployeeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsHcmUser]

    def get_serializer_class(self):
        return EmployeeProfileWriteSerializer if self.request.method == "POST" else EmployeeProfileSerializer

    def get_queryset(self):
        queryset = EmployeeProfile.objects.select_related("user__department", "position")
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            EmployeeProfileSerializer(serializer.instance, context={"request": request}).data,
            status=201,
        )


class EmployeeDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsHcmUser]

    def get_queryset(self):
        return EmployeeProfile.objects.select_related("user__department", "position")

    def get_serializer_class(self):
        return EmployeeProfileSerializer if self.request.method == "GET" else EmployeeProfileWriteSerializer

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        serializer.save()
        AuditEvent.objects.create(
            actor=request.user, entity_type="employee", entity_id=str(profile.pk), action="updated"
        )
        return Response(EmployeeProfileSerializer(profile, context={"request": request}).data)


class EmployeeScopedMixin:
    permission_classes = [IsHcmUser]

    def get_employee(self):
        queryset = EmployeeProfile.objects.select_related("user__department")
        return get_object_or_404(queryset, pk=self.kwargs["employee_id"])


class EmployeeGoalListCreateView(EmployeeScopedMixin, generics.ListCreateAPIView):
    serializer_class = EmployeeGoalSerializer

    def get_queryset(self):
        return EmployeeGoal.objects.filter(employee=self.get_employee())

    def perform_create(self, serializer):
        goal = serializer.save(employee=self.get_employee())
        AuditEvent.objects.create(actor=self.request.user, entity_type="employee_goal", entity_id=str(goal.pk), action="created")


class EmploymentEventListCreateView(EmployeeScopedMixin, generics.ListCreateAPIView):
    serializer_class = EmploymentEventSerializer

    def get_queryset(self):
        return EmploymentEvent.objects.filter(employee=self.get_employee()).select_related("created_by")

    def perform_create(self, serializer):
        event = serializer.save(employee=self.get_employee(), created_by=self.request.user)
        AuditEvent.objects.create(actor=self.request.user, entity_type="employment_event", entity_id=str(event.pk), action="created")


class EmployeeLearningListCreateView(EmployeeScopedMixin, generics.ListCreateAPIView):
    serializer_class = EmployeeLearningSerializer

    def get_queryset(self):
        return EmployeeLearning.objects.filter(employee=self.get_employee()).select_related("course")

    def perform_create(self, serializer):
        assignment = serializer.save(employee=self.get_employee())
        AuditEvent.objects.create(actor=self.request.user, entity_type="employee_learning", entity_id=str(assignment.pk), action="created")


class EmployeeDocumentListCreateView(EmployeeScopedMixin, generics.ListCreateAPIView):
    serializer_class = EmployeeDocumentSerializer

    def get_queryset(self):
        return EmployeeDocument.objects.filter(employee=self.get_employee())

    def perform_create(self, serializer):
        document = serializer.save(employee=self.get_employee())
        AuditEvent.objects.create(actor=self.request.user, entity_type="employee_document", entity_id=str(document.pk), action="created")


class EmployeeGoalDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployeeGoalSerializer
    permission_classes = [IsHcmUser]

    def get_queryset(self):
        return EmployeeGoal.objects.select_related("employee__user")


class EmployeeLearningDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployeeLearningSerializer
    permission_classes = [IsHcmUser]

    def get_queryset(self):
        return EmployeeLearning.objects.select_related("employee__user", "course")


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


class CandidateDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CandidateSerializer
    permission_classes = [IsRecruiter]
    queryset = Candidate.objects.select_related("stage", "department", "recruiter")

    def perform_update(self, serializer):
        candidate = serializer.save()
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="candidate", entity_id=str(candidate.pk), action="updated"
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
        candidates = Candidate.objects.all()
        return Response(
            {
                "employees_total": employees.exclude(status=EmployeeProfile.Status.DISMISSED).count(),
                "on_probation": employees.filter(status=EmployeeProfile.Status.PROBATION).count(),
                "average_development_progress": round(
                    sum(employees.values_list("development_progress", flat=True)) / max(employees.count(), 1)
                ),
                "candidates_total": candidates.count(),
                "open_positions": candidates.values("desired_position").distinct().count(),
            }
        )
