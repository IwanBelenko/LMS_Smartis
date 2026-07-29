from django.db import migrations, models


def preserve_existing_hr_access(apps, schema_editor):
    User = apps.get_model("identity", "User")
    User.objects.filter(role__in=["admin", "hr"]).update(can_view_compensation=True)


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0003_department_manager_department_parent"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="can_view_compensation",
            field=models.BooleanField(default=False, verbose_name="Может видеть оплату труда"),
        ),
        migrations.RunPython(preserve_existing_hr_access, migrations.RunPython.noop),
    ]
