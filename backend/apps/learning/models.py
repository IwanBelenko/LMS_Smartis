from django.conf import settings
from django.db import models


class Course(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликован"
        ARCHIVED = "archived", "В архиве"

    title = models.CharField("Название", max_length=220)
    description = models.TextField("Описание", blank=True)
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
