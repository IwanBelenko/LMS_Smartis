from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
import re

from django.core.management import call_command
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.people.models import AuditEvent, EmployeeProfile, Position
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

    def test_new_login_rotates_existing_token(self):
        first = self.client.post(
            "/api/v1/auth/login/",
            {"email": "admin@test.local", "password": "StrongPassword123!"},
            format="json",
        )
        second = self.client.post(
            "/api/v1/auth/login/",
            {"email": "admin@test.local", "password": "StrongPassword123!"},
            format="json",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertNotEqual(first.json()["token"], second.json()["token"])
        self.assertIn("expires_at", second.json())
        self.client.credentials(HTTP_AUTHORIZATION="Token " + first.json()["token"])
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)

    @override_settings(API_TOKEN_TTL_SECONDS=3600)
    def test_expired_token_is_rejected_and_revoked(self):
        token = Token.objects.create(user=self.admin)
        Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(hours=2))
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

        response = self.client.get("/api/v1/auth/me/")

        self.assertEqual(response.status_code, 401)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

    def test_administrator_creates_department_and_invited_user_without_email(self):
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
        self.assertEqual(len(mail.outbox), 0)

    def test_administrator_creates_user_with_one_time_generated_password(self):
        self.authenticate()
        response = self.client.post(
            "/api/v1/users/",
            {
                "email": "manual.access@test.local",
                "first_name": "Анна",
                "last_name": "Тестова",
                "role": User.Role.EMPLOYEE,
                "generate_password": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        password = response.json()["temporary_password"]
        user = User.objects.get(email="manual.access@test.local")
        self.assertGreaterEqual(len(password), 12)
        self.assertTrue(user.check_password(password))
        self.assertEqual(user.status, User.Status.ACTIVE)
        self.assertFalse(Invitation.objects.filter(user=user).exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_new_internal_user_requires_department_and_position(self):
        self.authenticate()
        response = self.client.post(
            "/api/v1/users/",
            {
                "email": "internal.user@test.local",
                "first_name": "Анна",
                "last_name": "Сотрудник",
                "middle_name": "Ивановна",
                "role": User.Role.EMPLOYEE,
                "create_employee_profile": True,
                "generate_password": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("department", response.json())
        self.assertIn("position", response.json())

    def test_administrator_links_existing_user_to_employee_from_user_card(self):
        position = Position.objects.create(name="Руководитель HR")
        user = User.objects.create_user(
            email="hr.manager@test.local",
            password="StrongPassword123!",
            first_name="Альбина",
            status=User.Status.ACTIVE,
        )
        self.authenticate()

        response = self.client.patch(
            f"/api/v1/users/{user.pk}/",
            {
                "department": self.department.pk,
                "position": position.pk,
                "employee_number": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        profile = EmployeeProfile.objects.get(user=user)
        self.assertEqual(profile.position, position)
        self.assertTrue(profile.employee_number.startswith("AUTO-"))
        self.assertEqual(response.json()["employee_profile_id"], profile.pk)
        self.assertEqual(response.json()["position_name"], "Руководитель HR")

    def test_administrator_generates_new_password_for_existing_user(self):
        employee = User.objects.create_user(
            email="generated@test.local",
            password=None,
            status=User.Status.INVITED,
        )
        employee.set_unusable_password()
        employee.save(update_fields=["password"])
        Invitation.objects.create(user=employee, created_by=self.admin)
        self.client.force_authenticate(self.admin)

        response = self.client.post(f"/api/v1/users/{employee.pk}/generate-password/")

        self.assertEqual(response.status_code, 200)
        password = response.json()["temporary_password"]
        employee.refresh_from_db()
        self.assertTrue(employee.check_password(password))
        self.assertEqual(employee.status, User.Status.ACTIVE)
        self.assertFalse(Invitation.objects.filter(user=employee).exists())
        self.assertTrue(AuditEvent.objects.filter(
            actor=self.admin,
            entity_type="user",
            entity_id=str(employee.pk),
            action="password_generated",
        ).exists())

    def test_user_changes_own_password_and_current_session_is_revoked(self):
        token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + token.key)

        response = self.client.post(
            "/api/v1/auth/change-password/",
            {
                "current_password": "StrongPassword123!",
                "password": "AnotherStrongPassword456!",
                "password_confirm": "AnotherStrongPassword456!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("AnotherStrongPassword456!"))
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())
        audit_changes = AuditEvent.objects.get(
            entity_type="user",
            entity_id=str(self.admin.pk),
            action="password_changed",
        ).changes
        self.assertEqual(set(audit_changes), {"_context"})
        self.assertNotIn("AnotherStrongPassword456!", str(audit_changes))

    def test_administrator_cannot_replace_own_password_from_user_management(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(f"/api/v1/users/{self.admin.pk}/generate-password/")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Свой пароль измените через профиль")
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("StrongPassword123!"))

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

    def test_administrator_controls_compensation_permission_by_role(self):
        self.authenticate()
        response = self.client.post(
            "/api/v1/users/",
            {
                "email": "leader.compensation@test.local",
                "first_name": "Анна",
                "last_name": "Руководитель",
                "role": User.Role.LEADER,
                "department": self.department.pk,
                "can_view_compensation": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["can_view_compensation"])

        changed = self.client.patch(
            f"/api/v1/users/{response.json()['id']}/",
            {"role": User.Role.EMPLOYEE},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        self.assertFalse(changed.json()["can_view_compensation"])

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
        self.assertTrue(AuditEvent.objects.filter(
            actor=self.admin,
            entity_type="user",
            entity_id=str(employee.pk),
            action="blocked",
        ).exists())

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

    def test_administrator_deletes_user_and_linked_employee_profile(self):
        position = Position.objects.create(name="Удаляемая должность")
        employee = User.objects.create_user(
            email="delete.me@test.local",
            password="StrongPassword123!",
            status=User.Status.ACTIVE,
        )
        profile = EmployeeProfile.objects.create(
            user=employee,
            employee_number="DELETE-001",
            position=position,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.delete(f"/api/v1/users/{employee.pk}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=employee.pk).exists())
        self.assertFalse(EmployeeProfile.objects.filter(pk=profile.pk).exists())
        self.assertTrue(AuditEvent.objects.filter(
            actor=self.admin,
            entity_type="user",
            entity_id=str(employee.pk),
            action="deleted",
        ).exists())

    def test_administrator_cannot_delete_self_or_last_active_admin(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/v1/users/{self.admin.pk}/").status_code, 400)

        second_admin = User.objects.create_user(
            email="second.admin@test.local",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.assertEqual(self.client.delete(f"/api/v1/users/{second_admin.pk}/").status_code, 204)
        self.assertTrue(User.objects.filter(pk=self.admin.pk).exists())

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
