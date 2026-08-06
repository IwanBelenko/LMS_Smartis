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
    {"key": "employee_number", "label": "Табельный номер", "required": False},
    {"key": "email", "label": "Корпоративная почта", "required": False},
    {"key": "full_name", "label": "ФИО одной колонкой", "required": False},
    {"key": "first_name", "label": "Имя", "required": False},
    {"key": "last_name", "label": "Фамилия", "required": False},
    {"key": "middle_name", "label": "Отчество", "required": False},
    {"key": "department", "label": "Отдел", "required": False},
    {"key": "position", "label": "Должность", "required": False},
    {"key": "grade", "label": "Грейд", "required": False},
    {"key": "birth_date", "label": "Дата рождения", "required": False},
    {"key": "hire_date", "label": "Дата выхода", "required": False},
    {"key": "dismissal_date", "label": "Дата увольнения", "required": False},
    {"key": "status", "label": "Статус", "required": False},
    {"key": "education", "label": "Образование", "required": False},
    {"key": "competencies", "label": "Компетенции", "required": False},
    {"key": "location", "label": "Локация", "required": False},
    {"key": "legal_entity", "label": "Юридическое лицо", "required": False},
    {"key": "gender", "label": "Пол", "required": False},
    {"key": "telegram", "label": "Telegram", "required": False},
    {"key": "dms_status", "label": "ДМС", "required": False},
    {"key": "dms_details", "label": "Сведения по ДМС", "required": False},
    {"key": "electronic_employment_record", "label": "Электронная трудовая книжка", "required": False},
    {"key": "time_off_balance", "label": "Отгулы", "required": False},
    {"key": "participates_secret_santa", "label": "Участвует в Тайном Санте", "required": False},
    {"key": "birthday_chat_member", "label": "Добавлен в чат дней рождения", "required": False},
    {"key": "company_review_left", "label": "Оставил отзыв о компании", "required": False},
    {"key": "survey_completed", "label": "Прошёл опрос", "required": False},
    {"key": "personal_data_consent_kedo", "label": "Согласие на ПДн в КЭДО", "required": False},
    {"key": "performance_rating", "label": "Оценка эффективности", "required": False},
    {"key": "performance_notes", "label": "Комментарий к оценке эффективности", "required": False},
    {"key": "hr_notes", "label": "Заметки HR", "required": False},
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
    "middle_name": {"отчество", "middle name", "patronymic"},
    "department": {"отдел", "подразделение", "департамент", "department"},
    "position": {"должность", "позиция", "position", "job title"},
    "grade": {"грейд", "grade", "уровень"},
    "birth_date": {"дата рождения", "день рождения", "birth date", "birthday"},
    "hire_date": {"дата выхода", "дата приема", "дата приёма", "hire date", "start date"},
    "dismissal_date": {"дата увольнения", "exit day", "dismissal date", "termination date"},
    "status": {"статус", "status"},
    "education": {"образование", "education"},
    "competencies": {"компетенции", "навыки", "skills", "competencies"},
    "location": {"локация", "город", "location"},
    "legal_entity": {"юридическое лицо", "юр лицо", "юр.лицо (или компания)", "компания", "legal entity"},
    "gender": {"пол", "gender"},
    "telegram": {"telegram", "телеграм", "телеграмм"},
    "dms_status": {"дмс", "статус дмс"},
    "dms_details": {"сведения по дмс", "детали дмс"},
    "electronic_employment_record": {"электронная трудовая книжка", "эл тк", "эл.тк"},
    "time_off_balance": {"отгулы", "остаток отгулов"},
    "participates_secret_santa": {"участвует в тайном санте", "играют в тайного санту", "тайный санта"},
    "birthday_chat_member": {"добавлен в чат дней рождения", "есть в чате др", "чат др"},
    "company_review_left": {"оставил отзыв о компании", "оставили отзыв о нас", "отзыв о компании"},
    "survey_completed": {"прошёл опрос", "прошел опрос", "опрос", "опрс"},
    "personal_data_consent_kedo": {"согласие на пдн в кэдо", "подписали согласие на пдн в кэдо"},
    "performance_rating": {"оценка эффективности", "performance rating"},
    "performance_notes": {"комментарий к оценке эффективности", "критерии эффективности"},
    "hr_notes": {"заметки hr", "комментарий hr", "hr notes"},
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

GENDER_ALIASES = {
    "ж": EmployeeProfile.Gender.FEMALE,
    "женский": EmployeeProfile.Gender.FEMALE,
    "female": EmployeeProfile.Gender.FEMALE,
    "м": EmployeeProfile.Gender.MALE,
    "m": EmployeeProfile.Gender.MALE,
    "мужской": EmployeeProfile.Gender.MALE,
    "male": EmployeeProfile.Gender.MALE,
}

