import apps.learning.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0002_lesson_video_file_lesson_video_original_name_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="cover_style",
            field=models.CharField(
                choices=[("standard", "Стандартная"), ("custom", "Своя обложка")],
                default="standard",
                max_length=20,
                verbose_name="Тип обложки",
            ),
        ),
        migrations.AddField(
            model_name="course",
            name="cover_file",
            field=models.FileField(blank=True, upload_to=apps.learning.models.course_cover_path, verbose_name="Файл обложки"),
        ),
        migrations.AddField(
            model_name="course",
            name="cover_original_name",
            field=models.CharField(blank=True, max_length=255, verbose_name="Исходное имя обложки"),
        ),
        migrations.AddField(
            model_name="course",
            name="cover_size",
            field=models.PositiveBigIntegerField(default=0, verbose_name="Размер обложки"),
        ),
        migrations.AddField(
            model_name="course",
            name="cover_uploaded_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Дата загрузки обложки"),
        ),
    ]
