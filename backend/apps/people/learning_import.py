from __future__ import annotations

from datetime import datetime, timedelta
import hashlib

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.learning.models import Course
from .employee_import import MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, _parse_csv, _parse_xlsx, employee_import_payload_hash
from .models import AuditEvent, EmployeeLearning, EmployeeProfile, LearningImportBatch


IMPORT_FIELDS = [
    {"key": "employee_email", "label": "Корпоративная почта", "required": True},
    {"key": "course_title", "label": "Название курса", "required": True},
    {"key": "status", "label": "Статус", "required": False},
    {"key": "progress", "label": "Прогресс, %", "required": False},
    {"key": "score", "label": "Результат, %", "required": False},
    {"key": "completed_at", "label": "Дата завершения", "required": False},
]

HEADER_ALIASES = {
    "employee_email": {"email", "e-mail", "почта", "корпоративная почта", "email пользователя", "user email"},
    "course_title": {"курс", "название курса", "course", "course title", "материал"},
    "status": {"статус", "status", "статус прохождения"},
    "progress": {"прогресс", "progress", "выполнено", "completion", "completion percentage"},
    "score": {"баллы", "результат", "score", "result", "итоговый балл"},
    "completed_at": {"дата завершения", "завершено", "completion date", "completed at", "дата прохождения"},
}

STATUS_ALIASES = {
    "assigned": EmployeeLearning.Status.ASSIGNED,
    "назначен": EmployeeLearning.Status.ASSIGNED,
    "назначено": EmployeeLearning.Status.ASSIGNED,
    "не начат": EmployeeLearning.Status.ASSIGNED,
    "not started": EmployeeLearning.Status.ASSIGNED,
    "in progress": EmployeeLearning.Status.IN_PROGRESS,
    "in_progress": EmployeeLearning.Status.IN_PROGRESS,
    "проходит": EmployeeLearning.Status.IN_PROGRESS,
    "в процессе": EmployeeLearning.Status.IN_PROGRESS,
    "начат": EmployeeLearning.Status.IN_PROGRESS,
    "completed": EmployeeLearning.Status.COMPLETED,
    "complete": EmployeeLearning.Status.COMPLETED,
    "завершен": EmployeeLearning.Status.COMPLETED,
    "завершён": EmployeeLearning.Status.COMPLETED,
    "пройден": EmployeeLearning.Status.COMPLETED,
    "успешно завершен": EmployeeLearning.Status.COMPLETED,
    "успешно завершён": EmployeeLearning.Status.COMPLETED,
}


def _normalize(value):
    return " ".join(str(value or "").strip().lower().replace("_", " ").split())


def suggest_learning_mapping(headers):
    normalized = {_normalize(header): header for header in headers}
    result = {}
    for key, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            if _normalize(alias) in normalized:
                result[key] = normalized[_normalize(alias)]
                break
    return result


def parse_learning_import_file(uploaded_file):
    if not uploaded_file:
        raise ValidationError({"file": "Выберите CSV или XLSX-файл"})
    if uploaded_file.size > MAX_IMPORT_BYTES:
        raise ValidationError({"file": "Размер файла не должен превышать 5 МБ"})
    filename = uploaded_file.name or "ispring-report"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    data = uploaded_file.read()
    if extension == "csv":
        headers, rows = _parse_csv(data)
    elif extension == "xlsx":
        headers, rows = _parse_xlsx(data)
    else:
        raise ValidationError({"file": "Поддерживаются только файлы CSV и XLSX"})
    return {
        "filename": filename,
        "file_sha256": hashlib.sha256(data).hexdigest(),
        "payload_sha256": employee_import_payload_hash(rows),
        "headers": headers,
        "rows": rows,
        "mapping": suggest_learning_mapping(headers),
        "fields": IMPORT_FIELDS,
    }


def _value(row, mapping, key):
    header = mapping.get(key)
    return str(row.get(header, "") if header else "").strip()


