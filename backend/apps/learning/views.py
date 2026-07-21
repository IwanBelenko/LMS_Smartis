from pathlib import Path

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.identity.models import User

from .models import Course, Lesson
from .permissions import IsCourseManagerOrReadOnly
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
