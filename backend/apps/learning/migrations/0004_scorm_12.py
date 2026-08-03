import apps.learning.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0003_course_cover"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="source_format",
            field=models.CharField(
                choices=[("native", "Курс Smartis"), ("scorm_12", "SCORM 1.2")],
                default="native",
                max_length=20,
                verbose_name="Формат источника",
            ),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_package",
            field=models.FileField(blank=True, upload_to=apps.learning.models.scorm_package_path, verbose_name="SCORM-пакет"),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_identifier",
            field=models.CharField(blank=True, max_length=255, verbose_name="Идентификатор SCORM"),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_entry_point",
            field=models.CharField(blank=True, max_length=500, verbose_name="Стартовый файл SCORM"),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_content_dir",
            field=models.CharField(blank=True, max_length=500, verbose_name="Каталог SCORM"),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_original_name",
            field=models.CharField(blank=True, max_length=255, verbose_name="Исходное имя SCORM"),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_size",
            field=models.PositiveBigIntegerField(default=0, verbose_name="Размер SCORM"),
        ),
        migrations.AddField(
            model_name="course",
            name="scorm_imported_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Дата импорта SCORM"),
        ),
        migrations.AlterField(
            model_name="lesson",
            name="lesson_type",
            field=models.CharField(
                choices=[
                    ("text", "Текст"),
                    ("video", "Видео"),
                    ("link", "Ссылка"),
                    ("file", "Файл"),
                    ("scorm", "SCORM 1.2"),
                ],
                default="text",
                max_length=20,
                verbose_name="Тип",
            ),
        ),
    ]
