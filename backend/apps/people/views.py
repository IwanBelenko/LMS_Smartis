from datetime import date, timedelta
import mimetypes

from django.http import FileResponse
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.identity.models import Department, User
from apps.learning.models import LearningPath
from .models import (
    AbsenceRequest,
    AuditEvent,
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
    OnboardingPlan,
    OnboardingTemplate,
)
from .permissions import IsHcmUser, IsRecruiter
from .serializers import (
    AbsenceRequestSerializer,
    CandidateSerializer,
    CandidateHireSerializer,
    CandidateStageSerializer,
    EmployeeDocumentSerializer,
    EmployeeGoalSerializer,
    EmployeeLearningSerializer,
    EmployeeProfileSerializer,
    EmployeeProfileWriteSerializer,
    EmploymentEventSerializer,
    PositionSerializer,
    OrganizationDepartmentSerializer,
    StaffPositionSerializer,
    VacancySerializer,
    OnboardingPlanSerializer,
    OnboardingTemplateSerializer,
)
from .services import assign_onboarding


def can_manage_documents(user):
    return user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}


def document_queryset_for(user):
    queryset = EmployeeDocument.objects.select_related(
        "employee__user__department", "uploaded_by"
    )
    return queryset if can_manage_documents(user) else queryset.filter(employee__user=user)


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = document_queryset_for(self.request.user)
        status_filter = self.request.query_params.get("status")
        return queryset.filter(status=status_filter) if status_filter else queryset

    def perform_create(self, serializer):
        if not can_manage_documents(self.request.user):
            raise PermissionDenied("Добавлять кадровые документы могут только HR и администраторы")
        employee_id = self.request.data.get("employee")
        if not employee_id:
            raise ValidationError({"employee": "Выберите сотрудника"})
        employee = get_object_or_404(EmployeeProfile, pk=employee_id)
        document = serializer.save(employee=employee, uploaded_by=self.request.user)
        AuditEvent.objects.create(
            actor=self.request.user,
            entity_type="employee_document",
            entity_id=str(document.pk),
            action="uploaded",
        )


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        document = get_object_or_404(document_queryset_for(request.user), pk=pk)
        if not document.file:
            return Response({"detail": "Файл не загружен"}, status=status.HTTP_404_NOT_FOUND)
        content_type = mimetypes.guess_type(document.file_original_name)[0] or "application/octet-stream"
        return FileResponse(
            document.file.open("rb"),
            content_type=content_type,
            as_attachment=content_type != "application/pdf",
            filename=document.file_original_name or f"document-{document.pk}",
        )


class DocumentSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not can_manage_documents(request.user):
            raise PermissionDenied("Недостаточно прав")
        document = get_object_or_404(EmployeeDocument, pk=pk)
        if not document.requires_signature:
            raise ValidationError("Для документа не требуется подтверждение")
        if not document.file:
            raise ValidationError("Сначала загрузите файл документа")
        if document.status not in {EmployeeDocument.Status.DRAFT, EmployeeDocument.Status.DECLINED}:
            raise ValidationError("Документ уже отправлен или завершён")
        document.status = EmployeeDocument.Status.AWAITING
        document.sent_at = timezone.now()
        document.signed_at = None
        document.decision_comment = ""
        document.save(update_fields=["status", "sent_at", "signed_at", "decision_comment", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user, entity_type="employee_document", entity_id=str(document.pk), action="sent"
        )
        return Response(EmployeeDocumentSerializer(document, context={"request": request}).data)


class DocumentDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(
            EmployeeDocument.objects.select_related("employee__user__department", "uploaded_by"),
            pk=pk,
        )
        if document.employee.user_id != request.user.id:
            raise PermissionDenied("Подтвердить документ может только назначенный сотрудник")
        if document.status != EmployeeDocument.Status.AWAITING:
            raise ValidationError("Документ не ожидает подтверждения")
        action = request.data.get("action")
        if action not in {"sign", "decline"}:
            raise ValidationError("Укажите действие sign или decline")
        document.status = (
            EmployeeDocument.Status.SIGNED if action == "sign" else EmployeeDocument.Status.DECLINED
        )
        document.signed_at = timezone.now() if action == "sign" else None
        document.decision_comment = request.data.get("comment", "")
        document.save(update_fields=["status", "signed_at", "decision_comment", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="employee_document",
            entity_id=str(document.pk),
            action=action,
        )
        return Response(EmployeeDocumentSerializer(document, context={"request": request}).data)


class DocumentArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not can_manage_documents(request.user):
            raise PermissionDenied("Недостаточно прав")
        document = get_object_or_404(EmployeeDocument, pk=pk)
        document.status = EmployeeDocument.Status.ARCHIVED
        document.save(update_fields=["status", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user, entity_type="employee_document", entity_id=str(document.pk), action="archived"
        )
        return Response(EmployeeDocumentSerializer(document, context={"request": request}).data)


def absence_queryset_for(user):
    queryset = AbsenceRequest.objects.select_related(
        "employee__user__department", "reviewer"
    )
    if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}:
        return queryset
    if user.role == User.Role.LEADER and user.department_id:
        return queryset.filter(employee__user__department_id=user.department_id)
    return queryset.filter(employee__user=user)


def can_review_absence(user, absence):
    return (
        user.is_superuser
        or user.role in {User.Role.ADMIN, User.Role.HR}
        or (
            user.role == User.Role.LEADER
            and user.department_id
            and user.department_id == absence.employee.user.department_id
        )
    )


class AbsenceListCreateView(generics.ListCreateAPIView):
    serializer_class = AbsenceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = absence_queryset_for(self.request.user)
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start:
            queryset = queryset.filter(end_date__gte=start)
        if end:
            queryset = queryset.filter(start_date__lte=end)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}:
            absence = serializer.save()
        else:
            profile = get_object_or_404(EmployeeProfile, user=user)
            absence = serializer.save(employee=profile)
        AuditEvent.objects.create(
            actor=user, entity_type="absence_request", entity_id=str(absence.pk), action="created"
        )


class AbsenceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AbsenceRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return absence_queryset_for(self.request.user)

    def perform_update(self, serializer):
        absence = self.get_object()
        if absence.status != AbsenceRequest.Status.PENDING:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Изменять можно только заявку на согласовании")
        if not (
            self.request.user.is_superuser
            or self.request.user.role in {User.Role.ADMIN, User.Role.HR}
            or absence.employee.user_id == self.request.user.id
        ):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Недостаточно прав")
        serializer.save()


class AbsenceDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        absence = get_object_or_404(
            AbsenceRequest.objects.select_related("employee__user__department"), pk=pk
        )
        if not can_review_absence(request.user, absence):
            return Response({"detail": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)
        if absence.status != AbsenceRequest.Status.PENDING:
            return Response({"detail": "Заявка уже рассмотрена"}, status=status.HTTP_400_BAD_REQUEST)
        action = request.data.get("action")
        if action not in {"approve", "reject"}:
            return Response({"detail": "Укажите действие approve или reject"}, status=status.HTTP_400_BAD_REQUEST)
        absence.status = (
            AbsenceRequest.Status.APPROVED if action == "approve" else AbsenceRequest.Status.REJECTED
        )
        absence.reviewer = request.user
        absence.decision_note = request.data.get("note", "")
        absence.reviewed_at = timezone.now()
        absence.save(update_fields=["status", "reviewer", "decision_note", "reviewed_at", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="absence_request",
            entity_id=str(absence.pk),
            action=action,
        )
        return Response(AbsenceRequestSerializer(absence, context={"request": request}).data)


class AbsenceCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        absence = get_object_or_404(absence_queryset_for(request.user), pk=pk)
        if absence.employee.user_id != request.user.id or absence.status != AbsenceRequest.Status.PENDING:
            return Response({"detail": "Эту заявку нельзя отменить"}, status=status.HTTP_403_FORBIDDEN)
        absence.status = AbsenceRequest.Status.CANCELLED
        absence.save(update_fields=["status", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user, entity_type="absence_request", entity_id=str(absence.pk), action="cancelled"
        )
        return Response(AbsenceRequestSerializer(absence, context={"request": request}).data)


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
        document = serializer.save(employee=self.get_employee(), uploaded_by=self.request.user)
        AuditEvent.objects.create(actor=self.request.user, entity_type="employee_document", entity_id=str(document.pk), action="created")


class EmployeeOnboardingView(APIView):
    permission_classes = [IsHcmUser]

    def get_employee(self, employee_id):
        return get_object_or_404(
            EmployeeProfile.objects.select_related("user__department", "position"),
            pk=employee_id,
        )

    def get(self, request, employee_id):
        plan = OnboardingPlan.objects.filter(employee=self.get_employee(employee_id)).select_related(
            "template", "learning_path", "responsible"
        ).first()
        return Response(OnboardingPlanSerializer(plan).data if plan else None)

    def post(self, request, employee_id):
        plan = assign_onboarding(self.get_employee(employee_id))
        return Response(OnboardingPlanSerializer(plan).data, status=201)

    def patch(self, request, employee_id):
        plan = get_object_or_404(
            OnboardingPlan.objects.select_related("template", "learning_path", "responsible"),
            employee=self.get_employee(employee_id),
        )
        serializer = OnboardingPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        AuditEvent.objects.create(
            actor=request.user, entity_type="onboarding_plan", entity_id=str(plan.pk), action="updated"
        )
        return Response(serializer.data)


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
        queryset = Candidate.objects.select_related("stage", "department", "recruiter", "vacancy", "hired_employee__user")
        stage = self.request.query_params.get("stage")
        vacancy = self.request.query_params.get("vacancy")
        if stage:
            queryset = queryset.filter(stage_id=stage)
        if vacancy:
            queryset = queryset.filter(vacancy_id=vacancy)
        return queryset

    def perform_create(self, serializer):
        candidate = serializer.save(recruiter=self.request.user)
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="candidate", entity_id=str(candidate.pk), action="created"
        )


class CandidateDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CandidateSerializer
    permission_classes = [IsRecruiter]
    queryset = Candidate.objects.select_related("stage", "department", "recruiter", "vacancy", "hired_employee__user")

    def perform_update(self, serializer):
        candidate = serializer.save()
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="candidate", entity_id=str(candidate.pk), action="updated"
        )


class CandidateStageListView(generics.ListAPIView):
    serializer_class = CandidateStageSerializer
    permission_classes = [IsRecruiter]
    queryset = CandidateStage.objects.annotate(candidates_count=Count("candidates")).order_by("position", "id")


class CandidateHireView(APIView):
    permission_classes = [IsRecruiter]

    def post(self, request, pk):
        candidate = get_object_or_404(
            Candidate.objects.select_related("stage", "vacancy__department", "vacancy__position"),
            pk=pk,
        )
        serializer = CandidateHireSerializer(
            data=request.data,
            context={"request": request, "candidate": candidate},
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="candidate",
            entity_id=str(candidate.pk),
            action="hired",
            changes={"employee_id": profile.pk},
        )
        candidate.refresh_from_db()
        return Response(
            {
                "candidate": CandidateSerializer(candidate, context={"request": request}).data,
                "employee": EmployeeProfileSerializer(profile, context={"request": request}).data,
            },
            status=201,
        )


class VacancyListCreateView(generics.ListCreateAPIView):
    serializer_class = VacancySerializer
    permission_classes = [IsRecruiter]

    def get_queryset(self):
        queryset = Vacancy.objects.select_related(
            "staff_position", "department", "position", "recruiter"
        ).prefetch_related("candidates")
        status = self.request.query_params.get("status")
        return queryset.filter(status=status) if status else queryset

    def perform_create(self, serializer):
        vacancy = serializer.save(recruiter=self.request.user)
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="vacancy", entity_id=str(vacancy.pk), action="created"
        )


class VacancyDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = VacancySerializer
    permission_classes = [IsRecruiter]
    queryset = Vacancy.objects.select_related(
        "staff_position", "department", "position", "recruiter"
    ).prefetch_related("candidates")

    def perform_update(self, serializer):
        vacancy = serializer.save()
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="vacancy", entity_id=str(vacancy.pk), action="updated"
        )


class OnboardingTemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = OnboardingTemplateSerializer
    permission_classes = [IsHcmUser]
    queryset = OnboardingTemplate.objects.select_related(
        "department", "position", "learning_path", "responsible"
    )


class OnboardingTemplateDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OnboardingTemplateSerializer
    permission_classes = [IsHcmUser]
    queryset = OnboardingTemplate.objects.select_related(
        "department", "position", "learning_path", "responsible"
    )


class OnboardingOptionsView(APIView):
    permission_classes = [IsHcmUser]

    def get(self, request):
        return Response(
            {
                "learning_paths": list(
                    LearningPath.objects.exclude(status=LearningPath.Status.ARCHIVED)
                    .values("id", "title", "status")
                ),
            }
        )


class PositionListView(generics.ListAPIView):
    serializer_class = PositionSerializer
    permission_classes = [IsHcmUser]
    queryset = Position.objects.filter(is_active=True)


class OrganizationDepartmentListCreateView(generics.ListCreateAPIView):
    serializer_class = OrganizationDepartmentSerializer
    permission_classes = [IsHcmUser]
    queryset = Department.objects.filter(is_active=True).select_related("parent", "manager").prefetch_related("staff_positions")


class OrganizationDepartmentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrganizationDepartmentSerializer
    permission_classes = [IsHcmUser]
    queryset = Department.objects.select_related("parent", "manager").prefetch_related("staff_positions")


