from __future__ import annotations

import csv
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
from io import BytesIO, StringIO
import json
import re
from zipfile import BadZipFile, ZipFile
from xml.etree import ElementTree

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.identity.models import Department
from .models import AuditEvent, EmployeeProfile, EmploymentEvent, HrImportBatch, Position
from .serializers import EmployeeProfileWriteSerializer


MAX_IMPORT_BYTES = 5 * 1024 * 1024
MAX_IMPORT_ROWS = 1000

IMPORT_FIELDS = [
    {"key": "employee_number", "label": "Табельный номер", "required": True},
    {"key": "email", "label": "Корпоративная почта", "required": True},
    {"key": "full_name", "label": "ФИО одной колонкой", "required": False},
    {"key": "first_name", "label": "Имя", "required": False},
    {"key": "last_name", "label": "Фамилия", "required": False},
    {"key": "department", "label": "Отдел", "required": False},
    {"key": "position", "label": "Должность", "required": False},
    {"key": "grade", "label": "Грейд", "required": False},
    {"key": "birth_date", "label": "Дата рождения", "required": False},
    {"key": "hire_date", "label": "Дата выхода", "required": False},
    {"key": "status", "label": "Статус", "required": False},
    {"key": "education", "label": "Образование", "required": False},
    {"key": "competencies", "label": "Компетенции", "required": False},
    {"key": "salary_base", "label": "Оклад", "required": False},
    {"key": "monthly_bonus", "label": "Месячная премия", "required": False},
    {"key": "quarterly_bonus", "label": "Квартальная премия", "required": False},
]

HEADER_ALIASES = {
    "employee_number": {"табельный номер", "таб номер", "табельный", "employee number", "personnel number", "id сотрудника"},
    "email": {"email", "e-mail", "почта", "корпоративная почта", "рабочая почта"},
    "full_name": {"фио", "сотрудник", "полное имя", "full name", "name"},
    "first_name": {"имя", "first name"},
    "last_name": {"фамилия", "last name", "surname"},
    "department": {"отдел", "подразделение", "департамент", "department"},
    "position": {"должность", "позиция", "position", "job title"},
    "grade": {"грейд", "grade", "уровень"},
    "birth_date": {"дата рождения", "день рождения", "birth date", "birthday"},
    "hire_date": {"дата выхода", "дата приема", "дата приёма", "hire date", "start date"},
    "status": {"статус", "status"},
    "education": {"образование", "education"},
    "competencies": {"компетенции", "навыки", "skills", "competencies"},
    "salary_base": {"оклад", "salary", "salary base"},
    "monthly_bonus": {"месячная премия", "ежемесячная премия", "monthly bonus"},
    "quarterly_bonus": {"квартальная премия", "quarterly bonus"},
}

STATUS_ALIASES = {
    "работает": EmployeeProfile.Status.EMPLOYED,
    "сотрудник": EmployeeProfile.Status.EMPLOYED,
    "employed": EmployeeProfile.Status.EMPLOYED,
    "испытательный срок": EmployeeProfile.Status.PROBATION,
    "испытательный": EmployeeProfile.Status.PROBATION,
    "probation": EmployeeProfile.Status.PROBATION,
    "уволен": EmployeeProfile.Status.DISMISSED,
    "уволена": EmployeeProfile.Status.DISMISSED,
    "dismissed": EmployeeProfile.Status.DISMISSED,
}


def _clean_header(value):
    return re.sub(r"\s+", " ", str(value or "").strip())


def _normalized_header(value):
    return re.sub(r"[^a-zа-яё0-9]+", " ", _clean_header(value).lower()).strip()


def suggest_mapping(headers):
    normalized = {_normalized_header(header): header for header in headers}
    mapping = {}
    for field, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            if _normalized_header(alias) in normalized:
                mapping[field] = normalized[_normalized_header(alias)]
                break
    return mapping


def _unique_headers(values):
    result = []
    used = set()
    for index, value in enumerate(values, start=1):
        base = _clean_header(value) or f"Колонка {index}"
        header = base
        suffix = 2
        while header.lower() in used:
            header = f"{base} ({suffix})"
            suffix += 1
        used.add(header.lower())
        result.append(header)
    return result


