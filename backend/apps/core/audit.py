from django.apps import apps


SENSITIVE_MARKERS = ("password", "token", "secret", "authorization", "cookie")


def _safe_value(key, value):
    if any(marker in str(key).lower() for marker in SENSITIVE_MARKERS):
        return "[скрыто]"
    if isinstance(value, dict):
        return {nested_key: _safe_value(nested_key, nested_value) for nested_key, nested_value in value.items()}
    if isinstance(value, (list, tuple)):
        return [_safe_value(key, item) for item in value]
    return value


def safe_audit_changes(changes):
    return {
        key: _safe_value(key, value)
        for key, value in (changes or {}).items()
    }


def record_audit(*, actor, entity_type, entity_id, action, changes=None, request=None):
    AuditEvent = apps.get_model("people", "AuditEvent")
    safe_changes = safe_audit_changes(changes)
    if request:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        safe_changes["_context"] = {
            "ip": (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR", ""))[:64],
            "method": request.method,
            "path": request.path[:240],
        }
    return AuditEvent.objects.create(
        actor=actor,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        changes=safe_changes,
    )
