import re

from rest_framework import serializers

from .models import SystemSettings


DOMAIN_PATTERN = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            "company_name",
            "legal_name",
            "support_email",
            "corporate_email_domains",
            "invitation_expiry_days",
            "notify_learning",
            "notify_interviews",
            "notify_hr_events",
            "notify_invitations",
            "updated_by",
            "updated_at",
        ]
        read_only_fields = ["updated_by", "updated_at"]

    def validate_corporate_email_domains(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Передайте домены списком")
        normalized = []
        for domain in value:
            domain = str(domain).strip().lower().lstrip("@")
            if not domain:
                continue
            if not DOMAIN_PATTERN.fullmatch(domain):
                raise serializers.ValidationError(f"Некорректный домен: {domain}")
            if domain not in normalized:
                normalized.append(domain)
        return normalized

    def validate_invitation_expiry_days(self, value):
        if not 1 <= value <= 30:
            raise serializers.ValidationError("Укажите срок от 1 до 30 дней")
        return value
