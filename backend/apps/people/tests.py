from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.identity.models import Department, User
from apps.learning.models import Course
from .models import (
    Candidate,
    CandidateStage,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Position,
)


class PeopleApiTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Аналитика", code="analytics")
        self.other_department = Department.objects.create(name="Продукт", code="product")
        self.position = Position.objects.create(name="Аналитик")
        self.admin = User.objects.create_superuser(email="admin@test.local", password="Password123!")
        self.hr = User.objects.create_user(
            email="hr@test.local",
            password="Password123!",
            role=User.Role.HR,
            status=User.Status.ACTIVE,
        )
        self.author = User.objects.create_user(
            email="author@test.local",
            password="Password123!",
            role=User.Role.AUTHOR,
            status=User.Status.ACTIVE,
        )
        self.leader = User.objects.create_user(
            email="leader@test.local",
            password="Password123!",
            role=User.Role.LEADER,
            status=User.Status.ACTIVE,
            department=self.department,
        )
        self.employee = User.objects.create_user(
            email="employee@test.local",
            password="Password123!",
            first_name="Анна",
            role=User.Role.EMPLOYEE,
            status=User.Status.ACTIVE,
            department=self.department,
        )
        self.other_employee = User.objects.create_user(
            email="other@test.local",
            password="Password123!",
            first_name="Олег",
            role=User.Role.EMPLOYEE,
            status=User.Status.ACTIVE,
            department=self.other_department,
        )
        self.profile = EmployeeProfile.objects.create(
            user=self.employee,
            employee_number="SM-101",
            position=self.position,
            hire_date=date(2024, 1, 1),
            salary_base=150000,
        )
        EmployeeProfile.objects.create(user=self.other_employee, employee_number="SM-102")
        self.stage = CandidateStage.objects.create(name="Новые", position=1)
        Candidate.objects.create(full_name="Мария Тестова", desired_position="Аналитик", stage=self.stage)
        self.client = APIClient()

    def test_admin_sees_employee_compensation(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("salary_base", response.json()[0])

    def test_leader_cannot_open_hcm_registry(self):
        self.client.force_authenticate(self.leader)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 403)

    def test_employee_cannot_open_hcm_registry(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)

    def test_course_author_cannot_open_hcm_sections(self):
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/candidates/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/hcm/summary/").status_code, 403)

    def test_hr_has_hcm_access_and_sees_compensation(self):
        self.client.force_authenticate(self.hr)
        employees = self.client.get("/api/v1/employees/")
        candidates = self.client.get("/api/v1/candidates/")
        analytics = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(employees.status_code, 200)
        self.assertEqual(candidates.status_code, 200)
        self.assertEqual(analytics.status_code, 200)
        self.assertIn("salary_base", employees.json()[0])

    def test_admin_sees_recruitment_board_and_summary(self):
        self.client.force_authenticate(self.admin)
        stages = self.client.get("/api/v1/candidate-stages/")
        summary = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(stages.status_code, 200)
        self.assertEqual(stages.json()[0]["candidates_count"], 1)
        self.assertEqual(summary.json()["employees_total"], 2)

    def test_admin_creates_and_updates_employee_card(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/v1/employees/",
            {
                "email": "new.employee@test.local",
                "first_name": "Новый",
                "last_name": "Сотрудник",
                "employee_number": "SM-200",
                "department": self.department.pk,
                "position": self.position.pk,
                "grade": "Junior",
                "status": EmployeeProfile.Status.PROBATION,
                "checklist_score": 20,
                "development_progress": 15,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["full_name"], "Новый Сотрудник")
        profile_id = created.json()["id"]
        updated = self.client.patch(
            f"/api/v1/employees/{profile_id}/",
            {"grade": "Middle", "development_progress": 55},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["grade"], "Middle")
        self.assertEqual(updated.json()["development_progress"], 55)
        self.assertFalse(User.objects.get(email="new.employee@test.local").has_usable_password())

    def test_admin_moves_candidate_to_another_stage(self):
        next_stage = CandidateStage.objects.create(name="Интервью", position=2)
        candidate = Candidate.objects.get()
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/candidates/{candidate.pk}/",
            {"stage": next_stage.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["stage_name"], "Интервью")

    def test_admin_manages_employee_development_profile(self):
        course = Course.objects.create(title="Основы аналитики", author=self.admin)
        self.client.force_authenticate(self.admin)
        goal = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/goals/",
            {"title": "Освоить SQL", "progress": 30, "status": EmployeeGoal.Status.IN_PROGRESS},
            format="json",
        )
        history = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/history/",
            {
                "event_type": EmploymentEvent.Type.REVIEW,
                "title": "Квартальная оценка",
                "effective_date": "2026-07-01",
            },
            format="json",
        )
        learning = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/learning/",
            {"course": course.pk, "status": EmployeeLearning.Status.ASSIGNED, "progress": 0},
            format="json",
        )
        document = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/documents/",
            {"title": "Согласие", "document_type": "Кадровый документ"},
            format="json",
        )
        self.assertEqual(goal.status_code, 201)
        self.assertEqual(history.status_code, 201)
        self.assertEqual(learning.status_code, 201)
        self.assertEqual(document.status_code, 201)
        self.assertTrue(EmployeeDocument.objects.filter(employee=self.profile).exists())

    def test_leader_cannot_read_or_change_employee_profile(self):
        EmployeeGoal.objects.create(employee=self.profile, title="Цель отдела")
        self.client.force_authenticate(self.leader)
        response = self.client.get(f"/api/v1/employees/{self.profile.pk}/goals/")
        forbidden = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/goals/",
            {"title": "Новая цель", "progress": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(forbidden.status_code, 403)
