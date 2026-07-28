from datetime import date, timedelta
from collections import Counter
from html import unescape
import re

from django.db import transaction
from django.db.models import Q

from apps.learning.models import Course
from .models import EmployeeLearning, OnboardingPlan, OnboardingTemplate


DEFAULT_ONBOARDING_CHECKLIST = [
    "Познакомиться с командой и руководителем",
    "Получить доступы к рабочим системам",
    "Изучить правила и процессы компании",
    "Согласовать цели на испытательный срок",
]

DAILY_STOP_WORDS = {
    "который", "которая", "которые", "этого", "этой", "также", "сегодня", "вчера",
    "завтра", "потом", "тогда", "просто", "нужно", "будет", "были", "было", "есть",
    "очень", "можно", "чтобы", "потому", "через", "между", "после", "перед", "работа",
    "задача", "задачи", "сделать", "делаем", "сейчас", "далее", "вопрос", "коллеги",
}


def extract_terms(text):
    plain = re.sub(r"<[^>]+>", " ", unescape(text or "")).lower().replace("ё", "е")
    return [
        word for word in re.findall(r"[а-яa-z0-9]{4,}", plain)
        if word not in DAILY_STOP_WORDS and not word.isdigit()
    ]


def normalize_term(word):
    for suffix in (
        "иями", "ями", "ами", "ого", "ему", "ыми", "ими", "иях", "ение", "ания",
        "ах", "ях", "ию", "ия", "ой", "ий", "ый", "ая", "яя", "ое", "ее", "ую",
        "юю", "ов", "ев", "ам", "ям", "ом", "ем", "ы", "и", "а", "я", "у", "ю", "е", "о",
    ):
        if word.endswith(suffix) and len(word) - len(suffix) >= 4:
            return word[:-len(suffix)]
    return word


def analyze_daily_transcript(text):
    transcript_counts = Counter(extract_terms(text))
    keywords = [term for term, _ in transcript_counts.most_common(18)]
    courses = Course.objects.exclude(status=Course.Status.ARCHIVED).prefetch_related("lessons")
    matches = []
    covered = set()
    for course in courses:
        course_text = " ".join([
            course.title,
            course.description,
            *[f"{lesson.title} {lesson.content}" for lesson in course.lessons.all()],
        ])
        course_terms = {normalize_term(term) for term in extract_terms(course_text)}
        matched = [term for term in keywords if normalize_term(term) in course_terms]
        covered.update(matched)
        if matched:
            matches.append({
                "course_id": course.pk,
                "course_title": course.title,
                "coverage_percent": round(len(matched) / max(len(keywords), 1) * 100),
                "matched_terms": matched[:8],
                "lessons_count": course.lessons.count(),
            })
    matches.sort(key=lambda item: (-item["coverage_percent"], item["course_title"]))
    gaps = [term for term in keywords if term not in covered]
    return {
        "keywords": [
            {"term": term, "count": transcript_counts[term], "covered": term in covered}
            for term in keywords
        ],
        "course_matches": matches[:8],
        "gaps": gaps[:12],
        "coverage_percent": round(len(covered) / max(len(keywords), 1) * 100),
    }


def analyze_product_update(title, description):
    update_terms = list(dict.fromkeys(extract_terms(f"{title} {description}")))[:16]
    targets = []
    courses = Course.objects.exclude(status=Course.Status.ARCHIVED).prefetch_related("lessons")
    for course in courses:
        course_terms = {normalize_term(term) for term in extract_terms(f"{course.title} {course.description}")}
        course_matches = [term for term in update_terms if normalize_term(term) in course_terms]
        lesson_candidates = []
        for lesson in course.lessons.all():
            lesson_terms = {normalize_term(term) for term in extract_terms(f"{lesson.title} {lesson.content}")}
            matched = [term for term in update_terms if normalize_term(term) in lesson_terms]
            if matched:
                lesson_candidates.append({
                    "lesson_id": lesson.pk,
                    "lesson_title": lesson.title,
                    "matched_terms": matched,
                })
        if not course_matches and not lesson_candidates:
            continue
        lesson_candidates.sort(key=lambda item: (-len(item["matched_terms"]), item["lesson_title"]))
        suggested = lesson_candidates[0] if lesson_candidates else (
            {
                "lesson_id": course.lessons.first().pk,
                "lesson_title": course.lessons.first().title,
                "matched_terms": course_matches,
            }
            if course.lessons.exists() else None
        )
        combined = list(dict.fromkeys(course_matches + [
            term for candidate in lesson_candidates for term in candidate["matched_terms"]
        ]))
        targets.append({
            "course_id": course.pk,
            "course_title": course.title,
            "course_version": course.version,
            "course_status": course.status,
            "confidence": round(len(combined) / max(len(update_terms), 1) * 100),
            "matched_terms": combined[:10],
            "suggested_lesson_id": suggested["lesson_id"] if suggested else None,
            "suggested_lesson_title": suggested["lesson_title"] if suggested else "",
            "lesson_candidates": lesson_candidates[:6],
        })
    targets.sort(key=lambda item: (-item["confidence"], item["course_title"]))
    return {"keywords": update_terms, "targets": targets}


def normalize_checklist(items):
    return [
        {
            "id": str(index + 1),
            "title": item.get("title", "") if isinstance(item, dict) else str(item),
            "done": bool(item.get("done", False)) if isinstance(item, dict) else False,
        }
        for index, item in enumerate(items)
        if (item.get("title") if isinstance(item, dict) else str(item)).strip()
    ]


@transaction.atomic
def assign_onboarding(employee):
    existing = employee.onboarding_plans.filter(status=OnboardingPlan.Status.ACTIVE).first()
    if existing:
        return existing
    department = employee.user.department
    templates = OnboardingTemplate.objects.filter(is_active=True).filter(
        Q(department=department) | Q(department__isnull=True),
        Q(position=employee.position) | Q(position__isnull=True),
    )
    template = sorted(
        templates,
        key=lambda item: (
            item.department_id == getattr(department, "id", None),
            item.position_id == employee.position_id,
        ),
        reverse=True,
    )[0] if templates else None
    today = date.today()
    start = max(employee.hire_date or today, today)
    duration = template.duration_days if template else 30
    checklist = normalize_checklist(
        template.checklist if template and template.checklist else DEFAULT_ONBOARDING_CHECKLIST
    )
    plan = OnboardingPlan.objects.create(
        employee=employee,
        template=template,
        learning_path=template.learning_path if template else None,
        responsible=(template.responsible if template else None) or getattr(department, "manager", None),
        checklist=checklist,
        start_date=start,
        due_date=start + timedelta(days=duration),
    )
    if plan.learning_path:
        for path_course in plan.learning_path.path_courses.select_related("course").all():
            EmployeeLearning.objects.get_or_create(
                employee=employee,
                course=path_course.course,
                defaults={"status": EmployeeLearning.Status.ASSIGNED, "progress": 0},
            )
    return plan
