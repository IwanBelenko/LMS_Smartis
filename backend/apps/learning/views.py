import mimetypes
import shutil
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core import signing
from django.http import FileResponse, HttpResponseNotFound
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.identity.models import User

from .models import Course, Lesson
from .permissions import IsCourseManagerOrReadOnly
from .scorm import build_scorm_12_package, ensure_scorm_runtime_bridge, extract_scorm_package, inspect_scorm_package
from .serializers import CourseSerializer, LessonSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsCourseManagerOrReadOnly]

    def get_queryset(self):
        queryset = Course.objects.select_related("author").prefetch_related("lessons")
        user = self.request.user
        if user.is_superuser or user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.AUTHOR:
            return queryset.filter(author=user)
        return queryset.filter(status=Course.Status.PUBLISHED)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

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

        course = Course.objects.create(
            title=manifest.title,
            description=f"Импортировано из SCORM 1.2 · {Path(package.name).name}",
            author=request.user,
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
        return Response(self.get_serializer(course).data)

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
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        course.status = Course.Status.DRAFT
        course.save(update_fields=["status", "updated_at"])
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