def _tabular_rows(values):
    populated = [row for row in values if any(str(cell or "").strip() for cell in row)]
    if not populated:
        raise ValidationError("Файл не содержит строк")
    headers = _unique_headers(populated[0])
    rows = []
    for row in populated[1:]:
        padded = list(row) + [""] * max(0, len(headers) - len(row))
        rows.append({header: str(padded[index] or "").strip() for index, header in enumerate(headers)})
        if len(rows) > MAX_IMPORT_ROWS:
            raise ValidationError(f"За один раз можно импортировать не более {MAX_IMPORT_ROWS} сотрудников")
    if not rows:
        raise ValidationError("После строки заголовков нет данных сотрудников")
    return headers, rows


def _parse_csv(data):
    text = None
    for encoding in ("utf-8-sig", "cp1251"):
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValidationError("Не удалось определить кодировку CSV")
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        values = list(csv.reader(StringIO(text), dialect))
    except csv.Error:
        values = list(csv.reader(StringIO(text), delimiter=";"))
    return _tabular_rows(values)


def _xlsx_column_index(reference):
    letters = re.match(r"[A-Z]+", reference or "")
    if not letters:
        return 0
    value = 0
    for char in letters.group(0):
        value = value * 26 + ord(char) - 64
    return value - 1


def _parse_xlsx(data):
    try:
        archive = ZipFile(BytesIO(data))
    except BadZipFile as exc:
        raise ValidationError("XLSX-файл повреждён или имеет неверный формат") from exc
    namespace = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    shared_strings = []
    if "xl/sharedStrings.xml" in archive.namelist():
        root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
        for item in root.findall("x:si", namespace):
            shared_strings.append("".join(node.text or "" for node in item.findall(".//x:t", namespace)))
    sheet_name = next(
        (name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")),
        None,
    )
    if not sheet_name:
        raise ValidationError("В XLSX не найден рабочий лист")
    root = ElementTree.fromstring(archive.read(sheet_name))
    values = []
    for row_node in root.findall(".//x:sheetData/x:row", namespace):
        row = []
        for cell in row_node.findall("x:c", namespace):
            index = _xlsx_column_index(cell.attrib.get("r", ""))
            while len(row) <= index:
                row.append("")
            cell_type = cell.attrib.get("t")
            if cell_type == "inlineStr":
                value = "".join(node.text or "" for node in cell.findall(".//x:t", namespace))
            else:
                value_node = cell.find("x:v", namespace)
                value = value_node.text if value_node is not None and value_node.text is not None else ""
                if cell_type == "s" and value:
                    try:
                        value = shared_strings[int(value)]
                    except (IndexError, ValueError):
                        value = ""
                elif cell_type == "b":
                    value = "Да" if value == "1" else "Нет"
            row[index] = value
        values.append(row)
    return _tabular_rows(values)


def parse_employee_import_file(uploaded_file):
    if not uploaded_file:
        raise ValidationError({"file": "Выберите CSV или XLSX-файл"})
    if uploaded_file.size > MAX_IMPORT_BYTES:
        raise ValidationError({"file": "Размер файла не должен превышать 5 МБ"})
    filename = uploaded_file.name or "employees"
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
        "mapping": suggest_mapping(headers),
        "fields": IMPORT_FIELDS,
    }


def employee_import_payload_hash(rows):
    canonical = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _mapped_value(row, mapping, field):
    header = mapping.get(field)
    return str(row.get(header, "") if header else "").strip()


def _parse_date(value, field_name, errors):
    if not value:
        return None
    compact = value.strip()
    try:
        serial = float(compact.replace(",", "."))
        if 1 <= serial <= 100000:
            return (date(1899, 12, 30) + timedelta(days=int(serial))).isoformat()
    except ValueError:
        pass
    for pattern in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(compact, pattern).date().isoformat()
        except ValueError:
            continue
    errors[field_name] = ["Используйте дату в формате ДД.ММ.ГГГГ или ГГГГ-ММ-ДД"]
    return None


def _parse_money(value, field_name, errors):
    if not value:
        return None
    normalized = value.replace("\xa0", "").replace(" ", "").replace(",", ".")
    try:
        return str(Decimal(normalized))
    except InvalidOperation:
        errors[field_name] = ["Укажите число без обозначения валюты"]
        return None


