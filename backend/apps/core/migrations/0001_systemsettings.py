from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import apps.core.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SystemSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company_name", models.CharField(default="HCM / LMS Smartis", max_length=160, verbose_name="Название платформы")),
                ("legal_name", models.CharField(blank=True, max_length=240, verbose_name="Юридическое название")),
                ("support_email", models.EmailField(blank=True, max_length=254, verbose_name="Почта поддержки")),
                (
                    "corporate_email_domains",
                    models.JSONField(blank=True, default=apps.core.models.default_corporate_email_domains, verbose_name="Корпоративные домены"),
                ),
                ("invitation_expiry_days", models.PositiveSmallIntegerField(default=7, verbose_name="Срок приглашения, дней")),
                ("notify_learning", models.BooleanField(default=True, verbose_name="Уведомления об обучении")),
                ("notify_interviews", models.BooleanField(default=True, verbose_name="Уведомления о собеседованиях")),
                ("notify_hr_events", models.BooleanField(default=True, verbose_name="Уведомления о кадровых событиях")),
                ("notify_invitations", models.BooleanField(default=True, verbose_name="Уведомления о приглашениях")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_system_settings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Системные настройки",
                "verbose_name_plural": "Системные настройки",
            },
        ),
    ]
