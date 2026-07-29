from unittest.mock import patch

from django.db.utils import OperationalError
from django.test import TestCase
from rest_framework.test import APIClient


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