def _resolve_department(value, errors):
    if not value:
        return None
    department = Department.objects.filter(name__iexact=value, is_active=True).first()
    if not department:
        department = Department.objects.filter(code__iexact=value, is_active=True).first()
    if not department:
        errors["department"] = [f"Отдел «{value}» не найден"]
        return None
    return department.pk


def _resolve_position(value, errors):
    if not value:
        return None
    position = Position.objects.filter(name__iexact=value, is_active=True).first()
    if not position:
        errors["position"] = [f"Должность «{value}» не найдена"]
        return None
    return position.pk


def _flatten_serializer_errors(error):
    result = {}
    for field, messages in error.items():
        if isinstance(messages, dict):
            for nested_field, nested_messages in messages.items():
                result[nested_field] = [str(message) for message in nested_messages]
        else:
            result[field] = [str(message) for message in messages]
    return result


def _prepare_row(row, mapping, request, row_number, source=HrImportBatch.Source.MANUAL, effective_date=None):
    errors = {}
    employee_number = _mapped_value(row, mapping, "employee_number")
    email = _mapped_value(row, mapping, "email").lower()
    first_name = _mapped_value(row, mapping, "first_name")
    last_name = _mapped_value(row, mapping, "last_name")
    full_name = _mapped_value(row, mapping, "full_name")
    if full_name and not (first_name and last_name):
        parts = full_name.split()
        if len(parts) >= 2:
            last_name = last_name or parts[0]
            first_name = first_name or " ".join(parts[1:])
        else:
            errors["full_name"] = ["Укажите минимум фамилию и имя"]
    required = {
        "employee_number": employee_number,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
    }
    for field, value in required.items():
        if not value:
            errors[field] = ["Обязательное поле не сопоставлено или пусто"]

    number_match = EmployeeProfile.objects.select_related("user").filter(employee_number=employee_number).first() if employee_number else None
    email_match = EmployeeProfile.objects.select_related("user").filter(user__email__iexact=email).first() if email else None
    if number_match and email_match and number_match.pk != email_match.pk:
        errors["identity"] = ["Табельный номер и email принадлежат разным сотрудникам"]
    instance = number_match or email_match

    payload = {
        "employee_number": employee_number,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
    }
    optional_text_fields = ["grade", "education", "competencies"]
    for field in optional_text_fields:
        if mapping.get(field):
            payload[field] = _mapped_value(row, mapping, field)
    if mapping.get("department"):
        payload["department"] = _resolve_department(_mapped_value(row, mapping, "department"), errors)
    if mapping.get("position"):
        payload["position"] = _resolve_position(_mapped_value(row, mapping, "position"), errors)
    for field in ("birth_date", "hire_date"):
        if mapping.get(field):
            payload[field] = _parse_date(_mapped_value(row, mapping, field), field, errors)
    if mapping.get("status"):
        status_value = _mapped_value(row, mapping, "status").lower()
        if status_value:
            if status_value not in STATUS_ALIASES:
                errors["status"] = ["Допустимо: Работает, Испытательный срок или Уволен"]
            else:
                payload["status"] = STATUS_ALIASES[status_value]
    for field in ("salary_base", "monthly_bonus", "quarterly_bonus"):
        if mapping.get(field):
            payload[field] = _parse_money(_mapped_value(row, mapping, field), field, errors)

    serializer = EmployeeProfileWriteSerializer(
        instance,
        data=payload,
        partial=instance is not None,
        context={
            "request": request,
            "change_source": "Источник: ежемесячная выгрузка 1С" if source == HrImportBatch.Source.ONE_C else "",
            "change_effective_date": effective_date,
        },
    )
    if not errors and not serializer.is_valid():
        errors.update(_flatten_serializer_errors(serializer.errors))
    elif not errors:
        serializer.is_valid(raise_exception=False)
    return {
        "row_number": row_number,
        "action": "error" if errors else ("update" if instance else "create"),
        "errors": errors,
        "preview": {
            "full_name": f"{last_name} {first_name}".strip(),
            "email": email,
            "employee_number": employee_number,
            "department": _mapped_value(row, mapping, "department"),
            "position": _mapped_value(row, mapping, "position"),
        },
        "_serializer": serializer,
        "_instance": instance,
    }


