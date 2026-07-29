from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
import re

from django.core.management import call_command
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Department, Invitation, User


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    APP_PUBLIC_URL="http://lms.test",
)
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
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("HCM / LMS Smartis", mail.outbox[0].subject)
        self.assertIn("?invite=", mail.outbox[0].body)

    def test_employee_cannot_manage_users(self):
        employee = User.objects.create_user(
            email="employee2@test.local",
            password="StrongPassword123!",
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(employee)
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, 403)

    def test_administrator_assigns_hr_role(self):
        self.authenticate()
        response = self.client.post(
            "/api/v1/users/",
            {
                "email": "hr@test.local",
                "first_name": "Анна",
                "last_name": "HR",
                "role": User.Role.HR,
                "department": self.department.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["role"], User.Role.HR)

    def test_ensure_admin_creates_only_initial_administrator(self):
        with patch.dict(
            "os.environ",
            {
                "INITIAL_ADMIN_EMAIL": "first.admin@smartis.local",
                "INITIAL_ADMIN_PASSWORD": "TemporaryStrong123!",
            },
        ):
            call_command("ensure_admin")
        admin = User.objects.get(email="first.admin@smartis.local")
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)
        self.assertEqual(admin.role, User.Role.ADMIN)
        self.assertTrue(admin.check_password("TemporaryStrong123!"))

    def test_invited_user_sets_password_and_activates_account(self):
        invited = User.objects.create_user(
            email="invitee@test.local",
            password=None,
            first_name="Анна",
            status=User.Status.INVITED,
        )
        invited.set_unusable_password()
        invited.save(update_fields=["password"])
        invitation = Invitation.objects.create(user=invited, created_by=self.admin)

        details = self.client.get(f"/api/v1/auth/invitations/{invitation.token}/")
        self.assertEqual(details.status_code, 200)
        accepted = self.client.post(
            f"/api/v1/auth/invitations/{invitation.token}/",
            {"password": "NewStrongPassword123!", "password_confirm": "NewStrongPassword123!"},
            format="json",
        )
        self.assertEqual(accepted.status_code, 200)
        invited.refresh_from_db()
        invitation.refresh_from_db()
        self.assertEqual(invited.status, User.Status.ACTIVE)
        self.assertTrue(invited.check_password("NewStrongPassword123!"))
        self.assertIsNotNone(invitation.accepted_at)
        self.assertEqual(
            self.client.get(f"/api/v1/auth/invitations/{invitation.token}/").status_code,
            404,
        )

    def test_admin_resends_invitation_with_new_token(self):
        invited = User.objects.create_user(
            email="resend@test.local",
            password=None,
            status=User.Status.INVITED,
        )
        invited.set_unusable_password()
        invited.save(update_fields=["password"])
        invitation = Invitation.objects.create(user=invited, created_by=self.admin)
        old_token = invitation.token
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/v1/users/{invited.pk}/resend-invitation/")
        self.assertEqual(response.status_code, 200)
        invitation.refresh_from_db()
        self.assertNotEqual(invitation.token, old_token)
        self.assertEqual(len(mail.outbox), 1)

    def test_active_user_resets_password_from_email_link(self):
        response = self.client.post(
            "/api/v1/auth/password-reset/",
            {"email": self.admin.email},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        url = re.search(r"https?://\S+", mail.outbox[0].body).group(0)
        query = parse_qs(urlparse(url).query)
        uid = query["reset_uid"][0]
        token = query["reset_token"][0]

        valid = self.client.get(f"/api/v1/auth/password-reset/{uid}/{token}/")
        self.assertEqual(valid.status_code, 200)
        changed = self.client.post(
            f"/api/v1/auth/password-reset/{uid}/{token}/",
            {"password": "ChangedStrongPassword123!", "password_confirm": "ChangedStrongPassword123!"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("ChangedStrongPassword123!"))
        self.assertEqual(
            self.client.get(f"/api/v1/auth/password-reset/{uid}/{token}/").status_code,
            400,
        )

    def test_password_reset_does_not_disclose_unknown_email(self):
        response = self.client.post(
            "/api/v1/auth/password-reset/",
            {"email": "unknown@test.local"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_administrator_updates_role_and_department(self):
        employee = User.objects.create_user(
            email="managed@test.local",
            password="StrongPassword123!",
            role=User.Role.EMPLOYEE,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/users/{employee.pk}/",
            {"role": User.Role.AUTHOR, "department": self.department.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        employee.refresh_from_db()
        self.assertEqual(employee.role, User.Role.AUTHOR)
        self.assertEqual(employee.department, self.department)

    def test_blocking_user_revokes_existing_token_and_restore_activates(self):
        employee = User.objects.create_user(
            email="blocked@test.local",
            password="StrongPassword123!",
            status=User.Status.ACTIVE,
        )
        token = Token.objects.create(user=employee)
        self.client.force_authenticate(self.admin)
        blocked = self.client.post(f"/api/v1/users/{employee.pk}/block/")
        self.assertEqual(blocked.status_code, 200)
        employee.refresh_from_db()
        self.assertEqual(employee.status, User.Status.BLOCKED)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

        restored = self.client.post(f"/api/v1/users/{employee.pk}/restore/")
        self.assertEqual(restored.status_code, 200)
        employee.refresh_from_db()
        self.assertEqual(employee.status, User.Status.ACTIVE)

    def test_administrator_cannot_block_self_or_remove_last_admin_role(self):
        self.client.force_authenticate(self.admin)
        blocked = self.client.post(f"/api/v1/users/{self.admin.pk}/block/")
        self.assertEqual(blocked.status_code, 400)
        demoted = self.client.patch(
            f"/api/v1/users/{self.admin.pk}/",
            {"role": User.Role.EMPLOYEE},
            format="json",
        )
        self.assertEqual(demoted.status_code, 400)

    @override_settings(CORPORATE_EMAIL_DOMAINS=["smartis.bi"])
    def test_user_creation_rejects_non_corporate_email_when_domain_is_configured(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/v1/users/",
            {
                "email": "person@gmail.com",
                "first_name": "Иван",
                "last_name": "Петров",
                "role": User.Role.EMPLOYEE,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("@smartis.bi", response.json()["email"][0])
