import apps.people.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("people", "0017_inboxitemstate"),
    ]

    operations = [
        migrations.CreateModel(
            name="CandidateResume",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to=apps.people.models.candidate_resume_path, verbose_name="Файл резюме")),
                ("file_original_name", models.CharField(max_length=255, verbose_name="Исходное имя файла")),
                ("content_type", models.CharField(blank=True, max_length=120, verbose_name="Тип файла")),
                ("file_size", models.PositiveBigIntegerField(default=0, verbose_name="Размер файла")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("candidate", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="resumes", to="people.candidate")),
                ("uploaded_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="uploaded_candidate_resumes", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Резюме кандидата",
                "verbose_name_plural": "Резюме кандидатов",
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
