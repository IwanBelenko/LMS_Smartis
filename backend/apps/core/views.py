from django.db import connections
from django.db.utils import OperationalError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except OperationalError:
            return Response(
                {"status": "error", "service": "smartis-hcm-lms-api", "database": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok", "service": "smartis-hcm-lms-api", "database": "ok"})


class DashboardView(APIView):
    def get(self, request):
        return Response(
            {
                "trajectory": {"name": "Аналитик Smartis", "progress": 42},
                "stats": [
                    {"label": "Ближайший срок", "value": "4 дня", "caption": "Модели атрибуции"},
                    {"label": "Курсы", "value": "7 / 16", "caption": "Пройдено"},
                    {"label": "Проверка", "value": "1", "caption": "Задание отправлено"},
                ],
                "ranking": [
                    {"place": 1, "name": "Анна", "progress": 82},
                    {"place": 2, "name": "Вы", "progress": 54},
                    {"place": 3, "name": "Максим", "progress": 41},
                    {"place": 4, "name": "Ольга", "progress": 28},
                ],
            }
        )
