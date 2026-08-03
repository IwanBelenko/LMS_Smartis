from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("people", "0015_learningimportbatch"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employmentevent",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("hired", "Приём"),
                    ("dismissed", "Увольнение"),
                    ("transfer", "Перевод"),
                    ("promotion", "Повышение"),
                    ("review", "Оценка"),
                    ("other", "Другое"),
                ],
                default="other",
                max_length=20,
                verbose_name="Тип",
            ),
        ),
    ]
