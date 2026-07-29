from django.conf import settings
from rest_framework import serializers


def validate_corporate_email(value):
    email = value.strip().lower()
    domains = getattr(settings, "CORPORATE_EMAIL_DOMAINS", [])
    if domains and email.rsplit("@", 1)[-1] not in domains:
        allowed = ", ".join(f"@{domain}" for domain in domains)
        raise serializers.ValidationError(f"Используйте корпоративную почту: {allowed}")
    return email
