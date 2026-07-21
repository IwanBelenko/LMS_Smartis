import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


def lesson_video_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"courses/{instance.course_id}/videos/{uuid.uuid4().hex}{suffix}"


def course_cover_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"courses/{instance.id}/cover/{uuid.uuid4().hex}{suffix}"


class Course(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликован"
        ARCHIVED = "archived", "В архиве"

    class CoverStyle(models.TextChoices):
        STANDARD = "standard", "Стандартная"
        CUSTOM = "custom", "Своя обложка"

    title = models.CharField("Название", max_length=220)
    description = models.TextField("Описание", blank=True)
    cover_style = models.CharField(
        "Тип обложки", max_length=20, choices=CoverStyle.choices, default=CoverStyle.STANDARD
    )
    cover_file = models.FileField("Файл обложки", upload_to=course_cover_path, blank=True)
    cover_original_name = models.CharField("Исходное имя обложки", max_length=255, blank=True)
    cover_size = models.PositiveBigIntegerField("Размер обложки", default=0)
    cover_uploaded_at = models.DateTimeField("Дата загрузки обложки", null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Автор",
        related_name="authored_courses",
        on_delete=models.PROTECT,
    )
    status = models.CharField("Статус", max_length=20, choices=Status.choices, default=Status.DRAFT)
    estimated_minutes = models.PositiveIntegerField("Длительность, минут", default=30)
    version = models.PositiveIntegerField("Версия", default=1)
    published_at = models.DateTimeField("Дата публикации", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Курс"
        verbose_name_plural = "Курсы"

    def __str__(self) -> str:
        return self.title


class Lesson(models.Model):
    class Type(models.TextChoices):
        TEXT = "text", "Текст"
        VIDEO = "video", "Видео"
        LINK = "link", "Ссылка"
        FILE = "file", "Файл"

    course = models.ForeignKey(Course, related_name="lessons", on_delete=models.CASCADE)
    title = models.CharField("Название", max_length=220)
    lesson_type = models.CharField("Тип", max_length=20, choices=Type.choices, default=Type.TEXT)
    content = models.TextField("Содержание", blank=True)
    media_url = models.URLField("Ссылка на материал", blank=True)
    video_file = models.FileField("Видеофайл", upload_to=lesson_video_path, blank=True)
    video_original_name = models.CharField("Исходное имя видео", max_length=255, blank=True)
    video_size = models.PositiveBigIntegerField("Размер видео", default=0)
    video_uploaded_at = models.DateTimeField("Дата загрузки видео", null=True, blank=True)
    duration_minutes = models.PositiveIntegerField("Длительность, минут", default=5)
    position = models.PositiveIntegerField("Позиция", default=0)
    is_required = models.BooleanField("Обязательный", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "Урок"
        verbose_name_plural = "Уроки"
        constraints = [
            models.UniqueConstraint(fields=["course", "position"], name="unique_lesson_position"),
        ]

    def __str__(self) -> str:
        return self.title


@receiver(post_delete, sender=Lesson)
def delete_lesson_video(sender, instance, **kwargs):
    if instance.video_file:
        instance.video_file.delete(save=False)


@receiver(post_delete, sender=Course)
def delete_course_cover(sender, instance, **kwargs):
    if instance.cover_file:
        instance.cover_file.delete(save=False)
