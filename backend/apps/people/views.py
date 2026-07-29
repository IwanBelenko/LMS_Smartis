from datetime import date, datetime, time, timedelta
from html import escape
import mimetypes

from django.http import FileResponse
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.identity.models import Department, User
from apps.core.audit import record_audit, safe_audit_changes
from apps.identity.permissions import IsAdministrator
from apps.learning.models import Course, LearningPath, Lesson
from .models import (
    AbsenceRequest,
    AuditEvent,
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
    HrImportBatch,
    InboxItemState,
    LearningImportBatch,
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
from .permissions import IsHcmUser, IsRecruiter
from .serializers import (
    AbsenceRequestSerializer,
    CandidateSerializer,
    CandidateHireSerializer,
    CandidateOfferSerializer,
    CandidateStageSerializer,
    CompetencySerializer,
    DailyTranscriptSerializer,
    EmployeeDocumentSerializer,
    EmployeeGoalSerializer,
    EmployeeLearningSerializer,
    EmployeeProfileSerializer,
    EmployeeProfileWriteSerializer,
    EmploymentEventSerializer,
    InterviewFeedbackSerializer,
    InterviewSerializer,
    PositionSerializer,
    OrganizationDepartmentSerializer,
    StaffPositionSerializer,
    VacancySerializer,
    OnboardingPlanSerializer,
    OnboardingTemplateSerializer,
    PerformanceCycleSerializer,
    PerformanceReviewSerializer,
    PerformanceSubmissionSerializer,
    ProductUpdateSerializer,
)
from .services import analyze_daily_transcript, analyze_product_update, assign_onboarding
from .employee_import import commit_employee_import, parse_employee_import_file, preview_employee_import
from .learning_import import commit_learning_import, parse_learning_import_file, preview_learning_import


def is_product_update_admin(user):
    return user.is_superuser or user.role == User.Role.ADMIN


AUDIT_ENTITY_LABELS = {
    "user": "Пользователи",
    "employee": "Сотрудники",
    "course": "Курсы",
    "employee_import": "Импорт сотрудников",
    "learning_import": "Импорт обучения",
    "employee_goal": "Цели",
    "employment_event": "Кадровая история",
    "employee_learning": "Обучение",
    "employee_document": "Документы",
    "document": "Документы",
    "absence": "Отсутствия",
    "candidate": "Подбор",
    "vacancy": "Вакансии",
    "interview": "Собеседования",
    "offer": "Офферы",
    "performance": "Оценка",
    "onboarding": "Онбординг",
    "onboarding_plan": "Онбординг",
    "product_update": "Обновления продукта",
}

AUDIT_ACTION_LABELS = {
    "created": "Создание",
    "updated": "Изменение",
    "deleted": "Удаление",
    "published": "Публикация",
    "unpublished": "Снятие с публикации",
    "scorm_imported": "Импорт SCORM",
    "scorm_replaced": "Замена SCORM",
    "scorm_converted": "Преобразование SCORM",
    "scheduled": "Планирование",
    "feedback_submitted": "Оценка собеседования",
    "blocked": "Блокировка доступа",
    "restored": "Восстановление доступа",
    "invitation_resent": "Повторное приглашение",
    "invitation_accepted": "Активация учётной записи",
    "password_reset": "Смена пароля",
    "completed": "Завершение",
    "sent": "Отправка",
    "signed": "Подтверждение",
    "declined": "Отклонение",
    "archived": "Архивация",
    "approved": "Согласование",
    "rejected": "Отклонение",
    "cancelled": "Отмена",
}


class AuditEventListView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        queryset = AuditEvent.objects.select_related("actor")
        entity_type = request.query_params.get("entity_type", "").strip()
        action = request.query_params.get("action", "").strip()
        actor_id = request.query_params.get("actor", "").strip()
        query = request.query_params.get("q", "").strip()
        date_from = request.query_params.get("date_from", "").strip()
        date_to = request.query_params.get("date_to", "").strip()
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        if action:
            queryset = queryset.filter(action=action)
        if actor_id.isdigit():
            queryset = queryset.filter(actor_id=int(actor_id))
        if query:
            queryset = queryset.filter(
                Q(actor__email__icontains=query)
                | Q(actor__first_name__icontains=query)
                | Q(actor__last_name__icontains=query)
                | Q(entity_type__icontains=query)
                | Q(action__icontains=query)
                | Q(entity_id__icontains=query)
            )
        try:
            if date_from:
                queryset = queryset.filter(created_at__date__gte=date.fromisoformat(date_from))
            if date_to:
                queryset = queryset.filter(created_at__date__lte=date.fromisoformat(date_to))
        except ValueError as exc:
            raise ValidationError({"date": "Укажите корректный диапазон дат"}) from exc

        total = queryset.count()
        try:
            limit = min(max(int(request.query_params.get("limit", 100)), 1), 250)
        except ValueError as exc:
            raise ValidationError({"limit": "Укажите числовой лимит"}) from exc
        events = list(queryset[:limit])
        all_events = AuditEvent.objects.select_related("actor")
        actors = {}
        for event in all_events.exclude(actor=None).only(
            "actor_id", "actor__first_name", "actor__last_name", "actor__email",
        ).distinct():
            actors[event.actor_id] = event.actor.get_full_name() or event.actor.email

        results = []
        for event in events:
            changes = safe_audit_changes(event.changes)
            context = changes.pop("_context", {}) if isinstance(changes, dict) else {}
            title = (
                changes.get("employee_name")
                or changes.get("email")
                or changes.get("title")
                or f"Объект #{event.entity_id}"
            )
            results.append({
                "id": event.pk,
                "actor_id": event.actor_id,
                "actor_name": event.actor.get_full_name() if event.actor else "Система",
                "actor_email": event.actor.email if event.actor else "",
                "entity_type": event.entity_type,
                "entity_label": AUDIT_ENTITY_LABELS.get(event.entity_type, event.entity_type.replace("_", " ").title()),
                "entity_id": event.entity_id,
                "entity_title": title,
                "action": event.action,
                "action_label": AUDIT_ACTION_LABELS.get(event.action, event.action.replace("_", " ").title()),
                "changes": changes,
                "ip_address": context.get("ip", ""),
                "created_at": event.created_at,
            })
        return Response({
            "total": total,
            "limit": limit,
            "results": results,
            "filters": {
                "entity_types": [
                    {"value": value, "label": AUDIT_ENTITY_LABELS.get(value, value.replace("_", " ").title())}
                    for value in AuditEvent.objects.order_by("entity_type").values_list("entity_type", flat=True).distinct()
                ],
                "actions": [
                    {"value": value, "label": AUDIT_ACTION_LABELS.get(value, value.replace("_", " ").title())}
                    for value in AuditEvent.objects.order_by("action").values_list("action", flat=True).distinct()
                ],
                "actors": [
                    {"id": actor_id, "name": name}
                    for actor_id, name in sorted(actors.items(), key=lambda item: item[1])
                ],
            },
        })


class ProductUpdateListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductUpdateSerializer
    permission_classes = [IsAuthenticated]
    queryset = ProductUpdate.objects.select_related("created_by")

    def get_queryset(self):
        if not is_product_update_admin(self.request.user):
            raise PermissionDenied("Управление обновлениями доступно только администраторам")
        return super().get_queryset()

    def perform_create(self, serializer):
        if not is_product_update_admin(self.request.user):
            raise PermissionDenied("Управление обновлениями доступно только администраторам")
        analysis = analyze_product_update(
            serializer.validated_data["title"],
            serializer.validated_data["description"],
        )
        update = serializer.save(created_by=self.request.user, analysis=analysis)
        AuditEvent.objects.create(
            actor=self.request.user, entity_type="product_update", entity_id=str(update.pk), action="analyzed"
        )


class ProductUpdateDetailView(generics.RetrieveAPIView):
    serializer_class = ProductUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not is_product_update_admin(self.request.user):
            raise PermissionDenied("Управление обновлениями доступно только администраторам")
        return ProductUpdate.objects.select_related("created_by")


class ProductUpdateApplyView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not is_product_update_admin(request.user):
            raise PermissionDenied("Применять обновления могут только администраторы")
        update = get_object_or_404(ProductUpdate, pk=pk)
        if update.status == ProductUpdate.Status.APPLIED:
            raise ValidationError("Обновление уже применено")
        selections = request.data.get("targets", [])
        if not isinstance(selections, list) or not selections:
            raise ValidationError({"targets": "Выберите хотя бы один урок"})
        allowed_courses = {
            item["course_id"] for item in update.analysis.get("targets", [])
            if item.get("course_id")
        }
        applied = []
        changed_courses = set()
        marker = f'data-product-update-id="{update.pk}"'
        safe_title = escape(update.title)
        safe_description = "<br>".join(escape(update.description).splitlines())
        block = (
            f'<section {marker} class="product-update-note">'
            f"<h3>Обновление: {safe_title}</h3><p>{safe_description}</p>"
            f"<p><small>Действует с {update.effective_date:%d.%m.%Y}</small></p></section>"
        )
        for selection in selections:
            course_id = selection.get("course_id")
            lesson_id = selection.get("lesson_id")
            if course_id not in allowed_courses:
                raise ValidationError("Выбранный курс отсутствует в результатах анализа")
            lesson = get_object_or_404(Lesson.objects.select_related("course"), pk=lesson_id, course_id=course_id)
            if marker not in lesson.content:
                lesson.content = f"{lesson.content}\n{block}".strip()
                lesson.save(update_fields=["content", "updated_at"])
            changed_courses.add(course_id)
            applied.append({
                "course_id": course_id,
                "course_title": lesson.course.title,
                "lesson_id": lesson.pk,
                "lesson_title": lesson.title,
            })
        for course in Course.objects.filter(pk__in=changed_courses):
            course.version += 1
            course.save(update_fields=["version", "updated_at"])
        update.status = ProductUpdate.Status.APPLIED
        update.applied_targets = applied
        update.applied_at = timezone.now()
        update.save(update_fields=["status", "applied_targets", "applied_at", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="product_update",
            entity_id=str(update.pk),
            action="applied",
            changes={"targets": applied},
        )
        return Response(ProductUpdateSerializer(update, context={"request": request}).data)


class DailyTranscriptListCreateView(generics.ListCreateAPIView):
    serializer_class = DailyTranscriptSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = DailyTranscript.objects.select_related("department", "created_by")
        user = self.request.user
        if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}:
            return queryset
        return queryset.filter(created_by=user)

    def create(self, request, *args, **kwargs):
        if not (
            request.user.is_superuser
            or request.user.role in {User.Role.ADMIN, User.Role.HR, User.Role.AUTHOR}
        ):
            raise PermissionDenied("Добавлять расшифровки могут HR, администраторы и авторы курсов")
        data = request.data.copy()
        uploaded = request.FILES.get("file")
        source = DailyTranscript.Source.PASTE
        original_filename = ""
        if uploaded:
            suffix = uploaded.name.lower().rsplit(".", 1)[-1] if "." in uploaded.name else ""
            if suffix not in {"txt", "srt", "vtt"}:
                raise ValidationError({"file": "Поддерживаются текстовые файлы TXT, SRT и VTT"})
            if uploaded.size > 5 * 1024 * 1024:
                raise ValidationError({"file": "Файл превышает допустимый размер 5 МБ"})
            data["raw_text"] = uploaded.read().decode("utf-8-sig", errors="replace")
            source = DailyTranscript.Source.FILE
            original_filename = uploaded.name
        if not str(data.get("raw_text", "")).strip():
            raise ValidationError({"raw_text": "Добавьте текст расшифровки или загрузите файл"})
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        analysis = analyze_daily_transcript(serializer.validated_data["raw_text"])
        transcript = serializer.save(
            created_by=request.user,
            source=source,
            original_filename=original_filename,
            analysis=analysis,
            coverage_percent=analysis["coverage_percent"],
        )
        AuditEvent.objects.create(
            actor=request.user, entity_type="daily_transcript", entity_id=str(transcript.pk), action="analyzed"
        )
        return Response(
            DailyTranscriptSerializer(transcript, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DailyTranscriptDetailView(generics.RetrieveAPIView):
    serializer_class = DailyTranscriptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DailyTranscript.objects.select_related("department", "created_by")
        user = self.request.user
        return queryset if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR} else queryset.filter(created_by=user)


def review_queryset_for(user):
    queryset = PerformanceReview.objects.select_related(
        "cycle", "employee__user__department", "employee__position", "reviewer"
    ).prefetch_related("scores__competency")
    if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}:
        return queryset
    if user.role == User.Role.LEADER:
        return queryset.filter(Q(reviewer=user) | Q(employee__user=user)).distinct()
    return queryset.filter(employee__user=user)


class CompetencyListCreateView(generics.ListCreateAPIView):
    serializer_class = CompetencySerializer
    permission_classes = [IsAuthenticated]
    queryset = Competency.objects.all()

    def perform_create(self, serializer):
        if not can_manage_documents(self.request.user):
            raise PermissionDenied("Добавлять компетенции могут только HR и администраторы")
        serializer.save()


class PerformanceCycleListCreateView(generics.ListCreateAPIView):
    serializer_class = PerformanceCycleSerializer
    permission_classes = [IsHcmUser]
    queryset = PerformanceCycle.objects.prefetch_related("reviews")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PerformanceCycleLaunchView(APIView):
    permission_classes = [IsHcmUser]

    @transaction.atomic
    def post(self, request, pk):
        cycle = get_object_or_404(PerformanceCycle, pk=pk)
        if cycle.status != PerformanceCycle.Status.DRAFT:
            raise ValidationError("Запустить можно только черновик цикла")
        competencies = list(Competency.objects.filter(is_active=True))
        if not competencies:
            raise ValidationError("Добавьте хотя бы одну активную компетенцию")
        employees = EmployeeProfile.objects.filter(
            status__in=[EmployeeProfile.Status.EMPLOYED, EmployeeProfile.Status.PROBATION]
        ).select_related("user__department__manager")
        for employee in employees:
            review, created = PerformanceReview.objects.get_or_create(
                cycle=cycle,
                employee=employee,
                defaults={"reviewer": getattr(employee.user.department, "manager", None)},
            )
            if created:
                PerformanceScore.objects.bulk_create([
                    PerformanceScore(review=review, competency=competency)
                    for competency in competencies
                ])
        cycle.status = PerformanceCycle.Status.ACTIVE
        cycle.save(update_fields=["status", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user, entity_type="performance_cycle", entity_id=str(cycle.pk), action="launched"
        )
        return Response(PerformanceCycleSerializer(cycle, context={"request": request}).data)


class PerformanceReviewListView(generics.ListAPIView):
    serializer_class = PerformanceReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return review_queryset_for(self.request.user)


class PerformanceReviewDetailView(generics.RetrieveAPIView):
    serializer_class = PerformanceReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return review_queryset_for(self.request.user)


def validate_review_scores(review, submitted):
    expected = set(review.scores.values_list("competency_id", flat=True))
    received = {item["competency"] for item in submitted}
    if expected != received:
        raise ValidationError("Заполните оценки по всем компетенциям")


class PerformanceSelfSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        review = get_object_or_404(review_queryset_for(request.user), pk=pk)
        if review.employee.user_id != request.user.id:
            raise PermissionDenied("Самооценка доступна только сотруднику")
        if review.status != PerformanceReview.Status.SELF:
            raise ValidationError("Самооценка уже завершена")
        serializer = PerformanceSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validate_review_scores(review, serializer.validated_data["scores"])
        for item in serializer.validated_data["scores"]:
            PerformanceScore.objects.filter(review=review, competency_id=item["competency"]).update(
                self_score=item["score"],
                self_comment=item.get("comment", ""),
            )
        review.self_summary = serializer.validated_data.get("summary", "")
        review.status = PerformanceReview.Status.MANAGER
        review.self_submitted_at = timezone.now()
        review.save(update_fields=["self_summary", "status", "self_submitted_at", "updated_at"])
        review._prefetched_objects_cache = {}
        return Response(PerformanceReviewSerializer(review, context={"request": request}).data)


class PerformanceManagerSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        review = get_object_or_404(review_queryset_for(request.user), pk=pk)
        if not (
            request.user.is_superuser
            or request.user.role in {User.Role.ADMIN, User.Role.HR}
            or review.reviewer_id == request.user.id
        ):
            raise PermissionDenied("Оценка доступна только назначенному руководителю")
        if review.status != PerformanceReview.Status.MANAGER:
            raise ValidationError("Сначала сотрудник должен завершить самооценку")
        serializer = PerformanceSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validate_review_scores(review, serializer.validated_data["scores"])
        for item in serializer.validated_data["scores"]:
            PerformanceScore.objects.filter(review=review, competency_id=item["competency"]).update(
                manager_score=item["score"],
                manager_comment=item.get("comment", ""),
            )
        review.manager_summary = serializer.validated_data.get("summary", "")
        review.development_plan = serializer.validated_data.get("development_plan", "")
        review.status = PerformanceReview.Status.COMPLETED
        review.completed_at = timezone.now()
        review.save(update_fields=["manager_summary", "development_plan", "status", "completed_at", "updated_at"])
        review._prefetched_objects_cache = {}
        cycle = review.cycle
        if not cycle.reviews.exclude(status=PerformanceReview.Status.COMPLETED).exists():
            cycle.status = PerformanceCycle.Status.COMPLETED
            cycle.save(update_fields=["status", "updated_at"])
        return Response(PerformanceReviewSerializer(review, context={"request": request}).data)


class InboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        week_end = today + timedelta(days=7)
        items = []

        def add(identifier, category, title, description, target_view, target_id=None, due_date=None, priority="normal", action_label="Открыть"):
            items.append({
                "id": identifier,
                "category": category,
                "title": title,
                "description": description,
                "target_view": target_view,
                "target_id": target_id,
                "due_date": due_date,
                "priority": priority,
                "action_label": action_label,
            })

        profile = EmployeeProfile.objects.filter(user=user).first()
        if profile:
            for document in EmployeeDocument.objects.filter(
                employee=profile, status=EmployeeDocument.Status.AWAITING
            ):
                add(
                    f"document-{document.pk}", "documents", "Подтвердить документ",
                    document.title, "documents", document.pk,
                    priority="warning", action_label="Ознакомиться",
                )
            for review in PerformanceReview.objects.filter(
                employee=profile, status=PerformanceReview.Status.SELF
            ).select_related("cycle"):
                add(
                    f"review-self-{review.pk}", "performance", "Пройти самооценку",
                    review.cycle.title, "performance", review.pk, review.cycle.end_date,
                    "danger" if review.cycle.end_date < today else "warning",
                    "Начать",
                )
            for assignment in EmployeeLearning.objects.filter(
                employee=profile,
                status__in=[EmployeeLearning.Status.ASSIGNED, EmployeeLearning.Status.IN_PROGRESS],
            ).select_related("course")[:8]:
                add(
                    f"learning-{assignment.pk}", "learning", "Продолжить обучение",
                    assignment.course.title, "trajectory", assignment.course_id,
                    priority="normal", action_label="К курсу",
                )
            for goal in EmployeeGoal.objects.filter(employee=profile).exclude(
                status=EmployeeGoal.Status.COMPLETED
            )[:8]:
                add(
                    f"goal-{goal.pk}", "goals", "Цель требует внимания",
                    goal.title, "tasks", goal.pk, goal.due_date,
                    "danger" if goal.due_date and goal.due_date < today else "warning"
                    if goal.due_date and goal.due_date <= week_end else "normal",
                    "Посмотреть",
                )
            for event in EmploymentEvent.objects.filter(
                employee=profile,
                effective_date__gte=today - timedelta(days=30),
            )[:6]:
                add(
                    f"employment-{event.pk}", "employment", "Кадровое событие",
                    f"{event.get_event_type_display()} · {event.title}", "tasks", event.pk,
                    event.effective_date, "normal", "Подробнее",
                )
            for plan in OnboardingPlan.objects.filter(
                employee=profile, status=OnboardingPlan.Status.ACTIVE
            ):
                add(
                    f"onboarding-own-{plan.pk}", "onboarding", "Продолжить адаптацию",
                    f"Чек-лист · срок {plan.due_date:%d.%m.%Y}", "home", plan.pk, plan.due_date,
                    "danger" if plan.due_date < today else "warning" if plan.due_date <= week_end else "normal",
                    "Посмотреть",
                )

        if user.role == User.Role.LEADER and user.department_id:
            for absence in AbsenceRequest.objects.filter(
                employee__user__department_id=user.department_id,
                status=AbsenceRequest.Status.PENDING,
            ).select_related("employee__user"):
                add(
                    f"absence-{absence.pk}", "absences", "Согласовать отсутствие",
                    f"{absence.employee.user.get_full_name() or absence.employee.user.email} · {absence.get_absence_type_display()}",
                    "absences", absence.pk, absence.start_date,
                    "danger" if absence.start_date <= today else "warning",
                    "Рассмотреть",
                )
            for review in PerformanceReview.objects.filter(
                reviewer=user, status=PerformanceReview.Status.MANAGER
            ).select_related("employee__user", "cycle"):
                add(
                    f"review-manager-{review.pk}", "performance", "Оценить сотрудника",
                    f"{review.employee.user.get_full_name() or review.employee.user.email} · {review.cycle.title}",
                    "performance", review.pk, review.cycle.end_date,
                    "danger" if review.cycle.end_date < today else "warning",
                    "Оценить",
                )

        if can_manage_documents(user):
            for absence in AbsenceRequest.objects.filter(
                status=AbsenceRequest.Status.PENDING
            ).select_related("employee__user")[:12]:
                add(
                    f"absence-{absence.pk}", "absences", "Согласовать отсутствие",
                    f"{absence.employee.user.get_full_name() or absence.employee.user.email} · {absence.get_absence_type_display()}",
                    "absences", absence.pk, absence.start_date,
                    "danger" if absence.start_date <= today else "warning",
                    "Рассмотреть",
                )
            for document in EmployeeDocument.objects.filter(
                requires_signature=True,
                status__in=[EmployeeDocument.Status.DRAFT, EmployeeDocument.Status.DECLINED],
            ).select_related("employee__user")[:12]:
                title = "Исправить отклонённый документ" if document.status == EmployeeDocument.Status.DECLINED else "Отправить документ сотруднику"
                add(
                    f"document-manage-{document.pk}", "documents", title,
                    f"{document.employee.user.get_full_name() or document.employee.user.email} · {document.title}",
                    "documents", document.pk,
                    priority="danger" if document.status == EmployeeDocument.Status.DECLINED else "normal",
                    action_label="К документу",
                )
            for plan in OnboardingPlan.objects.filter(
                status=OnboardingPlan.Status.ACTIVE, due_date__lte=week_end
            ).select_related("employee__user")[:12]:
                add(
                    f"onboarding-{plan.pk}", "onboarding", "Проверить адаптацию",
                    plan.employee.user.get_full_name() or plan.employee.user.email,
                    "employees", plan.employee_id, plan.due_date,
                    "danger" if plan.due_date < today else "warning",
                    "Открыть карточку",
                )
            for review in PerformanceReview.objects.filter(
                status=PerformanceReview.Status.MANAGER
            ).select_related("employee__user", "cycle")[:12]:
                add(
                    f"review-manager-{review.pk}", "performance", "Оценка ждёт руководителя",
                    f"{review.employee.user.get_full_name() or review.employee.user.email} · {review.cycle.title}",
                    "performance", review.pk, review.cycle.end_date,
                    "danger" if review.cycle.end_date < today else "warning",
                    "Открыть",
                )

        for interview in Interview.objects.filter(
            Q(participants=user) | Q(created_by=user),
            status__in=[Interview.Status.SCHEDULED, Interview.Status.IN_PROGRESS],
            scheduled_at__gte=timezone.now() - timedelta(hours=2),
        ).select_related("candidate").distinct()[:8]:
            interview_target = "recruitment" if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR} else "tasks"
            add(
                f"interview-{interview.pk}", "interviews", "Предстоящее собеседование",
                f"{interview.candidate.full_name} · {interview.title}", interview_target, interview.pk,
                interview.scheduled_at.date(),
                "danger" if interview.scheduled_at <= timezone.now() + timedelta(hours=2) else "warning",
                "К собеседованию",
            )

        if user.is_superuser or user.role == User.Role.ADMIN:
            for invited_user in User.objects.filter(status=User.Status.INVITED).order_by("date_joined")[:8]:
                add(
                    f"invitation-{invited_user.pk}", "users", "Ожидается активация доступа",
                    invited_user.get_full_name() or invited_user.email, "users", invited_user.pk,
                    priority="normal", action_label="К пользователям",
                )

        priority_order = {"danger": 0, "warning": 1, "normal": 2}
        unique = {item["id"]: item for item in items}
        result = sorted(
            unique.values(),
            key=lambda item: (priority_order[item["priority"]], item["due_date"] or date.max),
        )
        states = {
            state.item_id: state
            for state in InboxItemState.objects.filter(user=user, item_id__in=unique)
        }
        for item in result:
            state = states.get(item["id"])
            item["is_read"] = bool(state and state.read_at)
            item["read_at"] = state.read_at if state else None
        return Response({
            "total": len(result),
            "urgent": sum(item["priority"] == "danger" for item in result),
            "unread": sum(not item["is_read"] for item in result),
            "items": result,
        })

    def post(self, request):
        item_ids = request.data.get("item_ids", [])
        if not isinstance(item_ids, list) or not item_ids:
            raise ValidationError({"item_ids": "Передайте список уведомлений"})
        item_ids = list(dict.fromkeys(str(item_id)[:160] for item_id in item_ids[:200]))
        read_at = timezone.now() if request.data.get("read", True) else None
        for item_id in item_ids:
            InboxItemState.objects.update_or_create(
                user=request.user,
                item_id=item_id,
                defaults={"read_at": read_at},
            )
        return Response({"updated": len(item_ids), "read": read_at is not None})


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


class EmployeeImportView(APIView):
    permission_classes = [IsHcmUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        batches = HrImportBatch.objects.filter(status=HrImportBatch.Status.COMPLETED).select_related("imported_by")[:20]
        return Response([
            {
                "id": batch.pk,
                "source": batch.source,
                "source_label": batch.get_source_display(),
                "status": batch.status,
                "filename": batch.filename,
                "effective_date": batch.effective_date,
                "total_rows": batch.total_rows,
                "created_count": batch.created_count,
                "updated_count": batch.updated_count,
                "error_count": batch.error_count,
                "imported_by_name": batch.imported_by.get_full_name() if batch.imported_by else "",
                "completed_at": batch.completed_at,
            }
            for batch in batches
        ])

    def post(self, request):
        if request.content_type and request.content_type.startswith("multipart/"):
            parsed = parse_employee_import_file(request.FILES.get("file"))
            source = request.data.get("source", HrImportBatch.Source.MANUAL)
            if source not in HrImportBatch.Source.values:
                raise ValidationError({"source": "Неизвестный источник импорта"})
            effective_date = None
            if request.data.get("effective_date"):
                try:
                    effective_date = date.fromisoformat(request.data["effective_date"])
                except ValueError as exc:
                    raise ValidationError({"effective_date": "Укажите корректную дату среза"}) from exc
            if source == HrImportBatch.Source.ONE_C and not effective_date:
                raise ValidationError({"effective_date": "Для выгрузки 1С укажите дату среза"})
            if source == HrImportBatch.Source.ONE_C and HrImportBatch.objects.filter(
                source=HrImportBatch.Source.ONE_C,
                status=HrImportBatch.Status.COMPLETED,
                file_sha256=parsed["file_sha256"],
            ).exists():
                raise ValidationError({"detail": "Эта выгрузка 1С уже была импортирована"})
            review = preview_employee_import(parsed["rows"], parsed["mapping"], request, source, effective_date)
            batch = HrImportBatch.objects.create(
                source=source,
                filename=parsed["filename"],
                file_sha256=parsed["file_sha256"],
                payload_sha256=parsed["payload_sha256"],
                effective_date=effective_date,
                mapping=parsed["mapping"],
                total_rows=review["total"],
                error_count=review["error_count"],
                imported_by=request.user,
            )
            parsed["batch_id"] = batch.pk
            parsed["source"] = source
            parsed["effective_date"] = effective_date
            parsed.pop("file_sha256", None)
            parsed.pop("payload_sha256", None)
            parsed["review"] = {key: value for key, value in review.items() if not key.startswith("_")}
            return Response(parsed)
        rows = request.data.get("rows", [])
        mapping = request.data.get("mapping", {})
        batch_id = request.data.get("batch_id")
        batch = get_object_or_404(HrImportBatch, pk=batch_id) if batch_id else None
        if request.data.get("commit"):
            if not batch:
                raise ValidationError({"batch_id": "Загрузите файл ещё раз"})
            return Response(commit_employee_import(rows, mapping, request, batch.pk), status=status.HTTP_201_CREATED)
        review = preview_employee_import(
            rows,
            mapping,
            request,
            batch.source if batch else HrImportBatch.Source.MANUAL,
            batch.effective_date if batch else None,
        )
        if batch:
            batch.mapping = mapping
            batch.error_count = review["error_count"]
            batch.save(update_fields=["mapping", "error_count"])
        return Response({key: value for key, value in review.items() if not key.startswith("_")})


class LearningImportView(APIView):
    permission_classes = [IsHcmUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        batches = LearningImportBatch.objects.filter(
            status=LearningImportBatch.Status.COMPLETED,
        ).select_related("imported_by")[:20]
        return Response([
            {
                "id": batch.pk,
                "source": batch.source,
                "source_label": batch.get_source_display(),
                "filename": batch.filename,
                "total_rows": batch.total_rows,
                "created_count": batch.created_count,
                "updated_count": batch.updated_count,
                "error_count": batch.error_count,
                "imported_by_name": batch.imported_by.get_full_name() if batch.imported_by else "",
                "completed_at": batch.completed_at,
            }
            for batch in batches
        ])

    def post(self, request):
        if request.content_type and request.content_type.startswith("multipart/"):
            parsed = parse_learning_import_file(request.FILES.get("file"))
            if LearningImportBatch.objects.filter(
                source=LearningImportBatch.Source.ISPRING_FILE,
                status=LearningImportBatch.Status.COMPLETED,
                file_sha256=parsed["file_sha256"],
            ).exists():
                raise ValidationError({"detail": "Этот отчёт iSpring уже был импортирован"})
            review = preview_learning_import(parsed["rows"], parsed["mapping"])
            batch = LearningImportBatch.objects.create(
                source=LearningImportBatch.Source.ISPRING_FILE,
                filename=parsed["filename"],
                file_sha256=parsed["file_sha256"],
                payload_sha256=parsed["payload_sha256"],
                mapping=parsed["mapping"],
                total_rows=review["total"],
                error_count=review["error_count"],
                imported_by=request.user,
            )
            parsed["batch_id"] = batch.pk
            parsed.pop("file_sha256", None)
            parsed.pop("payload_sha256", None)
            parsed["review"] = {key: value for key, value in review.items() if not key.startswith("_")}
            return Response(parsed)

        rows = request.data.get("rows", [])
        mapping = request.data.get("mapping", {})
        batch_id = request.data.get("batch_id")
        batch = get_object_or_404(LearningImportBatch, pk=batch_id) if batch_id else None
        if request.data.get("commit"):
            if not batch:
                raise ValidationError({"batch_id": "Загрузите файл ещё раз"})
            return Response(
                commit_learning_import(rows, mapping, request, batch.pk),
                status=status.HTTP_201_CREATED,
            )
        review = preview_learning_import(rows, mapping)
        if batch:
            batch.mapping = mapping
            batch.error_count = review["error_count"]
            batch.save(update_fields=["mapping", "error_count"])
        return Response({key: value for key, value in review.items() if not key.startswith("_")})


class EmployeeDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsHcmUser]

    def get_queryset(self):
        return EmployeeProfile.objects.select_related("user__department", "position")

    def get_serializer_class(self):
        return EmployeeProfileSerializer if self.request.method == "GET" else EmployeeProfileWriteSerializer

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        before = {
            "status": profile.status,
            "department_id": profile.user.department_id,
            "position_id": profile.position_id,
        }
        serializer = self.get_serializer(profile, data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changed_fields = sorted(set(request.data.keys()))
        record_audit(
            actor=request.user,
            entity_type="employee",
            entity_id=profile.pk,
            action="updated",
            changes={
                "employee_name": profile.user.get_full_name(),
                "fields": changed_fields,
                "status": {"before": before["status"], "after": profile.status}
                if before["status"] != profile.status else None,
                "department_id": {"before": before["department_id"], "after": profile.user.department_id}
                if before["department_id"] != profile.user.department_id else None,
                "position_id": {"before": before["position_id"], "after": profile.position_id}
                if before["position_id"] != profile.position_id else None,
                "compensation_changed": bool(
                    {"salary_base", "monthly_bonus", "quarterly_bonus"}.intersection(changed_fields)
                ),
            },
            request=request,
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


class CandidateOfferListCreateView(generics.ListCreateAPIView):
    serializer_class = CandidateOfferSerializer
    permission_classes = [IsRecruiter]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = CandidateOffer.objects.select_related(
            "candidate", "candidate__vacancy", "created_by", "approved_by"
        )
        candidate_id = self.request.query_params.get("candidate")
        if candidate_id:
            queryset = queryset.filter(candidate_id=candidate_id)
        return queryset

    def perform_create(self, serializer):
        offer = serializer.save(created_by=self.request.user)
        AuditEvent.objects.create(
            actor=self.request.user,
            entity_type="candidate_offer",
            entity_id=str(offer.pk),
            action="created",
            changes={"candidate_id": offer.candidate_id},
        )


class CandidateOfferDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CandidateOfferSerializer
    permission_classes = [IsRecruiter]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    queryset = CandidateOffer.objects.select_related(
        "candidate", "candidate__vacancy", "created_by", "approved_by"
    )

    def update(self, request, *args, **kwargs):
        offer = self.get_object()
        if offer.status != CandidateOffer.Status.DRAFT:
            raise ValidationError("Редактировать можно только черновик оффера")
        return super().update(request, *args, **kwargs)


class CandidateOfferSubmitView(APIView):
    permission_classes = [IsRecruiter]

    def post(self, request, pk):
        offer = get_object_or_404(CandidateOffer, pk=pk)
        if offer.status != CandidateOffer.Status.DRAFT:
            raise ValidationError("На согласование можно отправить только черновик")
        if not offer.salary or not offer.start_date or not offer.valid_until:
            raise ValidationError("Укажите оклад, дату выхода и срок ответа")
        offer.status = CandidateOffer.Status.PENDING
        offer.save(update_fields=["status", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="candidate_offer",
            entity_id=str(offer.pk),
            action="submitted",
        )
        return Response(CandidateOfferSerializer(offer, context={"request": request}).data)


class CandidateOfferApproveView(APIView):
    permission_classes = [IsRecruiter]

    def post(self, request, pk):
        offer = get_object_or_404(CandidateOffer, pk=pk)
        if offer.status != CandidateOffer.Status.PENDING:
            raise ValidationError("Согласовать можно только отправленный оффер")
        offer.status = CandidateOffer.Status.APPROVED
        offer.approved_by = request.user
        offer.approved_at = timezone.now()
        offer.decision_comment = str(request.data.get("comment", "")).strip()
        offer.save(update_fields=["status", "approved_by", "approved_at", "decision_comment", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="candidate_offer",
            entity_id=str(offer.pk),
            action="approved",
        )
        return Response(CandidateOfferSerializer(offer, context={"request": request}).data)


class CandidateOfferOutcomeView(APIView):
    permission_classes = [IsRecruiter]

    def post(self, request, pk):
        offer = get_object_or_404(CandidateOffer.objects.select_related("candidate"), pk=pk)
        outcome = request.data.get("outcome")
        if offer.status != CandidateOffer.Status.APPROVED:
            raise ValidationError("Ответ можно зафиксировать только по согласованному офферу")
        if outcome not in {CandidateOffer.Status.ACCEPTED, CandidateOffer.Status.DECLINED}:
            raise ValidationError("Выберите: принят или отклонён")
        offer.status = outcome
        offer.responded_at = timezone.now()
        offer.decision_comment = str(request.data.get("comment", "")).strip()
        offer.save(update_fields=["status", "responded_at", "decision_comment", "updated_at"])
        if outcome == CandidateOffer.Status.ACCEPTED and offer.start_date:
            offer_stage = CandidateStage.objects.filter(name__iexact="Оффер").first()
            if offer_stage:
                offer.candidate.stage = offer_stage
            offer.candidate.next_action_at = timezone.make_aware(
                datetime.combine(offer.start_date, time(hour=12))
            )
            offer.candidate.save(update_fields=["stage", "next_action_at", "updated_at"] if offer_stage else ["next_action_at", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="candidate_offer",
            entity_id=str(offer.pk),
            action=outcome,
        )
        return Response(CandidateOfferSerializer(offer, context={"request": request}).data)


class InterviewListCreateView(generics.ListCreateAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Interview.objects.select_related("candidate", "candidate__vacancy", "created_by")
            .prefetch_related("participants", "feedback__participant")
        )
        user = self.request.user
        if not (user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}):
            queryset = queryset.filter(participants=user)
        candidate_id = self.request.query_params.get("candidate")
        status_value = self.request.query_params.get("status")
        if candidate_id:
            queryset = queryset.filter(candidate_id=candidate_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset.distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}):
            raise PermissionDenied("Планировать собеседования могут только HR и администраторы")
        interview = serializer.save(created_by=user)
        interview.candidate.next_action_at = interview.scheduled_at
        interview.candidate.save(update_fields=["next_action_at", "updated_at"])
        AuditEvent.objects.create(
            actor=user,
            entity_type="interview",
            entity_id=str(interview.pk),
            action="scheduled",
            changes={"candidate_id": interview.candidate_id},
        )


class InterviewDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            Interview.objects.select_related("candidate", "candidate__vacancy", "created_by")
            .prefetch_related("participants", "feedback__participant")
        )
        user = self.request.user
        if user.is_superuser or user.role in {User.Role.ADMIN, User.Role.HR}:
            return queryset
        return queryset.filter(participants=user)

    def update(self, request, *args, **kwargs):
        if not (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}):
            raise PermissionDenied("Изменять встречу могут только HR и администраторы")
        return super().update(request, *args, **kwargs)


class InterviewOptionsView(APIView):
    permission_classes = [IsRecruiter]

    def get(self, request):
        users = User.objects.filter(
            status=User.Status.ACTIVE,
            role__in={User.Role.ADMIN, User.Role.HR, User.Role.LEADER},
        ).order_by("last_name", "first_name", "email")
        return Response({
            "participants": [
                {
                    "id": user.pk,
                    "name": user.get_full_name() or user.email,
                    "role": user.get_role_display(),
                }
                for user in users
            ],
            "default_questions": [
                "Расскажите о наиболее релевантном опыте для этой позиции.",
                "Как вы подходите к решению сложной рабочей задачи?",
                "Какие ожидания у вас от роли и команды?",
            ],
        })


class InterviewStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        interview = get_object_or_404(
            Interview.objects.prefetch_related("participants"),
            pk=pk,
        )
        is_recruiter = request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}
        if not is_recruiter and not interview.participants.filter(pk=request.user.pk).exists():
            raise PermissionDenied("Вы не участвуете в этом собеседовании")
        if interview.status == Interview.Status.SCHEDULED:
            interview.status = Interview.Status.IN_PROGRESS
            interview.save(update_fields=["status", "updated_at"])
        return Response(InterviewSerializer(interview, context={"request": request}).data)


class InterviewFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        interview = get_object_or_404(
            Interview.objects.prefetch_related("participants", "feedback__participant"),
            pk=pk,
        )
        is_recruiter = request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}
        if not is_recruiter and not interview.participants.filter(pk=request.user.pk).exists():
            raise PermissionDenied("Оценку могут оставить только участники интервью")
        if interview.status in {Interview.Status.COMPLETED, Interview.Status.CANCELLED}:
            raise ValidationError("Собеседование уже закрыто")
        feedback = InterviewFeedback.objects.filter(interview=interview, participant=request.user).first()
        serializer = InterviewFeedbackSerializer(
            feedback,
            data=request.data,
            context={"request": request, "interview": interview},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(interview=interview, participant=request.user)
        if interview.status == Interview.Status.SCHEDULED:
            interview.status = Interview.Status.IN_PROGRESS
            interview.save(update_fields=["status", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="interview",
            entity_id=str(interview.pk),
            action="feedback_submitted",
        )
        interview = (
            Interview.objects.select_related("candidate", "candidate__vacancy", "created_by")
            .prefetch_related("participants", "feedback__participant")
            .get(pk=interview.pk)
        )
        return Response(InterviewSerializer(interview, context={"request": request}).data)


class InterviewCompleteView(APIView):
    permission_classes = [IsRecruiter]

    @transaction.atomic
    def post(self, request, pk):
        interview = get_object_or_404(Interview.objects.select_related("candidate"), pk=pk)
        decision = request.data.get("decision")
        if decision not in {
            Interview.Decision.ADVANCE,
            Interview.Decision.HOLD,
            Interview.Decision.REJECT,
        }:
            raise ValidationError({"decision": "Выберите итоговое решение"})
        interview.decision = decision
        interview.summary = str(request.data.get("summary", "")).strip()
        interview.status = Interview.Status.COMPLETED
        interview.completed_at = timezone.now()
        interview.save(update_fields=["decision", "summary", "status", "completed_at", "updated_at"])
        interview.candidate.next_action_at = None
        interview.candidate.save(update_fields=["next_action_at", "updated_at"])
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="interview",
            entity_id=str(interview.pk),
            action="completed",
            changes={"decision": decision},
        )
        interview = (
            Interview.objects.select_related("candidate", "candidate__vacancy", "created_by")
            .prefetch_related("participants", "feedback__participant")
            .get(pk=interview.pk)
        )
        return Response(InterviewSerializer(interview, context={"request": request}).data)


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