class StaffPositionListCreateView(generics.ListCreateAPIView):
    serializer_class = StaffPositionSerializer
    permission_classes = [IsHcmUser]

    def get_queryset(self):
        queryset = StaffPosition.objects.select_related("department", "position")
        department = self.request.query_params.get("department")
        return queryset.filter(department_id=department) if department else queryset


class StaffPositionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = StaffPositionSerializer
    permission_classes = [IsHcmUser]
    queryset = StaffPosition.objects.select_related("department", "position")


class HcmSummaryView(APIView):
    permission_classes = [IsHcmUser]

    def get(self, request):
        employees = EmployeeProfile.objects.all()
        candidates = Candidate.objects.filter(hired_employee__isnull=True)
        return Response(
            {
                "employees_total": employees.exclude(status=EmployeeProfile.Status.DISMISSED).count(),
                "on_probation": employees.filter(status=EmployeeProfile.Status.PROBATION).count(),
                "average_development_progress": round(
                    sum(employees.values_list("development_progress", flat=True)) / max(employees.count(), 1)
                ),
                "candidates_total": candidates.count(),
                "open_positions": Vacancy.objects.filter(status=Vacancy.Status.OPEN).count(),
            }
        )


class HcmDashboardView(APIView):
    permission_classes = [IsHcmUser]

    def get(self, request):
        today = date.today()
        onboarding = OnboardingPlan.objects.filter(status=OnboardingPlan.Status.ACTIVE).select_related(
            "employee__user__department", "responsible"
        )
        probation = EmployeeProfile.objects.filter(
            status=EmployeeProfile.Status.PROBATION
        ).select_related("user__department", "position")
        vacancies = Vacancy.objects.filter(status=Vacancy.Status.OPEN).select_related(
            "department", "position", "recruiter"
        ).prefetch_related("candidates")
        stages = CandidateStage.objects.annotate(
            active_count=Count("candidates", filter=Q(candidates__hired_employee__isnull=True))
        ).order_by("position", "id")

        onboarding_items = []
        for plan in onboarding.order_by("due_date")[:12]:
            progress = (
                round(sum(bool(item.get("done")) for item in plan.checklist) / len(plan.checklist) * 100)
                if plan.checklist else 0
            )
            days_left = (plan.due_date - today).days
            onboarding_items.append(
                {
                    "id": plan.id,
                    "employee_id": plan.employee_id,
                    "employee_name": plan.employee.user.get_full_name() or plan.employee.user.email,
                    "department_name": getattr(plan.employee.user.department, "name", ""),
                    "responsible_name": plan.responsible.get_full_name() if plan.responsible else "",
                    "due_date": plan.due_date,
                    "days_left": days_left,
                    "progress": progress,
                    "severity": "danger" if days_left < 0 else "warning" if days_left <= 7 else "normal",
                }
            )

        probation_items = []
        for profile in probation.order_by("hire_date")[:12]:
            end_date = (profile.hire_date or today) + timedelta(days=90)
            probation_items.append(
                {
                    "id": profile.id,
                    "employee_name": profile.user.get_full_name() or profile.user.email,
                    "department_name": getattr(profile.user.department, "name", ""),
                    "position_name": getattr(profile.position, "name", ""),
                    "end_date": end_date,
                    "days_left": (end_date - today).days,
                }
            )

        vacancy_items = []
        stale_before = timezone.now() - timedelta(days=14)
        for vacancy in vacancies.order_by("deadline", "-updated_at")[:12]:
            active_candidates = vacancy.candidates.filter(hired_employee__isnull=True).count()
            vacancy_items.append(
                {
                    "id": vacancy.id,
                    "title": vacancy.title,
                    "department_name": vacancy.department.name,
                    "openings": vacancy.openings,
                    "candidates_count": active_candidates,
                    "deadline": vacancy.deadline,
                    "is_stale": vacancy.updated_at < stale_before,
                    "recruiter_name": vacancy.recruiter.get_full_name() if vacancy.recruiter else "",
                }
            )

        return Response(
            {
                "metrics": {
                    "active_onboarding": onboarding.count(),
                    "overdue_onboarding": onboarding.filter(due_date__lt=today).count(),
                    "probation": probation.count(),
                    "open_vacancies": vacancies.count(),
                    "active_candidates": Candidate.objects.filter(hired_employee__isnull=True).count(),
                },
                "onboarding": onboarding_items,
                "probation": probation_items,
                "vacancies": vacancy_items,
                "funnel": [
                    {"id": stage.id, "name": stage.name, "count": stage.active_count}
                    for stage in stages
                ],
            }
        )