def preview_employee_import(rows, mapping, request, source=HrImportBatch.Source.MANUAL, effective_date=None):
    if not isinstance(rows, list) or not rows:
        raise ValidationError({"rows": "Нет строк для импорта"})
    if len(rows) > MAX_IMPORT_ROWS:
        raise ValidationError({"rows": f"За один раз можно импортировать не более {MAX_IMPORT_ROWS} сотрудников"})
    if not isinstance(mapping, dict):
        raise ValidationError({"mapping": "Настройте сопоставление колонок"})
    prepared = [
        _prepare_row(row, mapping, request, index + 2, source, effective_date)
        for index, row in enumerate(rows)
    ]
    seen_numbers = {}
    seen_emails = {}
    for item in prepared:
        number = item["preview"]["employee_number"].lower()
        email = item["preview"]["email"].lower()
        duplicate_row = seen_numbers.get(number) if number else None
        if duplicate_row is None and email:
            duplicate_row = seen_emails.get(email)
        if duplicate_row is not None:
            item["action"] = "error"
            item["errors"]["duplicate"] = [f"Дубликат строки {duplicate_row} в этом файле"]
        else:
            if number:
                seen_numbers[number] = item["row_number"]
            if email:
                seen_emails[email] = item["row_number"]
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
def commit_employee_import(rows, mapping, request, batch_id):
    try:
        batch = HrImportBatch.objects.select_for_update().get(pk=batch_id)
    except HrImportBatch.DoesNotExist as exc:
        raise ValidationError({"batch_id": "Сессия импорта не найдена. Загрузите файл ещё раз"}) from exc
    if batch.status == HrImportBatch.Status.COMPLETED:
        raise ValidationError({"detail": "Эта выгрузка уже была импортирована"})
    if employee_import_payload_hash(rows) != batch.payload_sha256:
        raise ValidationError("Данные изменились после предварительной проверки. Загрузите файл ещё раз")
    if batch.source == HrImportBatch.Source.ONE_C and HrImportBatch.objects.filter(
        source=HrImportBatch.Source.ONE_C,
        status=HrImportBatch.Status.COMPLETED,
        file_sha256=batch.file_sha256,
    ).exclude(pk=batch.pk).exists():
        raise ValidationError({"detail": "Эта выгрузка 1С уже была импортирована"})
    review = preview_employee_import(rows, mapping, request, batch.source, batch.effective_date)
    if review["error_count"]:
        batch.mapping = mapping
        batch.error_count = review["error_count"]
        batch.save(update_fields=["mapping", "error_count"])
        raise ValidationError({
            "detail": "Исправьте ошибки перед импортом",
            "rows": review["rows"],
        })
    imported_ids = []
    for item in review["_prepared"]:
        profile = item["_serializer"].save()
        imported_ids.append(profile.pk)
        if item["action"] == "create":
            EmploymentEvent.objects.create(
                employee=profile,
                event_type=EmploymentEvent.Type.HIRED,
                title="Создан при импорте сотрудников",
                note="Источник: массовый импорт CSV/XLSX",
                effective_date=profile.hire_date or date.today(),
                created_by=request.user,
            )
        AuditEvent.objects.create(
            actor=request.user,
            entity_type="employee",
            entity_id=str(profile.pk),
            action=f"import_{item['action']}",
            changes={"row_number": item["row_number"], "source": batch.source, "batch_id": batch.pk},
        )
    batch.status = HrImportBatch.Status.COMPLETED
    batch.mapping = mapping
    batch.total_rows = review["total"]
    batch.created_count = review["create_count"]
    batch.updated_count = review["update_count"]
    batch.error_count = 0
    batch.completed_at = timezone.now()
    batch.save(update_fields=[
        "status", "mapping", "total_rows", "created_count", "updated_count",
        "error_count", "completed_at",
    ])
    AuditEvent.objects.create(
        actor=request.user,
        entity_type="employee_import",
        entity_id=str(batch.pk),
        action="completed",
        changes={
            "source": batch.source,
            "effective_date": batch.effective_date.isoformat() if batch.effective_date else None,
            "total": review["total"],
            "created": review["create_count"],
            "updated": review["update_count"],
        },
    )
    return {
        "total": review["total"],
        "created": review["create_count"],
        "updated": review["update_count"],
        "employee_ids": imported_ids,
    }
