from django.db import models, transaction
import nh3
from rest_framework import serializers

from apps.identity.models import User

from .models import ContentFolder, ContentProject, Course, LearningPath, LearningPathCourse, Lesson


def validate_library_placement(request, project, folder):
    if folder:
        if project and folder.project_id != project.id:
            raise serializers.ValidationError({"folder": "Папка относится к другому проекту"})
        project = folder.project
    if project and request:
        user = request.user
        if not (user.is_superuser or user.role == User.Role.ADMIN) and project.owner_id != user.id:
            raise serializers.ValidationError({"project": "Этот проект принадлежит другому автору"})
    return project, folder


class ContentProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    course_count = serializers.SerializerMethodField()
    folder_count = serializers.SerializerMethodField()
    path_count = serializers.SerializerMethodField()

    class Meta:
        model = ContentProject
        fields = [
            "id", "name", "description", "owner", "owner_name", "course_count", "folder_count",
            "path_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "owner_name", "course_count", "folder_count", "path_count", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        return obj.owner.get_full_name() or obj.owner.email

    def get_course_count(self, obj):
        return obj.courses.count()

    def get_folder_count(self, obj):
        return obj.folders.count()

    def get_path_count(self, obj):
        return obj.learning_paths.count()


class ContentFolderSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    course_count = serializers.SerializerMethodField()
    path_count = serializers.SerializerMethodField()

    class Meta:
        model = ContentFolder
        fields = [
            "id", "name", "project", "project_name", "parent", "course_count", "path_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "project_name", "course_count", "path_count", "created_at", "updated_at"]

    def get_course_count(self, obj):
        return obj.courses.count()

    def get_path_count(self, obj):
        return obj.learning_paths.count()

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        request = self.context.get("request")
        validate_library_placement(request, project, None)
        if parent and parent.project_id != project.id:
            raise serializers.ValidationError({"parent": "Родительская папка относится к другому проекту"})
        if self.instance and parent and parent.id == self.instance.id:
            raise serializers.ValidationError({"parent": "Папка не может находиться внутри самой себя"})
        duplicate = ContentFolder.objects.filter(project=project, parent=parent, name__iexact=attrs.get("name", getattr(self.instance, "name", "")))
        if self.instance:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError({"name": "Папка с таким названием уже существует здесь"})
        return attrs


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
    project_name = serializers.CharField(source="project.name", read_only=True, default="")
    folder_name = serializers.CharField(source="folder.name", read_only=True, default="")

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
            "project",
            "project_name",
            "folder",
            "folder_name",
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

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        folder = attrs.get("folder", getattr(self.instance, "folder", None))
        project, folder = validate_library_placement(self.context.get("request"), project, folder)
        if folder or "project" in attrs or "folder" in attrs:
            attrs["project"] = project
            attrs["folder"] = folder
        return attrs

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


class LearningPathSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source="project.name", read_only=True, default="")
    folder_name = serializers.CharField(source="folder.name", read_only=True, default="")
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    course_ids = serializers.PrimaryKeyRelatedField(source="courses", queryset=Course.objects.all(), many=True, required=False)
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = LearningPath
        fields = [
            "id", "title", "description", "author", "author_name", "project", "project_name", "folder",
            "folder_name", "status", "status_label", "course_ids", "course_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "author", "author_name", "status", "status_label", "course_count", "created_at", "updated_at"]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.email

    def get_course_count(self, obj):
        return obj.courses.count()

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        folder = attrs.get("folder", getattr(self.instance, "folder", None))
        project, folder = validate_library_placement(self.context.get("request"), project, folder)
        if folder or "project" in attrs or "folder" in attrs:
            attrs["project"] = project
            attrs["folder"] = folder
        request = self.context.get("request")
        for course in attrs.get("courses", []):
            if not (request.user.is_superuser or request.user.role == User.Role.ADMIN) and course.author_id != request.user.id:
                raise serializers.ValidationError({"course_ids": "В траекторию можно добавить только свои курсы"})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        courses = validated_data.pop("courses", [])
        learning_path = LearningPath.objects.create(**validated_data)
        LearningPathCourse.objects.bulk_create([
            LearningPathCourse(learning_path=learning_path, course=course, position=position)
            for position, course in enumerate(courses)
        ])
        return learning_path

    @transaction.atomic
    def update(self, instance, validated_data):
        courses = validated_data.pop("courses", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if courses is not None:
            instance.path_courses.all().delete()
            LearningPathCourse.objects.bulk_create([
                LearningPathCourse(learning_path=instance, course=course, position=position)
                for position, course in enumerate(courses)
            ])
        return instance
