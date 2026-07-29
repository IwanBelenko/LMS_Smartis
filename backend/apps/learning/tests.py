import io
import json
import tempfile
import zipfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.identity.models import User
from apps.people.models import AuditEvent

from .models import ContentProject, Course, CourseEnrollment, LearningImageAsset, LearningPath, Lesson


def make_scorm_12_package(title="Курс из SCORM", filename="course-scorm.zip", extra_files=None):
    manifest = f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="imported-course" version="1.2"
 xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
 xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
 <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
 <organizations default="ORG1"><organization identifier="ORG1"><title>{title}</title><item identifier="ITEM1" identifierref="RES1"><title>{title}</title></item></organization></organizations>
 <resources><resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources>
</manifest>'''
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("imsmanifest.xml", manifest)
        archive.writestr("index.html", "<!doctype html><title>SCORM</title><p>Курс</p>")
        for path, content in (extra_files or {}).items():
            archive.writestr(path, content)
    return SimpleUploadedFile(filename, output.getvalue(), content_type="application/zip")


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
        self.assertEqual(
            list(
                AuditEvent.objects.filter(entity_type="course", entity_id=str(response.data["id"]))
                .order_by("created_at")
                .values_list("action", flat=True)
            ),
            ["created", "published"],
        )

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

    def test_question_image_is_uploaded_and_deleted(self):
        self.client.force_authenticate(self.author)
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            image = SimpleUploadedFile("diagram.png", b"fake-image-content", content_type="image/png")
            response = self.client.post(
                "/api/v1/courses/question-image/",
                {"image": image},
                format="multipart",
            )

            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data["original_name"], "diagram.png")
            self.assertTrue(response.data["url"].endswith(".png"))
            asset = LearningImageAsset.objects.get(pk=response.data["id"])
            self.assertTrue(Path(asset.file.path).exists())

            response = self.client.delete(
                f"/api/v1/courses/question-image/?asset_id={asset.pk}",
            )
            self.assertEqual(response.status_code, 204)
            self.assertFalse(LearningImageAsset.objects.filter(pk=asset.pk).exists())
            self.assertFalse(Path(asset.file.path).exists())

    def test_employee_cannot_upload_question_image(self):
        self.client.force_authenticate(self.employee)
        image = SimpleUploadedFile("diagram.png", b"fake-image-content", content_type="image/png")
        response = self.client.post(
            "/api/v1/courses/question-image/",
            {"image": image},
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)

    def test_question_image_rejects_unsupported_format(self):
        self.client.force_authenticate(self.admin)
        image = SimpleUploadedFile("diagram.gif", b"fake-image-content", content_type="image/gif")
        response = self.client.post(
            "/api/v1/courses/question-image/",
            {"image": image},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_scorm_12_package_is_imported_as_course(self):
        self.client.force_authenticate(self.admin)
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                "/api/v1/courses/import-scorm/",
                {"package": make_scorm_12_package()},
                format="multipart",
            )
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data["title"], "Курс из SCORM")
            self.assertEqual(response.data["source_format"], Course.SourceFormat.SCORM_12)
            self.assertEqual(response.data["lessons"][0]["lesson_type"], "scorm")
            self.assertEqual(response.data["scorm_entry_point"], "index.html")

            launch = self.client.get(f"/api/v1/courses/{response.data['id']}/scorm-launch/")
            self.assertEqual(launch.status_code, 200)
            launch_path = launch.data["launch_url"].removeprefix("http://127.0.0.1:8000")
            self.assertTrue(launch_path.startswith(f"/scorm-content/{response.data['id']}/"))
            self.assertTrue(launch.data["launch_url"].endswith("/index.html"))
            player = self.client.get(launch_path)
            self.assertEqual(player.status_code, 200)
            self.assertNotIn("X-Frame-Options", player)
            self.assertIn(b"data-smartis-scorm-bridge", b"".join(player.streaming_content))
            launch_file = Course.objects.get(id=response.data["id"])
            html_path = f"{media_root}/{launch_file.scorm_content_dir}/index.html"
            with open(html_path, encoding="utf-8") as imported_html:
                self.assertIn("data-smartis-scorm-bridge", imported_html.read())

    def test_native_course_is_exported_as_valid_scorm_12(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post("/api/v1/courses/", self.course_payload(), format="json").data

        response = self.client.get(f"/api/v1/courses/{created['id']}/export-scorm/")
        self.assertEqual(response.status_code, 200)
        package_bytes = b"".join(response.streaming_content)
        with zipfile.ZipFile(io.BytesIO(package_bytes)) as archive:
            self.assertIn("imsmanifest.xml", archive.namelist())
            self.assertIn("index.html", archive.namelist())
            manifest = archive.read("imsmanifest.xml").decode("utf-8")
            player = archive.read("index.html").decode("utf-8")
        self.assertIn("<schemaversion>1.2</schemaversion>", manifest)
        self.assertIn("LMSInitialize", player)
        self.assertIn("cmi.core.lesson_status", player)

    def test_scorm_package_can_be_replaced_without_creating_a_new_course(self):
        self.client.force_authenticate(self.admin)
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            created = self.client.post(
                "/api/v1/courses/import-scorm/",
                {"package": make_scorm_12_package()},
                format="multipart",
            ).data
            course = Course.objects.get(id=created["id"])
            old_package = course.scorm_package.path
            old_content_dir = f"{media_root}/{course.scorm_content_dir}"

            response = self.client.post(
                f"/api/v1/courses/{course.id}/replace-scorm/",
                {"package": make_scorm_12_package("Обновлённый пакет", "course-v2.zip")},
                format="multipart",
            )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["id"], course.id)
            self.assertEqual(response.data["title"], "Курс из SCORM")
            self.assertEqual(response.data["scorm_original_name"], "course-v2.zip")
            self.assertEqual(response.data["version"], 2)
            self.assertFalse(Path(old_package).exists())
            self.assertFalse(Path(old_content_dir).exists())
            self.assertTrue(Path(Course.objects.get(id=course.id).scorm_package.path).exists())

    def test_ispring_scorm_can_be_converted_to_editable_native_copy(self):
        self.client.force_authenticate(self.admin)
        ispring_document = {
            "metadata_url": "https://example.com/additional-guide",
            "content": {
                "c": {
                    "B": {
                        "course": {
                            "cs": {
                                "b": {
                                    "o": ["heading", "paragraph", "image", "test-heading", "quiz"],
                                    "B": {
                                        "heading": {"t": "p", "v": "h2", "c": [{"t": "1. Введение"}]},
                                        "paragraph": {
                                            "t": "p",
                                            "v": "text",
                                            "c": [
                                                {"t": "Редактируемый текст и "},
                                                {"t": "документация", "m": {"#": ["https://example.com/docs"]}},
                                            ],
                                        },
                                        "image": {
                                            "t": "c",
                                            "is": [
                                                {
                                                    "t": "i",
                                                    "s": "images/product.png",
                                                    "w": 640,
                                                    "h": 360,
                                                }
                                            ],
                                        },
                                        "test-heading": {"t": "p", "v": "h2", "c": [{"t": "2. Тест"}]},
                                        "quiz": {
                                            "t": "Q",
                                            "dt": {
                                                "q": {
                                                    "o": ["question"],
                                                    "B": {
                                                        "question": {
                                                            "d": {"b": {"o": ["q"], "B": {"q": {"t": "p", "c": [{"t": "Вопрос?"}]}}}},
                                                            "c": {
                                                                "o": ["answer", "wrong-answer"],
                                                                "B": {
                                                                    "answer": {
                                                                        "c": True,
                                                                        "t": {"b": {"o": ["a"], "B": {"a": {"t": "p", "c": [{"t": "Ответ"}]}}}},
                                                                    },
                                                                    "wrong-answer": {
                                                                        "c": False,
                                                                        "t": {"b": {"o": ["a"], "B": {"a": {"t": "p", "c": [{"t": "Другой ответ"}]}}}},
                                                                    },
                                                                },
                                                            },
                                                        }
                                                    },
                                                }
                                            },
                                        },
                                    },
                                }
                            }
                        }
                    }
                }
            }
        }
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            imported = self.client.post(
                "/api/v1/courses/import-scorm/",
                {
                    "package": make_scorm_12_package(
                        "iSpring",
                        extra_files={
                            "data-1.json": json.dumps(ispring_document, ensure_ascii=False),
                            "images/product.png": b"test-image",
                        },
                    )
                },
                format="multipart",
            ).data

            response = self.client.post(f"/api/v1/courses/{imported['id']}/convert-to-native/")

            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data["source_format"], Course.SourceFormat.NATIVE)
            self.assertEqual(response.data["lessons"][0]["title"], "1. Введение")
            self.assertIn("Редактируемый текст", response.data["lessons"][0]["content"])
            self.assertIn('<img src="/media/courses/', response.data["lessons"][0]["content"])
            self.assertIn('/assets/scorm-import/images/product.png"', response.data["lessons"][0]["content"])
            native_course_id = response.data["id"]
            imported_image = Path(media_root) / "courses" / str(native_course_id) / "assets" / "scorm-import" / "images" / "product.png"
            self.assertTrue(imported_image.exists())
            quiz_lesson = next(lesson for lesson in response.data["lessons"] if lesson["lesson_type"] == "quiz")
            self.assertEqual(quiz_lesson["title"], "2. Тест")
            self.assertEqual(quiz_lesson["quiz_data"]["questions"][0]["prompt"], "Вопрос?")
            self.assertTrue(quiz_lesson["quiz_data"]["questions"][0]["options"][0]["correct"])
            self.assertFalse(quiz_lesson["quiz_data"]["questions"][0]["options"][1]["correct"])
            all_content = "".join(lesson["content"] for lesson in response.data["lessons"])
            self.assertIn('href="https://example.com/docs"', all_content)
            self.assertIn('href="https://example.com/additional-guide"', all_content)
            self.assertEqual(response.data["lessons"][-1]["title"], "Ссылки из исходного курса")
            self.assertEqual(Course.objects.filter(id=imported["id"], source_format="scorm_12").count(), 1)

            lessons_payload = [dict(lesson) for lesson in response.data["lessons"]]
            lessons_payload[0]["content"] += (
                '<p><mark data-color="#fff1a8" style="background-color:#fff1a8">Важный фрагмент</mark></p>'
            )
            saved = self.client.patch(
                f"/api/v1/courses/{native_course_id}/",
                {"lessons": lessons_payload},
                format="json",
            )
            self.assertEqual(saved.status_code, 200)
            self.assertIn('<img src="/media/courses/', saved.data["lessons"][0]["content"])
            self.assertIn("<mark", saved.data["lessons"][0]["content"])
            self.assertIn("Важный фрагмент", saved.data["lessons"][0]["content"])

            removable_content = saved.data["lessons"][0]["content"]
            image_start = removable_content.index("<img")
            image_end = removable_content.index(">", image_start) + 1
            removable_lessons = [dict(lesson) for lesson in saved.data["lessons"]]
            removable_lessons[0]["content"] = removable_content[:image_start] + removable_content[image_end:]
            removed = self.client.patch(
                f"/api/v1/courses/{native_course_id}/",
                {"lessons": removable_lessons},
                format="json",
            )
            self.assertEqual(removed.status_code, 200)
            self.assertNotIn("<img", removed.data["lessons"][0]["content"])

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

    def test_author_organizes_courses_and_learning_paths_in_own_project(self):
        self.client.force_authenticate(self.author)
        project = self.client.post(
            "/api/v1/projects/",
            {"name": "Академия продукта", "description": "Рабочие материалы"},
            format="json",
        )
        self.assertEqual(project.status_code, 201)

        folder = self.client.post(
            "/api/v1/folders/",
            {"name": "Онбординг", "project": project.data["id"], "parent": None},
            format="json",
        )
        self.assertEqual(folder.status_code, 201)

        payload = self.course_payload("Курс автора в папке")
        payload.update({"project": project.data["id"], "folder": folder.data["id"]})
        course = self.client.post("/api/v1/courses/", payload, format="json")
        self.assertEqual(course.status_code, 201)
        self.assertEqual(course.data["project"], project.data["id"])
        self.assertEqual(course.data["folder"], folder.data["id"])

        learning_path = self.client.post(
            "/api/v1/learning-paths/",
            {
                "title": "Траектория новичка",
                "description": "Первый месяц",
                "project": project.data["id"],
                "folder": folder.data["id"],
                "course_ids": [course.data["id"]],
            },
            format="json",
        )
        self.assertEqual(learning_path.status_code, 201)
        self.assertEqual(learning_path.data["course_ids"], [course.data["id"]])
        self.assertEqual(learning_path.data["course_count"], 1)

        projects = self.client.get("/api/v1/projects/")
        self.assertEqual(projects.data[0]["course_count"], 1)
        self.assertEqual(projects.data[0]["folder_count"], 1)
        self.assertEqual(projects.data[0]["path_count"], 1)

    def test_learning_path_preserves_course_order_and_can_be_published(self):
        self.client.force_authenticate(self.author)
        first = self.client.post("/api/v1/courses/", self.course_payload("Первый"), format="json")
        second = self.client.post("/api/v1/courses/", self.course_payload("Второй"), format="json")
        learning_path = self.client.post(
            "/api/v1/learning-paths/",
            {
                "title": "Путь специалиста",
                "description": "Два курса по порядку",
                "course_ids": [first.data["id"], second.data["id"]],
            },
            format="json",
        )
        self.assertEqual(learning_path.status_code, 201)

        reordered = self.client.patch(
            f"/api/v1/learning-paths/{learning_path.data['id']}/",
            {"course_ids": [second.data["id"], first.data["id"]]},
            format="json",
        )
        self.assertEqual(reordered.status_code, 200)
        self.assertEqual(reordered.data["course_ids"], [second.data["id"], first.data["id"]])
        self.assertEqual(
            self.client.get(f"/api/v1/learning-paths/{learning_path.data['id']}/").data["course_ids"],
            [second.data["id"], first.data["id"]],
        )

        blocked = self.client.post(f"/api/v1/learning-paths/{learning_path.data['id']}/publish/")
        self.assertEqual(blocked.status_code, 400)
        self.client.post(f"/api/v1/courses/{first.data['id']}/publish/")
        self.client.post(f"/api/v1/courses/{second.data['id']}/publish/")
        published = self.client.post(f"/api/v1/learning-paths/{learning_path.data['id']}/publish/")
        self.assertEqual(published.status_code, 200)
        self.assertEqual(published.data["status"], LearningPath.Status.PUBLISHED)
        unpublished = self.client.post(f"/api/v1/learning-paths/{learning_path.data['id']}/unpublish/")
        self.assertEqual(unpublished.status_code, 200)
        self.assertEqual(unpublished.data["status"], LearningPath.Status.DRAFT)

    def test_author_cannot_move_content_to_another_owners_project(self):
        foreign_project = ContentProject.objects.create(name="Проект администратора", owner=self.admin)
        own_course = Course.objects.create(title="Курс автора", author=self.author)
        self.client.force_authenticate(self.author)

        response = self.client.patch(
            f"/api/v1/courses/{own_course.id}/",
            {"project": foreign_project.id, "folder": None},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        own_course.refresh_from_db()
        self.assertIsNone(own_course.project)

    def test_employee_cannot_manage_author_projects(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/projects/").status_code, 403)
        self.assertEqual(
            self.client.post("/api/v1/projects/", {"name": "Личный проект"}, format="json").status_code,
            403,
        )

    def test_path_unlocks_courses_in_sequence_after_required_lessons(self):
        first = Course.objects.create(
            title="Первый курс", author=self.admin, status=Course.Status.PUBLISHED
        )
        first_lesson = Lesson.objects.create(course=first, title="Введение", position=0)
        second = Course.objects.create(
            title="Второй курс", author=self.admin, status=Course.Status.PUBLISHED
        )
        Lesson.objects.create(course=second, title="Продолжение", position=0)
        path = LearningPath.objects.create(
            title="Последовательная траектория",
            author=self.admin,
            status=LearningPath.Status.PUBLISHED,
        )
        path.courses.add(first, through_defaults={"position": 0})
        path.courses.add(second, through_defaults={"position": 1})

        self.client.force_authenticate(self.admin)
        assigned = self.client.post(
            "/api/v1/my-learning/assign-path/",
            {"user_id": self.employee.pk, "learning_path_id": path.pk},
            format="json",
        )
        self.assertEqual(assigned.status_code, 201)
        self.assertEqual(
            [item["status"] for item in assigned.data],
            [CourseEnrollment.Status.AVAILABLE, CourseEnrollment.Status.LOCKED],
        )

        self.client.force_authenticate(self.employee)
        listing = self.client.get("/api/v1/my-learning/")
        first_enrollment, second_enrollment = listing.data["paths"][0]["courses"]
        self.assertNotIn("correct", first_enrollment["lessons"][0].get("quiz_data", {}))
        self.assertEqual(
            self.client.post(f"/api/v1/my-learning/{second_enrollment['id']}/start/").status_code,
            400,
        )
        completed = self.client.post(
            f"/api/v1/my-learning/{first_enrollment['id']}/lessons/{first_lesson.pk}/complete/"
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.data["status"], CourseEnrollment.Status.COMPLETED)
        self.assertEqual(completed.data["progress"], 100)
        second.refresh_from_db()
        unlocked = CourseEnrollment.objects.get(pk=second_enrollment["id"])
        self.assertEqual(unlocked.status, CourseEnrollment.Status.AVAILABLE)

    def test_quiz_attempts_are_saved_and_passing_score_completes_course(self):
        course = Course.objects.create(
            title="Курс с тестом", author=self.admin, status=Course.Status.PUBLISHED
        )
        lesson = Lesson.objects.create(
            course=course,
            title="Итоговый тест",
            lesson_type=Lesson.Type.QUIZ,
            position=0,
            quiz_data={
                "passing_score": 100,
                "max_attempts": 2,
                "questions": [{
                    "prompt": "Выберите верный ответ",
                    "feedback_correct": "Именно так.",
                    "feedback_incorrect": "Повторите материал урока.",
                    "options": [
                        {"text": "Неверно", "correct": False},
                        {"text": "Верно", "correct": True},
                    ],
                }],
            },
        )
        self.client.force_authenticate(self.admin)
        assigned = self.client.post(
            "/api/v1/my-learning/assign-course/",
            {"user_id": self.employee.pk, "course_id": course.pk},
            format="json",
        )
        enrollment_id = assigned.data["id"]

        self.client.force_authenticate(self.employee)
        public_course = self.client.get(f"/api/v1/courses/{course.pk}/")
        self.assertNotIn(
            "correct",
            public_course.data["lessons"][0]["quiz_data"]["questions"][0]["options"][0],
        )
        failed = self.client.post(
            f"/api/v1/my-learning/{enrollment_id}/lessons/{lesson.pk}/submit-quiz/",
            {"answers": [0]},
            format="json",
        )
        self.assertEqual(failed.status_code, 200)
        self.assertFalse(failed.data["passed"])
        self.assertEqual(failed.data["attempts_left"], 1)
        self.assertFalse(failed.data["question_results"][0]["correct"])
        self.assertEqual(failed.data["question_results"][0]["feedback"], "Повторите материал урока.")
        passed = self.client.post(
            f"/api/v1/my-learning/{enrollment_id}/lessons/{lesson.pk}/submit-quiz/",
            {"answers": [1]},
            format="json",
        )
        self.assertTrue(passed.data["passed"])
        self.assertEqual(passed.data["score"], 100)
        self.assertTrue(passed.data["question_results"][0]["correct"])
        self.assertEqual(passed.data["question_results"][0]["feedback"], "Именно так.")
        self.assertEqual(passed.data["enrollment"]["status"], CourseEnrollment.Status.COMPLETED)
        self.assertEqual(passed.data["enrollment"]["lessons"][0]["attempts_count"], 2)
        self.assertNotIn(
            "correct",
            passed.data["enrollment"]["lessons"][0]["quiz_data"]["questions"][0]["options"][0],
        )

    def test_advanced_quiz_types_are_scored_and_answers_are_hidden(self):
        course = Course.objects.create(
            title="Расширенный тест", author=self.admin, status=Course.Status.PUBLISHED
        )
        lesson = Lesson.objects.create(
            course=course,
            title="Семь типов вопросов",
            lesson_type=Lesson.Type.QUIZ,
            quiz_data={
                "passing_score": 100,
                "max_attempts": 2,
                "questions": [
                    {
                        "type": "single_choice",
                        "prompt": "Один ответ",
                        "feedback_correct": "Да, это верный вариант.",
                        "feedback_incorrect": "Посмотрите вводную главу.",
                        "options": [
                            {"text": "Нет", "correct": False},
                            {"text": "Да", "correct": True},
                        ],
                    },
                    {
                        "type": "multiple_choice",
                        "prompt": "Несколько ответов",
                        "options": [
                            {"text": "A", "correct": True},
                            {"text": "B", "correct": False},
                            {"text": "C", "correct": True},
                        ],
                    },
                    {"type": "true_false", "prompt": "Smartis — LMS", "correct_boolean": True},
                    {
                        "type": "matching",
                        "prompt": "Сопоставьте",
                        "pairs": [
                            {"left": "LMS", "right": "Обучение"},
                            {"left": "HCM", "right": "Персонал"},
                        ],
                    },
                    {
                        "type": "ordering",
                        "prompt": "Расставьте этапы",
                        "options": [{"text": "Начало"}, {"text": "Середина"}, {"text": "Финиш"}],
                    },
                    {
                        "type": "short_text",
                        "prompt": "Введите бренд",
                        "accepted_answers": ["Smartis", "Смартис"],
                    },
                    {
                        "type": "fill_blank",
                        "prompt": "HCM / LMS ___",
                        "accepted_answers": ["Smartis"],
                        "image_url": "https://example.test/question.png",
                    },
                ],
            },
        )
        self.client.force_authenticate(self.admin)
        assigned = self.client.post(
            "/api/v1/my-learning/assign-course/",
            {"user_id": self.employee.pk, "course_id": course.pk},
            format="json",
        )
        enrollment_id = assigned.data["id"]

        self.client.force_authenticate(self.employee)
        enrollment = self.client.get("/api/v1/my-learning/").data["standalone"][0]
        questions = enrollment["lessons"][0]["quiz_data"]["questions"]
        self.assertEqual(questions[1]["type"], "multiple_choice")
        self.assertNotIn("correct", questions[1]["options"][0])
        self.assertNotIn("correct_boolean", questions[2])
        self.assertEqual(questions[3]["left_items"], ["LMS", "HCM"])
        self.assertNotIn("pairs", questions[3])
        self.assertNotIn("accepted_answers", questions[5])
        self.assertEqual(questions[6]["image_url"], "https://example.test/question.png")

        response = self.client.post(
            f"/api/v1/my-learning/{enrollment_id}/lessons/{lesson.pk}/submit-quiz/",
            {
                "answers": [
                    1,
                    [0, 2],
                    True,
                    ["Обучение", "Персонал"],
                    ["Начало", "Середина", "Финиш"],
                    " смартис ",
                    "SMARTIS",
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["passed"])
        self.assertEqual(response.data["score"], 100)

        self.client.force_authenticate(self.admin)
        exported = self.client.get(f"/api/v1/courses/{course.pk}/export-scorm/")
        self.assertEqual(exported.status_code, 200)
        with zipfile.ZipFile(io.BytesIO(b"".join(exported.streaming_content))) as archive:
            player = archive.read("index.html").decode("utf-8")
        self.assertIn('data-type="multiple_choice"', player)
        self.assertIn('data-type="matching"', player)
        self.assertIn('data-type="fill_blank"', player)
        self.assertIn("Да, это верный вариант.", player)
        self.assertIn("quiz-question-feedback", player)

    def test_advanced_quiz_validation_rejects_invalid_question(self):
        self.client.force_authenticate(self.admin)
        payload = self.course_payload("Некорректный тест")
        payload["lessons"][0]["lesson_type"] = Lesson.Type.QUIZ
        payload["lessons"][0]["quiz_data"] = {
            "passing_score": 80,
            "max_attempts": 3,
            "questions": [{
                "type": "fill_blank",
                "prompt": "Здесь нет пропуска",
                "accepted_answers": ["ответ"],
            }],
        }
        response = self.client.post("/api/v1/courses/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("тремя подчёркиваниями", str(response.data))

    def test_employee_cannot_assign_learning(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(
            self.client.post(
                "/api/v1/my-learning/assign-course/",
                {"user_id": self.employee.pk, "course_id": 999},
                format="json",
            ).status_code,
            403,
        )
