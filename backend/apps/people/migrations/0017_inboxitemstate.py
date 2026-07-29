from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("people", "0016_alter_employmentevent_event_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InboxItemState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_id", models.CharField(max_length=160, verbose_name="Идентификатор уведомления")),
                ("read_at", models.DateTimeField(blank=True, null=True, verbose_name="Прочитано")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inbox_item_states",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Состояние уведомления",
                "verbose_name_plural": "Состояния уведомлений",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="inboxitemstate",
            constraint=models.UniqueConstraint(
                fields=("user", "item_id"),
                name="unique_user_inbox_item_state",
            ),
        ),
    ]
