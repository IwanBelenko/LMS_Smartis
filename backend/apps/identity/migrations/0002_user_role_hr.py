from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("identity", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("admin", "Администратор"),
                    ("hr", "HR-менеджер"),
                    ("author", "Автор"),
                    ("leader", "Руководитель"),
                    ("employee", "Сотрудник"),
                ],
                default="employee",
                max_length=20,
                verbose_name="Роль",
            ),
        ),
    ]
