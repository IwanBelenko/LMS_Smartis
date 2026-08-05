import django.db.models.deletion
from django.db import migrations, models


def _copy_user_data(apps, schema_editor):
    EmployeeProfile = apps.get_model("people", "EmployeeProfile")
    for profile in EmployeeProfile.objects.select_related("user").all().iterator():
        profile.first_name = profile.user.first_name
        profile.last_name = profile.user.last_name
        profile.email = profile.user.email
        profile.department_id = profile.user.department_id
        profile.save(update_fields=["first_name", "last_name", "email", "department"])


class Migration(migrations.Migration):
    dependencies = [("people", "0020_alter_staffposition_note")]

    operations = [
        migrations.AlterModelOptions(name="employeeprofile", options={"ordering": ["last_name", "first_name"], "verbose_name": "Карточка сотрудника", "verbose_name_plural": "Карточки сотрудников"}),
        migrations.AlterField(model_name="employeeprofile", name="employee_number", field=models.CharField(blank=True, max_length=40, null=True, unique=True, verbose_name="Табельный номер")),
        migrations.AlterField(model_name="employeeprofile", name="user", field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="employee_profile", to="identity.user")),
        migrations.AddField(model_name="employeeprofile", name="department", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="employee_profiles", to="identity.department", verbose_name="Отдел")),
        migrations.AddField(model_name="employeeprofile", name="email", field=models.EmailField(blank=True, max_length=254, verbose_name="Корпоративная почта")),
        migrations.AddField(model_name="employeeprofile", name="first_name", field=models.CharField(blank=True, max_length=150, verbose_name="Имя")),
        migrations.AddField(model_name="employeeprofile", name="last_name", field=models.CharField(blank=True, max_length=150, verbose_name="Фамилия")),
        migrations.AddField(model_name="employeeprofile", name="birthday_chat_member", field=models.BooleanField(blank=True, null=True, verbose_name="Добавлен в чат дней рождения")),
        migrations.AddField(model_name="employeeprofile", name="company_review_left", field=models.BooleanField(blank=True, null=True, verbose_name="Оставил отзыв о компании")),
        migrations.AddField(model_name="employeeprofile", name="dms_details", field=models.CharField(blank=True, max_length=160, verbose_name="Дополнительные сведения по ДМС")),
        migrations.AddField(model_name="employeeprofile", name="dms_status", field=models.CharField(blank=True, max_length=80, verbose_name="ДМС")),
        migrations.AddField(model_name="employeeprofile", name="electronic_employment_record", field=models.BooleanField(blank=True, null=True, verbose_name="Электронная трудовая книжка")),
        migrations.AddField(model_name="employeeprofile", name="gender", field=models.CharField(blank=True, choices=[("female", "Женский"), ("male", "Мужской")], max_length=10, verbose_name="Пол")),
        migrations.AddField(model_name="employeeprofile", name="hr_notes", field=models.TextField(blank=True, verbose_name="Заметки HR")),
        migrations.AddField(model_name="employeeprofile", name="legal_entity", field=models.CharField(blank=True, max_length=150, verbose_name="Юридическое лицо")),
        migrations.AddField(model_name="employeeprofile", name="location", field=models.CharField(blank=True, max_length=120, verbose_name="Локация")),
        migrations.AddField(model_name="employeeprofile", name="participates_secret_santa", field=models.BooleanField(blank=True, null=True, verbose_name="Участвует в Тайном Санте")),
        migrations.AddField(model_name="employeeprofile", name="performance_notes", field=models.TextField(blank=True, verbose_name="Комментарий к оценке эффективности")),
        migrations.AddField(model_name="employeeprofile", name="performance_rating", field=models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True, verbose_name="Оценка эффективности")),
        migrations.AddField(model_name="employeeprofile", name="personal_data_consent_kedo", field=models.BooleanField(blank=True, null=True, verbose_name="Согласие на ПДн в КЭДО")),
        migrations.AddField(model_name="employeeprofile", name="survey_completed", field=models.BooleanField(blank=True, null=True, verbose_name="Прошёл опрос")),
        migrations.AddField(model_name="employeeprofile", name="telegram", field=models.CharField(blank=True, max_length=100, verbose_name="Telegram")),
        migrations.AddField(model_name="employeeprofile", name="time_off_balance", field=models.CharField(blank=True, max_length=120, verbose_name="Отгулы")),
        migrations.RunPython(code=_copy_user_data, reverse_code=migrations.RunPython.noop),
    ]
