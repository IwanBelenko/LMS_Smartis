import uuid
import shutil
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


def scorm_package_path(instance, filename):
    return f"courses/{instance.id}/scorm/{uuid.uuid4().hex}.zip"


class Course(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликован"
        ARCHIVED = "archived", "В архиве"

    class CoverStyle(models.TextChoices):
        STANDARD = "standard", "Стандартная"
        CUSTOM = "custom", "Своя обложка"

    class SourceFormat(models.TextChoices):
        NATIVE = "native", "Курс Smartis"
        SCORM_12 = "scorm_12", "SCORM 1.2"

    title = models.CharField("Название", max_length=220)
    description = models.TextField("Описание", blank=True)
    cover_style = models.CharField(
        "Тип обложки", max_length=20, choices=CoverStyle.choices, default=CoverStyle.STANDARD
    )
    cover_file = models.FileField("Файл обложки", upload_to=course_cover_path, blank=True)
    cover_original_name = models.CharField("Исходное имя обложки", max_length=255, blank=True)
    cover_size = models.PositiveBigIntegerField("Размер обложки", default=0)
    cover_uploaded_at = models.DateTimeField("Дата загрузки обложки", null=True, blank=True)
    source_format = models.CharField(
        "Формат источника", max_length=20, choices=SourceFormat.choices, default=SourceFormat.NATIVE
    )
    scorm_package = models.FileField("SCORM-пакет", upload_to=scorm_package_path, blank=True)
    scorm_identifier = models.CharField("Идентификатор SCORM", max_length=255, blank=True)
    scorm_entry_point = models.CharField("Стартовый файл SCORM", max_length=500, blank=True)
    scorm_content_dir = models.CharField("Каталог SCORM", max_length=500, blank=True)
    scorm_original_name = models.CharField("Исходное имя SCORM", max_length=255, blank=True)
    scorm_size = models.PositiveBigIntegerField("Размер SCORM", default=0)
    scorm_imported_at = models.DateTimeField("Дата импорта SCORM", null=True, blank=True)
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
        QUIZ = "quiz", "Тест"
        SCORM = "scorm", "SCORM 1.2"

    course = models.ForeignKey(Course, related_name="lessons", on_delete=models.CASCADE)
    title = models.CharField("Название", max_length=220)
    lesson_type = models.CharField("Тип", max_length=20, choices=Type.choices, default=Type.TEXT)
    content = models.TextField("Содержание", blank=True)
    quiz_data = models.JSONField("Настройки теста", default=dict, blank=True)
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
    if instance.scorm_package:
        instance.scorm_package.delete(save=False)
    if instance.scorm_content_dir:
        content_dir = (Path(settings.MEDIA_ROOT) / instance.scorm_content_dir).resolve()
        media_root = Path(settings.MEDIA_ROOT).resolve()
        if content_dir != media_root and media_root in content_dir.parents:
            shutil.rmtree(content_dir, ignore_errors=True)
