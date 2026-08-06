from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("identity", "0004_user_can_view_compensation")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="middle_name",
            field=models.CharField(blank=True, max_length=150, verbose_name="Отчество"),
        ),
    ]
