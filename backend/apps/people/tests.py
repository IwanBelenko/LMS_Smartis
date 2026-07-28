from datetime import date, timedelta
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.identity.models import Department, User
from apps.learning.models import Course, LearningPath, LearningPathCourse
from .models import (
    AbsenceRequest,
    Candidate,
    CandidateStage,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Position,
    StaffPosition,
    Vacancy,
    OnboardingPlan,
    OnboardingTemplate,
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

    def test_leader_cannot_open_hcm_registry(self):
        self.client.force_authenticate(self.leader)
        response = self.client.get("/api/v1/employees/")
        self.assertEqual(response.status_code, 403)

    def test_employee_cannot_open_hcm_registry(self):
        self.client.force_authenticate(self.employee)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)

    def test_course_author_cannot_open_hcm_sections(self):
        self.client.force_authenticate(self.author)
        self.assertEqual(self.client.get("/api/v1/employees/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/candidates/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/hcm/summary/").status_code, 403)

    def test_hr_has_hcm_access_and_sees_compensation(self):
        self.client.force_authenticate(self.hr)
        employees = self.client.get("/api/v1/employees/")
        candidates = self.client.get("/api/v1/candidates/")
        analytics = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(employees.status_code, 200)
        self.assertEqual(candidates.status_code, 200)
        self.assertEqual(analytics.status_code, 200)
        self.assertIn("salary_base", employees.json()[0])

    def test_admin_sees_recruitment_board_and_summary(self):
        self.client.force_authenticate(self.admin)
        stages = self.client.get("/api/v1/candidate-stages/")
        summary = self.client.get("/api/v1/hcm/summary/")
        self.assertEqual(stages.status_code, 200)
        self.assertEqual(stages.json()[0]["candidates_count"], 1)
        self.assertEqual(summary.json()["employees_total"], 2)

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

    def test_leader_cannot_read_or_change_employee_profile(self):
        EmployeeGoal.objects.create(employee=self.profile, title="Цель отдела")
        self.client.force_authenticate(self.leader)
        response = self.client.get(f"/api/v1/employees/{self.profile.pk}/goals/")
        forbidden = self.client.post(
            f"/api/v1/employees/{self.profile.pk}/goals/",
            {"title": "Новая цель", "progress": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(forbidden.status_code, 403)

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
