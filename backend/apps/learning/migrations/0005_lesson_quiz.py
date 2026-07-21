from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("learning", "0004_scorm_12")]

    operations = [
        migrations.AddField(
            model_name="lesson",
            name="quiz_data",
            field=models.JSONField(blank=True, default=dict, verbose_name="Настройки теста"),
        ),
        migrations.AlterField(
            model_name="lesson",
            name="lesson_type",
            field=models.CharField(
                choices=[
                    ("text", "Текст"),
                    ("video", "Видео"),
                    ("link", "Ссылка"),
                    ("file", "Файл"),
                    ("quiz", "Тест"),
                    ("scorm", "SCORM 1.2"),
                ],
                default="text",
                max_length=20,
                verbose_name="Тип",
            ),
        ),
    ]
