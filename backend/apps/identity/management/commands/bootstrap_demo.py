import os
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from apps.identity.models import Department, User
from apps.learning.models import Course
from apps.people.models import (
    Candidate,
    CandidateStage,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Position,
    StaffPosition,
    Vacancy,
)


class Command(BaseCommand):
    help = "Создаёт демонстрационного администратора и отдел"

    def handle(self, *args, **options):
        department, _ = Department.objects.get_or_create(
            code="analytics",
            defaults={"name": "Аналитика"},
        )
        email = os.getenv("DEMO_ADMIN_EMAIL", "admin@smartis.local")
        password = os.getenv("DEMO_ADMIN_PASSWORD", "SmartisDemo123!")
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Иван",
                "last_name": "Администратор",
                "department": department,
                "role": User.Role.ADMIN,
                "status": User.Status.ACTIVE,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(f"Создан администратор {email}"))
        else:
            self.stdout.write(f"Администратор {email} уже существует")

        product_department, _ = Department.objects.get_or_create(
            code="product",
            defaults={"name": "Продукт"},
        )
        support_department, _ = Department.objects.get_or_create(
            code="support",
            defaults={"name": "Поддержка"},
        )
        analyst_position, _ = Position.objects.get_or_create(name="Аналитик")
        manager_position, _ = Position.objects.get_or_create(name="Менеджер проектов")
        support_position, _ = Position.objects.get_or_create(name="Специалист поддержки")

        demo_people = [
            ("anna@smartis.local", "Анна", "Соколова", department, analyst_position, "Middle", 82),
            ("maxim@smartis.local", "Максим", "Волков", product_department, manager_position, "Senior", 64),
            ("olga@smartis.local", "Ольга", "Миронова", support_department, support_position, "Junior", 38),
        ]
        for index, (person_email, first_name, last_name, person_department, position, grade, progress) in enumerate(
            demo_people, start=1
        ):
            person, _ = User.objects.get_or_create(
                email=person_email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "department": person_department,
                    "role": User.Role.EMPLOYEE,
                    "status": User.Status.ACTIVE,
                },
            )
            profile, _ = EmployeeProfile.objects.get_or_create(
                user=person,
                defaults={
                    "employee_number": f"SM-{100 + index}",
                    "position": position,
                    "grade": grade,
                    "hire_date": date.today() - timedelta(days=365 * (index + 1)),
                    "status": EmployeeProfile.Status.PROBATION if index == 3 else EmployeeProfile.Status.EMPLOYED,
                    "checklist_score": min(progress + 8, 100),
                    "development_progress": progress,
                    "salary_base": 120000 + index * 20000,
                },
            )
            EmploymentEvent.objects.get_or_create(
                employee=profile,
                event_type=EmploymentEvent.Type.HIRED,
                title=f"Принят на должность «{position.name}»",
                effective_date=profile.hire_date or date.today(),
                defaults={"created_by": user},
            )
            EmployeeGoal.objects.get_or_create(
                employee=profile,
                title="Развить ключевые профессиональные компетенции",
                defaults={
                    "description": "Цель индивидуального плана развития",
                    "due_date": date.today() + timedelta(days=90),
                    "progress": progress,
                    "status": EmployeeGoal.Status.IN_PROGRESS,
                },
            )
            if index == 1:
                EmployeeDocument.objects.get_or_create(
                    employee=profile,
                    title="Согласие на обработку персональных данных",
                    defaults={"document_type": "Кадровый документ", "issue_date": profile.hire_date},
                )

        company_department, _ = Department.objects.get_or_create(
            code="smartis",
            defaults={"name": "Smartis"},
        )
        company_department.manager = user
        company_department.save(update_fields=["manager"])
        for child, manager_email in [
            (department, "anna@smartis.local"),
            (product_department, "maxim@smartis.local"),
            (support_department, "olga@smartis.local"),
        ]:
            child.parent = company_department
            child.manager = User.objects.get(email=manager_email)
            child.save(update_fields=["parent", "manager"])
        for staff_department, staff_position, headcount in [
            (department, analyst_position, 2),
            (product_department, manager_position, 2),
            (support_department, support_position, 3),
        ]:
            StaffPosition.objects.update_or_create(
                department=staff_department,
                position=staff_position,
                defaults={"headcount": headcount, "is_active": True},
            )
        demo_vacancies = {}
        for vacancy_title, staff_department, staff_position, openings in [
            ("Продуктовый аналитик", department, analyst_position, 1),
            ("Менеджер проектов", product_department, manager_position, 1),
            ("Специалист поддержки", support_department, support_position, 2),
        ]:
            staff_row = StaffPosition.objects.get(department=staff_department, position=staff_position)
            vacancy, _ = Vacancy.objects.update_or_create(
                title=vacancy_title,
                department=staff_department,
                defaults={
                    "staff_position": staff_row,
                    "position": staff_position,
                    "openings": openings,
                    "status": Vacancy.Status.OPEN,
                    "recruiter": user,
                },
            )
            demo_vacancies[vacancy_title] = vacancy

        first_profile = EmployeeProfile.objects.order_by("id").first()
        if first_profile:
            for course_index, course in enumerate(Course.objects.order_by("id")[:2]):
                EmployeeLearning.objects.get_or_create(
                    employee=first_profile,
                    course=course,
                    defaults={
                        "status": EmployeeLearning.Status.IN_PROGRESS if course_index == 0 else EmployeeLearning.Status.ASSIGNED,
                        "progress": 54 if course_index == 0 else 0,
                    },
                )

        stages = []
        for stage_position, stage_name in enumerate(
            ["Новые", "Скрининг", "Интервью", "Оффер"],
            start=1,
        ):
            stage, _ = CandidateStage.objects.get_or_create(
                name=stage_name,
                defaults={"position": stage_position},
            )
            stages.append(stage)
        for candidate_name, desired_position, stage in [
            ("Мария Котова", "Продуктовый аналитик", stages[0]),
            ("Дмитрий Орлов", "Менеджер проектов", stages[1]),
            ("Елена Фомина", "Специалист поддержки", stages[2]),
        ]:
            candidate, _ = Candidate.objects.get_or_create(
                full_name=candidate_name,
                desired_position=desired_position,
                defaults={
                    "stage": stage,
                    "department": department,
                    "vacancy": demo_vacancies.get(desired_position),
                    "recruiter": user,
                    "source": "Рекомендация",
                },
            )
            if candidate.vacancy_id is None and desired_position in demo_vacancies:
                candidate.vacancy = demo_vacancies[desired_position]
                candidate.department = demo_vacancies[desired_position].department
                candidate.save(update_fields=["vacancy", "department"])
        self.stdout.write(self.style.SUCCESS("Демонстрационные данные HCM готовы"))
