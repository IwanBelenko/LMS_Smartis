from datetime import date, timedelta
from io import BytesIO
from pathlib import Path
import tempfile
from zipfile import ZIP_DEFLATED, ZipFile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.identity.models import Department, Invitation, User
from apps.learning.models import Course, LearningPath, LearningPathCourse, Lesson
from .models import (
    AbsenceRequest,
    AuditEvent,
    Candidate,
    CandidateAssignment,
    CandidateComment,
    CandidateExperience,
    CandidateOffer,
    CandidateResume,
    CandidateStage,
    CandidateStageEvent,
    Competency,
    DailyTranscript,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Interview,
    HrImportBatch,
    InboxItemState,
    LearningImportBatch,
    Position,
    StaffPosition,
    Vacancy,
    OnboardingPlan,
    OnboardingTemplate,
    PerformanceCycle,
    PerformanceReview,
    ProductUpdate,
)


class PeopleApiTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(name="Аналитика", code="analytics")
        self.other_department = Department.objects.create(name="Продукт", code="product")
        self.position = Position.objects.create(name="Аналитик")
        self.admin = User.objects.create_superuser(email="admin@test.local", password="Password123!")
        self.hr = User.objects.create_user(
            email="hr@test.local",
            password="Password123!",
            role=User.Role.HR,
            status=User.Status.ACTIVE,
        )
        self.author = User.objects.create_user(
            email="author@test.local",
            password="Password123!",
            role=User.Role.AUTHOR,
            status=User.Status.ACTIVE,
        )
        self.leader = User.objects.create_user(
            email="leader@test.local",
            password="Password123!",
            role=User.Role.LEADER,
            status=User.Status.ACTIVE,
            department=self.department,
        )
        self.employee = User.objects.create_user(
            email="employee@test.local",
            password="Password123!",
            first_name="Анна",
            role=User.Role.EMPLOYEE,
            status=User.Status.ACTIVE,
            department=self.department,
        )
        self.other_employee = User.objects.create_user(
            email="other@test.local",
            password="Password123!",
            first_name="Олег",
            role=User.Role.EMPLOYEE,
            status=User.Status.ACTIVE,
            department=self.other_department,
        )
        self.profile = EmployeeProfile.objects.create(
            user=self.employee,
            employee_number="SM-101",
            position=self.position,
            hire_date=date(2024, 1, 1),
            salary_base=150000,
        )
        EmployeeProfile.objects.create(user=self.other_employee, employee_number="SM-102")
        self.stage = CandidateStage.objects.create(name="Новые", position=1)
        Candidate.objects.create(full_name="Мария Тестова", desired_position="Аналитик", stage=self.stage)
        self.client = APIClient()

    def test_admin_sees_employee_compensation(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("salary_base", response.json()[0])

    def test_leader_sees_only_own_department_without_compensation(self):
        self.client.force_authenticate(self.leader)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["email"], self.employee.email)
        self.assertNotIn("salary_base", response.json()[0])
        self.assertEqual(
            self.client.get(f"/api/v1/employees/{self.other_employee.employee_profile.pk}/").status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/employees/",
                {
                    "email": "new@test.local",
                    "first_name": "Новый",
                    "last_name": "Сотрудник",
                    "employee_number": "SM-103",
                },
                format="json",
            ).status_code,
            403,
        )

    def test_leader_with_permission_sees_own_department_compensation(self):
        self.leader.can_view_compensation = True
        self.leader.save(update_fields=["can_view_compensation"])
        self.client.force_authenticate(self.leader)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertIn("salary_base", response.json()[0])

    def test_employee_cannot_open_hcm_registry(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)

    def test_course_author_cannot_open_hcm_sections(self):
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/candidates/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/hcm/summary/").status_code, 403)

    def test_hr_has_hcm_access_but_compensation_requires_permission(self):
        self.client.force_authenticate(self.hr)
        employees = self.client.get("/api/v1/employees/")
        candidates = self.client.get("/api/v1/candidates/")
        analytics = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(employees.status_code, 200)
        self.assertEqual(candidates.status_code, 200)
        self.assertEqual(analytics.status_code, 200)
        self.assertNotIn("salary_base", employees.json()[0])
        forbidden_update = self.client.patch(
            f"/api/v1/employees/{self.profile.pk}/",
            {"salary_base": "175000.00"},
            format="json",
        )
        self.assertEqual(forbidden_update.status_code, 400)

        self.hr.can_view_compensation = True
        self.hr.save(update_fields=["can_view_compensation"])
        allowed = self.client.get("/api/v1/employees/")
        self.assertIn("salary_base", allowed.json()[0])

    def test_employee_export_is_role_scoped_and_compensation_aware(self):
        self.employee.last_name = "=HYPERLINK(\"https://example.invalid\")"
        self.employee.save(update_fields=["last_name"])

        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/employees/export/").status_code, 403)

        self.client.force_authenticate(self.hr)
        hr_export = self.client.get("/api/v1/employees/export/")
        self.assertEqual(hr_export.status_code, 200)
        hr_text = hr_export.content.decode("utf-8-sig")
        self.assertNotIn("Оклад", hr_text.splitlines()[0])
        self.assertIn("'=HYPERLINK", hr_text)

        self.client.force_authenticate(self.admin)
        admin_export = self.client.get("/api/v1/employees/export/")
        self.assertEqual(admin_export.status_code, 200)
        self.assertIn("Оклад", admin_export.content.decode("utf-8-sig").splitlines()[0])
        self.assertTrue(AuditEvent.objects.filter(action="exported", entity_id="export").exists())

    def test_admin_sees_recruitment_board_and_summary(self):
        self.client.force_authenticate(self.admin)
        stages = self.client.get("/api/v1/candidate-stages/")
        summary = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(stages.status_code, 200)
        self.assertEqual(stages.json()[0]["candidates_count"], 1)
        self.assertEqual(summary.json()["employees_total"], 2)

    def test_hr_creates_position_and_leader_can_only_read_catalog(self):
        self.client.force_authenticate(self.hr)
        created = self.client.post("/api/v1/positions/", {"name": "Продуктовый аналитик"}, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["name"], "Продуктовый аналитик")
        duplicate = self.client.post("/api/v1/positions/", {"name": " продуктовый аналитик "}, format="json")
        self.assertEqual(duplicate.status_code, 400)
        self.assertTrue(AuditEvent.objects.filter(entity_type="position", action="created").exists())

        self.client.force_authenticate(self.leader)
        self.assertEqual(self.client.get("/api/v1/positions/").status_code, 200)
        self.assertEqual(
            self.client.post("/api/v1/positions/", {"name": "Руководитель практики"}, format="json").status_code,
            403,
        )

    def test_only_admin_configures_candidate_stages(self):
        self.client.force_authenticate(self.hr)
        self.assertEqual(
            self.client.post(
                "/api/v1/candidate-stages/",
                {"name": "Тестовое задание", "position": 3, "is_terminal": False},
                format="json",
            ).status_code,
            403,
        )

        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/v1/candidate-stages/",
            {"name": "Тестовое задание", "position": 3, "is_terminal": False},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        stage_id = created.json()["id"]
        updated = self.client.patch(
            f"/api/v1/candidate-stages/{stage_id}/",
            {"name": "Тестовое", "is_terminal": True},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertTrue(updated.json()["is_terminal"])
        self.assertEqual(self.client.delete(f"/api/v1/candidate-stages/{self.stage.pk}/").status_code, 409)
        self.assertEqual(self.client.delete(f"/api/v1/candidate-stages/{stage_id}/").status_code, 204)
        self.assertTrue(AuditEvent.objects.filter(entity_type="candidate_stage", action="created").exists())

    def test_hr_dashboard_highlights_overdue_onboarding_and_probation(self):
        self.profile.status = EmployeeProfile.Status.PROBATION
        self.profile.save(update_fields=["status"])
        OnboardingPlan.objects.create(
            employee=self.profile,
            checklist=[{"id": "1", "title": "Получить доступы", "done": False}],
            start_date=date.today() - timedelta(days=31),
            due_date=date.today() - timedelta(days=1),
        )
        Vacancy.objects.create(
            title="Аналитик",
            department=self.department,
            position=self.position,
            recruiter=self.hr,
        )
        self.client.force_authenticate(self.hr)
        response = self.client.get("/api/v1/hcm/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["metrics"]["overdue_onboarding"], 1)
        self.assertEqual(response.json()["metrics"]["probation"], 1)
        self.assertEqual(response.json()["metrics"]["open_vacancies"], 1)
        self.assertEqual(response.json()["onboarding"][0]["severity"], "danger")

    def test_only_admin_reads_filtered_audit_log_and_secrets_are_hidden(self):
        AuditEvent.objects.create(
            actor=self.admin,
            entity_type="user",
            entity_id=str(self.employee.pk),
            action="updated",
            changes={"email": self.employee.email, "password": "must-not-leak"},
        )
        self.client.force_authenticate(self.hr)
        self.assertEqual(self.client.get("/api/v1/audit-events/").status_code, 403)

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/v1/audit-events/?entity_type=user&action=updated")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["results"][0]["entity_label"], "Пользователи")
        self.assertEqual(payload["results"][0]["changes"]["password"], "[скрыто]")
        self.assertTrue(payload["filters"]["entity_types"])

    def test_admin_creates_and_updates_employee_card(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/v1/employees/",
            {
                "email": "new.employee@test.local",
                "first_name": "Новый",
                "last_name": "Сотрудник",
                "employee_number": "SM-200",
                "department": self.department.pk,
                "position": self.position.pk,
                "grade": "Junior",
                "status": EmployeeProfile.Status.PROBATION,
                "checklist_score": 20,
                "development_progress": 15,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["full_name"], "Новый Сотрудник")
        profile_id = created.json()["id"]
        updated = self.client.patch(
            f"/api/v1/employees/{profile_id}/",
            {"grade": "Middle", "development_progress": 55},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["grade"], "Middle")
        self.assertEqual(updated.json()["development_progress"], 55)
        self.assertFalse(User.objects.get(email="new.employee@test.local").has_usable_password())

    def test_admin_creates_employee_with_one_time_generated_password(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/v1/employees/",
            {
                "email": "manual.employee@test.local",
                "first_name": "Анна",
                "last_name": "Ручная",
                "employee_number": "SM-201",
                "department": self.department.pk,
                "position": self.position.pk,
                "status": EmployeeProfile.Status.EMPLOYED,
                "generate_password": True,
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201)
        password = created.json()["temporary_password"]
        user = User.objects.get(email="manual.employee@test.local")
        self.assertTrue(user.check_password(password))
        self.assertEqual(user.status, User.Status.ACTIVE)
        self.assertFalse(Invitation.objects.filter(user=user).exists())

    def test_dismissal_blocks_access_and_preserves_employee_history(self):
        token = Token.objects.create(user=self.employee)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/employees/{self.profile.pk}/",
            {"status": EmployeeProfile.Status.DISMISSED, "dismissal_date": "2026-07-29"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.employee.refresh_from_db()
        self.assertEqual(self.profile.dismissal_date.isoformat(), "2026-07-29")
        self.assertEqual(self.employee.status, User.Status.BLOCKED)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())
        event = EmploymentEvent.objects.get(
            employee=self.profile,
            event_type=EmploymentEvent.Type.DISMISSED,
        )
        self.assertEqual(event.effective_date.isoformat(), "2026-07-29")

        restore = self.client.post(f"/api/v1/users/{self.employee.pk}/restore/")
        self.assertEqual(restore.status_code, 400)
        self.assertTrue(EmployeeProfile.objects.filter(pk=self.profile.pk).exists())

    def test_hr_previews_and_commits_csv_employee_import(self):
        self.client.force_authenticate(self.hr)
        content = (
            "ФИО;Корпоративная почта;Табельный номер;Отдел;Должность;Грейд;Дата выхода;Статус\n"
            "Иванова Анна;employee@test.local;SM-101;Аналитика;Аналитик;Middle;01.02.2024;Работает\n"
            "Петров Иван;ivan.petrov@smartis.bi;SM-300;Продукт;Аналитик;Junior;15.07.2026;Испытательный срок\n"
        )
        preview = self.client.post(
            "/api/v1/employees/import/",
            {"file": SimpleUploadedFile("employees.csv", content.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(preview.status_code, 200)
        payload = preview.json()
        self.assertEqual(payload["review"]["create_count"], 1)
        self.assertEqual(payload["review"]["update_count"], 1)
        self.assertEqual(payload["review"]["error_count"], 0)
        committed = self.client.post(
            "/api/v1/employees/import/",
            {"batch_id": payload["batch_id"], "rows": payload["rows"], "mapping": payload["mapping"], "commit": True},
            format="json",
        )
        self.assertEqual(committed.status_code, 201)
        self.assertEqual(committed.json()["created"], 1)
        self.assertEqual(committed.json()["updated"], 1)
        imported = EmployeeProfile.objects.get(employee_number="SM-300")
        self.assertEqual(imported.user.last_name, "Петров")
        self.assertEqual(imported.user.department, self.other_department)
        self.assertEqual(imported.status, EmployeeProfile.Status.PROBATION)
        self.assertFalse(imported.user.has_usable_password())
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.grade, "Middle")
        self.assertTrue(EmploymentEvent.objects.filter(employee=imported, event_type=EmploymentEvent.Type.HIRED).exists())

    def test_employee_import_reports_unknown_directory_values_without_changes(self):
        self.client.force_authenticate(self.hr)
        content = (
            "ФИО,Email,Табельный номер,Отдел,Должность\n"
            "Тестов Тест,test.import@smartis.bi,SM-301,Неизвестный отдел,Неизвестная должность\n"
        )
        preview = self.client.post(
            "/api/v1/employees/import/",
            {"file": SimpleUploadedFile("employees.csv", content.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.json()["review"]["error_count"], 1)
        committed = self.client.post(
            "/api/v1/employees/import/",
            {
                "rows": preview.json()["rows"],
                "mapping": preview.json()["mapping"],
                "batch_id": preview.json()["batch_id"],
                "commit": True,
            },
            format="json",
        )
        self.assertEqual(committed.status_code, 400)
        self.assertFalse(EmployeeProfile.objects.filter(employee_number="SM-301").exists())

    def test_hr_can_preview_xlsx_employee_import(self):
        worksheet = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <sheetData>
            <row r="1">
              <c r="A1" t="inlineStr"><is><t>ФИО</t></is></c>
              <c r="B1" t="inlineStr"><is><t>Email</t></is></c>
              <c r="C1" t="inlineStr"><is><t>Табельный номер</t></is></c>
            </row>
            <row r="2">
              <c r="A2" t="inlineStr"><is><t>Сидорова Елена</t></is></c>
              <c r="B2" t="inlineStr"><is><t>elena.sidorova@smartis.bi</t></is></c>
              <c r="C2" t="inlineStr"><is><t>SM-302</t></is></c>
            </row>
          </sheetData>
        </worksheet>"""
        output = BytesIO()
        with ZipFile(output, "w", ZIP_DEFLATED) as archive:
            archive.writestr("xl/worksheets/sheet1.xml", worksheet)
        self.client.force_authenticate(self.hr)
        response = self.client.post(
            "/api/v1/employees/import/",
            {
                "file": SimpleUploadedFile(
                    "employees.xlsx",
                    output.getvalue(),
                    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["review"]["create_count"], 1)
        self.assertEqual(response.json()["review"]["error_count"], 0)

    def test_employee_import_detects_duplicates_inside_file(self):
        self.client.force_authenticate(self.hr)
        content = (
            "ФИО;Email;Табельный номер\n"
            "Первая Запись;duplicate@smartis.bi;SM-400\n"
            "Вторая Запись;duplicate@smartis.bi;SM-401\n"
        )
        response = self.client.post(
            "/api/v1/employees/import/",
            {"file": SimpleUploadedFile("duplicates.csv", content.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["review"]["create_count"], 1)
        self.assertEqual(response.json()["review"]["error_count"], 1)
        self.assertIn("Дубликат строки", response.json()["review"]["rows"][1]["errors"]["duplicate"][0])

    def test_one_c_import_uses_cutoff_date_and_rejects_same_file_twice(self):
        self.client.force_authenticate(self.hr)
        content = (
            "ФИО;Email;Табельный номер;Отдел;Должность\n"
            "Соколова Анна;employee@test.local;SM-101;Продукт;Аналитик\n"
        )
        upload = SimpleUploadedFile("one-c-june.csv", content.encode("utf-8"), content_type="text/csv")
        preview = self.client.post(
            "/api/v1/employees/import/",
            {"file": upload, "source": "one_c", "effective_date": "2026-06-30"},
            format="multipart",
        )
        self.assertEqual(preview.status_code, 200)
        payload = preview.json()
        committed = self.client.post(
            "/api/v1/employees/import/",
            {
                "batch_id": payload["batch_id"],
                "rows": payload["rows"],
                "mapping": payload["mapping"],
                "commit": True,
            },
            format="json",
        )
        self.assertEqual(committed.status_code, 201)
        event = EmploymentEvent.objects.get(employee=self.profile, event_type=EmploymentEvent.Type.TRANSFER)
        self.assertEqual(event.effective_date, date(2026, 6, 30))
        self.assertIn("1С", event.note)
        batch = HrImportBatch.objects.get(pk=payload["batch_id"])
        self.assertEqual(batch.status, HrImportBatch.Status.COMPLETED)
        duplicate = self.client.post(
            "/api/v1/employees/import/",
            {
                "file": SimpleUploadedFile("one-c-june.csv", content.encode("utf-8"), content_type="text/csv"),
                "source": "one_c",
                "effective_date": "2026-06-30",
            },
            format="multipart",
        )
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("уже была импортирована", duplicate.json()["detail"])

    def test_hr_previews_and_commits_ispring_learning_report(self):
        course = Course.objects.create(title="Основы аналитики", author=self.admin)
        self.client.force_authenticate(self.hr)
        content = (
            "Email;Курс;Статус;Прогресс;Результат;Дата завершения\n"
            "employee@test.local;Основы аналитики;Завершён;100%;92;28.07.2026\n"
        )
        preview = self.client.post(
            "/api/v1/learning-imports/ispring/",
            {"file": SimpleUploadedFile("ispring.csv", content.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(preview.status_code, 200)
        payload = preview.json()
        self.assertEqual(payload["review"]["create_count"], 1)
        self.assertEqual(payload["review"]["error_count"], 0)

        committed = self.client.post(
            "/api/v1/learning-imports/ispring/",
            {
                "batch_id": payload["batch_id"],
                "rows": payload["rows"],
                "mapping": payload["mapping"],
                "commit": True,
            },
            format="json",
        )
        self.assertEqual(committed.status_code, 201)
        assignment = EmployeeLearning.objects.get(employee=self.profile, course=course)
        self.assertEqual(assignment.status, EmployeeLearning.Status.COMPLETED)
        self.assertEqual(assignment.progress, 100)
        self.assertEqual(assignment.score, 92)
        self.assertIsNotNone(assignment.completed_at)
        self.assertEqual(
            LearningImportBatch.objects.get(pk=payload["batch_id"]).status,
            LearningImportBatch.Status.COMPLETED,
        )

        duplicate = self.client.post(
            "/api/v1/learning-imports/ispring/",
            {"file": SimpleUploadedFile("ispring.csv", content.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("уже был импортирован", duplicate.json()["detail"])

    def test_ispring_report_marks_unknown_employee_and_course(self):
        self.client.force_authenticate(self.hr)
        content = (
            "Email;Курс;Статус\n"
            "unknown@test.local;Несуществующий курс;В процессе\n"
        )
        response = self.client.post(
            "/api/v1/learning-imports/ispring/",
            {"file": SimpleUploadedFile("unknown.csv", content.encode("utf-8"), content_type="text/csv")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        row = response.json()["review"]["rows"][0]
        self.assertEqual(row["action"], "error")
        self.assertIn("не найден", row["errors"]["employee_email"][0])
        self.assertIn("не найден", row["errors"]["course_title"][0])

    def test_admin_moves_candidate_to_another_stage(self):
        next_stage = CandidateStage.objects.create(name="Интервью", position=2)
        candidate = Candidate.objects.get()
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/candidates/{candidate.pk}/",
            {"stage": next_stage.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["stage_name"], "Интервью")
        event = CandidateStageEvent.objects.get(candidate=candidate)
        self.assertEqual(event.from_stage, self.stage)
        self.assertEqual(event.to_stage, next_stage)
        self.assertEqual(event.changed_by, self.admin)

    def test_hr_manages_candidate_experience_assignment_and_leader_comments(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        self.client.force_authenticate(self.hr)
        experience = self.client.post(
            f"/api/v1/candidates/{candidate.pk}/experiences/",
            {
                "company": "Smartis",
                "position": "Стажёр-аналитик",
                "started_on": "2023-01-10",
                "ended_on": "2024-02-20",
                "description": "Исследования и отчётность",
            },
            format="json",
        )
        self.assertEqual(experience.status_code, 201)
        self.assertEqual(CandidateExperience.objects.get().company, "Smartis")

        assignment = self.client.put(
            f"/api/v1/candidates/{candidate.pk}/assignment/",
            {"leader": self.leader.pk},
            format="json",
        )
        self.assertEqual(assignment.status_code, 200)
        self.assertEqual(CandidateAssignment.objects.get().leader, self.leader)

        self.client.force_authenticate(self.leader)
        listing = self.client.get("/api/v1/candidates/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([item["id"] for item in listing.json()], [candidate.pk])
        self.assertEqual(listing.json()[0]["assigned_leader"], self.leader.pk)
        self.assertEqual(
            self.client.get(f"/api/v1/candidates/{candidate.pk}/experiences/").status_code,
            200,
        )
        comment = self.client.post(
            f"/api/v1/candidates/{candidate.pk}/comments/",
            {"text": "Готов провести финальное интервью"},
            format="json",
        )
        self.assertEqual(comment.status_code, 201)
        self.assertEqual(CandidateComment.objects.get().author, self.leader)
        self.assertEqual(
            self.client.patch(f"/api/v1/candidates/{candidate.pk}/", {"source": "manual"}, format="json").status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/candidates/{candidate.pk}/experiences/",
                {"company": "Other", "position": "Lead"},
                format="json",
            ).status_code,
            403,
        )

    def test_leader_cannot_see_unassigned_candidates_and_hr_filters_candidates(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        candidate.source = "Рекомендация"
        candidate.desired_salary = 180000
        candidate.department = self.department
        candidate.save(update_fields=["source", "desired_salary", "department", "updated_at"])

        self.client.force_authenticate(self.leader)
        self.assertEqual(self.client.get("/api/v1/candidates/").json(), [])
        self.assertEqual(self.client.get(f"/api/v1/candidates/{candidate.pk}/").status_code, 404)

        self.client.force_authenticate(self.hr)
        response = self.client.get(
            f"/api/v1/candidates/?q=Мария&department={self.department.pk}&source=Рекоменд&salary_min=170000&salary_max=190000"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [candidate.pk])
        self.assertEqual(self.client.get("/api/v1/candidates/?salary_min=200000").json(), [])

    def test_hr_uploads_versions_downloads_and_deletes_candidate_resumes(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            self.client.force_authenticate(self.hr)
            docx_content = BytesIO()
            with ZipFile(docx_content, "w", ZIP_DEFLATED) as archive:
                archive.writestr("[Content_Types].xml", "<Types />")
                archive.writestr("word/document.xml", "<document />")
            first = self.client.post(
                f"/api/v1/candidates/{candidate.pk}/resumes/",
                {"file": SimpleUploadedFile("resume.pdf", b"%PDF-1.4 resume", content_type="application/pdf")},
                format="multipart",
            )
            second = self.client.post(
                f"/api/v1/candidates/{candidate.pk}/resumes/",
                {"file": SimpleUploadedFile("resume-new.txt", "Опыт работы".encode(), content_type="text/plain")},
                format="multipart",
            )
            third = self.client.post(
                f"/api/v1/candidates/{candidate.pk}/resumes/",
                {
                    "file": SimpleUploadedFile(
                        "resume-latest.docx",
                        docx_content.getvalue(),
                        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    ),
                },
                format="multipart",
            )
            self.assertEqual(first.status_code, 201)
            self.assertEqual(second.status_code, 201)
            self.assertEqual(third.status_code, 201)
            self.assertEqual(CandidateResume.objects.filter(candidate=candidate).count(), 3)

            listing = self.client.get(f"/api/v1/candidates/{candidate.pk}/resumes/")
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(
                [item["file_original_name"] for item in listing.json()],
                ["resume-latest.docx", "resume-new.txt", "resume.pdf"],
            )
            self.assertTrue(listing.json()[0]["file_url"].endswith(f"/candidate-resumes/{third.json()['id']}/download/"))
            candidate_payload = self.client.get(f"/api/v1/candidates/{candidate.pk}/").json()
            self.assertEqual(candidate_payload["resume_count"], 3)

            downloaded = self.client.get(f"/api/v1/candidate-resumes/{first.json()['id']}/download/")
            self.assertEqual(downloaded.status_code, 200)
            self.assertEqual(b"".join(downloaded.streaming_content), b"%PDF-1.4 resume")
            self.assertEqual(downloaded["Cache-Control"], "no-store, private")

            stored = CandidateResume.objects.get(pk=second.json()["id"])
            stored_path = stored.file.path
            deleted = self.client.delete(f"/api/v1/candidate-resumes/{stored.pk}/")
            self.assertEqual(deleted.status_code, 204)
            self.assertFalse(CandidateResume.objects.filter(pk=stored.pk).exists())
            self.assertFalse(Path(stored_path).exists())
            self.assertTrue(AuditEvent.objects.filter(entity_type="candidate_resume", action="uploaded").exists())
            self.assertTrue(AuditEvent.objects.filter(entity_type="candidate_resume", action="downloaded").exists())
            self.assertTrue(AuditEvent.objects.filter(entity_type="candidate_resume", action="deleted").exists())

    def test_candidate_resume_rejects_spoofed_files_and_non_recruiters(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            self.client.force_authenticate(self.hr)
            invalid = self.client.post(
                f"/api/v1/candidates/{candidate.pk}/resumes/",
                {"file": SimpleUploadedFile("resume.pdf", b"not a pdf", content_type="application/pdf")},
                format="multipart",
            )
            self.assertEqual(invalid.status_code, 400)
            self.assertIn("корректным PDF", str(invalid.json()))

            created = self.client.post(
                f"/api/v1/candidates/{candidate.pk}/resumes/",
                {"file": SimpleUploadedFile("resume.txt", b"Experience", content_type="text/plain")},
                format="multipart",
            )
            self.assertEqual(created.status_code, 201)
            self.client.force_authenticate(self.employee)
            self.assertEqual(self.client.get(f"/api/v1/candidates/{candidate.pk}/resumes/").status_code, 403)
            self.assertEqual(
                self.client.get(f"/api/v1/candidate-resumes/{created.json()['id']}/download/").status_code,
                403,
            )
            self.assertEqual(self.client.delete(f"/api/v1/candidate-resumes/{created.json()['id']}/").status_code, 403)

    def test_assigned_leader_reads_candidate_resume_but_cannot_change_it(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        CandidateAssignment.objects.create(candidate=candidate, leader=self.leader, assigned_by=self.hr)
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            self.client.force_authenticate(self.hr)
            created = self.client.post(
                f"/api/v1/candidates/{candidate.pk}/resumes/",
                {"file": SimpleUploadedFile("resume.txt", b"Experience", content_type="text/plain")},
                format="multipart",
            )
            self.assertEqual(created.status_code, 201)

            self.client.force_authenticate(self.leader)
            listing = self.client.get(f"/api/v1/candidates/{candidate.pk}/resumes/")
            downloaded = self.client.get(f"/api/v1/candidate-resumes/{created.json()['id']}/download/")
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(downloaded.status_code, 200)
            self.assertEqual(b"".join(downloaded.streaming_content), b"Experience")
            self.assertEqual(
                self.client.post(
                    f"/api/v1/candidates/{candidate.pk}/resumes/",
                    {"file": SimpleUploadedFile("second.txt", b"Other", content_type="text/plain")},
                    format="multipart",
                ).status_code,
                403,
            )
            self.assertEqual(self.client.delete(f"/api/v1/candidate-resumes/{created.json()['id']}/").status_code, 403)

    def test_admin_manages_employee_development_profile(self):
        course = Course.objects.create(title="Основы аналитики", author=self.admin)
        self.client.force_authenticate(self.admin)
        goal = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/goals/",
            {"title": "Освоить SQL", "progress": 30, "status": EmployeeGoal.Status.IN_PROGRESS},
            format="json",
        )
        history = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/history/",
            {
                "event_type": EmploymentEvent.Type.REVIEW,
                "title": "Квартальная оценка",
                "effective_date": "2026-07-01",
            },
            format="json",
        )
        learning = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/learning/",
            {"course": course.pk, "status": EmployeeLearning.Status.ASSIGNED, "progress": 0},
            format="json",
        )
        document = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/documents/",
            {"title": "Согласие", "document_type": "Кадровый документ"},
            format="json",
        )
        self.assertEqual(goal.status_code, 201)
        self.assertEqual(history.status_code, 201)
        self.assertEqual(learning.status_code, 201)
        self.assertEqual(document.status_code, 201)
        self.assertTrue(EmployeeDocument.objects.filter(employee=self.profile).exists())

    def test_leader_reads_own_department_profile_but_cannot_change_it(self):
        EmployeeGoal.objects.create(employee=self.profile, title="Цель отдела")
        self.client.force_authenticate(self.leader)
        response = self.client.get(f"/api/v1/employees/{self.profile.pk}/goals/")
        forbidden = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/goals/",
            {"title": "Новая цель", "progress": 0},
            format="json",
        )
        other_department = self.client.get(
            f"/api/v1/employees/{self.other_employee.employee_profile.pk}/goals/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(other_department.status_code, 404)

    def test_hr_manages_organization_and_staffing(self):
        self.client.force_authenticate(self.hr)
        created = self.client.post(
            "/api/v1/org/departments/",
            {"name": "Продажи", "parent": self.department.pk, "manager": self.employee.pk},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        staff = self.client.post(
            "/api/v1/org/staff-positions/",
            {"department": self.department.pk, "position": self.position.pk, "headcount": 3},
            format="json",
        )
        self.assertEqual(staff.status_code, 201)
        self.assertEqual(staff.json()["filled_count"], 1)
        self.assertEqual(staff.json()["vacancies"], 2)
        self.assertTrue(StaffPosition.objects.filter(department=self.department).exists())

    def test_hr_can_select_active_user_without_employee_profile_as_department_manager(self):
        manager = User.objects.create_user(
            email="manager.option@smartis.local",
            password="StrongPassword123!",
            first_name="Альбина",
            last_name="Исаева",
            status=User.Status.ACTIVE,
            role=User.Role.ADMIN,
            department=self.department,
        )
        self.client.force_authenticate(self.hr)

        options = self.client.get("/api/v1/org/manager-options/")
        updated = self.client.patch(
            f"/api/v1/org/departments/{self.department.pk}/",
            {"manager": manager.pk},
            format="json",
        )

        self.assertEqual(options.status_code, 200)
        self.assertIn(manager.pk, [item["id"] for item in options.json()])
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["manager"], manager.pk)

    def test_staff_position_accepts_long_comment_and_shows_it_in_employee_card(self):
        note = "Отвечает за HR-систему, подбор, онбординг и развитие. " * 8
        staff = StaffPosition.objects.create(
            department=self.department,
            position=self.position,
            headcount=1,
            note=note,
        )
        self.client.force_authenticate(self.hr)

        response = self.client.get(f"/api/v1/employees/{self.profile.pk}/")

        self.assertGreater(len(staff.note), 240)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["staff_position_note"], note)

    def test_hr_deletes_empty_department_with_its_empty_staff_positions(self):
        empty_department = Department.objects.create(name="Временный отдел", code="temporary")
        staff = StaffPosition.objects.create(
            department=empty_department,
            position=self.position,
            headcount=1,
        )
        self.client.force_authenticate(self.hr)

        response = self.client.delete(f"/api/v1/org/departments/{empty_department.pk}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Department.objects.filter(pk=empty_department.pk).exists())
        self.assertFalse(StaffPosition.objects.filter(pk=staff.pk).exists())
        self.assertTrue(AuditEvent.objects.filter(
            actor=self.hr,
            entity_type="department",
            entity_id=str(empty_department.pk),
            action="deleted",
        ).exists())

    def test_department_with_members_cannot_be_deleted(self):
        self.client.force_authenticate(self.hr)

        response = self.client.delete(f"/api/v1/org/departments/{self.department.pk}/")

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Department.objects.filter(pk=self.department.pk).exists())

    def test_hr_deletes_only_unfilled_staff_position_without_open_vacancy(self):
        removable = StaffPosition.objects.create(
            department=self.other_department,
            position=self.position,
            headcount=1,
        )
        filled = StaffPosition.objects.create(
            department=self.department,
            position=self.position,
            headcount=2,
        )
        self.client.force_authenticate(self.hr)

        removed = self.client.delete(f"/api/v1/org/staff-positions/{removable.pk}/")
        blocked = self.client.delete(f"/api/v1/org/staff-positions/{filled.pk}/")

        self.assertEqual(removed.status_code, 204)
        self.assertEqual(blocked.status_code, 400)
        self.assertFalse(StaffPosition.objects.filter(pk=removable.pk).exists())
        self.assertTrue(StaffPosition.objects.filter(pk=filled.pk).exists())

    def test_position_can_be_created_and_added_to_department_staff_atomically(self):
        self.client.force_authenticate(self.hr)

        response = self.client.post(
            "/api/v1/positions/",
            {
                "name": "HR business partner",
                "department": self.department.pk,
                "headcount": 2,
                "note": "Отвечает за полный цикл работы с персоналом",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        staff = StaffPosition.objects.get(position_id=response.json()["id"], department=self.department)
        self.assertEqual(staff.headcount, 2)
        self.assertEqual(staff.note, "Отвечает за полный цикл работы с персоналом")

    def test_non_hcm_roles_cannot_open_organization(self):
        for user in (self.employee, self.author, self.leader):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get("/api/v1/org/departments/").status_code, 403)
            self.assertEqual(self.client.get("/api/v1/vacancies/").status_code, 403)

    def test_department_cannot_be_placed_inside_itself(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/v1/org/departments/{self.department.pk}/",
            {"parent": self.department.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_transfer_and_position_change_are_added_to_history(self):
        next_position = Position.objects.create(name="Старший аналитик")
        self.client.force_authenticate(self.hr)
        response = self.client.patch(
            f"/api/v1/employees/{self.profile.pk}/",
            {"department": self.other_department.pk, "position": next_position.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        events = EmploymentEvent.objects.filter(employee=self.profile)
        self.assertEqual(events.filter(event_type=EmploymentEvent.Type.TRANSFER).count(), 1)
        self.assertEqual(events.filter(event_type=EmploymentEvent.Type.PROMOTION).count(), 1)

    def test_hr_creates_vacancy_from_staff_position_and_assigns_candidate(self):
        staff = StaffPosition.objects.create(
            department=self.department,
            position=self.position,
            headcount=3,
        )
        self.client.force_authenticate(self.hr)
        vacancy = self.client.post(
            "/api/v1/vacancies/",
            {
                "title": "Аналитик данных",
                "staff_position": staff.pk,
                "department": self.department.pk,
                "position": self.position.pk,
                "openings": 2,
            },
            format="json",
        )
        self.assertEqual(vacancy.status_code, 201)
        self.assertEqual(vacancy.json()["status"], Vacancy.Status.OPEN)
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        assigned = self.client.patch(
            f"/api/v1/candidates/{candidate.pk}/",
            {"vacancy": vacancy.json()["id"]},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.json()["vacancy_title"], "Аналитик данных")

    def test_vacancy_must_match_staff_position(self):
        staff = StaffPosition.objects.create(
            department=self.department,
            position=self.position,
            headcount=2,
        )
        other_position = Position.objects.create(name="Разработчик")
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/v1/vacancies/",
            {
                "title": "Разработчик",
                "staff_position": staff.pk,
                "department": self.other_department.pk,
                "position": other_position.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_hr_hires_candidate_and_closes_filled_vacancy(self):
        staff = StaffPosition.objects.create(
            department=self.department,
            position=self.position,
            headcount=2,
        )
        vacancy = Vacancy.objects.create(
            title="Аналитик",
            staff_position=staff,
            department=self.department,
            position=self.position,
            openings=1,
            recruiter=self.hr,
        )
        course = Course.objects.create(title="Добро пожаловать", author=self.admin)
        path = LearningPath.objects.create(title="Адаптация аналитика", author=self.admin)
        LearningPathCourse.objects.create(learning_path=path, course=course, position=0)
        OnboardingTemplate.objects.create(
            name="Адаптация аналитика",
            department=self.department,
            position=self.position,
            learning_path=path,
            responsible=self.hr,
            checklist=["Получить доступы", "Познакомиться с командой"],
        )
        offer = CandidateStage.objects.create(name="Оффер", position=4, is_terminal=True)
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        candidate.vacancy = vacancy
        candidate.stage = offer
        candidate.save(update_fields=["vacancy", "stage"])
        self.client.force_authenticate(self.hr)
        response = self.client.post(
            f"/api/v1/candidates/{candidate.pk}/hire/",
            {
                "corporate_email": "maria@smartis.local",
                "first_name": "Мария",
                "last_name": "Тестова",
                "employee_number": "SM-300",
                "hire_date": "2026-08-01",
                "grade": "Middle",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        candidate.refresh_from_db()
        vacancy.refresh_from_db()
        self.assertIsNotNone(candidate.hired_employee_id)
        self.assertEqual(candidate.hired_employee.position, self.position)
        self.assertEqual(candidate.hired_employee.user.department, self.department)
        self.assertEqual(candidate.hired_employee.user.status, User.Status.INVITED)
        self.assertEqual(vacancy.status, Vacancy.Status.CLOSED)
        plan = OnboardingPlan.objects.get(employee=candidate.hired_employee)
        self.assertEqual(plan.learning_path, path)
        self.assertEqual(plan.responsible, self.hr)
        self.assertEqual(len(plan.checklist), 2)
        self.assertTrue(
            EmployeeLearning.objects.filter(employee=candidate.hired_employee, course=course).exists()
        )
        self.assertTrue(
            EmploymentEvent.objects.filter(
                employee=candidate.hired_employee,
                event_type=EmploymentEvent.Type.HIRED,
            ).exists()
        )

    def test_hr_completes_onboarding_checklist(self):
        self.client.force_authenticate(self.hr)
        created = self.client.post(f"/api/v1/employees/{self.profile.pk}/onboarding/", {}, format="json")
        self.assertEqual(created.status_code, 201)
        checklist = [{**item, "done": True} for item in created.json()["checklist"]]
        updated = self.client.patch(
            f"/api/v1/employees/{self.profile.pk}/onboarding/",
            {"checklist": checklist},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["progress"], 100)
        self.assertEqual(updated.json()["status"], OnboardingPlan.Status.COMPLETED)

    def test_candidate_cannot_be_hired_before_terminal_stage(self):
        staff = StaffPosition.objects.create(
            department=self.department,
            position=self.position,
            headcount=2,
        )
        vacancy = Vacancy.objects.create(
            title="Аналитик",
            staff_position=staff,
            department=self.department,
            position=self.position,
        )
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        candidate.vacancy = vacancy
        candidate.save(update_fields=["vacancy"])
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/v1/candidates/{candidate.pk}/hire/",
            {
                "corporate_email": "early@smartis.local",
                "first_name": "Мария",
                "last_name": "Тестова",
                "employee_number": "SM-301",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_hr_creates_submits_and_completes_candidate_offer(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        start_date = date.today() + timedelta(days=21)
        valid_until = date.today() + timedelta(days=7)
        self.client.force_authenticate(self.hr)
        created = self.client.post(
            "/api/v1/offers/",
            {
                "candidate": candidate.pk,
                "position_title": "Аналитик",
                "salary": "180000.00",
                "start_date": start_date.isoformat(),
                "valid_until": valid_until.isoformat(),
                "probation_months": 3,
                "work_format": CandidateOffer.WorkFormat.HYBRID,
                "conditions": "ДМС после испытательного срока",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        offer_id = created.json()["id"]
        submitted = self.client.post(f"/api/v1/offers/{offer_id}/submit/", {}, format="json")
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.json()["status"], CandidateOffer.Status.PENDING)
        approved = self.client.post(
            f"/api/v1/offers/{offer_id}/approve/",
            {"comment": "Условия согласованы"},
            format="json",
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.json()["status"], CandidateOffer.Status.APPROVED)
        accepted = self.client.post(
            f"/api/v1/offers/{offer_id}/outcome/",
            {"outcome": CandidateOffer.Status.ACCEPTED, "comment": "Кандидат подтвердил"},
            format="json",
        )
        self.assertEqual(accepted.status_code, 200)
        candidate.refresh_from_db()
        self.assertEqual(accepted.json()["status"], CandidateOffer.Status.ACCEPTED)
        self.assertEqual(candidate.next_action_at.date(), start_date)

    def test_employee_cannot_access_candidate_offers(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        CandidateOffer.objects.create(candidate=candidate, position_title="Аналитик", created_by=self.hr)
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/offers/").status_code, 403)

    def test_offer_file_is_only_downloaded_through_authorized_api(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            offer = CandidateOffer.objects.create(
                candidate=candidate,
                position_title="Аналитик",
                created_by=self.hr,
                file=SimpleUploadedFile("offer.pdf", b"%PDF-1.4 protected", content_type="application/pdf"),
                file_original_name="offer.pdf",
            )
            self.client.force_authenticate(self.hr)
            detail = self.client.get(f"/api/v1/offers/{offer.pk}/")
            self.assertEqual(detail.status_code, 200)
            self.assertTrue(detail.json()["file_url"].endswith(f"/api/v1/offers/{offer.pk}/download/"))
            downloaded = self.client.get(f"/api/v1/offers/{offer.pk}/download/")
            self.assertEqual(downloaded.status_code, 200)
            self.assertEqual(b"".join(downloaded.streaming_content), b"%PDF-1.4 protected")

            self.client.force_authenticate(self.employee)
            self.assertEqual(self.client.get(f"/api/v1/offers/{offer.pk}/download/").status_code, 403)

    def test_employee_creates_and_sees_only_own_absence_requests(self):
        other_profile = self.other_employee.employee_profile
        AbsenceRequest.objects.create(
            employee=other_profile,
            absence_type=AbsenceRequest.Type.VACATION,
            start_date=date.today() + timedelta(days=20),
            end_date=date.today() + timedelta(days=24),
        )
        self.client.force_authenticate(self.employee)
        created = self.client.post(
            "/api/v1/absences/",
            {
                "absence_type": AbsenceRequest.Type.REMOTE,
                "start_date": date.today() + timedelta(days=5),
                "end_date": date.today() + timedelta(days=6),
                "comment": "Работа из дома",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["employee"], self.profile.pk)
        self.assertTrue(created.json()["can_cancel"])
        listing = self.client.get("/api/v1/absences/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.json()), 1)
        self.assertEqual(listing.json()[0]["employee"], self.profile.pk)

    def test_leader_reviews_only_department_absences(self):
        own_department_request = AbsenceRequest.objects.create(
            employee=self.profile,
            absence_type=AbsenceRequest.Type.VACATION,
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=14),
        )
        other_request = AbsenceRequest.objects.create(
            employee=self.other_employee.employee_profile,
            absence_type=AbsenceRequest.Type.SICK,
            start_date=date.today() + timedelta(days=2),
            end_date=date.today() + timedelta(days=3),
        )
        self.client.force_authenticate(self.leader)
        listing = self.client.get("/api/v1/absences/")
        self.assertEqual([item["id"] for item in listing.json()], [own_department_request.pk])
        approved = self.client.post(
            f"/api/v1/absences/{own_department_request.pk}/decision/",
            {"action": "approve", "note": "Согласовано"},
            format="json",
        )
        forbidden = self.client.post(
            f"/api/v1/absences/{other_request.pk}/decision/",
            {"action": "approve"},
            format="json",
        )
        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.json()["status"], AbsenceRequest.Status.APPROVED)
        self.assertEqual(forbidden.status_code, 403)

    def test_hr_sees_all_absences_and_overlap_is_rejected(self):
        AbsenceRequest.objects.create(
            employee=self.profile,
            absence_type=AbsenceRequest.Type.VACATION,
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=9),
        )
        AbsenceRequest.objects.create(
            employee=self.other_employee.employee_profile,
            absence_type=AbsenceRequest.Type.OTHER,
            start_date=date.today() + timedelta(days=11),
            end_date=date.today() + timedelta(days=11),
        )
        self.client.force_authenticate(self.hr)
        listing = self.client.get("/api/v1/absences/")
        self.assertEqual(len(listing.json()), 2)
        overlap = self.client.post(
            "/api/v1/absences/",
            {
                "employee": self.profile.pk,
                "absence_type": AbsenceRequest.Type.REMOTE,
                "start_date": date.today() + timedelta(days=7),
                "end_date": date.today() + timedelta(days=8),
            },
            format="json",
        )
        self.assertEqual(overlap.status_code, 400)

    def test_employee_can_cancel_pending_absence(self):
        absence = AbsenceRequest.objects.create(
            employee=self.profile,
            absence_type=AbsenceRequest.Type.UNPAID,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=30),
        )
        self.client.force_authenticate(self.employee)
        response = self.client.post(f"/api/v1/absences/{absence.pk}/cancel/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], AbsenceRequest.Status.CANCELLED)

    def test_hr_uploads_and_sends_document_for_confirmation(self):
        self.client.force_authenticate(self.hr)
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            uploaded = self.client.post(
                "/api/v1/documents/",
                {
                    "employee": self.profile.pk,
                    "title": "Дополнительное соглашение",
                    "document_type": "Кадровый документ",
                    "requires_signature": "true",
                    "file": SimpleUploadedFile("agreement.pdf", b"%PDF-1.4 test", content_type="application/pdf"),
                },
                format="multipart",
            )
            self.assertEqual(uploaded.status_code, 201)
            self.assertTrue(uploaded.json()["has_file"])
            self.assertEqual(uploaded.json()["status"], EmployeeDocument.Status.DRAFT)
            sent = self.client.post(f"/api/v1/documents/{uploaded.json()['id']}/send/", {}, format="json")
            self.assertEqual(sent.status_code, 200)
            self.assertEqual(sent.json()["status"], EmployeeDocument.Status.AWAITING)

    def test_employee_sees_and_confirms_only_own_documents(self):
        own = EmployeeDocument.objects.create(
            employee=self.profile,
            title="Приказ",
            requires_signature=True,
            status=EmployeeDocument.Status.AWAITING,
        )
        EmployeeDocument.objects.create(
            employee=self.other_employee.employee_profile,
            title="Чужой документ",
        )
        self.client.force_authenticate(self.employee)
        listing = self.client.get("/api/v1/documents/")
        self.assertEqual([item["id"] for item in listing.json()], [own.pk])
        signed = self.client.post(
            f"/api/v1/documents/{own.pk}/decision/",
            {"action": "sign", "comment": "Ознакомлена"},
            format="json",
        )
        self.assertEqual(signed.status_code, 200)
        self.assertEqual(signed.json()["status"], EmployeeDocument.Status.SIGNED)
        self.assertIsNotNone(signed.json()["signed_at"])

    def test_employee_cannot_upload_or_confirm_another_document(self):
        foreign = EmployeeDocument.objects.create(
            employee=self.other_employee.employee_profile,
            title="Чужой приказ",
            requires_signature=True,
            status=EmployeeDocument.Status.AWAITING,
        )
        self.client.force_authenticate(self.employee)
        upload = self.client.post(
            "/api/v1/documents/",
            {"employee": self.profile.pk, "title": "Самостоятельная загрузка"},
            format="multipart",
        )
        decision = self.client.post(
            f"/api/v1/documents/{foreign.pk}/decision/",
            {"action": "sign"},
            format="json",
        )
        self.assertEqual(upload.status_code, 403)
        self.assertEqual(decision.status_code, 403)

    def test_hr_launches_performance_cycle_for_active_employees(self):
        self.department.manager = self.leader
        self.department.save(update_fields=["manager"])
        Competency.objects.create(name="Командная работа", category="Корпоративные")
        Competency.objects.create(name="Работа с данными", category="Профессиональные")
        self.client.force_authenticate(self.hr)
        created = self.client.post(
            "/api/v1/performance/cycles/",
            {
                "title": "Оценка за II полугодие",
                "start_date": "2026-07-01",
                "end_date": "2026-08-15",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        launched = self.client.post(
            f"/api/v1/performance/cycles/{created.json()['id']}/launch/",
            {},
            format="json",
        )
        self.assertEqual(launched.status_code, 200)
        self.assertEqual(launched.json()["status"], PerformanceCycle.Status.ACTIVE)
        self.assertEqual(launched.json()["review_count"], 2)
        review = PerformanceReview.objects.get(cycle_id=created.json()["id"], employee=self.profile)
        self.assertEqual(review.reviewer, self.leader)
        self.assertEqual(review.scores.count(), 2)

    def test_employee_and_manager_complete_performance_review(self):
        self.department.manager = self.leader
        self.department.save(update_fields=["manager"])
        competency = Competency.objects.create(name="Ответственность")
        cycle = PerformanceCycle.objects.create(
            title="Квартальная оценка",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            status=PerformanceCycle.Status.ACTIVE,
            created_by=self.hr,
        )
        review = PerformanceReview.objects.create(
            cycle=cycle,
            employee=self.profile,
            reviewer=self.leader,
        )
        review.scores.create(competency=competency)
        payload = {"scores": [{"competency": competency.pk, "score": 4, "comment": "Есть прогресс"}]}

        self.client.force_authenticate(self.employee)
        self_assessment = self.client.post(
            f"/api/v1/performance/reviews/{review.pk}/self/",
            {**payload, "summary": "Итоги квартала"},
            format="json",
        )
        self.assertEqual(self_assessment.status_code, 200)
        self.assertEqual(self_assessment.json()["status"], PerformanceReview.Status.MANAGER)

        self.client.force_authenticate(self.leader)
        manager_assessment = self.client.post(
            f"/api/v1/performance/reviews/{review.pk}/manager/",
            {**payload, "summary": "Хорошая динамика", "development_plan": "Углубить аналитику"},
            format="json",
        )
        self.assertEqual(manager_assessment.status_code, 200)
        self.assertEqual(manager_assessment.json()["status"], PerformanceReview.Status.COMPLETED)
        self.assertEqual(manager_assessment.json()["manager_average"], 4.0)
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, PerformanceCycle.Status.COMPLETED)

    def test_employee_cannot_see_foreign_performance_review(self):
        cycle = PerformanceCycle.objects.create(
            title="Оценка",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            created_by=self.hr,
        )
        foreign = PerformanceReview.objects.create(
            cycle=cycle,
            employee=self.other_employee.employee_profile,
        )
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get(f"/api/v1/performance/reviews/{foreign.pk}/").status_code, 404)

    def test_employee_inbox_contains_only_personal_actions(self):
        own = EmployeeDocument.objects.create(
            employee=self.profile,
            title="Личное соглашение",
            requires_signature=True,
            status=EmployeeDocument.Status.AWAITING,
        )
        EmployeeDocument.objects.create(
            employee=self.other_employee.employee_profile,
            title="Чужой документ",
            requires_signature=True,
            status=EmployeeDocument.Status.AWAITING,
        )
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/v1/inbox/")
        self.assertEqual(response.status_code, 200)
        identifiers = [item["id"] for item in response.json()["items"]]
        self.assertIn(f"document-{own.pk}", identifiers)
        self.assertEqual(len([item for item in identifiers if item.startswith("document-")]), 1)
        self.assertGreater(response.json()["unread"], 0)

        item_id = f"document-{own.pk}"
        marked = self.client.post("/api/v1/inbox/", {"item_ids": [item_id]}, format="json")
        self.assertEqual(marked.status_code, 200)
        self.assertTrue(InboxItemState.objects.get(user=self.employee, item_id=item_id).read_at)
        refreshed = self.client.get("/api/v1/inbox/").json()
        self.assertTrue(next(item for item in refreshed["items"] if item["id"] == item_id)["is_read"])

    def test_leader_inbox_contains_department_approvals(self):
        absence = AbsenceRequest.objects.create(
            employee=self.profile,
            absence_type=AbsenceRequest.Type.VACATION,
            start_date=date.today() + timedelta(days=3),
            end_date=date.today() + timedelta(days=5),
        )
        AbsenceRequest.objects.create(
            employee=self.other_employee.employee_profile,
            absence_type=AbsenceRequest.Type.VACATION,
            start_date=date.today() + timedelta(days=4),
            end_date=date.today() + timedelta(days=6),
        )
        self.client.force_authenticate(self.leader)
        response = self.client.get("/api/v1/inbox/")
        identifiers = [item["id"] for item in response.json()["items"]]
        self.assertEqual([item for item in identifiers if item.startswith("absence-")], [f"absence-{absence.pk}"])

    def test_hr_inbox_prioritizes_overdue_onboarding(self):
        plan = OnboardingPlan.objects.create(
            employee=self.profile,
            checklist=[{"id": "1", "title": "Получить доступ", "done": False}],
            start_date=date.today() - timedelta(days=10),
            due_date=date.today() - timedelta(days=1),
        )
        self.client.force_authenticate(self.hr)
        response = self.client.get("/api/v1/inbox/")
        self.assertEqual(response.status_code, 200)
        item = next(item for item in response.json()["items"] if item["id"] == f"onboarding-{plan.pk}")
        self.assertEqual(item["priority"], "danger")
        self.assertGreaterEqual(response.json()["urgent"], 1)

    def test_admin_analyzes_daily_transcript_against_courses(self):
        course = Course.objects.create(
            title="Сквозная аналитика",
            description="Атрибуция рекламных каналов и конверсия",
            author=self.admin,
            status=Course.Status.PUBLISHED,
        )
        Lesson.objects.create(
            course=course,
            title="Модели атрибуции",
            content="<p>Аналитика источников, конверсия и рекламные кампании</p>",
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/v1/daily-transcripts/",
            {
                "title": "Дэйлик маркетинга",
                "meeting_date": "2026-07-28",
                "raw_text": "Обсудили сквозную аналитику, атрибуцию, конверсию и новый рекламный канал. Не хватает материала про когортный анализ.",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertGreater(response.json()["coverage_percent"], 0)
        self.assertEqual(response.json()["analysis"]["course_matches"][0]["course_id"], course.pk)
        self.assertIn("когортный", response.json()["analysis"]["gaps"])

    def test_author_uploads_daily_transcript_text_file(self):
        self.client.force_authenticate(self.author)
        response = self.client.post(
            "/api/v1/daily-transcripts/",
            {
                "title": "Дэйлик продукта",
                "meeting_date": "2026-07-28",
                "file": SimpleUploadedFile("daily.vtt", "WEBVTT\nОбсудили продуктовую аналитику".encode("utf-8"), content_type="text/vtt"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["source"], DailyTranscript.Source.FILE)
        self.assertEqual(response.json()["original_filename"], "daily.vtt")

    def test_employee_cannot_add_daily_transcript(self):
        self.client.force_authenticate(self.employee)
        response = self.client.post(
            "/api/v1/daily-transcripts/",
            {
                "title": "Личный дэйлик",
                "meeting_date": "2026-07-28",
                "raw_text": "Текст встречи",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_finds_and_applies_product_update_to_course(self):
        course = Course.objects.create(
            title="Настройка атрибуции",
            description="Рекламные каналы и конверсии",
            author=self.admin,
            status=Course.Status.PUBLISHED,
            version=3,
        )
        lesson = Lesson.objects.create(
            course=course,
            title="Модель атрибуции",
            content="<p>Настройте атрибуцию рекламного канала.</p>",
        )
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/v1/product-updates/",
            {
                "title": "Новая модель атрибуции",
                "description": "Изменились настройки атрибуции рекламных каналов.",
                "effective_date": "2026-08-01",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["affected_courses"], 1)
        target = created.json()["analysis"]["targets"][0]
        self.assertEqual(target["suggested_lesson_id"], lesson.pk)
        applied = self.client.post(
            f"/api/v1/product-updates/{created.json()['id']}/apply/",
            {"targets": [{"course_id": course.pk, "lesson_id": lesson.pk}]},
            format="json",
        )
        self.assertEqual(applied.status_code, 200)
        self.assertEqual(applied.json()["status"], ProductUpdate.Status.APPLIED)
        course.refresh_from_db()
        lesson.refresh_from_db()
        self.assertEqual(course.version, 4)
        self.assertIn(f'data-product-update-id="{created.json()["id"]}"', lesson.content)

    def test_product_update_cannot_be_applied_twice(self):
        course = Course.objects.create(title="Аналитика", author=self.admin)
        lesson = Lesson.objects.create(course=course, title="Аналитика", content="Данные аналитики")
        update = ProductUpdate.objects.create(
            title="Аналитика",
            description="Обновление аналитики",
            effective_date=date.today(),
            created_by=self.admin,
            analysis={"targets": [{"course_id": course.pk}]},
        )
        self.client.force_authenticate(self.admin)
        payload = {"targets": [{"course_id": course.pk, "lesson_id": lesson.pk}]}
        self.assertEqual(self.client.post(f"/api/v1/product-updates/{update.pk}/apply/", payload, format="json").status_code, 200)
        self.assertEqual(self.client.post(f"/api/v1/product-updates/{update.pk}/apply/", payload, format="json").status_code, 400)
        course.refresh_from_db()
        self.assertEqual(course.version, 2)

    def test_non_admin_cannot_manage_product_updates(self):
        self.client.force_authenticate(self.hr)
        self.assertEqual(self.client.get("/api/v1/product-updates/").status_code, 403)
        self.assertEqual(
            self.client.post(
                "/api/v1/product-updates/",
                {"title": "Изменение", "description": "Описание", "effective_date": "2026-08-01"},
                format="json",
            ).status_code,
            403,
        )

    def test_hr_runs_interview_with_participant_feedback_and_decision(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        self.client.force_authenticate(self.hr)
        created = self.client.post(
            "/api/v1/interviews/",
            {
                "candidate": candidate.pk,
                "title": "Интервью с руководителем",
                "scheduled_at": "2026-08-03T10:00:00+03:00",
                "duration_minutes": 45,
                "format": Interview.Format.ONLINE,
                "meeting_url": "https://telemost.yandex.ru/example",
                "participants": [self.leader.pk],
                "questions": ["Опыт кандидата", "Работа со сложными задачами"],
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        interview_id = created.json()["id"]
        candidate.refresh_from_db()
        self.assertIsNotNone(candidate.next_action_at)

        self.client.force_authenticate(self.leader)
        listing = self.client.get("/api/v1/interviews/")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()[0]["candidate_name"], candidate.full_name)
        self.assertTrue(listing.json()[0]["can_submit_feedback"])
        started = self.client.post(f"/api/v1/interviews/{interview_id}/start/")
        self.assertEqual(started.json()["status"], Interview.Status.IN_PROGRESS)
        feedback = self.client.post(
            f"/api/v1/interviews/{interview_id}/feedback/",
            {
                "answers": [
                    {"score": 5, "note": "Релевантный опыт"},
                    {"score": 4, "note": "Хорошая структура ответа"},
                ],
                "overall_score": 5,
                "recommendation": "advance",
                "comment": "Рекомендую продолжить",
            },
            format="json",
        )
        self.assertEqual(feedback.status_code, 200)
        self.assertEqual(feedback.json()["average_score"], 5.0)
        self.assertEqual(len(feedback.json()["feedback"]), 1)

        self.client.force_authenticate(self.hr)
        completed = self.client.post(
            f"/api/v1/interviews/{interview_id}/complete/",
            {"decision": "advance", "summary": "Перевести на следующий этап"},
            format="json",
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["status"], Interview.Status.COMPLETED)
        self.assertEqual(completed.json()["decision"], Interview.Decision.ADVANCE)
        candidate.refresh_from_db()
        self.assertIsNone(candidate.next_action_at)

    def test_unrelated_employee_cannot_open_or_score_interview(self):
        candidate = Candidate.objects.get(full_name="Мария Тестова")
        interview = Interview.objects.create(
            candidate=candidate,
            title="Интервью",
            scheduled_at="2026-08-03T10:00:00+03:00",
            questions=["Первый вопрос"],
            created_by=self.hr,
        )
        interview.participants.add(self.leader)
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/interviews/").json(), [])
        self.assertEqual(
            self.client.post(
                f"/api/v1/interviews/{interview.pk}/feedback/",
                {
                    "answers": [{"score": 3, "note": ""}],
                    "overall_score": 3,
                    "recommendation": "hold",
                },
                format="json",
            ).status_code,
            403,
        )