def _percent(value, field, errors):
    if not value:
        return None
    normalized = value.replace("%", "").replace(" ", "").replace(",", ".")
    try:
        number = round(float(normalized))
    except ValueError:
        errors[field] = ["Укажите число от 0 до 100"]
        return None
    if not 0 <= number <= 100:
        errors[field] = ["Значение должно быть от 0 до 100"]
        return None
    return number


def _completed_at(value, errors):
    if not value:
        return None
    compact = value.strip()
    try:
        serial = float(compact.replace(",", "."))
        if 1 <= serial <= 100000:
            parsed = datetime(1899, 12, 30) + timedelta(days=serial)
            return timezone.make_aware(parsed)
    except ValueError:
        pass
    for pattern in ("%Y-%m-%d %H:%M", "%Y-%m-%d", "%d.%m.%Y %H:%M", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return timezone.make_aware(datetime.strptime(compact, pattern))
        except ValueError:
            continue
    errors["completed_at"] = ["Используйте дату ДД.ММ.ГГГГ или ГГГГ-ММ-ДД"]
    return None


def _prepare_row(row, mapping, row_number):
    errors = {}
    email = _value(row, mapping, "employee_email").lower()
    course_title = _value(row, mapping, "course_title")
    if not email:
        errors["employee_email"] = ["Корпоративная почта обязательна"]
    if not course_title:
        errors["course_title"] = ["Название курса обязательно"]

    employees = EmployeeProfile.objects.select_related("user").filter(user__email__iexact=email) if email else []
    employee = employees.first() if email else None
    if email and not employee:
        errors["employee_email"] = [f"Сотрудник с почтой {email} не найден"]

    courses = list(Course.objects.filter(title__iexact=course_title)) if course_title else []
    course = courses[0] if len(courses) == 1 else None
    if course_title and not courses:
        errors["course_title"] = [f"Курс «{course_title}» не найден"]
    elif len(courses) > 1:
        errors["course_title"] = [f"Найдено несколько курсов «{course_title}»"]

    progress = _percent(_value(row, mapping, "progress"), "progress", errors)
    score = _percent(_value(row, mapping, "score"), "score", errors)
    status_value = _normalize(_value(row, mapping, "status"))
    learning_status = STATUS_ALIASES.get(status_value) if status_value else None
    if status_value and not learning_status:
        errors["status"] = ["Неизвестный статус прохождения"]
    if not learning_status:
        learning_status = (
            EmployeeLearning.Status.COMPLETED if progress == 100
            else EmployeeLearning.Status.IN_PROGRESS if progress
            else EmployeeLearning.Status.ASSIGNED
        )
    if learning_status == EmployeeLearning.Status.COMPLETED:
        progress = 100
    elif progress is None:
        progress = 0
    completed_at = _completed_at(_value(row, mapping, "completed_at"), errors)

    assignment = (
        EmployeeLearning.objects.filter(employee=employee, course=course).first()
        if employee and course else None
    )
    return {
        "row_number": row_number,
        "action": "error" if errors else ("update" if assignment else "create"),
        "errors": errors,
        "preview": {
            "employee_email": email,
            "employee_name": employee.user.get_full_name() if employee else "",
            "course_title": course_title,
            "status": learning_status,
            "progress": progress,
            "score": score,
        },
        "_employee": employee,
        "_course": course,
        "_assignment": assignment,
        "_values": {
            "status": learning_status,
            "progress": progress,
            "score": score,
            "completed_at": completed_at,
        },
    }


def preview_learning_import(rows, mapping):
    if not isinstance(rows, list) or not rows:
        raise ValidationError({"rows": "Нет строк для импорта"})
    if len(rows) > MAX_IMPORT_ROWS:
        raise ValidationError({"rows": f"За один раз можно импортировать не более {MAX_IMPORT_ROWS} результатов"})
    if not isinstance(mapping, dict):
        raise ValidationError({"mapping": "Настройте сопоставление колонок"})
    prepared = [_prepare_row(row, mapping, index + 2) for index, row in enumerate(rows)]
    seen = {}
    for item in prepared:
        key = (item["preview"]["employee_email"], item["preview"]["course_title"].lower())
        if all(key):
            if key in seen:
                item["action"] = "error"
                item["errors"]["duplicate"] = [f"Дубликат строки {seen[key]} в этом файле"]
            else:
                seen[key] = item["row_number"]
    public_rows = [{key: value for key, value in item.items() if not key.startswith("_")} for item in prepared]
    return {
        "total": len(prepared),
        "create_count": sum(item["action"] == "create" for item in prepared),
        "update_count": sum(item["action"] == "update" for item in prepared),
        "error_count": sum(item["action"] == "error" for item in prepared),
        "rows": public_rows,
        "_prepared": prepared,
    }


@transaction.atomic
def commit_learning_import(rows, mapping, request, batch_id):
    try:
        batch = LearningImportBatch.objects.select_for_update().get(pk=batch_id)
    except LearningImportBatch.DoesNotExist as exc:
        raise ValidationError({"batch_id": "Сессия импорта не найдена. Загрузите файл ещё раз"}) from exc
    if batch.status == LearningImportBatch.Status.COMPLETED:
        raise ValidationError({"detail": "Этот отчёт уже был импортирован"})
    if employee_import_payload_hash(rows) != batch.payload_sha256:
        raise ValidationError("Данные изменились после предварительной проверки. Загрузите файл ещё раз")
    if LearningImportBatch.objects.filter(
        source=batch.source,
        status=LearningImportBatch.Status.COMPLETED,
        file_sha256=batch.file_sha256,
    ).exclude(pk=batch.pk).exists():
        raise ValidationError({"detail": "Этот отчёт iSpring уже был импортирован"})

    review = preview_learning_import(rows, mapping)
    if review["error_count"]:
        batch.mapping = mapping
        batch.error_count = review["error_count"]
        batch.save(update_fields=["mapping", "error_count"])
        raise ValidationError({"detail": "Исправьте ошибки перед импортом", "rows": review["rows"]})

    assignment_ids = []
    for item in review["_prepared"]:
        values = item["_values"]
        completed_at = values["completed_at"]
        if values["status"] == EmployeeLearning.Status.COMPLETED and not completed_at:
            completed_at = item["_assignment"].completed_at if item["_assignment"] else timezone.now()
        if values["status"] != EmployeeLearning.Status.COMPLETED:
            completed_at = None
        assignment, _ = EmployeeLearning.objects.update_or_create(
            employee=item["_employee"],
            course=item["_course"],
            defaults={
                "status": values["status"],
                "progress": values["progress"],
                "score": values["score"],
                "completed_at": completed_at,
            },
        )
        assignment_ids.append(assignment.pk)
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="employee_learning",
            entity_id=str(assignment.pk),
            action=f"ispring_import_{item['action']}",
            changes={"row_number": item["row_number"], "batch_id": batch.pk},
        )

    batch.status = LearningImportBatch.Status.COMPLETED
    batch.mapping = mapping
    batch.total_rows = review["total"]
    batch.created_count = review["create_count"]
    batch.updated_count = review["update_count"]
    batch.error_count = 0
    batch.completed_at = timezone.now()
    batch.save(update_fields=[
        "status", "mapping", "total_rows", "created_count", "updated_count", "error_count", "completed_at",
    ])
    AuditEvent.objects.create(
        actor=request.user,
        entity_type="learning_import",
        entity_id=str(batch.pk),
        action="completed",
        changes={"source": batch.source, "total": review["total"], "created": review["create_count"], "updated": review["update_count"]},
    )
    return {
        "total": review["total"],
        "created": review["create_count"],
        "updated": review["update_count"],
        "assignment_ids": assignment_ids,
    }
