import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
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

    def test_rich_text_is_sanitized_and_keeps_safe_formatting(self):
        self.client.force_authenticate(self.admin)
        payload = self.course_payload()
        payload["lessons"][0]["content"] = (
            '<h2 style="text-align:center">Заголовок</h2>'
            '<p><span style="font-family:Georgia;font-size:24px;color:#7ea935">Текст</span></p>'
            '<script>alert("xss")</script><a href="javascript:alert(1)" onclick="alert(1)">ссылка</a>'
        )
        response = self.client.post("/api/v1/courses/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        content = response.data["lessons"][0]["content"]
        self.assertIn("text-align:center", content)
        self.assertIn("font-family:Georgia", content)
        self.assertNotIn("script", content)
        self.assertNotIn("javascript", content)
        self.assertNotIn("onclick", content)

    def test_video_is_uploaded_to_platform_before_publication(self):
        self.client.force_authenticate(self.admin)
        payload = self.course_payload("Видеокурс")
        payload["lessons"] = [
            {
                "title": "Обзор платформы",
                "lesson_type": "video",
                "duration_minutes": 8,
                "position": 0,
                "is_required": True,
            }
        ]
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            created = self.client.post("/api/v1/courses/", payload, format="json").data
            course_id = created["id"]
            lesson_id = created["lessons"][0]["id"]

            response = self.client.post(f"/api/v1/courses/{course_id}/publish/")
            self.assertEqual(response.status_code, 400)

            video = SimpleUploadedFile("overview.mp4", b"fake-video-content", content_type="video/mp4")
            response = self.client.post(
                f"/api/v1/courses/{course_id}/lessons/{lesson_id}/video/",
                {"video": video},
                format="multipart",
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["video_original_name"], "overview.mp4")
            self.assertTrue(response.data["video_url"].endswith(".mp4"))

            response = self.client.post(f"/api/v1/courses/{course_id}/publish/")
            self.assertEqual(response.status_code, 200)

    def test_custom_cover_is_uploaded_and_can_be_reset(self):
        self.client.force_authenticate(self.admin)
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            created = self.client.post("/api/v1/courses/", self.course_payload(), format="json").data
            cover = SimpleUploadedFile("smartis-cover.png", b"fake-image-content", content_type="image/png")

            response = self.client.post(
                f"/api/v1/courses/{created['id']}/cover/",
                {"cover": cover},
                format="multipart",
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["cover_style"], Course.CoverStyle.CUSTOM)
            self.assertEqual(response.data["cover_original_name"], "smartis-cover.png")
            self.assertTrue(response.data["cover_url"].endswith(".png"))

            response = self.client.delete(f"/api/v1/courses/{created['id']}/cover/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["cover_style"], Course.CoverStyle.STANDARD)
            self.assertEqual(response.data["cover_url"], "")

    def test_editing_published_course_returns_it_to_draft(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/v1/courses/", self.course_payload(), format="json").data
        self.client.post(f"/api/v1/courses/{created['id']}/publish/")

        response = self.client.patch(
            f"/api/v1/courses/{created['id']}/",
            {"title": "Новая версия курса"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Course.Status.DRAFT)
        self.assertEqual(response.data["version"], 2)