BOOLEAN_ALIASES = {
    "1": True, "да": True, "yes": True, "true": True, "+": True,
    "0": False, "нет": False, "no": False, "false": False, "-": False,
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


def _parse_boolean(value, field_name, errors):
    if not value or value.strip() == "?":
        return None
    normalized = value.strip().lower()
    if normalized in BOOLEAN_ALIASES:
        return BOOLEAN_ALIASES[normalized]
    errors[field_name] = ["Допустимо: Да, Нет или пустое значение"]
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
    middle_name = _mapped_value(row, mapping, "middle_name")
    full_name = _mapped_value(row, mapping, "full_name")
    legacy_first_name = ""
    legacy_last_name = ""
    if full_name and not (first_name and last_name):
        parts = full_name.split()
        if len(parts) >= 2:
            legacy_first_name = " ".join(parts[1:])
            legacy_last_name = parts[0]
            first_name_index = 1
            surname_parts = [parts[0]]
            while first_name_index < len(parts) - 1 and parts[first_name_index].startswith("("):
                surname_parts.append(parts[first_name_index])
                first_name_index += 1
            last_name = last_name or " ".join(surname_parts)
            first_name = first_name or parts[first_name_index]
            middle_name = middle_name or " ".join(parts[first_name_index + 1:])
        else:
            errors["full_name"] = ["Укажите минимум фамилию и имя"]
    required = {"first_name": first_name, "last_name": last_name}
    for field, value in required.items():
        if not value:
            errors[field] = ["Обязательное поле не сопоставлено или пусто"]

    number_match = EmployeeProfile.objects.select_related("user").filter(employee_number=employee_number).first() if employee_number else None
    email_match = EmployeeProfile.objects.select_related("user").filter(email__iexact=email).first() if email else None
    if number_match and email_match and number_match.pk != email_match.pk:
        errors["identity"] = ["Табельный номер и email принадлежат разным сотрудникам"]
    instance = number_match or email_match
    if not instance and first_name and last_name and mapping.get("birth_date"):
        birth_date = _parse_date(_mapped_value(row, mapping, "birth_date"), "birth_date", errors)
        if birth_date:
            possible_matches = EmployeeProfile.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name,
                birth_date=birth_date,
            )
            if not possible_matches.exists() and middle_name:
                possible_matches = EmployeeProfile.objects.filter(
                    first_name__iexact=f"{first_name} {middle_name}",
                    last_name__iexact=last_name,
                    birth_date=birth_date,
                )
            if not possible_matches.exists() and legacy_first_name:
                possible_matches = EmployeeProfile.objects.filter(
                    first_name__iexact=legacy_first_name,
                    last_name__iexact=legacy_last_name or last_name,
                    birth_date=birth_date,
                )
            if possible_matches.count() == 1:
                instance = possible_matches.first()

    payload = {
        "employee_number": employee_number or None,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "middle_name": middle_name,
    }
    optional_text_fields = [
        "education", "competencies", "location", "legal_entity", "telegram",
        "dms_status", "dms_details", "time_off_balance", "performance_notes", "hr_notes",
    ]
    for field in optional_text_fields:
        if mapping.get(field):
            payload[field] = _mapped_value(row, mapping, field)
    if mapping.get("grade"):
        grade_value = _mapped_value(row, mapping, "grade")
        grades = {value.casefold(): value for value, _label in EmployeeProfile.Grade.choices}
        if grade_value and grade_value.casefold() not in grades:
            errors["grade"] = ["Выберите грейд из утверждённого справочника"]
        else:
            payload["grade"] = grades.get(grade_value.casefold(), "")
    if mapping.get("department"):
        payload["department"] = _resolve_department(_mapped_value(row, mapping, "department"), errors)
    if mapping.get("position"):
        payload["position"] = _resolve_position(_mapped_value(row, mapping, "position"), errors)
    for field in ("birth_date", "hire_date", "dismissal_date"):
        if mapping.get(field):
            payload[field] = _parse_date(_mapped_value(row, mapping, field), field, errors)
    if mapping.get("gender"):
        gender_value = _mapped_value(row, mapping, "gender").lower()
        if gender_value:
            if gender_value not in GENDER_ALIASES:
                errors["gender"] = ["Допустимо: Женский или Мужской"]
            else:
                payload["gender"] = GENDER_ALIASES[gender_value]
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
    if mapping.get("performance_rating"):
        payload["performance_rating"] = _parse_money(
            _mapped_value(row, mapping, "performance_rating"), "performance_rating", errors
        )
    for field in (
        "electronic_employment_record", "participates_secret_santa", "birthday_chat_member",
        "company_review_left", "survey_completed", "personal_data_consent_kedo",
    ):
        if mapping.get(field):
            payload[field] = _parse_boolean(_mapped_value(row, mapping, field), field, errors)

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
            "full_name": " ".join(filter(None, [last_name, first_name, middle_name])),
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
    missing_departments = sorted({
        item["preview"]["department"]
        for item in prepared
        if item["preview"]["department"] and "department" in item["errors"]
    }, key=str.casefold)
    missing_positions = sorted({
        item["preview"]["position"]
        for item in prepared
        if item["preview"]["position"] and "position" in item["errors"]
    }, key=str.casefold)
    return {
        "total": len(prepared),
        "create_count": sum(item["action"] == "create" for item in prepared),
        "update_count": sum(item["action"] == "update" for item in prepared),
        "error_count": sum(item["action"] == "error" for item in prepared),
        "missing_departments": missing_departments,
        "missing_positions": missing_positions,
        "rows": public_rows,
        "_prepared": prepared,
    }


