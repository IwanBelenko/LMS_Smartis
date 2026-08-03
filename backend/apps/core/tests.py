from unittest.mock import patch

from django.db.utils import OperationalError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.identity.models import User
from apps.people.models import AuditEvent

from .models import SystemSettings


class HealthApiTests(TestCase):
    def test_health_reports_database_connection(self):
        response = APIClient().get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["database"], "ok")
        self.assertEqual(response.json()["service"], "smartis-hcm-lms-api")

    @patch("apps.core.views.connections")
    def test_health_returns_503_when_database_is_unavailable(self, connections):
        connections.__getitem__.side_effect = OperationalError("database unavailable")
        response = APIClient().get("/api/v1/health/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["database"], "unavailable")


class SystemSettingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(email="admin@smartis.bi", password="Password123!")
        self.employee = User.objects.create_user(
            email="employee@smartis.bi",
            password="Password123!",
            status=User.Status.ACTIVE,
        )

    def test_only_admin_updates_system_settings(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/system-settings/").status_code, 403)

        self.client.force_authenticate(self.admin)
        response = self.client.put(
            "/api/v1/system-settings/",
            {
                "company_name": "HCM / LMS Smartis",
                "legal_name": "ООО «Смартис»",
                "support_email": "support@smartis.bi",
                "corporate_email_domains": ["@smartis.bi", "SMARTIS.TEAM", "smartis.bi"],
                "invitation_expiry_days": 10,
                "notify_learning": True,
                "notify_interviews": True,
                "notify_hr_events": False,
                "notify_invitations": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["corporate_email_domains"], ["smartis.bi", "smartis.team"])
        self.assertEqual(SystemSettings.objects.get(pk=1).invitation_expiry_days, 10)
        self.assertTrue(AuditEvent.objects.filter(entity_type="system_settings", action="updated").exists())

    def test_invalid_domain_and_invitation_period_are_rejected(self):
        self.client.force_authenticate(self.admin)
        configuration = SystemSettings.objects.create()
        payload = {
            "company_name": configuration.company_name,
            "legal_name": "",
            "support_email": "",
            "corporate_email_domains": ["not a domain"],
            "invitation_expiry_days": 60,
            "notify_learning": True,
            "notify_interviews": True,
            "notify_hr_events": True,
            "notify_invitations": True,
        }
        response = self.client.put("/api/v1/system-settings/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("corporate_email_domains", response.json())
        self.assertIn("invitation_expiry_days", response.json())
