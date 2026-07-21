from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "smartis-lms-api"})


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
