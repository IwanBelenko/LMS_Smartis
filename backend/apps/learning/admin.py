from django.contrib import admin

from .models import (
    ContentFolder,
    ContentProject,
    Course,
    CourseEnrollment,
    LearningPath,
    Lesson,
    LessonProgress,
    QuizAttempt,
)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "project", "folder", "status", "version", "updated_at"]
    list_filter = ["status", "author", "project"]
    search_fields = ["title", "description"]
    inlines = [LessonInline]


@admin.register(ContentProject)
class ContentProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "updated_at"]
    search_fields = ["name", "description", "owner__email"]


@admin.register(ContentFolder)
class ContentFolderAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "parent", "updated_at"]
    list_filter = ["project"]


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "project", "folder", "status", "updated_at"]
    list_filter = ["status", "author", "project"]


admin.site.register(CourseEnrollment)
admin.site.register(LessonProgress)
admin.site.register(QuizAttempt)
