from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("people", "0014_hrimportbatch"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LearningImportBatch",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source", models.CharField(choices=[("ispring_file", "Отчёт iSpring"), ("ispring_api", "API iSpring")], default="ispring_file", max_length=20, verbose_name="Источник")),
                ("status", models.CharField(choices=[("preview", "На проверке"), ("completed", "Завершён")], default="preview", max_length=20, verbose_name="Статус")),
                ("filename", models.CharField(max_length=255, verbose_name="Имя файла")),
                ("file_sha256", models.CharField(max_length=64, verbose_name="Хэш файла")),
                ("payload_sha256", models.CharField(max_length=64, verbose_name="Хэш данных")),
                ("mapping", models.JSONField(blank=True, default=dict, verbose_name="Сопоставление колонок")),
                ("total_rows", models.PositiveIntegerField(default=0, verbose_name="Всего строк")),
                ("created_count", models.PositiveIntegerField(default=0, verbose_name="Создано")),
                ("updated_count", models.PositiveIntegerField(default=0, verbose_name="Обновлено")),
                ("error_count", models.PositiveIntegerField(default=0, verbose_name="Ошибок")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("imported_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="learning_import_batches", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Импорт результатов обучения",
                "verbose_name_plural": "Импорты результатов обучения",
                "ordering": ["-created_at"],
            },
        ),
    ]
