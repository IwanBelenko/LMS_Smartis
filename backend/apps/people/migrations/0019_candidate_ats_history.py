from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("people", "0018_candidateresume"),
    ]

    operations = [
        migrations.CreateModel(
            name="CandidateComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.TextField(verbose_name="Комментарий")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="candidate_comments", to=settings.AUTH_USER_MODEL)),
                ("candidate", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="people.candidate")),
            ],
            options={
                "verbose_name": "Комментарий к кандидату",
                "verbose_name_plural": "Комментарии к кандидатам",
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.CreateModel(
            name="CandidateExperience",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company", models.CharField(max_length=180, verbose_name="Компания")),
                ("position", models.CharField(max_length=180, verbose_name="Должность")),
                ("started_on", models.DateField(blank=True, null=True, verbose_name="Начало работы")),
                ("ended_on", models.DateField(blank=True, null=True, verbose_name="Окончание работы")),
                ("description", models.TextField(blank=True, verbose_name="Обязанности и результаты")),
                ("position_order", models.PositiveSmallIntegerField(default=0, verbose_name="Порядок")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("candidate", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="experiences", to="people.candidate")),
            ],
            options={
                "verbose_name": "Опыт кандидата",
                "verbose_name_plural": "Опыт кандидатов",
                "ordering": ["position_order", "-started_on", "-id"],
            },
        ),
        migrations.CreateModel(
            name="CandidateAssignment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="candidate_assignments_created", to=settings.AUTH_USER_MODEL)),
                ("candidate", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="assignment", to="people.candidate")),
                ("leader", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assigned_candidates", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Назначение кандидата руководителю",
                "verbose_name_plural": "Назначения кандидатов руководителям",
            },
        ),
        migrations.CreateModel(
            name="CandidateStageEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("note", models.CharField(blank=True, max_length=500, verbose_name="Причина или примечание")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("candidate", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="stage_events", to="people.candidate")),
                ("changed_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="candidate_stage_events", to=settings.AUTH_USER_MODEL)),
                ("from_stage", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="candidate_events_from", to="people.candidatestage")),
                ("to_stage", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="candidate_events_to", to="people.candidatestage")),
            ],
            options={
                "verbose_name": "Событие этапа кандидата",
                "verbose_name_plural": "События этапов кандидатов",
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
