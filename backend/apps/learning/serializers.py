from django.db import models, transaction
from rest_framework import serializers

from .models import Course, Lesson


class LessonSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    lesson_type_label = serializers.CharField(source="get_lesson_type_display", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "lesson_type",
            "lesson_type_label",
            "content",
            "media_url",
            "duration_minutes",
            "position",
            "is_required",
        ]

    def validate(self, attrs):
        lesson_type = attrs.get("lesson_type", getattr(self.instance, "lesson_type", Lesson.Type.TEXT))
        if lesson_type in {Lesson.Type.VIDEO, Lesson.Type.LINK, Lesson.Type.FILE} and not attrs.get(
            "media_url", getattr(self.instance, "media_url", "")
        ):
            raise serializers.ValidationError({"media_url": "Добавьте ссылку на материал"})
        return attrs


class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, required=False)
    author_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    lessons_count = serializers.IntegerField(source="lessons.count", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
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
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.email

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
        instance.save()
        return instance

    def _lessons_changed(self, course, lessons):
        current = list(
            course.lessons.values(
                "id", "title", "lesson_type", "content", "media_url", "duration_minutes", "position", "is_required"
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
