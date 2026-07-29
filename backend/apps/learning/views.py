import mimetypes
import shutil
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.http import FileResponse, HttpResponseNotFound
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.identity.models import User
from apps.core.audit import record_audit

from .models import (
    ContentFolder,
    ContentProject,
    Course,
    CourseEnrollment,
    LearningImageAsset,
    LearningPath,
    Lesson,
    LessonProgress,
    QuizAttempt,
)
from .permissions import IsCourseManagerOrReadOnly, IsLibraryManager
from .quiz import answer_is_correct, answer_is_valid
from .scorm import build_scorm_12_package, ensure_scorm_runtime_bridge, extract_scorm_package, inspect_scorm_package
from .scorm_convert import convert_ispring_scorm_to_native, restore_ispring_images
from .serializers import (
    ContentFolderSerializer,
    ContentProjectSerializer,
    CourseSerializer,
    CourseEnrollmentSerializer,
    LearningPathSerializer,
    LessonSerializer,
    validate_library_placement,
)


def create_path_enrollments(user, learning_path):
    entries = list(
        learning_path.path_courses.select_related("course")
        .filter(course__status=Course.Status.PUBLISHED)
        .order_by("position", "id")
    )
    enrollments = []
    for index, entry in enumerate(entries):
        enrollment, created = CourseEnrollment.objects.get_or_create(
            user=user,
            course=entry.course,
            learning_path=learning_path,
            defaults={
                "position": index,
                "status": CourseEnrollment.Status.AVAILABLE if index == 0 else CourseEnrollment.Status.LOCKED,
            },
        )
        if not created and enrollment.status != CourseEnrollment.Status.COMPLETED:
            desired = CourseEnrollment.Status.AVAILABLE if index == 0 else enrollment.status
            if enrollment.status != desired:
                enrollment.status = desired
                enrollment.save(update_fields=["status", "updated_at"])
        enrollments.append(enrollment)
    return enrollments


def recalculate_enrollment(enrollment):
    lessons = list(enrollment.course.lessons.all())
    required = [lesson for lesson in lessons if lesson.is_required] or lessons
    completed_ids = set(
        enrollment.lesson_progress.filter(completed=True).values_list("lesson_id", flat=True)
    )
    completed_count = sum(lesson.pk in completed_ids for lesson in required)
    enrollment.progress = round(completed_count / max(len(required), 1) * 100)
    quiz_scores = list(
        enrollment.lesson_progress.filter(completed=True, best_score__isnull=False)
        .values_list("best_score", flat=True)
    )
    enrollment.score = round(sum(quiz_scores) / len(quiz_scores)) if quiz_scores else None
    if required and completed_count == len(required):
        enrollment.status = CourseEnrollment.Status.COMPLETED
        enrollment.progress = 100
        enrollment.completed_at = timezone.now()
    elif enrollment.status == CourseEnrollment.Status.AVAILABLE:
        enrollment.status = CourseEnrollment.Status.IN_PROGRESS
        enrollment.started_at = enrollment.started_at or timezone.now()
    enrollment.save()
    if enrollment.status == CourseEnrollment.Status.COMPLETED and enrollment.learning_path_id:
        next_enrollment = CourseEnrollment.objects.filter(
            user=enrollment.user,
            learning_path=enrollment.learning_path,
            position__gt=enrollment.position,
        ).order_by("position").first()
        if next_enrollment and next_enrollment.status == CourseEnrollment.Status.LOCKED:
            next_enrollment.status = CourseEnrollment.Status.AVAILABLE
            next_enrollment.save(update_fields=["status", "updated_at"])
    return enrollment