def _department_code(name):
    digest = hashlib.sha256(name.casefold().encode("utf-8")).hexdigest()[:12]
    return f"import-{digest}"


@transaction.atomic
def create_import_departments(rows, mapping, request, batch_id):
    try:
        batch = HrImportBatch.objects.select_for_update().get(pk=batch_id)
    except HrImportBatch.DoesNotExist as exc:
        raise ValidationError({"batch_id": "Сессия импорта не найдена. Загрузите файл ещё раз"}) from exc
    if batch.status == HrImportBatch.Status.COMPLETED:
        raise ValidationError({"detail": "Эта выгрузка уже была импортирована"})
    if employee_import_payload_hash(rows) != batch.payload_sha256:
        raise ValidationError("Данные изменились после предварительной проверки. Загрузите файл ещё раз")
    if not isinstance(mapping, dict):
        raise ValidationError({"mapping": "Настройте сопоставление колонок"})

    department_header = mapping.get("department")
    names = sorted({
        str(row.get(department_header, "")).strip()
        for row in rows
        if department_header and str(row.get(department_header, "")).strip()
    }, key=str.casefold)
    created = []
    for name in names:
        department = Department.objects.filter(name__iexact=name).first()
        action = None
        if department and not department.is_active:
            department.is_active = True
            department.save(update_fields=["is_active"])
            action = "import_reactivated"
        elif not department:
            code = _department_code(name)
            suffix = 2
            while Department.objects.filter(code=code).exists():
                code = f"{_department_code(name)}-{suffix}"
                suffix += 1
            department = Department.objects.create(name=name, code=code)
            action = "import_created"
        if action:
            created.append(name)
            AuditEvent.objects.create(
                actor=request.user,
                entity_type="department",
                entity_id=str(department.pk),
                action=action,
                changes={"name": name, "source": batch.source, "batch_id": batch.pk},
            )

    review = preview_employee_import(rows, mapping, request, batch.source, batch.effective_date)
    batch.mapping = mapping
    batch.error_count = review["error_count"]
    batch.save(update_fields=["mapping", "error_count"])
    return {
        "created_departments": created,
        "review": {key: value for key, value in review.items() if not key.startswith("_")},
    }


@transaction.atomic
def create_import_positions(rows, mapping, request, batch_id):
    try:
        batch = HrImportBatch.objects.select_for_update().get(pk=batch_id)
    except HrImportBatch.DoesNotExist as exc:
        raise ValidationError({"batch_id": "Сессия импорта не найдена. Загрузите файл ещё раз"}) from exc
    if batch.status == HrImportBatch.Status.COMPLETED:
        raise ValidationError({"detail": "Эта выгрузка уже была импортирована"})
    if employee_import_payload_hash(rows) != batch.payload_sha256:
        raise ValidationError("Данные изменились после предварительной проверки. Загрузите файл ещё раз")
    if not isinstance(mapping, dict):
        raise ValidationError({"mapping": "Настройте сопоставление колонок"})

    position_header = mapping.get("position")
    names = sorted({
        str(row.get(position_header, "")).strip()
        for row in rows
        if position_header and str(row.get(position_header, "")).strip()
    }, key=str.casefold)
    created = []
    for name in names:
        position = Position.objects.filter(name__iexact=name).first()
        action = None
        if position and not position.is_active:
            position.is_active = True
            position.save(update_fields=["is_active"])
            action = "import_reactivated"
        elif not position:
            position = Position.objects.create(name=name)
            action = "import_created"
        if action:
            created.append(name)
            AuditEvent.objects.create(
                actor=request.user,
                entity_type="position",
                entity_id=str(position.pk),
                action=action,
                changes={"name": name, "source": batch.source, "batch_id": batch.pk},
            )

    review = preview_employee_import(rows, mapping, request, batch.source, batch.effective_date)
    batch.mapping = mapping
    batch.error_count = review["error_count"]
    batch.save(update_fields=["mapping", "error_count"])
    return {
        "created_positions": created,
        "review": {key: value for key, value in review.items() if not key.startswith("_")},
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
