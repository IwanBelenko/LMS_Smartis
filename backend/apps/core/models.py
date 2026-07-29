from django.conf import settings
from django.db import models


def default_corporate_email_domains():
    return list(getattr(settings, "CORPORATE_EMAIL_DOMAINS", []))


class SystemSettings(models.Model):
    company_name = models.CharField("Название платформы", max_length=160, default="HCM / LMS Smartis")
    legal_name = models.CharField("Юридическое название", max_length=240, blank=True)
    support_email = models.EmailField("Почта поддержки", blank=True)
    corporate_email_domains = models.JSONField(
        "Корпоративные домены",
        default=default_corporate_email_domains,
        blank=True,
    )
    invitation_expiry_days = models.PositiveSmallIntegerField("Срок приглашения, дней", default=7)
    notify_learning = models.BooleanField("Уведомления об обучении", default=True)
    notify_interviews = models.BooleanField("Уведомления о собеседованиях", default=True)
    notify_hr_events = models.BooleanField("Уведомления о кадровых событиях", default=True)
    notify_invitations = models.BooleanField("Уведомления о приглашениях", default=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="updated_system_settings",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Системные настройки"
        verbose_name_plural = "Системные настройки"


def get_system_settings():
    configuration, _ = SystemSettings.objects.get_or_create(pk=1)
    return configuration
