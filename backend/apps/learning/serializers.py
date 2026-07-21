from django.db import models, transaction
import nh3
from rest_framework import serializers

from .models import Course, Lesson


class LessonSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    lesson_type_label = serializers.CharField(source="get_lesson_type_display", read_only=True)
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "lesson_type",
            "lesson_type_label",
            "content",
            "quiz_data",
            "media_url",
            "video_url",
            "video_original_name",
            "video_size",
            "video_uploaded_at",
            "duration_minutes",
            "position",
            "is_required",
        ]
        read_only_fields = ["video_url", "video_original_name", "video_size", "video_uploaded_at"]

    def get_video_url(self, obj):
        if not obj.video_file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.video_file.url) if request else obj.video_file.url

    def validate_content(self, value):
        return nh3.clean(
            value,
            tags={
                "p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "s", "del",
                "ul", "ol", "li", "blockquote", "pre", "code", "a", "span", "hr",
            },
            clean_content_tags={"script", "style", "iframe", "object", "embed"},
            attributes={
                "a": {"href", "target"},
                "span": {"style"},
                "p": {"style"},
                "h1": {"style"},
                "h2": {"style"},
                "h3": {"style"},
                "h4": {"style"},
            },
            filter_style_properties={
                "font-family", "font-size", "color", "background-color", "line-height", "text-align",
            },
            url_schemes={"http", "https", "mailto"},
        )

    def validate(self, attrs):
        lesson_type = attrs.get("lesson_type", getattr(self.instance, "lesson_type", Lesson.Type.TEXT))
        if lesson_type in {Lesson.Type.LINK, Lesson.Type.FILE} and not attrs.get(
            "media_url", getattr(self.instance, "media_url", "")
        ):
            raise serializers.ValidationError({"media_url": "Добавьте ссылку на материал"})
        if lesson_type == Lesson.Type.QUIZ:
            quiz_data = attrs.get("quiz_data", getattr(self.instance, "quiz_data", {}))
            questions = quiz_data.get("questions", []) if isinstance(quiz_data, dict) else []
            passing_score = quiz_data.get("passing_score", 80) if isinstance(quiz_data, dict) else 80
            if not isinstance(passing_score, (int, float)) or not 0 <= passing_score <= 100:
                raise serializers.ValidationError({"quiz_data": "Проходной балл должен быть от 0 до 100"})
            if not questions:
                raise serializers.ValidationError({"quiz_data": "Добавьте хотя бы один вопрос"})
            for question in questions:
                options = question.get("options", []) if isinstance(question, dict) else []
                if not str(question.get("prompt", "")).strip() or len(options) < 2 or any(
                    not str(option.get("text", "")).strip() for option in options if isinstance(option, dict)
                ):
                    raise serializers.ValidationError({"quiz_data": "У каждого вопроса должны быть текст и минимум два ответа"})
                if sum(bool(option.get("correct")) for option in options if isinstance(option, dict)) != 1:
                    raise serializers.ValidationError({"quiz_data": "Отметьте один правильный ответ для каждого вопроса"})
        return attrs


class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, required=False)
    author_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    lessons_count = serializers.IntegerField(source="lessons.count", read_only=True)
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "cover_style",
            "cover_url",
            "cover_original_name",
            "cover_size",
            "cover_uploaded_at",
            "source_format",
            "scorm_identifier",
            "scorm_entry_point",
            "scorm_original_name",
            "scorm_size",
            "scorm_imported_at",
            "author",
            "author_name",
            "status",
            "status_label",
            "estimated_minutes",
            "version",
            "published_at",
            "created_at",
            "updated_at",
            "lessons_count",
            "lessons",
        ]
        read_only_fields = [
            "id",
            "author",
            "status",
            "version",
            "published_at",
            "created_at",
            "updated_at",
            "cover_url",
            "cover_original_name",
            "cover_size",
            "cover_uploaded_at",
            "source_format",
            "scorm_identifier",
            "scorm_entry_point",
            "scorm_original_name",
            "scorm_size",
            "scorm_imported_at",
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.email

    def get_cover_url(self, obj):
        if not obj.cover_file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(obj.cover_file.url) if request else obj.cover_file.url

    def validate_lessons(self, lessons):
        positions = [lesson.get("position", index) for index, lesson in enumerate(lessons)]
        if len(positions) != len(set(positions)):
            raise serializers.ValidationError("Позиции уроков не должны повторяться")
        return lessons

    @transaction.atomic
    def create(self, validated_data):
        lessons = validated_data.pop("lessons", [])
        course = Course.objects.create(**validated_data)
        self._sync_lessons(course, lessons)
        return course

    @transaction.atomic
    def update(self, instance, validated_data):
        lessons = validated_data.pop("lessons", None)
        changed = any(getattr(instance, field) != value for field, value in validated_data.items())
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if lessons is not None:
            changed = changed or self._lessons_changed(instance, lessons)
            self._sync_lessons(instance, lessons)
        if changed:
            instance.version += 1
            if instance.status == Course.Status.PUBLISHED:
                instance.status = Course.Status.DRAFT
        instance.save()
        return instance

    def _lessons_changed(self, course, lessons):
        current = list(
            course.lessons.values(
                "id", "title", "lesson_type", "content", "quiz_data", "media_url", "duration_minutes", "position", "is_required"
            )
        )
        normalized = []
        for position, lesson in enumerate(lessons):
            normalized.append(
                {
                    "id": lesson.get("id"),
                    "title": lesson.get("title", ""),
                    "lesson_type": lesson.get("lesson_type", Lesson.Type.TEXT),
                    "content": lesson.get("content", ""),
                    "quiz_data": lesson.get("quiz_data", {}),
                    "media_url": lesson.get("media_url", ""),
                    "duration_minutes": lesson.get("duration_minutes", 5),
                    "position": lesson.get("position", position),
                    "is_required": lesson.get("is_required", True),
                }
            )
        return current != normalized

    def _sync_lessons(self, course, lessons):
        existing = {lesson.id: lesson for lesson in course.lessons.all()}
        if existing:
            Lesson.objects.filter(id__in=existing).update(position=models.F("position") + 10000)
        retained = set()
        for position, lesson_data in enumerate(lessons):
            lesson_id = lesson_data.pop("id", None)
            lesson_data["position"] = lesson_data.get("position", position)
            if lesson_id:
                lesson = existing.get(lesson_id)
                if not lesson:
                    raise serializers.ValidationError({"lessons": "Один из уроков не принадлежит этому курсу"})
                for field, value in lesson_data.items():
                    setattr(lesson, field, value)
                lesson.save()
                retained.add(lesson.id)
            else:
                lesson = Lesson.objects.create(course=course, **lesson_data)
                retained.add(lesson.id)
        course.lessons.exclude(id__in=retained).delete()
