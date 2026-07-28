from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.identity.models import Department, User
from .models import Candidate, CandidateStage, EmployeeProfile, Position


class PeopleApiTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Аналитика", code="analytics")
        self.other_department = Department.objects.create(name="Продукт", code="product")
        self.position = Position.objects.create(name="Аналитик")
        self.admin = User.objects.create_superuser(email="admin@test.local", password="Password123!")
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

    def test_leader_sees_only_department_without_compensation(self):
        self.client.force_authenticate(self.leader)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertNotIn("salary_base", response.json()[0])

    def test_employee_cannot_open_hcm_registry(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)

    def test_admin_sees_recruitment_board_and_summary(self):
        self.client.force_authenticate(self.admin)
        stages = self.client.get("/api/v1/candidate-stages/")
        summary = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(stages.status_code, 200)
        self.assertEqual(stages.json()[0]["candidates_count"], 1)
        self.assertEqual(summary.json()["employees_total"], 2)
