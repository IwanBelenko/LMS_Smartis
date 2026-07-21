from django.test import TestCase
from rest_framework.test import APIClient

from apps.identity.models import User

from .models import Course


class CourseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@smartis.local",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.author = User.objects.create_user(
            email="author@smartis.local",
            password="StrongPassword123!",
            role=User.Role.AUTHOR,
            status=User.Status.ACTIVE,
        )
        self.employee = User.objects.create_user(
            email="employee@smartis.local",
            password="StrongPassword123!",
            role=User.Role.EMPLOYEE,
            status=User.Status.ACTIVE,
        )

    def course_payload(self, title="Первый курс"):
        return {
            "title": title,
            "description": "Вводный курс Smartis",
            "estimated_minutes": 35,
            "lessons": [
                {
                    "title": "Знакомство",
                    "lesson_type": "text",
                    "content": "Добро пожаловать",
                    "duration_minutes": 7,
                    "position": 0,
                    "is_required": True,
                }
            ],
        }

    def test_admin_creates_and_publishes_course(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/v1/courses/", self.course_payload(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], Course.Status.DRAFT)
        self.assertEqual(response.data["lessons_count"], 1)

        response = self.client.post(f"/api/v1/courses/{response.data['id']}/publish/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Course.Status.PUBLISHED)

    def test_empty_course_cannot_be_published(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/v1/courses/",
            {"title": "Пустой курс", "description": "", "estimated_minutes": 10, "lessons": []},
            format="json",
        )
        response = self.client.post(f"/api/v1/courses/{response.data['id']}/publish/")
        self.assertEqual(response.status_code, 400)

    def test_author_updates_only_own_courses(self):
        admin_course = Course.objects.create(title="Курс администратора", author=self.admin)
        own_course = Course.objects.create(title="Курс автора", author=self.author)
        self.client.force_authenticate(self.author)

        response = self.client.get("/api/v1/courses/")
        self.assertEqual([item["id"] for item in response.data], [own_course.id])
        response = self.client.patch(
            f"/api/v1/courses/{admin_course.id}/", {"title": "Чужое изменение"}, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_employee_sees_only_published_courses_and_cannot_create(self):
        Course.objects.create(title="Черновик", author=self.admin)
        Course.objects.create(title="Доступный курс", author=self.admin, status=Course.Status.PUBLISHED)
        self.client.force_authenticate(self.employee)

        response = self.client.get("/api/v1/courses/")
        self.assertEqual([item["title"] for item in response.data], ["Доступный курс"])
        response = self.client.post("/api/v1/courses/", self.course_payload(), format="json")
        self.assertEqual(response.status_code, 403)

    def test_update_reorders_lessons_and_increments_version(self):
        self.client.force_authenticate(self.admin)
        payload = self.course_payload()
        payload["lessons"].append(
            {
                "title": "Практика",
                "lesson_type": "link",
                "media_url": "https://example.com/practice",
                "duration_minutes": 12,
                "position": 1,
                "is_required": True,
            }
        )
        created = self.client.post("/api/v1/courses/", payload, format="json").data
        lessons = list(reversed(created["lessons"]))
        for position, lesson in enumerate(lessons):
            lesson["position"] = position

        response = self.client.patch(
            f"/api/v1/courses/{created['id']}/",
            {"title": "Обновлённый курс", "lessons": lessons},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["version"], 2)
        self.assertEqual([item["title"] for item in response.data["lessons"]], ["Практика", "Знакомство"])
