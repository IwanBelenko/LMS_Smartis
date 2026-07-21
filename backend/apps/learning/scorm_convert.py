import html
import json
from pathlib import Path

from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from .models import Course, Lesson


def _plain_text(value) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(_plain_text(item) for item in value)
    if not isinstance(value, dict):
        return ""
    if isinstance(value.get("c"), list):
        return _plain_text(value["c"])
    if isinstance(value.get("t"), str):
        return value["t"]
    block_store = value.get("b")
    if isinstance(block_store, dict):
        return "\n".join(
            _plain_text(block_store.get("B", {}).get(key, {}))
            for key in block_store.get("o", [])
        )
    return ""


def _render_quiz(block) -> str:
    quiz = block.get("dt", {}).get("q", {})
    parts = ['<blockquote><p><strong>Тест из исходного курса</strong></p></blockquote>']
    for number, question_id in enumerate(quiz.get("o", []), start=1):
        question = quiz.get("B", {}).get(question_id, {})
        title = _plain_text(question.get("d", {})).strip() or f"Вопрос {number}"
        parts.append(f"<h3>{number}. {html.escape(title)}</h3><ul>")
        answers = question.get("c", {})
        for answer_id in answers.get("o", []):
            answer = answers.get("B", {}).get(answer_id, {})
            answer_text = _plain_text(answer.get("t", {})).strip()
            if answer_text:
                suffix = " ✓" if answer.get("c") else ""
                parts.append(f"<li>{html.escape(answer_text + suffix)}</li>")
        parts.append("</ul>")
    return "".join(parts)


def _render_store(store) -> str:
    parts = []
    list_open = False

    def close_list():
        nonlocal list_open
        if list_open:
            parts.append("</ul>")
            list_open = False

    for block_id in store.get("o", []):
        block = store.get("B", {}).get(block_id, {})
        block_type = block.get("t")
        text = _plain_text(block).strip()
        if block_type == "li":
            if not list_open:
                parts.append("<ul>")
                list_open = True
            parts.append(f"<li>{html.escape(text)}</li>")
            continue
        close_list()
        if block_type == "p":
            tag = block.get("v") if block.get("v") in {"h1", "h2", "h3", "h4"} else "p"
            if text:
                parts.append(f"<{tag}>{html.escape(text)}</{tag}>")
        elif block_type == "n" and text:
            parts.append(f"<blockquote>{html.escape(text)}</blockquote>")
        elif block_type == "c":
            parts.append("<p><em>Изображение сохранено в исходной SCORM-версии курса.</em></p>")
        elif block_type in {"ac", "tb"}:
            containers = block.get("cts", {})
            for index, container_id in enumerate(containers.get("ctsO", []), start=1):
                container = containers.get("ctsB", {}).get(container_id, {})
                title = _plain_text(container.get("tl", {})).strip()
                if title:
                    parts.append(f"<h3>{html.escape(title)}</h3>")
                elif block_type == "tb":
                    parts.append(f"<h3>Вкладка {index}</h3>")
                body = container.get("b", {})
                if isinstance(body, dict):
                    parts.append(_render_store(body))
        elif block_type == "Q":
            parts.append(_render_quiz(block))
        elif block_type == "ct":
            parts.append("<hr>")
        elif text:
            parts.append(f"<p>{html.escape(text)}</p>")
    close_list()
    return "".join(parts)


def _ispring_sections(document) -> list[tuple[str, str]]:
    courses = document.get("content", {}).get("c", {}).get("B", {})
    if not courses:
        raise serializers.ValidationError("В пакете не найдены данные лонгрида iSpring")
    course_document = next(iter(courses.values()))
    store = course_document.get("cs", {}).get("b", {})
    if not store.get("o") or not store.get("B"):
        raise serializers.ValidationError("Структура лонгрида iSpring не распознана")

    sections = []
    current_title = "Материалы курса"
    current_store = {"o": [], "B": {}}

    def flush():
        if current_store["o"]:
            content = _render_store(current_store)
            if content.strip():
                sections.append((current_title[:220], content))

    for block_id in store["o"]:
        block = store["B"].get(block_id, {})
        if block.get("t") == "p" and block.get("v") == "h2":
            flush()
            current_title = _plain_text(block).strip() or "Новая глава"
            current_store = {"o": [], "B": {}}
            continue
        current_store["o"].append(block_id)
        current_store["B"][block_id] = block
    flush()
    if not sections:
        raise serializers.ValidationError("В лонгриде iSpring не найдено редактируемое содержимое")
    return sections


@transaction.atomic
def convert_ispring_scorm_to_native(source_course: Course, author) -> Course:
    content_root = (Path(settings.MEDIA_ROOT) / source_course.scorm_content_dir).resolve()
    media_root = Path(settings.MEDIA_ROOT).resolve()
    if media_root not in content_root.parents or not content_root.is_dir():
        raise serializers.ValidationError("Распакованный SCORM-пакет не найден")

    data_files = sorted(content_root.rglob("data-*.json"))
    for data_file in data_files:
        try:
            document = json.loads(data_file.read_text(encoding="utf-8-sig"))
            sections = _ispring_sections(document)
            break
        except (UnicodeError, json.JSONDecodeError, serializers.ValidationError):
            continue
    else:
        raise serializers.ValidationError(
            "Автоматическое преобразование пока поддерживает лонгриды iSpring, подобные MacroData"
        )

    converted = Course.objects.create(
        title=f"{source_course.title} — редактируемая копия"[:220],
        description=(
            f"Создано из SCORM 1.2 «{source_course.title}». "
            "Исходный пакет сохранён отдельным курсом для сверки интерактивов и изображений."
        ),
        author=author,
        source_format=Course.SourceFormat.NATIVE,
        estimated_minutes=source_course.estimated_minutes,
    )
    minutes_per_section = max(1, source_course.estimated_minutes // len(sections))
    Lesson.objects.bulk_create(
        [
            Lesson(
                course=converted,
                title=title,
                lesson_type=Lesson.Type.TEXT,
                content=content,
                duration_minutes=minutes_per_section,
                position=position,
                is_required=True,
            )
            for position, (title, content) in enumerate(sections)
        ]
    )
    return converted