class MyLearningViewSet(viewsets.GenericViewSet):
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            CourseEnrollment.objects.filter(user=self.request.user)
            .select_related("course", "learning_path")
            .prefetch_related("course__lessons", "lesson_progress")
        )

    def list(self, request):
        enrollments = list(self.get_queryset())
        grouped = {}
        standalone = []
        for enrollment in enrollments:
            if enrollment.learning_path_id:
                group = grouped.setdefault(enrollment.learning_path_id, {
                    "id": enrollment.learning_path_id,
                    "title": enrollment.learning_path.title,
                    "description": enrollment.learning_path.description,
                    "courses": [],
                })
                group["courses"].append(enrollment)
            else:
                standalone.append(enrollment)
        paths = []
        for group in grouped.values():
            serialized = self.get_serializer(group["courses"], many=True).data
            completed = sum(item["status"] == CourseEnrollment.Status.COMPLETED for item in serialized)
            paths.append({
                "id": group["id"],
                "title": group["title"],
                "description": group["description"],
                "progress": round(completed / max(len(serialized), 1) * 100),
                "completed_courses": completed,
                "course_count": len(serialized),
                "status": "completed" if serialized and completed == len(serialized) else "in_progress",
                "courses": serialized,
            })
        return Response({
            "paths": paths,
            "standalone": self.get_serializer(standalone, many=True).data,
        })

    @action(detail=False, methods=["get"], url_path="assignment-options")
    def assignment_options(self, request):
        if not (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}):
            return Response({"detail": "Назначать обучение могут только HR и администраторы"}, status=403)
        users = User.objects.filter(status=User.Status.ACTIVE).order_by("last_name", "first_name", "email")
        paths = LearningPath.objects.filter(status=LearningPath.Status.PUBLISHED).order_by("title")
        courses = Course.objects.filter(status=Course.Status.PUBLISHED).order_by("title")
        return Response({
            "users": [
                {"id": user.pk, "name": user.get_full_name() or user.email, "email": user.email}
                for user in users
            ],
            "paths": [{"id": item.pk, "title": item.title} for item in paths],
            "courses": [{"id": item.pk, "title": item.title} for item in courses],
        })

    @action(detail=False, methods=["post"], url_path="assign-path")
    @transaction.atomic
    def assign_path(self, request):
        if not (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}):
            return Response({"detail": "Назначать траектории могут только HR и администраторы"}, status=403)
        user = get_object_or_404(User, pk=request.data.get("user_id"), status=User.Status.ACTIVE)
        learning_path = get_object_or_404(
            LearningPath,
            pk=request.data.get("learning_path_id"),
            status=LearningPath.Status.PUBLISHED,
        )
        enrollments = create_path_enrollments(user, learning_path)
        return Response(
            CourseEnrollmentSerializer(enrollments, many=True, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="assign-course")
    def assign_course(self, request):
        if not (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}):
            return Response({"detail": "Назначать курсы могут только HR и администраторы"}, status=403)
        user = get_object_or_404(User, pk=request.data.get("user_id"), status=User.Status.ACTIVE)
        course = get_object_or_404(Course, pk=request.data.get("course_id"), status=Course.Status.PUBLISHED)
        enrollment, _ = CourseEnrollment.objects.get_or_create(
            user=user,
            course=course,
            learning_path=None,
            defaults={"status": CourseEnrollment.Status.AVAILABLE},
        )
        return Response(
            CourseEnrollmentSerializer(enrollment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        enrollment = self.get_object()
        if enrollment.status == CourseEnrollment.Status.LOCKED:
            return Response({"detail": "Сначала завершите предыдущий курс"}, status=400)
        if enrollment.status == CourseEnrollment.Status.AVAILABLE:
            enrollment.status = CourseEnrollment.Status.IN_PROGRESS
            enrollment.started_at = timezone.now()
            enrollment.save(update_fields=["status", "started_at", "updated_at"])
        return Response(self.get_serializer(enrollment).data)

    def validate_lesson_access(self, enrollment, lesson):
        previous_required = enrollment.course.lessons.filter(
            is_required=True,
            position__lt=lesson.position,
        )
        completed = set(
            enrollment.lesson_progress.filter(completed=True).values_list("lesson_id", flat=True)
        )
        if any(item.pk not in completed for item in previous_required):
            raise serializers.ValidationError("Сначала завершите предыдущий обязательный урок")

    @action(detail=True, methods=["post"], url_path=r"lessons/(?P<lesson_id>\d+)/complete")
    @transaction.atomic
    def complete_lesson(self, request, pk=None, lesson_id=None):
        enrollment = self.get_object()
        if enrollment.status == CourseEnrollment.Status.LOCKED:
            return Response({"detail": "Курс пока недоступен"}, status=400)
        lesson = get_object_or_404(enrollment.course.lessons, pk=lesson_id)
        if lesson.lesson_type == Lesson.Type.QUIZ:
            return Response({"detail": "Тест завершается после успешной попытки"}, status=400)
        self.validate_lesson_access(enrollment, lesson)
        LessonProgress.objects.update_or_create(
            enrollment=enrollment,
            lesson=lesson,
            defaults={"completed": True, "completed_at": timezone.now()},
        )
        recalculate_enrollment(enrollment)
        return Response(self.get_serializer(self.get_queryset().get(pk=enrollment.pk)).data)

    @action(detail=True, methods=["post"], url_path=r"lessons/(?P<lesson_id>\d+)/submit-quiz")
    @transaction.atomic
    def submit_quiz(self, request, pk=None, lesson_id=None):
        enrollment = self.get_object()
        if enrollment.status == CourseEnrollment.Status.LOCKED:
            return Response({"detail": "Курс пока недоступен"}, status=400)
        lesson = get_object_or_404(enrollment.course.lessons, pk=lesson_id, lesson_type=Lesson.Type.QUIZ)
        self.validate_lesson_access(enrollment, lesson)
        quiz_data = lesson.quiz_data if isinstance(lesson.quiz_data, dict) else {}
        questions = quiz_data.get("questions", [])
        answers = request.data.get("answers", [])
        if not isinstance(answers, list) or len(answers) != len(questions):
            return Response({"detail": "Ответьте на все вопросы"}, status=400)
        progress, _ = LessonProgress.objects.get_or_create(enrollment=enrollment, lesson=lesson)
        max_attempts = quiz_data.get("max_attempts", 3)
        if progress.attempts_count >= max_attempts and not progress.completed:
            return Response({"detail": "Количество попыток исчерпано"}, status=400)
        correct = 0
        for question_index, question in enumerate(questions):
            answer = answers[question_index]
            if not answer_is_valid(question, answer):
                return Response({"detail": "Один из ответов некорректен"}, status=400)
            correct += answer_is_correct(question, answer)
        score = round(correct / max(len(questions), 1) * 100)
        passing_score = quiz_data.get("passing_score", 80)
        passed = score >= passing_score
        attempt_number = progress.attempts_count + 1
        QuizAttempt.objects.create(
            enrollment=enrollment,
            lesson=lesson,
            attempt_number=attempt_number,
            answers=answers,
            score=score,
            passed=passed,
        )
        progress.attempts_count = attempt_number
        progress.best_score = max(progress.best_score or 0, score)
        if passed:
            progress.completed = True
            progress.completed_at = timezone.now()
        progress.save()
        recalculate_enrollment(enrollment)
        refreshed = self.get_queryset().get(pk=enrollment.pk)
        return Response({
            "score": score,
            "passed": passed,
            "attempts_used": attempt_number,
            "attempts_left": max(max_attempts - attempt_number, 0),
            "enrollment": self.get_serializer(refreshed).data,
        })


class ContentProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ContentProjectSerializer
    permission_classes = [IsLibraryManager]

    def get_queryset(self):
        queryset = ContentProject.objects.select_related("owner").prefetch_related("folders", "courses", "learning_paths")
        user = self.request.user
        if user.is_superuser or user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ContentFolderViewSet(viewsets.ModelViewSet):
    serializer_class = ContentFolderSerializer
    permission_classes = [IsLibraryManager]

    def get_queryset(self):
        queryset = ContentFolder.objects.select_related("project", "project__owner", "parent").prefetch_related(
            "courses", "learning_paths"
        )
        user = self.request.user
        if not (user.is_superuser or user.role == User.Role.ADMIN):
            queryset = queryset.filter(project__owner=user)
        project_id = self.request.query_params.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset


class LearningPathViewSet(viewsets.ModelViewSet):
    serializer_class = LearningPathSerializer
    permission_classes = [IsLibraryManager]

    def get_queryset(self):
        queryset = LearningPath.objects.select_related(
            "author", "project", "folder"
        ).prefetch_related("courses")
        user = self.request.user
        if user.is_superuser or user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(author=user)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsCourseManagerOrReadOnly]

    def get_queryset(self):
        queryset = Course.objects.select_related("author", "project", "folder").prefetch_related("lessons")
        user = self.request.user
        if user.is_superuser or user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.AUTHOR:
            return queryset.filter(author=user)
        return queryset.filter(status=Course.Status.PUBLISHED)

    def perform_create(self, serializer):
        course = serializer.save(author=self.request.user)
        record_audit(
            actor=self.request.user,
            entity_type="course",
            entity_id=course.pk,
            action="created",
            changes={"title": course.title, "source_format": course.source_format},
            request=self.request,
        )

    def perform_update(self, serializer):
        course = serializer.save()
        record_audit(
            actor=self.request.user,
            entity_type="course",
            entity_id=course.pk,
            action="updated",
            changes={"title": course.title, "fields": sorted(self.request.data.keys())},
            request=self.request,
        )

    def perform_destroy(self, instance):
        course_id = instance.pk
        title = instance.title
        instance.delete()
        record_audit(
            actor=self.request.user,
            entity_type="course",
            entity_id=course_id,
            action="deleted",
            changes={"title": title},
            request=self.request,
        )

    @action(
        detail=False,
        methods=["post", "delete"],
        url_path="question-image",
        parser_classes=[MultiPartParser, FormParser],
    )
    def question_image(self, request):
        if request.method == "DELETE":
            asset_id = request.query_params.get("asset_id") or request.data.get("asset_id")
            if not asset_id:
                return Response(
                    {"detail": "Не указано изображение для удаления"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            asset = get_object_or_404(LearningImageAsset, pk=asset_id)
            if not (
                request.user.is_superuser
                or request.user.role == User.Role.ADMIN
                or asset.uploaded_by_id == request.user.id
            ):
                return Response(
                    {"detail": "Можно удалять только собственные изображения"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            asset.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        image = request.FILES.get("image")
        if not image:
            return Response(
                {"detail": "Выберите изображение для вопроса"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        suffix = Path(image.name).suffix.lower()
        allowed_suffixes = {".jpg", ".jpeg", ".png", ".webp"}
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if suffix not in allowed_suffixes or image.content_type not in allowed_types:
            return Response(
                {"detail": "Поддерживаются изображения JPG, PNG и WebP"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if image.size > settings.MAX_QUESTION_IMAGE_UPLOAD_SIZE:
            max_mb = settings.MAX_QUESTION_IMAGE_UPLOAD_SIZE // (1024 * 1024)
            return Response(
                {"detail": f"Размер изображения не должен превышать {max_mb} МБ"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        asset = LearningImageAsset.objects.create(
            file=image,
            original_name=Path(image.name).name[:255],
            size=image.size,
            uploaded_by=request.user,
        )
        return Response(
            {
                "id": asset.pk,
                "url": request.build_absolute_uri(asset.file.url),
                "original_name": asset.original_name,
                "size": asset.size,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="import-scorm",
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_scorm(self, request):
        package = request.FILES.get("package")
        if not package:
            return Response({"detail": "Выберите ZIP-пакет SCORM 1.2"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            manifest = inspect_scorm_package(package)
        except Exception as exc:
            if hasattr(exc, "detail"):
                return Response({"detail": exc.detail}, status=status.HTTP_400_BAD_REQUEST)
            raise

        project = None
        folder = None
        project_id = request.data.get("project")
        folder_id = request.data.get("folder")
        if project_id:
            project = get_object_or_404(ContentProject, pk=project_id)
        if folder_id:
            folder = get_object_or_404(ContentFolder.objects.select_related("project"), pk=folder_id)
        try:
            project, folder = validate_library_placement(request, project, folder)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        course = Course.objects.create(
            title=manifest.title,
            description=f"Импортировано из SCORM 1.2 · {Path(package.name).name}",
            author=request.user,
            project=project,
            folder=folder,
            source_format=Course.SourceFormat.SCORM_12,
            scorm_identifier=manifest.identifier,
            scorm_original_name=Path(package.name).name[:255],
            scorm_size=package.size,
            scorm_imported_at=timezone.now(),
        )
        try:
            course.scorm_package.save(Path(package.name).name, package, save=True)
            Lesson.objects.create(
                course=course,
                title=manifest.title,
                lesson_type=Lesson.Type.SCORM,
                duration_minutes=30,
                position=0,
                is_required=True,
            )
            extract_scorm_package(course, manifest)
        except Exception:
            course.delete()
            raise
        record_audit(
            actor=request.user,
            entity_type="course",
            entity_id=course.pk,
            action="scorm_imported",
            changes={"title": course.title, "filename": course.scorm_original_name},
            request=request,
        )
        return Response(self.get_serializer(course).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        url_path="replace-scorm",
        parser_classes=[MultiPartParser, FormParser],
    )
    def replace_scorm(self, request, pk=None):
        course = self.get_object()
        if course.source_format != Course.SourceFormat.SCORM_12:
            return Response({"detail": "Этот курс не является SCORM 1.2"}, status=status.HTTP_400_BAD_REQUEST)
        package = request.FILES.get("package")
        if not package:
            return Response({"detail": "Выберите новую версию ZIP-пакета"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            manifest = inspect_scorm_package(package)
        except Exception as exc:
            if hasattr(exc, "detail"):
                return Response({"detail": exc.detail}, status=status.HTTP_400_BAD_REQUEST)
            raise

        old_package_name = course.scorm_package.name
        old_content_dir = course.scorm_content_dir
        old_values = {
            "scorm_package": old_package_name,
            "scorm_identifier": course.scorm_identifier,
            "scorm_entry_point": course.scorm_entry_point,
            "scorm_content_dir": old_content_dir,
            "scorm_original_name": course.scorm_original_name,
            "scorm_size": course.scorm_size,
            "scorm_imported_at": course.scorm_imported_at,
        }
        storage = course.scorm_package.storage
        new_package_name = ""
        try:
            course.scorm_package.save(Path(package.name).name, package, save=False)
            new_package_name = course.scorm_package.name
            course.scorm_identifier = manifest.identifier
            course.scorm_original_name = Path(package.name).name[:255]
            course.scorm_size = package.size
            course.scorm_imported_at = timezone.now()
            course.save(
                update_fields=[
                    "scorm_package", "scorm_identifier", "scorm_original_name", "scorm_size",
                    "scorm_imported_at", "updated_at",
                ]
            )
            extract_scorm_package(course, manifest)
        except Exception:
            if new_package_name and new_package_name != old_package_name:
                storage.delete(new_package_name)
            for field, value in old_values.items():
                setattr(course, field, value)
            course.save(update_fields=[*old_values, "updated_at"])
            raise

        if old_package_name and old_package_name != new_package_name:
            storage.delete(old_package_name)
        self._remove_scorm_content(old_content_dir, keep=course.scorm_content_dir)
        course.version += 1
        if course.status == Course.Status.PUBLISHED:
            course.status = Course.Status.DRAFT
        course.save(update_fields=["version", "status", "updated_at"])
        record_audit(
            actor=request.user,
            entity_type="course",
            entity_id=course.pk,
            action="scorm_replaced",
            changes={"title": course.title, "version": course.version, "filename": course.scorm_original_name},
            request=request,
        )
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"], url_path="convert-to-native")
    def convert_to_native(self, request, pk=None):
        course = self.get_object()
        if course.source_format != Course.SourceFormat.SCORM_12:
            return Response({"detail": "Этот курс уже доступен в редакторе Smartis"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            existing_copy = Course.objects.filter(
                author=request.user,
                source_format=Course.SourceFormat.NATIVE,
                title=f"{course.title} — редактируемая копия"[:220],
                description__startswith=f"Создано из SCORM 1.2 «{course.title}».",
            ).order_by("-updated_at").first()
            if existing_copy:
                restore_ispring_images(course, existing_copy)
                return Response(self.get_serializer(existing_copy).data)
            converted = convert_ispring_scorm_to_native(course, request.user)
        except serializers.ValidationError as exc:
            return Response({"detail": exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        record_audit(
            actor=request.user,
            entity_type="course",
            entity_id=converted.pk,
            action="scorm_converted",
            changes={"title": converted.title, "source_course_id": course.pk},
            request=request,
        )
        return Response(self.get_serializer(converted).data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _remove_scorm_content(relative_dir, keep=""):
        if not relative_dir or relative_dir == keep:
            return
        media_root = Path(settings.MEDIA_ROOT).resolve()
        content_dir = (media_root / relative_dir).resolve()
        if content_dir != media_root and media_root in content_dir.parents:
            shutil.rmtree(content_dir, ignore_errors=True)

    @action(detail=True, methods=["get"], url_path="export-scorm")
    def export_scorm(self, request, pk=None):
        course = self.get_object()
        filename = f"{slugify(course.title, allow_unicode=True) or f'course-{course.id}'}-scorm-1.2.zip"
        if course.source_format == Course.SourceFormat.SCORM_12 and course.scorm_package:
            return FileResponse(course.scorm_package.open("rb"), as_attachment=True, filename=filename)
        package = build_scorm_12_package(course)
        return FileResponse(package, as_attachment=True, filename=filename)

    @action(detail=True, methods=["get"], url_path="scorm-launch")
    def scorm_launch(self, request, pk=None):
        course = self.get_object()
        if course.source_format != Course.SourceFormat.SCORM_12:
            return Response({"detail": "Этот курс не является SCORM 1.2"}, status=status.HTTP_400_BAD_REQUEST)
        ensure_scorm_runtime_bridge(course)
        token = signing.TimestampSigner(salt="learning.scorm-content").sign(str(course.id))
        entry_point = quote(course.scorm_entry_point, safe="/")
        relative_url = f"/scorm-content/{course.id}/{quote(token)}/{entry_point}"
        origin = settings.SCORM_CONTENT_ORIGIN or request.build_absolute_uri("/").rstrip("/")
        return Response({"launch_url": f"{origin}{relative_url}"})

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        course = self.get_object()
        if not course.lessons.exists():
            return Response(
                {"detail": "Добавьте хотя бы один урок перед публикацией"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        missing_videos = course.lessons.filter(lesson_type=Lesson.Type.VIDEO, video_file="")
        if missing_videos.exists():
            return Response(
                {"detail": "Загрузите видео для всех видеоуроков перед публикацией"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.status = Course.Status.PUBLISHED
        course.published_at = timezone.now()
        course.save(update_fields=["status", "published_at", "updated_at"])
        record_audit(
            actor=request.user,
            entity_type="course",
            entity_id=course.pk,
            action="published",
            changes={"title": course.title, "version": course.version},
            request=request,
        )
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        course.status = Course.Status.DRAFT
        course.save(update_fields=["status", "updated_at"])
        record_audit(
            actor=request.user,
            entity_type="course",
            entity_id=course.pk,
            action="unpublished",
            changes={"title": course.title, "version": course.version},
            request=request,
        )
        return Response(self.get_serializer(course).data)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path="cover",
        parser_classes=[MultiPartParser, FormParser],
    )
    def cover(self, request, pk=None):
        course = self.get_object()

        if request.method == "DELETE":
            if course.cover_file:
                course.cover_file.delete(save=False)
            course.cover_file = ""
            course.cover_original_name = ""
            course.cover_size = 0
            course.cover_uploaded_at = None
            course.cover_style = Course.CoverStyle.STANDARD
        else:
            cover = request.FILES.get("cover")
            if not cover:
                return Response({"detail": "Выберите изображение для обложки"}, status=status.HTTP_400_BAD_REQUEST)
            suffix = Path(cover.name).suffix.lower()
            allowed_suffixes = {".jpg", ".jpeg", ".png", ".webp"}
            allowed_types = {"image/jpeg", "image/png", "image/webp"}
            if suffix not in allowed_suffixes or cover.content_type not in allowed_types:
                return Response(
                    {"detail": "Для обложки поддерживаются JPG, PNG и WebP"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if cover.size > settings.MAX_COVER_UPLOAD_SIZE:
                max_mb = settings.MAX_COVER_UPLOAD_SIZE // (1024 * 1024)
                return Response(
                    {"detail": f"Размер обложки не должен превышать {max_mb} МБ"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if course.cover_file:
                course.cover_file.delete(save=False)
            course.cover_file = cover
            course.cover_original_name = Path(cover.name).name[:255]
            course.cover_size = cover.size
            course.cover_uploaded_at = timezone.now()
            course.cover_style = Course.CoverStyle.CUSTOM

        course.version += 1
        if course.status == Course.Status.PUBLISHED:
            course.status = Course.Status.DRAFT
        course.save()
        return Response(self.get_serializer(course).data)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path=r"lessons/(?P<lesson_id>\d+)/video",
        parser_classes=[MultiPartParser, FormParser],
    )
    def lesson_video(self, request, pk=None, lesson_id=None):
        course = self.get_object()
        lesson = get_object_or_404(course.lessons, pk=lesson_id)

        if request.method == "DELETE":
            if lesson.video_file:
                lesson.video_file.delete(save=False)
            lesson.video_file = ""
            lesson.video_original_name = ""
            lesson.video_size = 0
            lesson.video_uploaded_at = None
            lesson.save(
                update_fields=["video_file", "video_original_name", "video_size", "video_uploaded_at", "updated_at"]
            )
        else:
            video = request.FILES.get("video")
            if not video:
                return Response({"detail": "Выберите видеофайл"}, status=status.HTTP_400_BAD_REQUEST)
            suffix = Path(video.name).suffix.lower()
            allowed_suffixes = {".mp4", ".webm", ".mov", ".m4v"}
            allowed_types = {"video/mp4", "video/webm", "video/quicktime", "video/x-m4v"}
            if suffix not in allowed_suffixes or video.content_type not in allowed_types:
                return Response(
                    {"detail": "Поддерживаются видео MP4, WebM, MOV и M4V"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if video.size > settings.MAX_VIDEO_UPLOAD_SIZE:
                max_mb = settings.MAX_VIDEO_UPLOAD_SIZE // (1024 * 1024)
                return Response(
                    {"detail": f"Размер видео не должен превышать {max_mb} МБ"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if lesson.video_file:
                lesson.video_file.delete(save=False)
            lesson.video_file = video
            lesson.video_original_name = Path(video.name).name[:255]
            lesson.video_size = video.size
            lesson.video_uploaded_at = timezone.now()
            lesson.save()

        course.version += 1
        if course.status == Course.Status.PUBLISHED:
            course.status = Course.Status.DRAFT
        course.save(update_fields=["version", "status", "updated_at"])
        return Response(LessonSerializer(lesson, context=self.get_serializer_context()).data)


@xframe_options_exempt
def scorm_content(request, course_id, token, asset_path):
    try:
        signed_course_id = signing.TimestampSigner(salt="learning.scorm-content").unsign(
            token,
            max_age=8 * 60 * 60,
        )
    except signing.BadSignature:
        return HttpResponseNotFound()

    if signed_course_id != str(course_id):
        return HttpResponseNotFound()

    course = get_object_or_404(Course, pk=course_id, source_format=Course.SourceFormat.SCORM_12)
    content_root = (Path(settings.MEDIA_ROOT) / course.scorm_content_dir).resolve()
    requested_file = (content_root / asset_path).resolve()
    if content_root not in requested_file.parents or not requested_file.is_file():
        return HttpResponseNotFound()

    content_type, encoding = mimetypes.guess_type(requested_file.name)
    response = FileResponse(requested_file.open("rb"), content_type=content_type or "application/octet-stream")
    if encoding:
        response["Content-Encoding"] = encoding
    response["Cache-Control"] = "private, max-age=3600"
    response["Referrer-Policy"] = "no-referrer"
    return response
