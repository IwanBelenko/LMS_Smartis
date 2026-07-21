from django.test import TestCase
from rest_framework.test import APIClient

from .models import Department, Invitation, User


class IdentityApiTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Аналитика", code="analytics")
        self.admin = User.objects.create_superuser(
            email="admin@test.local",
            password="StrongPassword123!",
            first_name="Иван",
            department=self.department,
        )
        self.client = APIClient()

    def authenticate(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "admin@test.local", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + response.json()["token"])

    def test_login_and_current_user(self):
        self.authenticate()
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], User.Role.ADMIN)

    def test_administrator_creates_department_and_invited_user(self):
        self.authenticate()
        department = self.client.post(
            "/api/v1/departments/",
            {"name": "Поддержка", "code": "support"},
            format="json",
        )
        self.assertEqual(department.status_code, 201)
        user = self.client.post(
            "/api/v1/users/",
            {
                "email": "employee@test.local",
                "first_name": "Анна",
                "last_name": "Тестова",
                "role": User.Role.EMPLOYEE,
                "department": department.json()["id"],
            },
            format="json",
        )
        self.assertEqual(user.status_code, 201)
        self.assertEqual(user.json()["status"], User.Status.INVITED)
        self.assertTrue(Invitation.objects.filter(user__email="employee@test.local").exists())

    def test_employee_cannot_manage_users(self):
        employee = User.objects.create_user(
            email="employee2@test.local",
            password="StrongPassword123!",
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(employee)
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, 403)
