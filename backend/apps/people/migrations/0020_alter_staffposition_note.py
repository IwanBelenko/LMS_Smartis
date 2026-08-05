from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("people", "0019_candidate_ats_history"),
    ]

    operations = [
        migrations.AlterField(
            model_name="staffposition",
            name="note",
            field=models.TextField(blank=True, verbose_name="Комментарий"),
        ),
    ]
