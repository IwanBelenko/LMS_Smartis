from django.conf import settings
from django.db.utils import OperationalError, ProgrammingError
from rest_framework import serializers


def validate_corporate_email(value):
    email = value.strip().lower()
    domains = getattr(settings, "CORPORATE_EMAIL_DOMAINS", [])
    try:
        from apps.core.models import get_system_settings

        domains = get_system_settings().corporate_email_domains
    except (OperationalError, ProgrammingError):
        pass
    if domains and email.rsplit("@", 1)[-1] not in domains:
        allowed = ", ".join(f"@{domain}" for domain in domains)
        raise serializers.ValidationError(f"Используйте корпоративную почту: {allowed}")
    return email
