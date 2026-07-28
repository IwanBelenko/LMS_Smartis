from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q

from .models import EmployeeLearning, OnboardingPlan, OnboardingTemplate


DEFAULT_ONBOARDING_CHECKLIST = [
    "Познакомиться с командой и руководителем",
    "Получить доступы к рабочим системам",
    "Изучить правила и процессы компании",
    "Согласовать цели на испытательный срок",
]


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
