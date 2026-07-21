from django.contrib import admin

from .models import Course, Lesson


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status", "version", "updated_at"]
    list_filter = ["status", "author"]
    search_fields = ["title", "description"]
    inlines = [LessonInline]
