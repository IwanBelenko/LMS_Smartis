from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0005_user_middle_name"),
        ("people", "0022_alter_employeeprofile_education"),
    ]

    operations = [
        migrations.AddField(
            model_name="employeeprofile",
            name="middle_name",
            field=models.CharField(blank=True, max_length=150, verbose_name="Отчество"),
        ),
        migrations.AlterField(
            model_name="employeeprofile",
            name="grade",
            field=models.CharField(
                blank=True,
                choices=[
                    ("Ассистент", "Ассистент"),
                    ("Junior", "Junior"),
                    ("Middle", "Middle"),
                    ("Senior", "Senior"),
                    ("Руководитель группы / Team Lead", "Руководитель группы / Team Lead"),
                    ("Директор", "Директор"),
                    ("TOP-менеджер", "TOP-менеджер"),
                ],
                max_length=80,
                verbose_name="Грейд",
            ),
        ),
    ]
