from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("people", "0021_employeeprofile_hr_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employeeprofile",
            name="education",
            field=models.TextField(blank=True, verbose_name="Образование"),
        ),
    ]
