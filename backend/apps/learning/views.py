from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.identity.models import User

from .models import Course
from .permissions import IsCourseManagerOrReadOnly
from .serializers import CourseSerializer


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
