import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ContactRound,
  Clock3,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Home,
  Link2,
  LayoutGrid,
  List,
  LogOut,
  Minus,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  Route,
  Rows3,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Settings2,
  Trash2,
  Trophy,
  Type,
  Upload,
  Users,
  Video,
  Workflow,
  X,
} from "lucide-react";
import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import smartisWordmarkDark from "./assets/smartis-wordmark-dark.png";
import smartisWordmarkLight from "./assets/smartis-wordmark-light.png";

const RichTextEditor = lazy(() => import("./RichTextEditor"));

function Brand({ login = false }: { login?: boolean }) {
  return (
    <div className={login ? "brand brand--login" : "brand"}>
      <img className="brand__wordmark brand__wordmark--light" src={smartisWordmarkLight} alt="Smartis" />
      <img className="brand__wordmark brand__wordmark--dark" src={smartisWordmarkDark} alt="" aria-hidden="true" />
      {login ? <span className="brand__product-label">HCM / LMS</span> : <span className="visually-hidden">HCM / LMS Smartis</span>}
    </div>
  );
}

type ViewId =
  | "home" | "tasks" | "trajectory" | "ranking" | "analytics" | "absences" | "documents" | "performance"
  | "organization" | "employees" | "recruitment" | "hrAnalytics"
  | "users" | "courses" | "updates" | "audit" | "settings";
type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_label: string;
  status: string;
  status_label: string;
  can_view_compensation: boolean;
  department: number | null;
  department_name: string | null;
};
type Department = { id: number; name: string; code: string; is_active: boolean };
type Position = { id: number; name: string; is_active: boolean };
type OrgDepartment = Department & {
  parent: number | null;
  parent_name: string | null;
  manager: number | null;
  manager_name: string;
  employee_count: number;
  child_count: number;
  planned_headcount: number;
  vacancies: number;
};
type StaffPosition = {
  id: number;
  department: number;
  department_name: string;
  position: number;
  position_name: string;
  headcount: number;
  filled_count: number;
  vacancies: number;
  open_vacancy_count: number;
  note: string;
  is_active: boolean;
};
type EmployeeProfile = {
  id: number;
  user: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string;
  department: number | null;
  department_name: string | null;
  position: number | null;
  position_name: string | null;
  grade: string;
  birth_date: string | null;
  age: number | null;
  hire_date: string | null;
  dismissal_date: string | null;
  tenure_years: number | null;
  education: string;
  competencies: string;
  status: string;
  status_label: string;
  checklist_score: number;
  development_progress: number;
  salary_base?: string | null;
  monthly_bonus?: string | null;
  quarterly_bonus?: string | null;
};
type EmployeeImportField = { key: string; label: string; required: boolean };
type EmployeeImportRow = {
  row_number: number;
  action: "create" | "update" | "error";
  errors: Record<string, string[]>;
  preview: {
    full_name: string;
    email: string;
    employee_number: string;
    department: string;
    position: string;
  };
};
type EmployeeImportReview = {
  total: number;
  create_count: number;
  update_count: number;
  error_count: number;
  rows: EmployeeImportRow[];
};
type EmployeeImportPreview = {
  batch_id: number;
  source: "manual" | "one_c";
  effective_date: string | null;
  filename: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  mapping: Record<string, string>;
  fields: EmployeeImportField[];
  review: EmployeeImportReview;
};
type EmployeeImportBatch = {
  id: number;
  source: "manual" | "one_c";
  source_label: string;
  filename: string;
  effective_date: string | null;
  total_rows: number;
  created_count: number;
  updated_count: number;
  error_count: number;
  imported_by_name: string;
  completed_at: string;
};
type LearningImportRow = {
  row_number: number;
  action: "create" | "update" | "error";
  errors: Record<string, string[]>;
  preview: {
    employee_email: string;
    employee_name: string;
    course_title: string;
    status: string;
    progress: number;
    score: number | null;
  };
};
type LearningImportReview = {
  total: number;
  create_count: number;
  update_count: number;
  error_count: number;
  rows: LearningImportRow[];
};
type LearningImportPreview = {
  batch_id: number;
  filename: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  mapping: Record<string, string>;
  fields: EmployeeImportField[];
  review: LearningImportReview;
};
type LearningImportBatch = {
  id: number;
  source: "ispring_file" | "ispring_api";
  source_label: string;
  filename: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  error_count: number;
  imported_by_name: string;
  completed_at: string;
};
type AuditEvent = {
  id: number;
  actor_id: number | null;
  actor_name: string;
  actor_email: string;
  entity_type: string;
  entity_label: string;
  entity_id: string;
  entity_title: string;
  action: string;
  action_label: string;
  changes: Record<string, unknown>;
  ip_address: string;
  created_at: string;
};
type AuditResponse = {
  total: number;
  limit: number;
  results: AuditEvent[];
  filters: {
    entity_types: Array<{ value: string; label: string }>;
    actions: Array<{ value: string; label: string }>;
    actors: Array<{ id: number; name: string }>;
  };
};
type SystemSettingsConfig = {
  company_name: string;
  legal_name: string;
  support_email: string;
  corporate_email_domains: string[];
  invitation_expiry_days: number;
  notify_learning: boolean;
  notify_interviews: boolean;
  notify_hr_events: boolean;
  notify_invitations: boolean;
  updated_by: number | null;
  updated_at: string;
};
type CandidateStage = { id: number; name: string; position: number; is_terminal: boolean; candidates_count: number };
type Candidate = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  telegram: string;
  desired_position: string;
  desired_salary: string | null;
  vacancy: number | null;
  vacancy_title: string | null;
  skills: string;
  source: string;
  stage: number;
  stage_name: string;
  department: number | null;
  department_name: string | null;
  hired_employee: number | null;
  hired_employee_name: string | null;
  hired_at: string | null;
  next_action_at: string | null;
  comment: string;
};
type CandidateOffer = {
  id: number;
  candidate: number;
  candidate_name: string;
  vacancy_title: string | null;
  position_title: string;
  salary: string | null;
  start_date: string | null;
  valid_until: string | null;
  probation_months: number;
  work_format: "office" | "hybrid" | "remote";
  work_format_label: string;
  conditions: string;
  file_url: string;
  file_original_name: string;
  status: "draft" | "pending" | "approved" | "accepted" | "declined" | "withdrawn";
  status_label: string;
  approved_by_name: string;
  approved_at: string | null;
  responded_at: string | null;
  decision_comment: string;
  updated_at: string;
};
type InterviewFeedback = {
  id: number;
  participant: number;
  participant_name: string;
  answers: Array<{ question: string; score: number; note: string }>;
  overall_score: number;
  recommendation: "advance" | "hold" | "reject";
  recommendation_label: string;
  comment: string;
  submitted_at: string;
};
type Interview = {
  id: number;
  candidate: number;
  candidate_name: string;
  vacancy_title: string | null;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  format: "online" | "office" | "phone";
  format_label: string;
  location: string;
  meeting_url: string;
  participants: number[];
  participant_names: string[];
  questions: string[];
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  status_label: string;
  decision: "pending" | "advance" | "hold" | "reject";
  decision_label: string;
  summary: string;
  feedback: InterviewFeedback[];
  average_score: number | null;
  can_submit_feedback: boolean;
  my_feedback_id: number | null;
};
type Vacancy = {
  id: number;
  title: string;
  staff_position: number | null;
  department: number;
  department_name: string;
  position: number;
  position_name: string;
  openings: number;
  status: "open" | "paused" | "closed";
  status_label: string;
  description: string;
  requirements: string;
  deadline: string | null;
  recruiter_name: string;
  candidates_count: number;
  hired_count: number;
};
type HcmSummary = {
  employees_total: number;
  on_probation: number;
  average_development_progress: number;
  candidates_total: number;
  open_positions: number;
};
type HcmDashboard = {
  metrics: {
    active_onboarding: number;
    overdue_onboarding: number;
    probation: number;
    open_vacancies: number;
    active_candidates: number;
  };
  onboarding: Array<{
    id: number; employee_id: number; employee_name: string; department_name: string;
    responsible_name: string; due_date: string; days_left: number; progress: number;
    severity: "danger" | "warning" | "normal";
  }>;
  probation: Array<{
    id: number; employee_name: string; department_name: string; position_name: string;
    end_date: string; days_left: number;
  }>;
  vacancies: Array<{
    id: number; title: string; department_name: string; openings: number;
    candidates_count: number; deadline: string | null; is_stale: boolean; recruiter_name: string;
  }>;
  funnel: Array<{ id: number; name: string; count: number }>;
};
type EmployeeGoal = {
  id: number; title: string; description: string; due_date: string | null; progress: number;
  status: "planned" | "in_progress" | "completed"; status_label: string;
};
type EmploymentEvent = {
  id: number; event_type: string; event_type_label: string; title: string; note: string;
  effective_date: string; created_by_name: string;
};
type EmployeeLearning = {
  id: number; course: number; course_title: string; course_minutes: number; course_version: number;
  status: "assigned" | "in_progress" | "completed"; status_label: string;
  progress: number; score: number | null; assigned_at: string; completed_at: string | null;
};
type EmployeeDocument = {
  id: number; employee: number; employee_name: string; employee_email: string;
  department_name: string | null; title: string; document_type: string; number: string;
  issue_date: string | null; expires_at: string | null; file_original_name: string;
  file_size: number; file_sha256: string; has_file: boolean; requires_signature: boolean;
  status: "draft" | "awaiting" | "signed" | "declined" | "archived"; status_label: string;
  uploaded_by_name: string; sent_at: string | null; signed_at: string | null;
  decision_comment: string; can_sign: boolean; can_manage: boolean;
};
type AbsenceRequest = {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  department_name: string | null;
  absence_type: "vacation" | "sick" | "remote" | "unpaid" | "other";
  absence_type_label: string;
  start_date: string;
  end_date: string;
  days: number;
  comment: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  status_label: string;
  reviewer_name: string;
  decision_note: string;
  can_review: boolean;
  can_cancel: boolean;
};
type Competency = { id: number; name: string; category: string; description: string; is_active: boolean };
type PerformanceCycle = {
  id: number; title: string; start_date: string; end_date: string;
  status: "draft" | "active" | "completed"; status_label: string;
  review_count: number; completed_count: number;
};
type PerformanceScore = {
  id: number; competency: number; competency_name: string; competency_category: string;
  competency_description: string; self_score: number | null; manager_score: number | null;
  self_comment: string; manager_comment: string;
};
type PerformanceReview = {
  id: number; cycle: number; cycle_title: string; cycle_end_date: string;
  employee: number; employee_name: string; employee_email: string; department_name: string;
  position_name: string; reviewer_name: string; status: "self" | "manager" | "completed";
  status_label: string; self_summary: string; manager_summary: string; development_plan: string;
  scores: PerformanceScore[]; self_average: number | null; manager_average: number | null;
  can_self_submit: boolean; can_manager_submit: boolean;
};
type InboxItem = {
  id: string;
  category: "documents" | "performance" | "learning" | "onboarding" | "absences" | "goals" | "employment" | "interviews" | "users";
  title: string;
  description: string;
  target_view: ViewId;
  target_id: number | null;
  due_date: string | null;
  priority: "danger" | "warning" | "normal";
  action_label: string;
  is_read: boolean;
  read_at: string | null;
};
type Inbox = { total: number; urgent: number; unread: number; items: InboxItem[] };
type DailyTranscript = {
  id: number; title: string; meeting_date: string; department: number | null;
  department_name: string | null; source: "paste" | "file" | "api"; source_label: string;
  original_filename: string; text_preview: string; coverage_percent: number;
  created_by_name: string; created_at: string;
  analysis: {
    keywords: Array<{ term: string; count: number; covered: boolean }>;
    course_matches: Array<{
      course_id: number; course_title: string; coverage_percent: number;
      matched_terms: string[]; lessons_count: number;
    }>;
    gaps: string[];
    coverage_percent: number;
  };
};
type ProductUpdateTarget = {
  course_id: number; course_title: string; course_version: number; course_status: string;
  confidence: number; matched_terms: string[]; suggested_lesson_id: number | null;
  suggested_lesson_title: string;
  lesson_candidates: Array<{ lesson_id: number; lesson_title: string; matched_terms: string[] }>;
};
type ProductUpdate = {
  id: number; title: string; description: string; effective_date: string;
  status: "analyzed" | "applied"; status_label: string;
  analysis: { keywords: string[]; targets: ProductUpdateTarget[] };
  affected_courses: number;
  applied_targets: Array<{ course_id: number; course_title: string; lesson_id: number; lesson_title: string }>;
  created_by_name: string; applied_at: string | null; created_at: string;
};
type OnboardingPlan = {
  id: number;
  template_name: string | null;
  learning_path_name: string | null;
  responsible_name: string | null;
  checklist: Array<{ id: string; title: string; done: boolean }>;
  status: "active" | "completed" | "cancelled";
  status_label: string;
  progress: number;
  start_date: string;
  due_date: string;
  completed_at: string | null;
};
type OnboardingTemplateConfig = {
  id: number;
  name: string;
  department: number | null;
  position: number | null;
  learning_path: number | null;
  responsible: number | null;
  duration_days: number;
  checklist: Array<string | { title: string }>;
  is_active: boolean;
};
type LearningPathOption = { id: number; title: string; status: string };
type QuizOption = { text: string; correct: boolean };
type QuizQuestionType = "single_choice" | "multiple_choice" | "true_false" | "matching" | "ordering" | "short_text" | "fill_blank";
type QuizPair = { left: string; right: string };
type QuizQuestion = {
  type?: QuizQuestionType;
  prompt: string;
  image_url?: string;
  image_asset_id?: number | null;
  image_original_name?: string;
  learner_view?: boolean;
  options: QuizOption[];
  correct_boolean?: boolean;
  pairs?: QuizPair[];
  left_items?: string[];
  right_items?: string[];
  accepted_answers?: string[];
};
type QuizData = { passing_score: number; max_attempts: number; questions: QuizQuestion[] };
type QuizAnswer = number | number[] | boolean | string | string[];
type Lesson = {
  id?: number;
  client_key: string;
  title: string;
  lesson_type: "text" | "video" | "link" | "file" | "quiz" | "scorm";
  lesson_type_label?: string;
  content: string;
  media_url: string;
  video_url: string;
  video_original_name: string;
  video_size: number;
  video_uploaded_at?: string | null;
  duration_minutes: number;
  position: number;
  is_required: boolean;
  quiz_data: QuizData;
};
type Course = {
  id: number;
  title: string;
  description: string;
  cover_style: "standard" | "custom";
  cover_url: string;
  cover_original_name: string;
  cover_size: number;
  cover_uploaded_at?: string | null;
  source_format: "native" | "scorm_12";
  scorm_identifier: string;
  scorm_entry_point: string;
  scorm_original_name: string;
  scorm_size: number;
  scorm_imported_at?: string | null;
  author: number;
  author_name: string;
  project: number | null;
  project_name: string;
  folder: number | null;
  folder_name: string;
  status: "draft" | "published" | "archived";
  status_label: string;
  estimated_minutes: number;
  version: number;
  lessons_count: number;
  lessons: Lesson[];
  updated_at: string;
};
type ContentProject = {
  id: number;
  name: string;
  description: string;
  owner: number;
  owner_name: string;
  course_count: number;
  folder_count: number;
  path_count: number;
  updated_at: string;
};
type ContentFolder = {
  id: number;
  name: string;
  project: number;
  project_name: string;
  parent: number | null;
  course_count: number;
  path_count: number;
  updated_at: string;
};
type LearningPath = {
  id: number;
  title: string;
  description: string;
  author: number;
  author_name: string;
  project: number | null;
  project_name: string;
  folder: number | null;
  folder_name: string;
  status: "draft" | "published" | "archived";
  status_label: string;
  course_ids: number[];
  course_count: number;
  updated_at: string;
};
type LearningLesson = Omit<Lesson, "client_key" | "quiz_data"> & {
  quiz_data: QuizData;
  completed: boolean;
  best_score: number | null;
  attempts_count: number;
};
type CourseEnrollment = {
  id: number;
  course: number;
  course_title: string;
  course_description: string;
  course_minutes: number;
  course_cover_url: string;
  learning_path: number | null;
  learning_path_title: string;
  position: number;
  status: "locked" | "available" | "in_progress" | "completed";
  status_label: string;
  progress: number;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  lessons: LearningLesson[];
};
type LearningPathProgress = {
  id: number;
  title: string;
  description: string;
  progress: number;
  completed_courses: number;
  course_count: number;
  status: "in_progress" | "completed";
  courses: CourseEnrollment[];
};
type MyLearning = {
  paths: LearningPathProgress[];
  standalone: CourseEnrollment[];
};

const API = "/api/v1";

async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Token " + token } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      data.detail ||
      data.non_field_errors?.[0] ||
      Object.values(data).flat().join(" ") ||
      "Не удалось выполнить запрос";
    throw new Error(String(message));
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

async function apiUpload<T>(path: string, token: string, body: FormData, method = "POST"): Promise<T> {
  const response = await fetch(API + path, {
    method,
    headers: { Authorization: "Token " + token },
    body,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || Object.values(data).flat().join(" ") || "Не удалось загрузить файл");
  }
  return response.json();
}

function ThemeSwitch({ dark, onChange }: { dark: boolean; onChange: () => void }) {
  return (
    <button
      className="theme-switch"
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      onClick={onChange}
    >
      <span aria-hidden="true" />
    </button>
  );
}

function CurtainToggleIcon({ open }: { open: boolean }) {
  return (
    <svg className="curtain-toggle-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.5 4.5v15" />
      <circle cx="5.5" cy="12" r="1.35" />
      <path d="M9 5.5h1.5c4.7 0 8 2.7 8 6.5s-3.3 6.5-8 6.5H9" />
      <path className="curtain-toggle-icon__arrow" d={open ? "m15 9-3 3 3 3" : "m12 9 3 3-3 3"} />
    </svg>
  );
}

function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const query = new URLSearchParams(window.location.search);
  const invitationToken = query.get("invite") || "";
  const resetUid = query.get("reset_uid") || "";
  const resetToken = query.get("reset_token") || "";
  const initialMode = invitationToken ? "invite" : resetUid && resetToken ? "reset" : "login";
  const [mode, setMode] = useState<"login" | "forgot" | "invite" | "reset">(initialMode);
  const [email, setEmail] = useState(import.meta.env.DEV ? "admin@smartis.local" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "SmartisDemo123!" : "");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkReady, setLinkReady] = useState(initialMode === "login");

  useEffect(() => {
    if (mode !== "invite" && mode !== "reset") return;
    const path = mode === "invite"
      ? `/auth/invitations/${invitationToken}/`
      : `/auth/password-reset/${resetUid}/${resetToken}/`;
    setLinkReady(false);
    setError("");
    apiRequest<{ email: string; full_name?: string }>(path, null)
      .then((data) => {
        setEmail(data.email);
        setLinkReady(true);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Ссылка недействительна или устарела"));
  }, [mode, invitationToken, resetUid, resetToken]);

  function showLogin() {
    window.history.replaceState({}, "", window.location.pathname);
    setMode("login");
    setPassword("");
    setPasswordConfirm("");
    setError("");
    setNotice("");
    setLinkReady(true);
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ token: string; user: User }>("/auth/login/", null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.token, data.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<{ detail: string }>("/auth/password-reset/", null, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setNotice(response.detail);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отправить письмо");
    } finally {
      setLoading(false);
    }
  }

  async function setNewPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const path = mode === "invite"
      ? `/auth/invitations/${invitationToken}/`
      : `/auth/password-reset/${resetUid}/${resetToken}/`;
    try {
      await apiRequest<{ detail: string }>(path, null, {
        method: "POST",
        body: JSON.stringify({ password, password_confirm: passwordConfirm }),
      });
      window.history.replaceState({}, "", window.location.pathname);
      setNotice(mode === "invite" ? "Учётная запись активирована. Теперь можно войти." : "Пароль изменён. Теперь можно войти.");
      setMode("login");
      setPassword("");
      setPasswordConfirm("");
      setLinkReady(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить пароль");
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: ["Управление и обучение персонала", "Единая корпоративная система HCM / LMS Smartis"],
    forgot: ["Восстановление доступа", "Отправим одноразовую ссылку на корпоративную почту"],
    invite: ["Добро пожаловать в Smartis", "Задайте пароль, чтобы активировать учётную запись"],
    reset: ["Новый пароль", "Придумайте новый пароль для своей учётной записи"],
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <Brand login />
        <div className="login-intro">
          <h1>{titles[mode][0]}</h1>
          <p>{titles[mode][1]}</p>
        </div>
        {mode === "login" ? (
          <form onSubmit={submitLogin}>
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <p className="form-error">{error}</p>}
            {notice && <p className="form-notice login-notice"><CheckCircle2 />{notice}</p>}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? "Входим…" : "Войти"}</button>
            <button className="login-link" type="button" onClick={() => {
              setMode("forgot");
              setPassword("");
              setError("");
              setNotice("");
            }}>Не помню пароль</button>
          </form>
        ) : mode === "forgot" ? (
          <form onSubmit={requestPasswordReset}>
            <label>Корпоративная почта<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            {error && <p className="form-error">{error}</p>}
            {notice && <p className="form-notice login-notice"><CheckCircle2 />{notice}</p>}
            <button className="primary-button" type="submit" disabled={loading || Boolean(notice)}>{loading ? "Отправляем…" : "Получить ссылку"}</button>
            <button className="login-link" type="button" onClick={showLogin}>Вернуться ко входу</button>
          </form>
        ) : (
          <form onSubmit={setNewPassword}>
            {email && <div className="login-account"><span>Учётная запись</span><strong>{email}</strong></div>}
            <label>Новый пароль<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} disabled={!linkReady} required /></label>
            <label>Повторите пароль<input type="password" autoComplete="new-password" minLength={8} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} disabled={!linkReady} required /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={loading || !linkReady}>{loading ? "Сохраняем…" : mode === "invite" ? "Активировать доступ" : "Сохранить пароль"}</button>
            <button className="login-link" type="button" onClick={showLogin}>Вернуться ко входу</button>
          </form>
        )}
        {mode === "login" && import.meta.env.DEV && <p className="login-note">Демонстрационный вход заполнен только в локальной версии</p>}
      </section>
    </main>
  );
}

const nav = [
  { id: "home" as const, label: "Главная", icon: Home },
  { id: "trajectory" as const, label: "Траектория", icon: Route },
  { id: "ranking" as const, label: "Сеть развития", icon: Workflow },
  { id: "analytics" as const, label: "Аналитика", icon: BarChart3 },
  { id: "performance" as const, label: "Оценка", icon: CheckCircle2 },
];
const hcmNav = [
  { id: "tasks" as const, label: "Задачи", icon: Bell },
  { id: "documents" as const, label: "Документы", icon: FileText },
  { id: "absences" as const, label: "Отпуска и отсутствия", icon: CalendarDays },
  { id: "organization" as const, label: "Оргструктура", icon: Building2 },
  { id: "employees" as const, label: "Сотрудники", icon: ContactRound },
  { id: "recruitment" as const, label: "Подбор", icon: BriefcaseBusiness },
  { id: "hrAnalytics" as const, label: "HR-аналитика", icon: ChartNoAxesCombined },
];
const adminNav = [
  { id: "users" as const, label: "Пользователи", icon: Users },
  { id: "courses" as const, label: "Курсы", icon: BookOpen },
  { id: "updates" as const, label: "Обновления", icon: RefreshCw },
  { id: "audit" as const, label: "Журнал действий", icon: FileText },
  { id: "settings" as const, label: "Настройки", icon: Settings },
];

function visibleHcmNav(user: User) {
  if (user.role === "admin" || user.role === "hr") return hcmNav;
  if (user.role === "leader") {
    return hcmNav.filter((item) => ["tasks", "documents", "absences", "employees"].includes(item.id));
  }
  return hcmNav.filter((item) => item.id === "tasks" || item.id === "documents");
}

function visibleAdminNav(user: User) {
  return user.role === "admin"
    ? adminNav
    : user.role === "author"
      ? adminNav.filter((item) => item.id === "courses")
      : [];
}

function canAccessView(user: User, view: ViewId) {
  return nav.some((item) => item.id === view)
    || visibleHcmNav(user).some((item) => item.id === view)
    || visibleAdminNav(user).some((item) => item.id === view);
}

function Sidebar({
  active,
  user,
  open,
  dark,
  onNavigate,
  onTheme,
  onLogout,
}: {
  active: ViewId;
  user: User;
  open: boolean;
  dark: boolean;
  onNavigate: (view: ViewId) => void;
  onTheme: () => void;
  onLogout: () => void;
}) {
  const availableHcmNav = visibleHcmNav(user);
  const availableAdminNav = visibleAdminNav(user);
  const group = (items: typeof nav | typeof hcmNav | typeof adminNav) =>
    items.map(({ id, label }) => (
      <button
        type="button"
        key={id}
        className={"nav-item " + (active === id ? "nav-item--active" : "")}
        onClick={() => onNavigate(id)}
      >
        <span className="nav-item__label">{label}</span>
      </button>
    ));
  return (
    <aside className="sidebar" aria-hidden={!open} inert={!open}>
      <div className="sidebar__header">
        <Brand />
      </div>
      <nav className="nav-group" aria-label="Рабочее пространство">
        <p>Рабочее пространство</p>
        {group(nav)}
      </nav>
      {availableHcmNav.length > 0 && (
        <>
          <span className="sidebar__divider" aria-hidden="true" />
          <nav className="nav-group" aria-label="HR">
            <p>HR</p>
            {group(availableHcmNav)}
          </nav>
        </>
      )}
      {availableAdminNav.length > 0 && (
        <>
          <span className="sidebar__divider" aria-hidden="true" />
          <nav className="nav-group" aria-label="Администрирование">
            <p>Администрирование</p>
            {group(availableAdminNav)}
          </nav>
        </>
      )}
      <div className="sidebar__footer">
        <div className="user-chip">
          <div>
            <strong>{user.first_name || user.email}</strong>
            <span>{user.role_label}</span>
          </div>
        </div>
        <div className="footer-actions">
          <ThemeSwitch dark={dark} onChange={onTheme} />
          <button className="icon-button" type="button" onClick={onLogout} aria-label="Выйти">
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function IconRail({
  active,
  user,
  open,
  inbox,
  onNavigate,
  onOpen,
  onReadInbox,
}: {
  active: ViewId;
  user: User;
  open: boolean;
  inbox: Inbox;
  onNavigate: (view: ViewId) => void;
  onOpen: () => void;
  onReadInbox: (itemIds: string[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<"learning" | "hr" | "admin" | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const availableHcmNav = visibleHcmNav(user);
  const availableAdminNav = visibleAdminNav(user);
  const learningNav = nav.filter((item) => item.id !== "home");
  useEffect(() => {
    function closeNestedMenu(event: MouseEvent) {
      if (!railRef.current?.contains(event.target as Node)) {
        setExpanded(null);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", closeNestedMenu);
    return () => document.removeEventListener("mousedown", closeNestedMenu);
  }, []);

  function nestedGroup(
    id: "learning" | "hr" | "admin",
    label: string,
    Icon: typeof BookOpen,
    items: typeof nav | typeof hcmNav | typeof adminNav,
  ) {
    const isActive = items.some((item) => item.id === active);
    const isExpanded = expanded === id;
    return (
      <div className="icon-rail__nested" key={id}>
        <button
          className={isActive || isExpanded ? "icon-rail__item icon-rail__item--active" : "icon-rail__item"}
          type="button"
          aria-label={label}
          aria-expanded={isExpanded}
          data-tooltip={isExpanded ? undefined : label}
          onClick={() => setExpanded(isExpanded ? null : id)}
        >
          <Icon aria-hidden="true" />
          <ChevronRight className="icon-rail__nested-arrow" aria-hidden="true" />
        </button>
        {isExpanded && (
          <div className="icon-rail__submenu" role="menu" aria-label={label}>
            <header><span>{label}</span><small>{items.length}</small></header>
            {items.map(({ id: view, label: itemLabel, icon: ItemIcon }) => (
              <button
                className={active === view ? "icon-rail__submenu-item icon-rail__submenu-item--active" : "icon-rail__submenu-item"}
                type="button"
                role="menuitem"
                onClick={() => { onNavigate(view); setExpanded(null); }}
                key={view}
              >
                <ItemIcon aria-hidden="true" />
                <span>{itemLabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <aside className="icon-rail" aria-label="Быстрая навигация" ref={railRef}>
      <button
        className="icon-rail__toggle"
        type="button"
        aria-label={open ? "Скрыть полное меню" : "Открыть полное меню"}
        aria-expanded={open}
        data-tooltip={open ? "Скрыть меню" : "Открыть меню"}
        onClick={() => { setExpanded(null); setNotificationsOpen(false); onOpen(); }}
      >
        <CurtainToggleIcon open={open} />
      </button>
      <div className="icon-rail__notifications">
        <button
          className={notificationsOpen ? "icon-rail__item icon-rail__item--active" : "icon-rail__item"}
          type="button"
          aria-label={`Уведомления${inbox.unread ? `, непрочитанных: ${inbox.unread}` : ""}`}
          aria-expanded={notificationsOpen}
          data-tooltip={notificationsOpen ? undefined : "Уведомления"}
          onClick={() => { setExpanded(null); setNotificationsOpen((value) => !value); }}
        >
          <Bell aria-hidden="true" />
          {inbox.unread > 0 && <span className="icon-rail__badge">{inbox.unread > 99 ? "99+" : inbox.unread}</span>}
        </button>
        {notificationsOpen && (
          <section className="notification-popover" aria-label="Новые уведомления">
            <header>
              <div><strong>Уведомления</strong><span>{inbox.unread ? `${inbox.unread} новых` : "Новых нет"}</span></div>
              {inbox.unread > 0 && (
                <button type="button" onClick={() => void onReadInbox(inbox.items.map((item) => item.id))}>Прочитать все</button>
              )}
            </header>
            <div className="notification-popover__list">
              {inbox.items.slice(0, 6).map((item) => (
                <button
                  className={item.is_read ? "notification-popover__item" : "notification-popover__item notification-popover__item--unread"}
                  type="button"
                  key={item.id}
                  onClick={() => {
                    void onReadInbox([item.id]);
                    onNavigate(item.target_view);
                    setNotificationsOpen(false);
                  }}
                >
                  <i aria-hidden="true" />
                  <span><strong>{item.title}</strong><small>{item.description}</small></span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ))}
              {!inbox.items.length && <div className="notification-popover__empty"><CheckCircle2 /><span>Новых задач нет</span></div>}
            </div>
            <button className="notification-popover__footer" type="button" onClick={() => { onNavigate("tasks"); setNotificationsOpen(false); }}>
              Все задачи и уведомления<ChevronRight />
            </button>
          </section>
        )}
      </div>
      <nav className="icon-rail__group" aria-label="Основные разделы">
        <button
          className={active === "home" ? "icon-rail__item icon-rail__item--active" : "icon-rail__item"}
          type="button"
          aria-label="Главная"
          data-tooltip="Главная"
          onClick={() => { onNavigate("home"); setExpanded(null); }}
        >
          <Home aria-hidden="true" />
        </button>
        {nestedGroup("learning", "Обучение", BookOpen, learningNav)}
      </nav>
      {availableHcmNav.length > 0 && (
        <>
          <span className="icon-rail__divider" aria-hidden="true" />
          <nav className="icon-rail__group" aria-label="HR">
            {nestedGroup("hr", "HR", ContactRound, availableHcmNav)}
          </nav>
        </>
      )}
      {availableAdminNav.length > 0 && (
        <>
          <span className="icon-rail__divider" aria-hidden="true" />
          <nav className="icon-rail__group" aria-label="Администрирование">
            {nestedGroup("admin", "Администрирование", Settings, availableAdminNav)}
          </nav>
        </>
      )}
      <div className="icon-rail__user" data-tooltip={`${user.first_name || user.email} · ${user.role_label}`}>
        <CircleUserRound aria-hidden="true" />
      </div>
    </aside>
  );
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {action}
    </header>
  );
}

function SmartisSpiderMark() {
  return (
    <svg className="development-spider" viewBox="0 0 48 42" aria-hidden="true">
      <path d="M17 16C11 14 9 9 6 5M15 20 4 16M16 24 5 27M18 27c-6 3-8 7-9 11M31 16c6-2 8-7 11-11M33 20l11-4M32 24l11 3M30 27c6 3 8 7 9 11" />
      <ellipse cx="24" cy="24" rx="11.5" ry="10" />
      <circle cx="24" cy="13" r="7" />
      <circle className="development-spider__eye" cx="21.5" cy="11.5" r="1.1" />
      <circle className="development-spider__eye" cx="26.5" cy="11.5" r="1.1" />
    </svg>
  );
}

const developmentNodePositions = Array.from({ length: 12 }, (_, index) => {
  const angle = -90 + index * 30;
  const radialVariation = [1, .95, 1.02, .97, 1.01, .94, 1, .96, 1.03, .95, 1.01, .96][index];
  return [
    50 + Math.cos(angle * Math.PI / 180) * 46 * radialVariation,
    50 + Math.sin(angle * Math.PI / 180) * 46 * radialVariation,
  ] as const;
});

type DevelopmentPoint = { x: number; y: number };
type DevelopmentSegment = { start: DevelopmentPoint; end: DevelopmentPoint };

const developmentCenter = { x: 50, y: 50 };
const developmentRingFactors = [0.16, 0.32, 0.49, 0.66, 0.83, 1] as const;
const developmentRingPoints = developmentRingFactors.map((factor) =>
  developmentNodePositions.map(([x, y]) => ({
    x: developmentCenter.x + (x - developmentCenter.x) * factor,
    y: developmentCenter.y + (y - developmentCenter.y) * factor,
  })),
);
const developmentWebSegments: DevelopmentSegment[] = [
  ...developmentNodePositions.map(([x, y]) => ({ start: developmentCenter, end: { x, y } })),
  ...developmentRingPoints.flatMap((ring) =>
    ring.map((point, index) => ({ start: point, end: ring[(index + 1) % ring.length] })),
  ),
];

function developmentRingPath(ring: DevelopmentPoint[]) {
  let path = `M ${ring[0].x} ${ring[0].y}`;
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
    const control = {
      x: developmentCenter.x + (midpoint.x - developmentCenter.x) * .91,
      y: developmentCenter.y + (midpoint.y - developmentCenter.y) * .91,
    };
    path += ` Q ${control.x} ${control.y} ${next.x} ${next.y}`;
  });
  return `${path} Z`;
}

function developmentRingArcPath(ring: DevelopmentPoint[], segment: number) {
  const startIndex = segment * 3;
  const start = ring[startIndex];
  let path = `M ${start.x} ${start.y}`;
  for (let step = 0; step < 3; step += 1) {
    const point = ring[(startIndex + step) % ring.length];
    const next = ring[(startIndex + step + 1) % ring.length];
    const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
    const control = {
      x: developmentCenter.x + (midpoint.x - developmentCenter.x) * .91,
      y: developmentCenter.y + (midpoint.y - developmentCenter.y) * .91,
    };
    path += ` Q ${control.x} ${control.y} ${next.x} ${next.y}`;
  }
  return path;
}

const developmentDewPoints = [
  developmentRingPoints[1][1],
  developmentRingPoints[2][4],
  developmentRingPoints[3][7],
  developmentRingPoints[4][10],
  developmentRingPoints[5][2],
];

type DevelopmentCourseNode = {
  id: string;
  title: string;
  progress: number;
  status: "locked" | "available" | "in_progress" | "completed";
  segment: number | null;
  left: number;
  top: number;
};

const developmentSegmentNames = ["Продукт", "Процессы", "Коммуникации", "Данные"] as const;

function positionDevelopmentCourse(segment: number | null, index: number, total: number) {
  if (segment === null) {
    const angle = -90 + index * (360 / Math.max(total, 1));
    return {
      left: 50 + Math.cos(angle * Math.PI / 180) * 42,
      top: 50 + Math.sin(angle * Math.PI / 180) * 41,
    };
  }
  const centers = [-45, 45, 135, 225];
  const ring = 0.25 + Math.floor(index / 2) * 0.125;
  const angle = centers[segment] + (index % 2 === 0 ? -11 : 11);
  return {
    left: 50 + Math.cos(angle * Math.PI / 180) * 42 * ring,
    top: 50 + Math.sin(angle * Math.PI / 180) * 41 * ring,
  };
}

const demoDevelopmentCourses: DevelopmentCourseNode[] = Array.from({ length: 50 }, (_, index) => {
  const segment = index < 40 ? Math.floor(index / 10) : null;
  const segmentIndex = segment === null ? index - 40 : index % 10;
  const position = positionDevelopmentCourse(segment, segmentIndex, segment === null ? 10 : 10);
  const status = index < 20 ? "completed" : index < 30 ? "in_progress" : index < 35 ? "available" : "locked";
  return {
    id: `demo-${index + 1}`,
    title: segment === null
      ? `Дополнительный курс ${segmentIndex + 1}`
      : `${developmentSegmentNames[segment]} · курс ${segmentIndex + 1}`,
    progress: status === "completed" ? 100 : status === "in_progress" ? 25 + (index % 5) * 12 : 0,
    status,
    segment,
    ...position,
  };
});

function closestPointOnDevelopmentWeb(point: DevelopmentPoint) {
  let nearest = developmentCenter;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const segment of developmentWebSegments) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared
      ? Math.max(0, Math.min(1, ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared))
      : 0;
    const candidate = {
      x: segment.start.x + projection * dx,
      y: segment.start.y + projection * dy,
    };
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function DevelopmentNetwork({
  learning,
  compact = false,
  onNavigate,
}: {
  learning: MyLearning;
  compact?: boolean;
  onNavigate: (view: ViewId) => void;
}) {
  const courses = [...learning.paths.flatMap((path) => path.courses), ...learning.standalone];
  const actualDevelopmentCourses: DevelopmentCourseNode[] = [
    ...learning.paths.slice(0, 4).flatMap((path, segment) =>
      path.courses.slice(0, 10).map((course, index) => ({
        id: `course-${course.id}`,
        title: course.course_title,
        progress: course.progress,
        status: course.status,
        segment,
        ...positionDevelopmentCourse(segment, index, 10),
      })),
    ),
    ...learning.standalone.slice(0, 10).map((course, index, items) => ({
      id: `course-${course.id}`,
      title: course.course_title,
      progress: course.progress,
      status: course.status,
      segment: null,
      ...positionDevelopmentCourse(null, index, items.length),
    })),
  ];
  const demoMode = actualDevelopmentCourses.length < 8;
  const networkCourses = demoMode ? demoDevelopmentCourses : actualDevelopmentCourses;
  const segmentOpenCounts = developmentSegmentNames.map((_, segment) =>
    networkCourses.filter((course) => course.segment === segment && course.status !== "locked").length,
  );
  const completedCourses = networkCourses.filter((course) => course.status === "completed").length;
  const openCourses = networkCourses.filter((course) => course.status !== "locked").length;
  const averageProgress = networkCourses.length
    ? Math.round(networkCourses.reduce((sum, course) => sum + course.progress, 0) / networkCourses.length)
    : 0;
  const currentCourse = networkCourses.find((course) => course.status === "in_progress")
    || networkCourses.find((course) => course.status === "available");
  const level = Math.max(1, Math.floor(completedCourses / 5) + 1);
  const [spiderPose, setSpiderPose] = useState({ x: 50, y: 36.4, angle: 0, moving: false });
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [webZoom, setWebZoom] = useState(1);
  const activeCourse = networkCourses.find((course) => course.id === activeNode);

  function moveSpider(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" && event.buttons === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;
    const pointer = {
      x: Math.max(0, Math.min(100, 50 + (rawX - 50) / webZoom)),
      y: Math.max(0, Math.min(100, 50 + (rawY - 50) / webZoom)),
    };
    const next = closestPointOnDevelopmentWeb(pointer);
    setSpiderPose((previous) => {
      const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
      const angle = distance > 0.35
        ? Math.atan2(next.y - previous.y, next.x - previous.x) * 180 / Math.PI + 90
        : previous.angle;
      return { ...next, angle, moving: distance > 0.15 };
    });
    const nearestNode = networkCourses
      .map((course) => ({
        id: course.id,
        distance: Math.hypot(pointer.x - course.left, pointer.y - course.top),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    setActiveNode(nearestNode && nearestNode.distance < 6 ? nearestNode.id : null);
  }

  function changeWebZoom(nextZoom: number) {
    setWebZoom(Math.max(.65, Math.min(1.8, Math.round(nextZoom * 10) / 10)));
  }

  return (
    <section className={"panel development-card " + (compact ? "development-card--compact" : "")}>
      <div className="section-heading development-card__heading">
        <div>
          <span className="eyebrow">Персональная карта</span>
          <h2>Сеть развития</h2>
          <p>Каждый завершённый курс укрепляет вашу профессиональную сеть</p>
        </div>
        <div className="development-card__badges">
          {demoMode && <span className="development-demo-badge">Демо · 50 курсов</span>}
          {!compact && <span className="development-level">Уровень {level}</span>}
        </div>
      </div>
      <div className="development-card__body">
        <div
          className="development-map"
          aria-label="Интерактивная карта назначенных курсов"
          onPointerMove={moveSpider}
          onPointerLeave={() => {
            setSpiderPose({ x: 50, y: 36.4, angle: 0, moving: false });
            setActiveNode(null);
          }}
          onWheel={(event) => {
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            changeWebZoom(webZoom + (event.deltaY < 0 ? .1 : -.1));
          }}
        >
          <div className="development-map__hint"><span />Курсор по нитям · Ctrl/⌘ + колесо меняет масштаб</div>
          <div className="development-map__viewport" style={{ transform: `scale(${webZoom})` }}>
            <svg className="development-map__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <g className="development-web__depth" transform="translate(.18 .3)">
              {developmentNodePositions.map(([x, y], index) => (
                <line className="development-web__depth-thread" key={`depth-spoke-${index}`} x1="50" y1="50" x2={x} y2={y} />
              ))}
              {developmentRingPoints.map((ring, index) => (
                <path className="development-web__depth-thread" key={`depth-ring-${index}`} d={developmentRingPath(ring)} />
              ))}
              {developmentNodePositions.map(([x, y], index) => {
                const adjacentSegments = [
                  Math.floor(((index - 1 + developmentNodePositions.length) % developmentNodePositions.length) / 3),
                  Math.floor(index / 3) % 4,
                ];
                const openRatio = Math.max(...adjacentSegments.map((segment) => segmentOpenCounts[segment] / 10));
                const openFactor = Math.min(1, .16 + openRatio * .84);
                return openRatio > 0 && (
                  <line
                    className="development-web__depth-thread development-web__depth-thread--open"
                    key={`depth-open-spoke-${index}`}
                    x1="50"
                    y1="50"
                    x2={50 + (x - 50) * openFactor}
                    y2={50 + (y - 50) * openFactor}
                  />
                );
              })}
              {developmentRingPoints.flatMap((ring, ringIndex) =>
                segmentOpenCounts.map((count, segment) => ringIndex < Math.ceil((count / 10) * developmentRingPoints.length) && (
                  <path
                    className="development-web__depth-thread development-web__depth-thread--open"
                    d={developmentRingArcPath(ring, segment)}
                    key={`depth-open-ring-${ringIndex}-${segment}`}
                  />
                )),
              )}
            </g>
            <path className="development-web__segment development-web__segment--1" d="M50 50 50 7 92 50Z" />
            <path className="development-web__segment development-web__segment--2" d="M50 50 92 50 50 93Z" />
            <path className="development-web__segment development-web__segment--3" d="M50 50 50 93 8 50Z" />
            <path className="development-web__segment development-web__segment--4" d="M50 50 8 50 50 7Z" />
            {developmentNodePositions.map(([x, y], index) => {
              const adjacentSegments = [
                Math.floor(((index - 1 + developmentNodePositions.length) % developmentNodePositions.length) / 3),
                Math.floor(index / 3) % 4,
              ];
              const openRatio = Math.max(...adjacentSegments.map((segment) => segmentOpenCounts[segment] / 10));
              const openFactor = Math.min(1, .16 + openRatio * .84);
              return (
                <g key={`spoke-${index}`}>
                  <line className={`development-web__thread ${index % 3 === 1 ? "development-web__thread--glint" : ""}`} x1="50" y1="50" x2={x} y2={y} />
                  {openRatio > 0 && (
                    <line
                      className="development-web__thread development-web__thread--open"
                      x1="50"
                      y1="50"
                      x2={50 + (x - 50) * openFactor}
                      y2={50 + (y - 50) * openFactor}
                    />
                  )}
                </g>
              );
            })}
            {developmentRingPoints.map((ring, index) => (
              <path
                className={`development-web__ring development-web__ring--${index + 1}`}
                key={`ring-${index}`}
                d={developmentRingPath(ring)}
              />
            ))}
            {developmentRingPoints.flatMap((ring, ringIndex) =>
              segmentOpenCounts.map((count, segment) => ringIndex < Math.ceil((count / 10) * developmentRingPoints.length) && (
                <path
                  className="development-web__ring development-web__ring--open"
                  d={developmentRingArcPath(ring, segment)}
                  key={`open-ring-${ringIndex}-${segment}`}
                />
              )),
            )}
            {developmentDewPoints.map((point, index) => (
              <g className="development-web__dew" key={`dew-${index}`}>
                <circle cx={point.x} cy={point.y} r=".8" />
                <circle className="development-web__dew-shine" cx={point.x - .22} cy={point.y - .22} r=".2" />
              </g>
            ))}
            </svg>
            {developmentSegmentNames.map((name, index) => {
              const positions = [[69, 22], [78, 72], [31, 78], [22, 28]] as const;
              return <span className={`development-segment-label development-segment-label--${index + 1}`} style={{ left: `${positions[index][0]}%`, top: `${positions[index][1]}%` }} key={name}>{name}<small>10 курсов</small></span>;
            })}
            {developmentNodePositions.map(([left, top], index) => (
              <span className="development-map__anchor" style={{ left: `${left}%`, top: `${top}%` }} key={`anchor-${index}`} />
            ))}
            <div
              className={`development-map__spider ${spiderPose.moving ? "development-map__spider--moving" : ""} ${activeCourse?.status === "locked" ? "development-map__spider--locked" : ""}`}
              style={{
                left: `${spiderPose.x}%`,
                top: `${spiderPose.y}%`,
                transform: `translate(-50%, -50%) rotate(${spiderPose.angle}deg)`,
              }}
              aria-hidden="true"
            >
              <SmartisSpiderMark />
            </div>
            <div className="development-map__center">
              <strong>{averageProgress}%</strong>
              <span>общий прогресс</span>
            </div>
            {networkCourses.map((course) => (
              <button
                className={`development-course-dot development-course-dot--${course.status} ${activeNode === course.id ? "development-course-dot--active" : ""}`}
                style={{ left: `${course.left}%`, top: `${course.top}%` }}
                type="button"
                key={course.id}
                aria-label={`${course.title}: ${course.status === "locked" ? "закрыт" : `${course.progress}%`}`}
                onClick={() => { if (!demoMode) onNavigate("trajectory"); }}
                onFocus={() => setActiveNode(course.id)}
                onBlur={() => setActiveNode(null)}
              >
                {course.status === "completed" && <CheckCircle2 />}
              </button>
            ))}
            {activeCourse && (
              <div className={`development-course-tooltip ${activeCourse.top < 18 ? "development-course-tooltip--below" : ""}`} style={{ left: `${activeCourse.left}%`, top: `${activeCourse.top}%` }}>
                <strong>{activeCourse.title}</strong>
                <span>{activeCourse.status === "locked" ? "Закрыт · завершите предыдущие курсы" : `${activeCourse.progress}% пройдено`}</span>
              </div>
            )}
          </div>
          <div className="development-map__zoom" aria-label="Масштаб паутины" onPointerMove={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Уменьшить масштаб" disabled={webZoom <= .65} onClick={() => changeWebZoom(webZoom - .1)}><Minus /></button>
            <button className="development-map__zoom-value" type="button" aria-label="Сбросить масштаб до 100%" onClick={() => changeWebZoom(1)}>
              <RotateCcw /><span>{Math.round(webZoom * 100)}%</span>
            </button>
            <button type="button" aria-label="Увеличить масштаб" disabled={webZoom >= 1.8} onClick={() => changeWebZoom(webZoom + .1)}><Plus /></button>
          </div>
        </div>
        <aside className="development-summary">
          <div>
            <span>Доступно курсов</span>
            <strong>{openCourses} из {networkCourses.length}</strong>
          </div>
          <div>
            <span>Завершено</span>
            <strong>{completedCourses}</strong>
          </div>
          <div>
            <span>Траектории</span>
            <strong>4 сегмента</strong>
          </div>
          <div className="development-summary__focus">
            <span>Текущий фокус</span>
            <strong>{currentCourse?.title || (networkCourses.length ? "Сеть завершена" : "Ожидает назначения")}</strong>
            {currentCourse && <small>{currentCourse.progress}% · следующий узел уже формируется</small>}
          </div>
          <button className="secondary-button" type="button" onClick={() => onNavigate("trajectory")} disabled={demoMode}>
            Открыть обучение <ChevronRight />
          </button>
        </aside>
      </div>
    </section>
  );
}

function DevelopmentNetworkView({ token, onNavigate }: { token: string; onNavigate: (view: ViewId) => void }) {
  const [learning, setLearning] = useState<MyLearning>({ paths: [], standalone: [] });
  useEffect(() => {
    apiRequest<MyLearning>("/my-learning/", token).then(setLearning).catch(() => undefined);
  }, [token]);
  return (
    <>
      <PageHeader title="Сеть развития" subtitle="Ваши знания, курсы и достижения в одной карте" />
      <DevelopmentNetwork learning={learning} onNavigate={onNavigate} />
    </>
  );
}

function HomeView({ user, token, onNavigate }: { user: User; token: string; onNavigate: (view: ViewId) => void }) {
  const [learning, setLearning] = useState<MyLearning>({ paths: [], standalone: [] });
  useEffect(() => {
    apiRequest<MyLearning>("/my-learning/", token).then(setLearning).catch(() => undefined);
  }, [token]);
  const allCourses = [...learning.paths.flatMap((path) => path.courses), ...learning.standalone];
  const current = allCourses.find((item) => item.status === "in_progress")
    || allCourses.find((item) => item.status === "available");
  const completed = allCourses.filter((item) => item.status === "completed").length;
  return (
    <>
      <PageHeader title={"Добрый день, " + (user.first_name || user.email)} subtitle={learning.paths[0] ? `Траектория «${learning.paths[0].title}»` : "Ваше обучение"} />
      <section className="stats">
        {[
          ["Текущий курс", current ? `${current.progress}%` : "—", current?.course_title || "Нет назначений"],
          ["Курсы", `${completed} / ${allCourses.length}`, "Пройдено"],
          ["Траектории", String(learning.paths.length), learning.paths.some((path) => path.status === "completed") ? "Есть завершённые" : "В процессе"],
        ].map(([label, value, note]) => (
          <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
        ))}
      </section>
      <section className="panel current-course">
        <div><span className="eyebrow">Текущий курс</span><h2>{current?.course_title || "Обучение пока не назначено"}</h2><p>{current ? `${current.lessons.filter((lesson) => lesson.completed).length} из ${current.lessons.length} уроков · ${current.course_minutes} мин` : "Новые курсы появятся здесь после назначения"}</p></div>
        <button className="primary-button" type="button" onClick={() => onNavigate("trajectory")}>{current ? "Продолжить" : "Открыть обучение"} <ChevronRight /></button>
        <div className="progress"><span style={{ width: `${current?.progress || 0}%` }} /></div>
      </section>
      <DevelopmentNetwork learning={learning} compact onNavigate={onNavigate} />
    </>
  );
}

const roleAccessCards = [
  { role: "employee", title: "Сотрудник", access: "Проходит курсы, траектории и тесты. Не видит данные персонала." },
  { role: "author", title: "Автор курсов", access: "Создаёт и редактирует свои курсы и проекты обучения." },
  { role: "hr", title: "HR-менеджер", access: "Работает с сотрудниками, подбором и HR-аналитикой." },
  { role: "admin", title: "Администратор", access: "Полный доступ, пользователи, роли, HCM и все курсы." },
  { role: "leader", title: "Руководитель", access: "Видит сотрудников только своего отдела. Зарплаты — по отдельному разрешению." },
];

function UsersView({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendingUser, setResendingUser] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userBusy, setUserBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", first_name: "", last_name: "", role: "employee", department: "", can_view_compensation: false,
  });
  const [departmentName, setDepartmentName] = useState("");
  const [userForm, setUserForm] = useState({
    email: "", first_name: "", last_name: "", role: "employee", department: "", can_view_compensation: false,
  });

  async function load() {
    try {
      const [userData, departmentData] = await Promise.all([
        apiRequest<User[]>("/users/", token),
        apiRequest<Department[]>("/departments/", token),
      ]);
      setUsers(userData);
      setDepartments(departmentData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить данные");
    }
  }

  useEffect(() => { void load(); }, []);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await apiRequest<User>("/users/", token, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          department: form.department ? Number(form.department) : null,
        }),
      });
      setForm({ email: "", first_name: "", last_name: "", role: "employee", department: "", can_view_compensation: false });
      setShowForm(false);
      setNotice("Пользователь создан, приглашение отправлено на корпоративную почту");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать сотрудника");
    }
  }

  async function resendInvitation(user: User) {
    setResendingUser(user.id);
    setError("");
    setNotice("");
    try {
      const response = await apiRequest<{ detail: string }>(`/users/${user.id}/resend-invitation/`, token, { method: "POST" });
      setNotice(`${response.detail}: ${user.email}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отправить приглашение");
    } finally {
      setResendingUser(null);
    }
  }

  function openUser(user: User) {
    setError("");
    setNotice("");
    setEditingUser(user);
    setUserForm({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department ? String(user.department) : "",
      can_view_compensation: user.can_view_compensation,
    });
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    setUserBusy(true);
    setError("");
    try {
      await apiRequest<User>(`/users/${editingUser.id}/`, token, {
        method: "PATCH",
        body: JSON.stringify({
          ...userForm,
          department: userForm.department ? Number(userForm.department) : null,
        }),
      });
      setEditingUser(null);
      setNotice("Данные пользователя и права доступа обновлены");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить пользователя");
    } finally {
      setUserBusy(false);
    }
  }

  async function changeUserAccess(action: "block" | "restore") {
    if (!editingUser) return;
    setUserBusy(true);
    setError("");
    try {
      const updated = await apiRequest<User>(`/users/${editingUser.id}/${action}/`, token, { method: "POST" });
      setEditingUser(updated);
      setNotice(action === "block" ? "Доступ пользователя заблокирован" : updated.status === "invited" ? "Доступ возвращён в статус приглашения" : "Доступ пользователя восстановлен");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить доступ");
    } finally {
      setUserBusy(false);
    }
  }

  async function createDepartment(event: FormEvent) {
    event.preventDefault();
    if (!departmentName.trim()) return;
    try {
      await apiRequest<Department>("/departments/", token, {
        method: "POST",
        body: JSON.stringify({
          name: departmentName,
          code: "dept-" + Date.now(),
        }),
      });
      setDepartmentName("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать отдел");
    }
  }

  return (
    <>
      <PageHeader
        title="Пользователи"
        subtitle="Учётные записи, роли, отделы и приглашения"
        action={
          <button className="primary-button" type="button" onClick={() => setShowForm(true)}>
            <Plus /> Добавить пользователя
          </button>
        }
      />
      <section className="role-access-grid" aria-label="Права ролей">
        {roleAccessCards.map((item) => (
          <article className="role-access-card" key={item.role}>
            <span className={`role-access-card__badge role-access-card__badge--${item.role}`}>{item.title}</span>
            <p>{item.access}</p>
          </article>
        ))}
      </section>
      {showForm && (
        <section className="panel form-panel">
          <div className="section-heading">
            <div><h2>Новый пользователь</h2><p>Выберите роль — доступы применятся автоматически</p></div>
            <button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Закрыть"><X /></button>
          </div>
          <form className="user-form" onSubmit={createUser}>
            <label>Имя<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></label>
            <label>Фамилия<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Роль<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, can_view_compensation: ["hr", "leader"].includes(e.target.value) ? form.can_view_compensation : false })}>
              <option value="employee">Сотрудник</option><option value="hr">HR-менеджер</option>
              <option value="admin">Администратор</option><option value="author">Автор курсов</option>
              <option value="leader">Руководитель</option>
            </select></label>
            <label>Отдел<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Без отдела</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            {["hr", "leader"].includes(form.role) && <label className="user-compensation-access"><input type="checkbox" checked={form.can_view_compensation} onChange={(event) => setForm({ ...form, can_view_compensation: event.target.checked })} /><span><strong>Доступ к оплате труда</strong><small>Показывать оклад и премии в карточках сотрудников</small></span></label>}
            <button className="primary-button" type="submit">Создать приглашение</button>
          </form>
        </section>
      )}
      <section className="panel department-bar">
        <form onSubmit={createDepartment}>
          <label>Новый отдел<input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Например, Поддержка" /></label>
          <button className="secondary-button" type="submit">Добавить отдел</button>
        </form>
        <span>{departments.length} отделов</span>
      </section>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice users-notice"><CheckCircle2 />{notice}</p>}
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Сотрудник</th><th>Отдел</th><th>Роль</th><th>Статус</th><th aria-label="Действия" /></tr></thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.first_name} {item.last_name}</strong><span>{item.email}</span></td>
                  <td>{item.department_name || "—"}</td><td>{item.role_label}{item.can_view_compensation && item.role !== "admin" && <span>Оплата труда</span>}</td>
                  <td><span className={"status status--" + item.status}>{item.status_label}</span></td>
                  <td><button className="secondary-button user-invite-button" type="button" onClick={() => openUser(item)}><Settings2 />Управлять</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {editingUser && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !userBusy) setEditingUser(null);
        }}>
          <section className="hcm-dialog user-access-dialog" role="dialog" aria-modal="true" aria-labelledby="user-access-title">
            <header>
              <div><span className="eyebrow">Учётная запись</span><h2 id="user-access-title">Пользователь и права</h2><p>Изменения роли применяются сразу после сохранения</p></div>
              <button className="icon-button" type="button" disabled={userBusy} onClick={() => setEditingUser(null)} aria-label="Закрыть"><X /></button>
            </header>
            <form className="hcm-form" onSubmit={saveUser}>
              <div className="hcm-form__grid">
                <label>Имя<input value={userForm.first_name} onChange={(event) => setUserForm({ ...userForm, first_name: event.target.value })} required /></label>
                <label>Фамилия<input value={userForm.last_name} onChange={(event) => setUserForm({ ...userForm, last_name: event.target.value })} required /></label>
                <label className="hcm-form__wide">Корпоративная почта<input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required /></label>
                <label>Роль<select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value, can_view_compensation: ["hr", "leader"].includes(event.target.value) ? userForm.can_view_compensation : false })}><option value="employee">Сотрудник</option><option value="hr">HR-менеджер</option><option value="admin">Администратор</option><option value="author">Автор курсов</option><option value="leader">Руководитель</option></select></label>
                <label>Отдел<select value={userForm.department} onChange={(event) => setUserForm({ ...userForm, department: event.target.value })}><option value="">Без отдела</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                {["hr", "leader"].includes(userForm.role) && <label className="hcm-form__wide user-compensation-access"><input type="checkbox" checked={userForm.can_view_compensation} onChange={(event) => setUserForm({ ...userForm, can_view_compensation: event.target.checked })} /><span><strong>Разрешить просмотр оплаты труда</strong><small>Пользователь увидит оклады, месячные и квартальные премии.</small></span></label>}
              </div>
              <div className="user-access-state">
                <span className={"status status--" + editingUser.status}>{editingUser.status_label}</span>
                <p>{editingUser.status === "blocked" ? "Вход и действующие сессии отключены." : editingUser.status === "invited" ? "Пользователь ещё не активировал доступ." : "Пользователь может входить в систему."}</p>
              </div>
              {error && <p className="form-error">{error}</p>}
              <footer className="user-access-actions">
                <div>
                  {editingUser.status === "invited" && <button className="secondary-button" type="button" disabled={userBusy || resendingUser === editingUser.id} onClick={() => void resendInvitation(editingUser)}><RefreshCw />Отправить приглашение снова</button>}
                  {editingUser.status === "blocked"
                    ? <button className="secondary-button" type="button" disabled={userBusy} onClick={() => void changeUserAccess("restore")}>Восстановить доступ</button>
                    : <button className="danger-button" type="button" disabled={userBusy} onClick={() => void changeUserAccess("block")}>Заблокировать</button>}
                </div>
                <div><button className="secondary-button" type="button" onClick={() => setEditingUser(null)}>Отмена</button><button className="primary-button" type="submit" disabled={userBusy}>{userBusy ? "Сохраняем…" : "Сохранить"}</button></div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const auditFieldLabels: Record<string, string> = {
  email: "Почта",
  role: "Роль",
  status: "Статус",
  department_id: "Отдел",
  position_id: "Должность",
  employee_name: "Сотрудник",
  fields: "Изменённые поля",
  compensation_changed: "Изменена оплата",
  source: "Источник",
  total: "Всего",
  created: "Создано",
  updated: "Обновлено",
  row_number: "Строка импорта",
  batch_id: "Пакет импорта",
  can_view_compensation: "Доступ к оплате труда",
};

function auditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (Array.isArray(value)) return value.map((item) => auditFieldLabels[String(item)] || String(item)).join(", ");
  if (typeof value === "object") {
    const pair = value as { before?: unknown; after?: unknown };
    if ("before" in pair || "after" in pair) return `${auditValue(pair.before)} → ${auditValue(pair.after)}`;
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${auditFieldLabels[key] || key}: ${auditValue(item)}`).join(" · ");
  }
  return String(value);
}

function AuditLogView({ token }: { token: string }) {
  const emptyFilters = { q: "", entity_type: "", action: "", actor: "", date_from: "", date_to: "" };
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    setLoading(true);
    setError("");
    apiRequest<AuditResponse>(`/audit-events/?${query.toString()}`, token)
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить журнал"))
      .finally(() => setLoading(false));
  }, [token, filters]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setFilters({ ...draft });
  }

  const today = new Date().toDateString();
  const todayCount = data?.results.filter((item) => new Date(item.created_at).toDateString() === today).length || 0;
  const activeActors = new Set(data?.results.map((item) => item.actor_id).filter(Boolean)).size;

  return (
    <>
      <PageHeader title="Журнал действий" subtitle="Изменения пользователей, персонала, обучения и документов" />
      <section className="audit-metrics">
        <article><span>Найдено событий</span><strong>{data?.total ?? "—"}</strong><small>с учётом фильтров</small></article>
        <article><span>Сегодня</span><strong>{todayCount}</strong><small>в загруженной выборке</small></article>
        <article><span>Участники</span><strong>{activeActors}</strong><small>в загруженной выборке</small></article>
      </section>
      <form className="panel audit-filters" onSubmit={applyFilters}>
        <label className="audit-search"><Search /><input value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} placeholder="Пользователь, объект или номер" /></label>
        <label>Раздел<select value={draft.entity_type} onChange={(event) => setDraft({ ...draft, entity_type: event.target.value })}><option value="">Все разделы</option>{data?.filters.entity_types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Действие<select value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })}><option value="">Все действия</option>{data?.filters.actions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Кто изменил<select value={draft.actor} onChange={(event) => setDraft({ ...draft, actor: event.target.value })}><option value="">Все пользователи</option>{data?.filters.actors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>С даты<input type="date" value={draft.date_from} onChange={(event) => setDraft({ ...draft, date_from: event.target.value })} /></label>
        <label>По дату<input type="date" value={draft.date_to} onChange={(event) => setDraft({ ...draft, date_to: event.target.value })} /></label>
        <div className="audit-filter-actions">
          <button className="secondary-button" type="button" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); }}>Сбросить</button>
          <button className="primary-button" type="submit">Применить</button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
      <section className="panel audit-log">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Дата и время</th><th>Кто</th><th>Раздел</th><th>Действие</th><th>Объект</th><th aria-label="Подробнее" /></tr></thead>
            <tbody>
              {data?.results.map((event) => (
                <tr key={event.id}>
                  <td><strong>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.created_at))}</strong><span>{event.ip_address || "IP не записан"}</span></td>
                  <td><strong>{event.actor_name || "Система"}</strong><span>{event.actor_email}</span></td>
                  <td><span className="audit-entity">{event.entity_label}</span></td>
                  <td><strong>{event.action_label}</strong></td>
                  <td><strong>{event.entity_title}</strong><span>#{event.entity_id}</span></td>
                  <td><button className="icon-button" type="button" onClick={() => setSelected(event)} aria-label={`Подробнее о событии ${event.id}`}><Eye /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !data?.results.length && <div className="audit-empty"><Search /><strong>События не найдены</strong><span>Измените параметры фильтра</span></div>}
        {loading && <div className="audit-empty"><RefreshCw /><strong>Загружаем журнал…</strong></div>}
        {!!data && data.total > data.results.length && <footer className="audit-limit-note">Показаны последние {data.results.length} из {data.total} событий. Уточните фильтры для поиска.</footer>}
      </section>
      {selected && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="hcm-dialog audit-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
            <header><div><span className="eyebrow">{selected.entity_label}</span><h2 id="audit-detail-title">{selected.action_label}</h2><p>{new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "medium" }).format(new Date(selected.created_at))}</p></div><button className="icon-button" type="button" onClick={() => setSelected(null)} aria-label="Закрыть"><X /></button></header>
            <div className="audit-detail-summary"><div><span>Кто</span><strong>{selected.actor_name || "Система"}</strong><small>{selected.actor_email}</small></div><div><span>Объект</span><strong>{selected.entity_title}</strong><small>{selected.entity_type} #{selected.entity_id}</small></div><div><span>IP-адрес</span><strong>{selected.ip_address || "Не записан"}</strong></div></div>
            <section className="audit-changes">
              <div className="section-heading"><div><h3>Что изменилось</h3><p>Секретные значения автоматически скрываются</p></div></div>
              {Object.entries(selected.changes).filter(([, value]) => value !== null).map(([key, value]) => <div key={key}><span>{auditFieldLabels[key] || key.replaceAll("_", " ")}</span><strong>{auditValue(value)}</strong></div>)}
              {!Object.keys(selected.changes).length && <p>Дополнительных данных нет</p>}
            </section>
          </section>
        </div>
      )}
    </>
  );
}

function SettingsView({ token }: { token: string }) {
  const [form, setForm] = useState<SystemSettingsConfig | null>(null);
  const [domains, setDomains] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiRequest<SystemSettingsConfig>("/system-settings/", token)
      .then((configuration) => {
        setForm(configuration);
        setDomains(configuration.corporate_email_domains.join("\n"));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить настройки"))
      .finally(() => setLoading(false));
  }, [token]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<SystemSettingsConfig>("/system-settings/", token, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          corporate_email_domains: domains.split(/[\s,;]+/).map((domain) => domain.trim()).filter(Boolean),
        }),
      });
      setForm(updated);
      setDomains(updated.corporate_email_domains.join("\n"));
      setNotice("Настройки сохранены и уже применяются");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="panel settings-loading"><RefreshCw /><strong>Загружаем настройки…</strong></section>;
  if (!form) return <><PageHeader title="Настройки" subtitle="Параметры платформы" />{error && <p className="form-error">{error}</p>}</>;

  const notificationOptions: Array<{ key: "notify_learning" | "notify_interviews" | "notify_hr_events" | "notify_invitations"; title: string; text: string }> = [
    { key: "notify_learning", title: "Обучение", text: "Назначенные и незавершённые курсы" },
    { key: "notify_interviews", title: "Собеседования", text: "Предстоящие встречи и участие в интервью" },
    { key: "notify_hr_events", title: "Кадровые события", text: "Цели, изменения и сроки сотрудника" },
    { key: "notify_invitations", title: "Приглашения", text: "Ожидающие активации учётные записи" },
  ];

  return (
    <>
      <PageHeader
        title="Настройки"
        subtitle="Профиль компании, доступы и правила системных уведомлений"
        action={<button className="primary-button" type="submit" form="system-settings-form" disabled={saving}><Save />{saving ? "Сохраняем…" : "Сохранить"}</button>}
      />
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice settings-notice"><CheckCircle2 />{notice}</p>}
      <form className="settings-layout" id="system-settings-form" onSubmit={saveSettings}>
        <div className="settings-main">
          <section className="panel settings-section">
            <header><Building2 /><div><h2>Профиль компании</h2><p>Название платформы и контакт для сотрудников</p></div></header>
            <div className="settings-fields">
              <label>Название платформы<input value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} required /></label>
              <label>Юридическое название<input value={form.legal_name} onChange={(event) => setForm({ ...form, legal_name: event.target.value })} placeholder="Например, ООО «Смартис»" /></label>
              <label>Почта поддержки<input type="email" value={form.support_email} onChange={(event) => setForm({ ...form, support_email: event.target.value })} placeholder="support@smartis.bi" /></label>
            </div>
          </section>
          <section className="panel settings-section">
            <header><Users /><div><h2>Корпоративный доступ</h2><p>По одному домену в строке, без символа @</p></div></header>
            <div className="settings-fields settings-fields--access">
              <label className="settings-domains">Разрешённые домены<textarea value={domains} onChange={(event) => setDomains(event.target.value)} placeholder={"smartis.bi\nsmartis.team"} /></label>
              <label>Срок приглашения<input type="number" min="1" max="30" value={form.invitation_expiry_days} onChange={(event) => setForm({ ...form, invitation_expiry_days: Number(event.target.value) })} /><span>от 1 до 30 дней</span></label>
            </div>
          </section>
          <section className="panel settings-section">
            <header><Bell /><div><h2>Системные уведомления</h2><p>Какие события попадут в центр задач пользователей</p></div></header>
            <div className="settings-notification-grid">
              {notificationOptions.map((option) => (
                <label className={form[option.key] ? "settings-toggle-card settings-toggle-card--active" : "settings-toggle-card"} key={option.key}>
                  <span><strong>{option.title}</strong><small>{option.text}</small></span>
                  <input type="checkbox" checked={form[option.key]} onChange={(event) => setForm({ ...form, [option.key]: event.target.checked })} />
                  <i aria-hidden="true" />
                </label>
              ))}
            </div>
          </section>
        </div>
        <aside className="settings-aside">
          <section className="panel settings-summary">
            <span className="eyebrow">Текущая политика</span>
            <dl><div><dt>Доменов</dt><dd>{domains.split(/[\s,;]+/).filter(Boolean).length}</dd></div><div><dt>Приглашение</dt><dd>{form.invitation_expiry_days} дн.</dd></div><div><dt>Каналов</dt><dd>{notificationOptions.filter((option) => form[option.key]).length} из 4</dd></div></dl>
            <p>{form.updated_at ? `Последнее сохранение: ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(form.updated_at))}` : "Настройки ещё не изменялись"}</p>
          </section>
          <section className="panel settings-security">
            <Settings2 /><div><strong>Секреты остаются на сервере</strong><p>SMTP-пароль, ключ Django и параметры базы не выводятся в интерфейс и задаются при развёртывании.</p></div>
          </section>
        </aside>
      </form>
    </>
  );
}

function HcmMetricCards({ summary, leaderView = false }: { summary: HcmSummary | null; leaderView?: boolean }) {
  const metrics = [
    ["Сотрудники", summary?.employees_total ?? "—", "Активные карточки"],
    ["Испытательный срок", summary?.on_probation ?? "—", "Требуют внимания"],
    ["План развития", summary ? `${summary.average_development_progress}%` : "—", "Средний прогресс"],
    ...(!leaderView ? [["Кандидаты", summary?.candidates_total ?? "—", `${summary?.open_positions ?? "—"} открытых позиций`]] : []),
  ];
  return (
    <section className="hcm-metrics">
      {metrics.map(([label, value, note]) => (
        <article className="hcm-metric" key={label}>
          <span>{label}</span><strong>{value}</strong><small>{note}</small>
        </article>
      ))}
    </section>
  );
}

type EmployeeProfileTab = "overview" | "onboarding" | "learning" | "history" | "goals" | "documents";

function displayDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("ru-RU").format(new Date(`${value}T00:00:00`)) : "—";
}

function EmployeeProfileView({
  employee,
  token,
  canManage,
  onBack,
  onEdit,
}: {
  employee: EmployeeProfile;
  token: string;
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<EmployeeProfileTab>("overview");
  const [goals, setGoals] = useState<EmployeeGoal[]>([]);
  const [history, setHistory] = useState<EmploymentEvent[]>([]);
  const [learning, setLearning] = useState<EmployeeLearning[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingPlan | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [goalForm, setGoalForm] = useState({ title: "", description: "", due_date: "", progress: "0", status: "planned" });
  const [historyForm, setHistoryForm] = useState({ event_type: "other", title: "", note: "", effective_date: "" });
  const [learningForm, setLearningForm] = useState({ course: "", status: "assigned", progress: "0" });
  const [documentForm, setDocumentForm] = useState({ title: "", document_type: "", number: "", issue_date: "", expires_at: "" });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [employee.id]);

  async function loadProfile() {
    try {
      const [nextGoals, nextHistory, nextLearning, nextDocuments, nextCourses, nextOnboarding] = await Promise.all([
        apiRequest<EmployeeGoal[]>(`/employees/${employee.id}/goals/`, token),
        apiRequest<EmploymentEvent[]>(`/employees/${employee.id}/history/`, token),
        apiRequest<EmployeeLearning[]>(`/employees/${employee.id}/learning/`, token),
        apiRequest<EmployeeDocument[]>(`/employees/${employee.id}/documents/`, token),
        apiRequest<Course[]>("/courses/", token),
        apiRequest<OnboardingPlan | null>(`/employees/${employee.id}/onboarding/`, token),
      ]);
      setGoals(nextGoals);
      setHistory(nextHistory);
      setLearning(nextLearning);
      setDocuments(nextDocuments);
      setCourses(nextCourses);
      setOnboarding(nextOnboarding);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить карточку");
    }
  }

  useEffect(() => { void loadProfile(); }, [employee.id, token]);
  useEffect(() => { setShowAdd(false); setError(""); }, [tab]);

  async function createGoal(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/employees/${employee.id}/goals/`, token, {
        method: "POST",
        body: JSON.stringify({ ...goalForm, due_date: goalForm.due_date || null, progress: Number(goalForm.progress) }),
      });
      setGoalForm({ title: "", description: "", due_date: "", progress: "0", status: "planned" });
      setShowAdd(false);
      await loadProfile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось добавить цель"); }
  }

  async function completeGoal(goal: EmployeeGoal) {
    try {
      await apiRequest(`/employee-goals/${goal.id}/`, token, {
        method: "PATCH", body: JSON.stringify({ status: "completed", progress: 100 }),
      });
      await loadProfile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось обновить цель"); }
  }

  async function createHistoryEvent(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/employees/${employee.id}/history/`, token, {
        method: "POST", body: JSON.stringify(historyForm),
      });
      setHistoryForm({ event_type: "other", title: "", note: "", effective_date: "" });
      setShowAdd(false);
      await loadProfile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось добавить событие"); }
  }

  async function assignCourse(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/employees/${employee.id}/learning/`, token, {
        method: "POST",
        body: JSON.stringify({ course: Number(learningForm.course), status: learningForm.status, progress: Number(learningForm.progress) }),
      });
      setLearningForm({ course: "", status: "assigned", progress: "0" });
      setShowAdd(false);
      await loadProfile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось назначить курс"); }
  }

  async function changeLearningStatus(item: EmployeeLearning, status: string) {
    const progress = status === "completed" ? 100 : status === "in_progress" ? Math.max(item.progress, 10) : item.progress;
    try {
      await apiRequest(`/employee-learning/${item.id}/`, token, {
        method: "PATCH", body: JSON.stringify({ status, progress }),
      });
      await loadProfile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось обновить обучение"); }
  }

  async function createDocument(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest(`/employees/${employee.id}/documents/`, token, {
        method: "POST",
        body: JSON.stringify({
          ...documentForm,
          issue_date: documentForm.issue_date || null,
          expires_at: documentForm.expires_at || null,
        }),
      });
      setDocumentForm({ title: "", document_type: "", number: "", issue_date: "", expires_at: "" });
      setShowAdd(false);
      await loadProfile();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось добавить документ"); }
  }

  async function toggleOnboardingItem(itemId: string) {
    if (!onboarding) return;
    try {
      const checklist = onboarding.checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item,
      );
      const updated = await apiRequest<OnboardingPlan>(`/employees/${employee.id}/onboarding/`, token, {
        method: "PATCH",
        body: JSON.stringify({ checklist }),
      });
      setOnboarding(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить онбординг");
    }
  }

  const availableCourses = courses.filter((course) => !learning.some((item) => item.course === course.id));
  const tabs: { id: EmployeeProfileTab; label: string }[] = [
    { id: "overview", label: "Обзор" }, { id: "onboarding", label: "Онбординг" }, { id: "learning", label: "Обучение" },
    { id: "history", label: "История" }, { id: "goals", label: "Цели" }, { id: "documents", label: "Документы" },
  ];
  const addLabels: Partial<Record<EmployeeProfileTab, string>> = {
    learning: "Назначить курс", history: "Добавить событие", goals: "Добавить цель", documents: "Добавить документ",
  };

  return (
    <div className="employee-profile-page">
      <header className="employee-profile-header">
        <button className="secondary-button" type="button" onClick={onBack}><ChevronLeft /> Сотрудники</button>
        <div className="employee-profile-person">
          <span>{employee.first_name.slice(0, 1)}{employee.last_name.slice(0, 1)}</span>
          <div><h1>{employee.full_name}</h1><p>{employee.position_name || "Должность не указана"} · {employee.department_name || "Без отдела"}</p></div>
        </div>
        {canManage && <button className="secondary-button" type="button" onClick={onEdit}><Pencil /> Редактировать</button>}
      </header>
      <nav className="employee-profile-tabs" aria-label="Карточка сотрудника">
        {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "employee-profile-tab employee-profile-tab--active" : "employee-profile-tab"} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>
      {error && <p className="form-error">{error}</p>}

      {tab === "overview" && (
        <div className="employee-overview">
          <section className="panel employee-overview__main">
            <div className="section-heading"><div><h2>Основная информация</h2><p>Актуальные данные сотрудника</p></div></div>
            <dl className="employee-details">
              <div><dt>Корпоративная почта</dt><dd>{employee.email}</dd></div>
              <div><dt>Табельный номер</dt><dd>{employee.employee_number}</dd></div>
              <div><dt>Отдел</dt><dd>{employee.department_name || "—"}</dd></div>
              <div><dt>Должность</dt><dd>{employee.position_name || "—"}</dd></div>
              <div><dt>Грейд</dt><dd>{employee.grade || "—"}</dd></div>
              <div><dt>Дата выхода</dt><dd>{displayDate(employee.hire_date)}</dd></div>
              <div><dt>Стаж</dt><dd>{employee.tenure_years === null ? "—" : `${employee.tenure_years} г.`}</dd></div>
              <div><dt>Статус</dt><dd><span className={`status status--${employee.status}`}>{employee.status_label}</span></dd></div>
            </dl>
          </section>
          <aside className="panel employee-development">
            <h2>Развитие</h2>
            <div><span>Индивидуальный план</span><strong>{employee.development_progress}%</strong><div className="mini-progress"><i style={{ width: `${employee.development_progress}%` }} /></div></div>
            <div><span>Чек-лист</span><strong>{employee.checklist_score}%</strong><div className="mini-progress"><i style={{ width: `${employee.checklist_score}%` }} /></div></div>
            <div><span>Активные цели</span><strong>{goals.filter((goal) => goal.status !== "completed").length}</strong></div>
          </aside>
          <section className="panel employee-competencies">
            <div className="section-heading"><div><h2>Компетенции</h2><p>Ключевые навыки и зоны экспертизы</p></div></div>
            <div>{employee.competencies ? employee.competencies.split(/[,;\n]/).filter(Boolean).map((item) => <span key={item.trim()}>{item.trim()}</span>) : <p>Компетенции пока не заполнены</p>}</div>
          </section>
          {"salary_base" in employee && (
            <section className="panel employee-compensation">
              <div className="section-heading"><div><h2>Оплата труда</h2><p>Доступна только пользователям с отдельным разрешением</p></div></div>
              <dl>
                <div><dt>Оклад</dt><dd>{employee.salary_base ? `${Number(employee.salary_base).toLocaleString("ru-RU")} ₽` : "—"}</dd></div>
                <div><dt>Месячная премия</dt><dd>{employee.monthly_bonus ? `${Number(employee.monthly_bonus).toLocaleString("ru-RU")} ₽` : "—"}</dd></div>
                <div><dt>Квартальная премия</dt><dd>{employee.quarterly_bonus ? `${Number(employee.quarterly_bonus).toLocaleString("ru-RU")} ₽` : "—"}</dd></div>
              </dl>
            </section>
          )}
        </div>
      )}

      {tab !== "overview" && (
        <section className="employee-profile-section">
          <header><div><h2>{tabs.find((item) => item.id === tab)?.label}</h2><p>{tab === "onboarding" ? "План адаптации нового сотрудника" : tab === "learning" ? "Назначенные курсы и результаты" : tab === "history" ? "Хронология кадровых изменений" : tab === "goals" ? "Индивидуальный план развития" : "Реестр документов сотрудника"}</p></div>{canManage && addLabels[tab] && <button className="primary-button" type="button" onClick={() => setShowAdd((value) => !value)}><Plus /> {addLabels[tab]}</button>}</header>

          {tab === "onboarding" && <>
            {onboarding ? (
              <div className="onboarding-layout">
                <article className="panel onboarding-summary">
                  <header><div><span>{onboarding.status_label}</span><h3>{onboarding.template_name || "План адаптации"}</h3></div><strong>{onboarding.progress}%</strong></header>
                  <div className="mini-progress"><i style={{ width: `${onboarding.progress}%` }} /></div>
                  <dl>
                    <div><dt>Ответственный</dt><dd>{onboarding.responsible_name || "Не назначен"}</dd></div>
                    <div><dt>Срок</dt><dd>{displayDate(onboarding.due_date)}</dd></div>
                    <div><dt>Траектория</dt><dd>{onboarding.learning_path_name || "Без траектории"}</dd></div>
                  </dl>
                </article>
                <section className="panel onboarding-checklist">
                  <div className="section-heading"><div><h3>Чек-лист адаптации</h3><p>Задачи сотрудника и ответственного</p></div></div>
                  <div>{onboarding.checklist.map((item) => (
                    <label key={item.id} className={item.done ? "onboarding-task onboarding-task--done" : "onboarding-task"}>
                      <input type="checkbox" checked={item.done} disabled={!canManage} onChange={() => void toggleOnboardingItem(item.id)} />
                      <span>{item.title}</span>
                    </label>
                  ))}</div>
                </section>
              </div>
            ) : <div className="hcm-empty"><CheckCircle2 /><p>План онбординга не назначен</p></div>}
          </>}

          {tab === "learning" && <>
            {showAdd && <form className="panel employee-inline-form" onSubmit={assignCourse}><label>Курс<select value={learningForm.course} onChange={(e) => setLearningForm({ ...learningForm, course: e.target.value })} required><option value="">Выберите курс</option>{availableCourses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Статус<select value={learningForm.status} onChange={(e) => setLearningForm({ ...learningForm, status: e.target.value })}><option value="assigned">Назначен</option><option value="in_progress">Проходит</option><option value="completed">Завершён</option></select></label><button className="primary-button" type="submit">Назначить</button></form>}
            <div className="employee-learning-list">{learning.map((item) => <article className="panel employee-learning-card" key={item.id}><BookOpen /><div><strong>{item.course_title}</strong><span>Версия {item.course_version} · {item.course_minutes} мин · {item.status_label}</span><div className="mini-progress"><i style={{ width: `${item.progress}%` }} /></div></div>{canManage ? <select aria-label={`Статус курса ${item.course_title}`} value={item.status} onChange={(e) => void changeLearningStatus(item, e.target.value)}><option value="assigned">Назначен</option><option value="in_progress">Проходит</option><option value="completed">Завершён</option></select> : <strong>{item.progress}%</strong>}</article>)}</div>
            {!learning.length && <div className="hcm-empty"><BookOpen /><p>Обучение ещё не назначено</p></div>}
          </>}

          {tab === "history" && <>
            {showAdd && <form className="panel employee-inline-form employee-inline-form--wide" onSubmit={createHistoryEvent}><label>Тип<select value={historyForm.event_type} onChange={(e) => setHistoryForm({ ...historyForm, event_type: e.target.value })}><option value="hired">Приём</option><option value="transfer">Перевод</option><option value="promotion">Повышение</option><option value="review">Оценка</option><option value="other">Другое</option></select></label><label>Дата<input type="date" value={historyForm.effective_date} onChange={(e) => setHistoryForm({ ...historyForm, effective_date: e.target.value })} required /></label><label className="employee-inline-form__wide">Событие<input value={historyForm.title} onChange={(e) => setHistoryForm({ ...historyForm, title: e.target.value })} required /></label><button className="primary-button" type="submit">Добавить</button></form>}
            <div className="employee-timeline">{history.map((item) => <article key={item.id}><i /><time>{displayDate(item.effective_date)}</time><div><span>{item.event_type_label}</span><strong>{item.title}</strong>{item.note && <p>{item.note}</p>}</div></article>)}</div>
            {!history.length && <div className="hcm-empty"><Workflow /><p>Кадровых событий пока нет</p></div>}
          </>}

          {tab === "goals" && <>
            {showAdd && <form className="panel employee-inline-form employee-inline-form--wide" onSubmit={createGoal}><label className="employee-inline-form__wide">Цель<input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} required /></label><label>Срок<input type="date" value={goalForm.due_date} onChange={(e) => setGoalForm({ ...goalForm, due_date: e.target.value })} /></label><label>Статус<select value={goalForm.status} onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}><option value="planned">Запланирована</option><option value="in_progress">В работе</option><option value="completed">Выполнена</option></select></label><button className="primary-button" type="submit">Добавить</button></form>}
            <div className="employee-goal-grid">{goals.map((goal) => <article className="panel employee-goal-card" key={goal.id}><header><span className={`status status--${goal.status}`}>{goal.status_label}</span><time>{displayDate(goal.due_date)}</time></header><h3>{goal.title}</h3>{goal.description && <p>{goal.description}</p>}<div><div className="mini-progress"><i style={{ width: `${goal.progress}%` }} /></div><strong>{goal.progress}%</strong></div>{canManage && goal.status !== "completed" && <button className="secondary-button" type="button" onClick={() => void completeGoal(goal)}>Отметить выполненной</button>}</article>)}</div>
            {!goals.length && <div className="hcm-empty"><Trophy /><p>Цели развития ещё не добавлены</p></div>}
          </>}

          {tab === "documents" && <>
            {showAdd && <form className="panel employee-inline-form employee-inline-form--wide" onSubmit={createDocument}><label className="employee-inline-form__wide">Название<input value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} required /></label><label>Тип<input value={documentForm.document_type} onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })} /></label><label>Номер<input value={documentForm.number} onChange={(e) => setDocumentForm({ ...documentForm, number: e.target.value })} /></label><label>Дата выдачи<input type="date" value={documentForm.issue_date} onChange={(e) => setDocumentForm({ ...documentForm, issue_date: e.target.value })} /></label><label>Действует до<input type="date" value={documentForm.expires_at} onChange={(e) => setDocumentForm({ ...documentForm, expires_at: e.target.value })} /></label><button className="primary-button" type="submit">Добавить</button></form>}
            <div className="employee-document-list">{documents.map((item) => <article className="panel" key={item.id}><FileText /><div><strong>{item.title}</strong><span>{item.document_type || "Документ"}{item.number ? ` · № ${item.number}` : ""}</span></div><time>{item.expires_at ? `до ${displayDate(item.expires_at)}` : displayDate(item.issue_date)}</time></article>)}</div>
            {!documents.length && <div className="hcm-empty"><FileText /><p>Документы ещё не добавлены</p></div>}
          </>}
        </section>
      )}
    </div>
  );
}

function OrganizationView({ token }: { token: string }) {
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [staff, setStaff] = useState<StaffPosition[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [onboardingTemplates, setOnboardingTemplates] = useState<OnboardingTemplateConfig[]>([]);
  const [learningPathOptions, setLearningPathOptions] = useState<LearningPathOption[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [departmentDialog, setDepartmentDialog] = useState<OrgDepartment | "new" | null>(null);
  const [staffDialog, setStaffDialog] = useState<StaffPosition | "new" | null>(null);
  const [onboardingDialog, setOnboardingDialog] = useState<StaffPosition | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "", code: "", parent: "", manager: "" });
  const [staffForm, setStaffForm] = useState({ position: "", headcount: "1", note: "" });
  const [onboardingForm, setOnboardingForm] = useState({
    name: "", learning_path: "", responsible: "", duration_days: "30", checklist: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const [nextDepartments, nextStaff, nextEmployees, nextPositions, nextTemplates, nextOptions] = await Promise.all([
        apiRequest<OrgDepartment[]>("/org/departments/", token),
        apiRequest<StaffPosition[]>("/org/staff-positions/", token),
        apiRequest<EmployeeProfile[]>("/employees/", token),
        apiRequest<Position[]>("/positions/", token),
        apiRequest<OnboardingTemplateConfig[]>("/onboarding-templates/", token),
        apiRequest<{ learning_paths: LearningPathOption[] }>("/onboarding-options/", token),
      ]);
      setDepartments(nextDepartments);
      setStaff(nextStaff);
      setEmployees(nextEmployees);
      setPositions(nextPositions);
      setOnboardingTemplates(nextTemplates);
      setLearningPathOptions(nextOptions.learning_paths);
      setSelected((current) => current && nextDepartments.some((item) => item.id === current)
        ? current
        : nextDepartments.find((item) => item.parent === null)?.id || nextDepartments[0]?.id || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить оргструктуру");
    }
  }

  useEffect(() => { void load(); }, [token]);

  const orderedDepartments: Array<OrgDepartment & { depth: number }> = [];
  const appendChildren = (parent: number | null, depth: number) => {
    departments.filter((item) => item.parent === parent).forEach((item) => {
      orderedDepartments.push({ ...item, depth });
      appendChildren(item.id, depth + 1);
    });
  };
  appendChildren(null, 0);
  departments.filter((item) => !orderedDepartments.some((row) => row.id === item.id))
    .forEach((item) => orderedDepartments.push({ ...item, depth: 0 }));

  const activeDepartment = departments.find((item) => item.id === selected) || null;
  const visibleStaff = staff.filter((item) => item.department === selected);
  const totals = departments.reduce((result, item) => ({
    employees: result.employees + item.employee_count,
    planned: result.planned + item.planned_headcount,
    vacancies: result.vacancies + item.vacancies,
  }), { employees: 0, planned: 0, vacancies: 0 });

  function openDepartment(item?: OrgDepartment) {
    setDepartmentDialog(item || "new");
    setDepartmentForm(item ? {
      name: item.name,
      code: item.code,
      parent: item.parent ? String(item.parent) : "",
      manager: item.manager ? String(item.manager) : "",
    } : { name: "", code: "", parent: selected ? String(selected) : "", manager: "" });
  }

  async function saveDepartment(event: FormEvent) {
    event.preventDefault();
    const editing = departmentDialog !== "new" && departmentDialog;
    try {
      await apiRequest(editing ? `/org/departments/${editing.id}/` : "/org/departments/", token, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          name: departmentForm.name,
          code: departmentForm.code,
          parent: departmentForm.parent ? Number(departmentForm.parent) : null,
          manager: departmentForm.manager ? Number(departmentForm.manager) : null,
        }),
      });
      setDepartmentDialog(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить подразделение");
    }
  }

  function openStaff(item?: StaffPosition) {
    setStaffDialog(item || "new");
    setStaffForm(item ? {
      position: String(item.position),
      headcount: String(item.headcount),
      note: item.note,
    } : { position: "", headcount: "1", note: "" });
  }

  async function saveStaff(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const editing = staffDialog !== "new" && staffDialog;
    try {
      await apiRequest(editing ? `/org/staff-positions/${editing.id}/` : "/org/staff-positions/", token, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          department: selected,
          position: Number(staffForm.position),
          headcount: Number(staffForm.headcount),
          note: staffForm.note,
        }),
      });
      setStaffDialog(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить штатную позицию");
    }
  }

  async function createVacancyFromStaff(item: StaffPosition) {
    setError("");
    setNotice("");
    try {
      await apiRequest<Vacancy>("/vacancies/", token, {
        method: "POST",
        body: JSON.stringify({
          title: item.position_name,
          staff_position: item.id,
          department: item.department,
          position: item.position,
          openings: Math.max(item.vacancies, 1),
        }),
      });
      setNotice(`Вакансия «${item.position_name}» создана в разделе «Подбор»`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось открыть вакансию");
    }
  }

  function openOnboardingTemplate(item: StaffPosition) {
    const template = onboardingTemplates.find(
      (entry) => entry.department === item.department && entry.position === item.position,
    );
    setOnboardingDialog(item);
    setOnboardingForm({
      name: template?.name || `Адаптация: ${item.position_name}`,
      learning_path: template?.learning_path ? String(template.learning_path) : "",
      responsible: template?.responsible ? String(template.responsible) : "",
      duration_days: String(template?.duration_days || 30),
      checklist: (template?.checklist || [
        "Познакомиться с командой и руководителем",
        "Получить доступы к рабочим системам",
        "Изучить правила и процессы компании",
        "Согласовать цели на испытательный срок",
      ]).map((entry) => typeof entry === "string" ? entry : entry.title).join("\n"),
    });
  }

  async function saveOnboardingTemplate(event: FormEvent) {
    event.preventDefault();
    if (!onboardingDialog) return;
    const existing = onboardingTemplates.find(
      (entry) => entry.department === onboardingDialog.department && entry.position === onboardingDialog.position,
    );
    try {
      await apiRequest(existing ? `/onboarding-templates/${existing.id}/` : "/onboarding-templates/", token, {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify({
          name: onboardingForm.name,
          department: onboardingDialog.department,
          position: onboardingDialog.position,
          learning_path: onboardingForm.learning_path ? Number(onboardingForm.learning_path) : null,
          responsible: onboardingForm.responsible ? Number(onboardingForm.responsible) : null,
          duration_days: Number(onboardingForm.duration_days),
          checklist: onboardingForm.checklist.split("\n").map((item) => item.trim()).filter(Boolean),
          is_active: true,
        }),
      });
      setOnboardingDialog(null);
      setNotice(`Шаблон адаптации для «${onboardingDialog.position_name}» сохранён`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить шаблон адаптации");
    }
  }

  return (
    <>
      <PageHeader
        title="Оргструктура"
        subtitle="Подразделения, руководители и штатное расписание"
        action={<button className="primary-button" type="button" onClick={() => openDepartment()}><Plus /> Подразделение</button>}
      />
      <section className="organization-metrics">
        <article><span>Подразделений</span><strong>{departments.length}</strong></article>
        <article><span>Сотрудников</span><strong>{totals.employees}</strong></article>
        <article><span>Штатных единиц</span><strong>{totals.planned}</strong></article>
        <article><span>Открытых вакансий</span><strong>{totals.vacancies}</strong></article>
      </section>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice"><CheckCircle2 />{notice}</p>}
      <div className="organization-layout">
        <section className="panel organization-tree">
          <header><div><h2>Структура компании</h2><p>Выберите подразделение для просмотра штата</p></div></header>
          <div className="organization-tree__list">
            {orderedDepartments.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? "organization-unit organization-unit--active" : "organization-unit"}
                style={{ paddingLeft: `${14 + item.depth * 24}px` }}
                onClick={() => setSelected(item.id)}
              >
                <Building2 />
                <span><strong>{item.name}</strong><small>{item.manager_name || "Руководитель не назначен"}</small></span>
                <i>{item.employee_count}</i>
              </button>
            ))}
            {!departments.length && <div className="hcm-empty"><Building2 /><p>Создайте первое подразделение</p></div>}
          </div>
        </section>
        <section className="panel organization-details">
          {activeDepartment ? (
            <>
              <header className="organization-details__header">
                <div>
                  <span>{activeDepartment.parent_name || "Компания"}</span>
                  <h2>{activeDepartment.name}</h2>
                  <p>{activeDepartment.manager_name ? `Руководитель · ${activeDepartment.manager_name}` : "Руководитель не назначен"}</p>
                </div>
                <button className="icon-button" type="button" onClick={() => openDepartment(activeDepartment)} aria-label="Редактировать подразделение"><Pencil /></button>
              </header>
              <div className="organization-details__summary">
                <span><strong>{activeDepartment.employee_count}</strong> сотрудников</span>
                <span><strong>{activeDepartment.planned_headcount}</strong> штатных единиц</span>
                <span><strong>{activeDepartment.vacancies}</strong> вакансий</span>
              </div>
              <div className="section-heading organization-staff-heading">
                <div><h3>Штатные позиции</h3><p>Плановая и фактическая численность</p></div>
                <button className="secondary-button" type="button" onClick={() => openStaff()}><Plus /> Позиция</button>
              </div>
              <div className="organization-staff-list">
                {visibleStaff.map((item) => (
                  <article key={item.id}>
                    <button className="organization-staff-list__main" type="button" onClick={() => openStaff(item)}>
                      <span><strong>{item.position_name}</strong><small>{item.note || "Без комментария"}</small></span>
                      <span><b>{item.filled_count} / {item.headcount}</b><small>{item.vacancies ? `${item.vacancies} вак.` : "Укомплектовано"}</small></span>
                    </button>
                    {item.vacancies > 0 && item.open_vacancy_count === 0 && <button className="organization-staff-list__vacancy" type="button" onClick={() => void createVacancyFromStaff(item)}>Открыть вакансию</button>}
                    {item.open_vacancy_count > 0 && <span className="organization-staff-list__opened">В подборе</span>}
                    <button className="organization-staff-list__onboarding" type="button" onClick={() => openOnboardingTemplate(item)}><Settings2 /> Адаптация</button>
                  </article>
                ))}
                {!visibleStaff.length && <div className="hcm-empty"><BriefcaseBusiness /><p>Штатные позиции ещё не добавлены</p></div>}
              </div>
            </>
          ) : <div className="hcm-empty"><Building2 /><p>Выберите подразделение</p></div>}
        </section>
      </div>

      {departmentDialog && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDepartmentDialog(null); }}>
          <section className="hcm-dialog organization-dialog">
            <header><div><h2>{departmentDialog === "new" ? "Новое подразделение" : "Настройки подразделения"}</h2><p>Укажите место в структуре и руководителя</p></div><button className="icon-button" type="button" onClick={() => setDepartmentDialog(null)}><X /></button></header>
            <form className="hcm-form" onSubmit={saveDepartment}>
              <div className="hcm-form__grid">
                <label>Название<input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} required /></label>
                <label>Код<input value={departmentForm.code} onChange={(event) => setDepartmentForm({ ...departmentForm, code: event.target.value })} placeholder="Создастся автоматически" /></label>
                <label>Вышестоящее подразделение<select value={departmentForm.parent} onChange={(event) => setDepartmentForm({ ...departmentForm, parent: event.target.value })}><option value="">Нет — верхний уровень</option>{departments.filter((item) => departmentDialog === "new" || item.id !== departmentDialog.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Руководитель<select value={departmentForm.manager} onChange={(event) => setDepartmentForm({ ...departmentForm, manager: event.target.value })}><option value="">Не назначен</option>{employees.map((item) => <option key={item.user} value={item.user}>{item.full_name}</option>)}</select></label>
              </div>
              <footer><button className="secondary-button" type="button" onClick={() => setDepartmentDialog(null)}>Отмена</button><button className="primary-button" type="submit">Сохранить</button></footer>
            </form>
          </section>
        </div>
      )}
      {staffDialog && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setStaffDialog(null); }}>
          <section className="hcm-dialog organization-dialog">
            <header><div><h2>{staffDialog === "new" ? "Новая штатная позиция" : "Штатная позиция"}</h2><p>{activeDepartment?.name}</p></div><button className="icon-button" type="button" onClick={() => setStaffDialog(null)}><X /></button></header>
            <form className="hcm-form" onSubmit={saveStaff}>
              <div className="hcm-form__grid">
                <label>Должность<select value={staffForm.position} onChange={(event) => setStaffForm({ ...staffForm, position: event.target.value })} required><option value="">Выберите должность</option>{positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Штатных единиц<input type="number" min="1" value={staffForm.headcount} onChange={(event) => setStaffForm({ ...staffForm, headcount: event.target.value })} required /></label>
                <label className="hcm-form__wide">Комментарий<input value={staffForm.note} onChange={(event) => setStaffForm({ ...staffForm, note: event.target.value })} /></label>
              </div>
              <footer><button className="secondary-button" type="button" onClick={() => setStaffDialog(null)}>Отмена</button><button className="primary-button" type="submit">Сохранить</button></footer>
            </form>
          </section>
        </div>
      )}
      {onboardingDialog && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOnboardingDialog(null); }}>
          <section className="hcm-dialog organization-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-template-title">
            <header><div><h2 id="onboarding-template-title">Шаблон адаптации</h2><p>{onboardingDialog.department_name} · {onboardingDialog.position_name}</p></div><button className="icon-button" type="button" onClick={() => setOnboardingDialog(null)} aria-label="Закрыть"><X /></button></header>
            <form className="hcm-form" onSubmit={saveOnboardingTemplate}>
              <div className="hcm-form__grid">
                <label className="hcm-form__wide">Название<input value={onboardingForm.name} onChange={(event) => setOnboardingForm({ ...onboardingForm, name: event.target.value })} required /></label>
                <label>Траектория<select value={onboardingForm.learning_path} onChange={(event) => setOnboardingForm({ ...onboardingForm, learning_path: event.target.value })}><option value="">Без траектории</option>{learningPathOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                <label>Ответственный<select value={onboardingForm.responsible} onChange={(event) => setOnboardingForm({ ...onboardingForm, responsible: event.target.value })}><option value="">Руководитель отдела</option>{employees.map((item) => <option key={item.user} value={item.user}>{item.full_name}</option>)}</select></label>
                <label>Срок, дней<input type="number" min="1" value={onboardingForm.duration_days} onChange={(event) => setOnboardingForm({ ...onboardingForm, duration_days: event.target.value })} required /></label>
                <label className="hcm-form__wide">Чек-лист<textarea className="onboarding-template-checklist" value={onboardingForm.checklist} onChange={(event) => setOnboardingForm({ ...onboardingForm, checklist: event.target.value })} placeholder="Одна задача на строку" required /></label>
              </div>
              <footer><button className="secondary-button" type="button" onClick={() => setOnboardingDialog(null)}>Отмена</button><button className="primary-button" type="submit">Сохранить шаблон</button></footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const emptyEmployeeForm = {
  first_name: "", last_name: "", email: "", employee_number: "", department: "", position: "",
  grade: "", birth_date: "", hire_date: "", dismissal_date: "", education: "", competencies: "", status: "employed",
  checklist_score: "0", development_progress: "0", salary_base: "", monthly_bonus: "", quarterly_bonus: "",
};

function EmployeesView({ token, user }: { token: string; user: User }) {
  const canViewCompensation = user.role === "admin" || user.can_view_compensation;
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [summary, setSummary] = useState<HcmSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EmployeeProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<EmployeeProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyEmployeeForm);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<EmployeeImportPreview | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importReview, setImportReview] = useState<EmployeeImportReview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [importSource, setImportSource] = useState<"manual" | "one_c">("manual");
  const [importEffectiveDate, setImportEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [importHistory, setImportHistory] = useState<EmployeeImportBatch[]>([]);

  async function load() {
    try {
      const [people, totals, nextDepartments, nextPositions] = await Promise.all([
      apiRequest<EmployeeProfile[]>("/employees/", token),
      apiRequest<HcmSummary>("/hcm/summary/", token),
        apiRequest<Department[]>("/departments/", token),
        apiRequest<Position[]>("/positions/", token),
      ]);
      setEmployees(people);
      setSummary(totals);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить сотрудников");
    }
  }

  useEffect(() => { void load(); }, [token]);

  function openEmployee(employee?: EmployeeProfile) {
    setError("");
    setEditing(employee || null);
    setForm(employee ? {
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      employee_number: employee.employee_number,
      department: employee.department ? String(employee.department) : "",
      position: employee.position ? String(employee.position) : "",
      grade: employee.grade || "",
      birth_date: employee.birth_date || "",
      hire_date: employee.hire_date || "",
      dismissal_date: employee.dismissal_date || "",
      education: employee.education || "",
      competencies: employee.competencies || "",
      status: employee.status,
      checklist_score: String(employee.checklist_score),
      development_progress: String(employee.development_progress),
      salary_base: employee.salary_base || "",
      monthly_bonus: employee.monthly_bonus || "",
      quarterly_bonus: employee.quarterly_bonus || "",
    } : emptyEmployeeForm);
    setShowForm(true);
  }

  async function saveEmployee(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        department: form.department ? Number(form.department) : null,
        position: form.position ? Number(form.position) : null,
        birth_date: form.birth_date || null,
        hire_date: form.hire_date || null,
        dismissal_date: form.dismissal_date || null,
        checklist_score: Number(form.checklist_score),
        development_progress: Number(form.development_progress),
        ...(canViewCompensation ? {
          salary_base: form.salary_base || null,
          monthly_bonus: form.monthly_bonus || null,
          quarterly_bonus: form.quarterly_bonus || null,
        } : {}),
      };
      await apiRequest<EmployeeProfile>(editing ? `/employees/${editing.id}/` : "/employees/", token, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setShowForm(false);
      setEditing(null);
      setForm(emptyEmployeeForm);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить сотрудника");
    } finally {
      setSaving(false);
    }
  }

  function openEmployeeImport() {
    setError("");
    setImportData(null);
    setImportMapping({});
    setImportReview(null);
    setImportNotice("");
    setShowImport(true);
    void apiRequest<EmployeeImportBatch[]>("/employees/import/", token)
      .then(setImportHistory)
      .catch(() => setImportHistory([]));
  }

  async function uploadEmployeeImport(file: File) {
    setImportBusy(true);
    setError("");
    setImportNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("source", importSource);
      if (importSource === "one_c") body.append("effective_date", importEffectiveDate);
      const preview = await apiUpload<EmployeeImportPreview>("/employees/import/", token, body);
      setImportData(preview);
      setImportMapping(preview.mapping);
      setImportReview(preview.review);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось прочитать файл");
    } finally {
      setImportBusy(false);
    }
  }

  async function reviewEmployeeImport() {
    if (!importData) return;
    setImportBusy(true);
    setError("");
    try {
      const review = await apiRequest<EmployeeImportReview>("/employees/import/", token, {
        method: "POST",
        body: JSON.stringify({ batch_id: importData.batch_id, rows: importData.rows, mapping: importMapping, commit: false }),
      });
      setImportReview(review);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проверить строки");
    } finally {
      setImportBusy(false);
    }
  }

  async function commitEmployeeImport() {
    if (!importData || !importReview || importReview.error_count) return;
    setImportBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ total: number; created: number; updated: number }>("/employees/import/", token, {
        method: "POST",
        body: JSON.stringify({ batch_id: importData.batch_id, rows: importData.rows, mapping: importMapping, commit: true }),
      });
      setImportNotice(`Импорт завершён: создано ${result.created}, обновлено ${result.updated}`);
      const history = await apiRequest<EmployeeImportBatch[]>("/employees/import/", token);
      setImportHistory(history);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось импортировать сотрудников");
    } finally {
      setImportBusy(false);
    }
  }

  const visible = employees.filter((employee) =>
    `${employee.full_name} ${employee.email} ${employee.department_name || ""} ${employee.position_name || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  if (selectedProfile) {
    return (
      <EmployeeProfileView
        employee={selectedProfile}
        token={token}
        canManage={user.role !== "leader"}
        onBack={() => setSelectedProfile(null)}
        onEdit={() => {
          setSelectedProfile(null);
          openEmployee(selectedProfile);
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Сотрудники"
        subtitle="Единый реестр команды, должностей и развития"
        action={user.role !== "leader" ? (
          <div className="page-actions">
            <button className="secondary-button" type="button" onClick={openEmployeeImport}>
              <Upload /> Импорт CSV/XLSX
            </button>
            <button className="primary-button" type="button" onClick={() => openEmployee()}>
              <Plus /> Добавить сотрудника
            </button>
          </div>
        ) : undefined}
      />
      <HcmMetricCards summary={summary} leaderView={user.role === "leader"} />
      <section className="hcm-toolbar">
        <label className="hcm-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти сотрудника, отдел или должность" />
        </label>
        <button className="secondary-button" type="button">Фильтры</button>
      </section>
      {error && <p className="form-error">{error}</p>}
      <section className="panel table-panel hcm-table">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Сотрудник</th><th>Должность</th><th>Отдел</th><th>Стаж</th><th>Развитие</th><th>Статус</th>{user.role !== "leader" && <th aria-label="Действия" />}</tr></thead>
            <tbody>
              {visible.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <button className="employee-name-button" type="button" onClick={() => setSelectedProfile(employee)}>{employee.full_name || employee.email}</button>
                    <span>{employee.employee_number} · {employee.email}</span>
                  </td>
                  <td>{employee.position_name || "Не указана"}{employee.grade && <span>{employee.grade}</span>}</td>
                  <td>{employee.department_name || "Без отдела"}</td>
                  <td>{employee.tenure_years === null ? "—" : `${employee.tenure_years} г.`}</td>
                  <td><div className="mini-progress"><span style={{ width: `${employee.development_progress}%` }} /></div><small>{employee.development_progress}%</small></td>
                  <td><span className={`status status--${employee.status}`}>{employee.status_label}</span></td>
                  {user.role !== "leader" && <td><button className="icon-button" type="button" onClick={() => openEmployee(employee)} aria-label={`Редактировать ${employee.full_name}`}><Pencil /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && <div className="hcm-empty"><ContactRound /><p>Сотрудники не найдены</p></div>}
      </section>
      {showImport && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !importBusy) setShowImport(false);
        }}>
          <section className="hcm-dialog employee-import-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-import-title">
            <header>
              <div>
                <h2 id="employee-import-title">Импорт сотрудников</h2>
                <p>Сначала проверим файл и сопоставление колонок — данные не изменятся без подтверждения</p>
              </div>
              <button className="icon-button" type="button" disabled={importBusy} onClick={() => setShowImport(false)} aria-label="Закрыть"><X /></button>
            </header>
            {!importData ? (
              <>
                <div className="employee-import-mode" role="group" aria-label="Тип кадрового импорта">
                  <button className={importSource === "manual" ? "employee-import-mode__active" : ""} type="button" onClick={() => setImportSource("manual")}>
                    <Upload /><span><strong>Список сотрудников</strong><small>Разовая загрузка или обновление</small></span>
                  </button>
                  <button className={importSource === "one_c" ? "employee-import-mode__active" : ""} type="button" onClick={() => setImportSource("one_c")}>
                    <RefreshCw /><span><strong>Выгрузка из 1С</strong><small>Ежемесячные кадровые изменения</small></span>
                  </button>
                </div>
                {importSource === "one_c" && (
                  <label className="employee-import-effective-date">
                    Дата кадрового среза
                    <input type="date" value={importEffectiveDate} onChange={(event) => setImportEffectiveDate(event.target.value)} required />
                    <span>Эта дата попадёт в историю переводов и смен должности</span>
                  </label>
                )}
                <label className={importBusy ? "employee-import-upload employee-import-upload--busy" : "employee-import-upload"}>
                  <Upload />
                  <strong>{importBusy ? "Читаем таблицу…" : importSource === "one_c" ? "Выберите выгрузку 1С" : "Выберите CSV или XLSX"}</strong>
                  <span>Первая строка должна содержать названия колонок · до 1000 сотрудников и 5 МБ</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={importBusy || (importSource === "one_c" && !importEffectiveDate)}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadEmployeeImport(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {!!importHistory.length && (
                  <section className="employee-import-history">
                    <div className="section-heading"><div><h3>Последние импорты</h3><p>Завершённые операции и кадровые срезы</p></div></div>
                    <div>
                      {importHistory.slice(0, 5).map((batch) => (
                        <article key={batch.id}>
                          <span className={batch.source === "one_c" ? "employee-import-history__source employee-import-history__source--one-c" : "employee-import-history__source"}>{batch.source_label}</span>
                          <div><strong>{batch.filename}</strong><small>{batch.effective_date ? `Срез ${displayDate(batch.effective_date)}` : new Intl.DateTimeFormat("ru-RU").format(new Date(batch.completed_at))} · {batch.imported_by_name || "Администратор"}</small></div>
                          <span>{batch.created_count} создано · {batch.updated_count} обновлено</span>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : importNotice ? (
              <div className="employee-import-complete">
                <CheckCircle2 />
                <span className="eyebrow">Готово</span>
                <h3>{importNotice}</h3>
                <p>Реестр и кадровая история обновлены. Новым сотрудникам созданы учётные записи с приглашениями.</p>
              </div>
            ) : (
              <>
                <div className="employee-import-file">
                  <FileText />
                  <div><strong>{importData.filename}</strong><span>{importData.source === "one_c" ? `Выгрузка 1С · срез ${displayDate(importData.effective_date)}` : "Список сотрудников"} · {importData.rows.length} строк</span></div>
                  <button className="text-button" type="button" onClick={() => {
                    setImportData(null);
                    setImportReview(null);
                    setError("");
                  }}>Заменить файл</button>
                </div>
                <section className="employee-import-mapping">
                  <div className="section-heading"><div><h3>Сопоставление колонок</h3><p>ФИО можно передать одной колонкой либо отдельно именем и фамилией</p></div></div>
                  <div>
                    {importData.fields.map((field) => (
                      <label key={field.key}>
                        <span>{field.label}{field.required && <i>обязательно</i>}</span>
                        <select
                          value={importMapping[field.key] || ""}
                          onChange={(event) => {
                            setImportMapping({ ...importMapping, [field.key]: event.target.value });
                            setImportReview(null);
                          }}
                        >
                          <option value="">Не импортировать</option>
                          {importData.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
                {importReview && (
                  <>
                    <div className="employee-import-summary">
                      <div><span>Всего строк</span><strong>{importReview.total}</strong></div>
                      <div><span>Будет создано</span><strong>{importReview.create_count}</strong></div>
                      <div><span>Будет обновлено</span><strong>{importReview.update_count}</strong></div>
                      <div className={importReview.error_count ? "employee-import-summary__error" : ""}><span>С ошибками</span><strong>{importReview.error_count}</strong></div>
                    </div>
                    <div className="employee-import-table">
                      <table>
                        <thead><tr><th>Строка</th><th>Сотрудник</th><th>Отдел / должность</th><th>Результат</th></tr></thead>
                        <tbody>
                          {importReview.rows.map((row) => (
                            <tr key={row.row_number}>
                              <td>{row.row_number}</td>
                              <td><strong>{row.preview.full_name || "Имя не определено"}</strong><span>{row.preview.employee_number || "Без номера"} · {row.preview.email || "Без email"}</span></td>
                              <td><strong>{row.preview.department || "Без отдела"}</strong><span>{row.preview.position || "Должность не указана"}</span></td>
                              <td>
                                <span className={`employee-import-status employee-import-status--${row.action}`}>
                                  {row.action === "create" ? "Создать" : row.action === "update" ? "Обновить" : "Ошибка"}
                                </span>
                                {row.action === "error" && <small>{Object.values(row.errors).flat().join(" · ")}</small>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
            {error && <p className="form-error">{error}</p>}
            <footer className="employee-import-dialog__footer">
              {importNotice ? (
                <button className="primary-button" type="button" onClick={() => setShowImport(false)}>Готово</button>
              ) : importData ? (
                <>
                  <button className="secondary-button" type="button" disabled={importBusy} onClick={() => void reviewEmployeeImport()}>
                    <RefreshCw /> {importReview ? "Проверить ещё раз" : "Проверить строки"}
                  </button>
                  <button className="primary-button" type="button" disabled={importBusy || !importReview || importReview.error_count > 0} onClick={() => void commitEmployeeImport()}>
                    {importBusy ? "Импортируем…" : `Импортировать ${importReview?.total || 0}`}
                  </button>
                </>
              ) : (
                <button className="secondary-button" type="button" disabled={importBusy} onClick={() => setShowImport(false)}>Отмена</button>
              )}
            </footer>
          </section>
        </div>
      )}
      {showForm && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <section className="hcm-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title">
            <header>
              <div><h2 id="employee-dialog-title">{editing ? "Карточка сотрудника" : "Новый сотрудник"}</h2><p>{editing ? "Основные данные и развитие" : "Будет создана учётная запись с приглашением"}</p></div>
              <button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Закрыть"><X /></button>
            </header>
            <form className="hcm-form" onSubmit={saveEmployee}>
              <div className="hcm-form__grid">
                <label>Имя<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></label>
                <label>Фамилия<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></label>
                <label className="hcm-form__wide">Корпоративная почта<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                <label>Табельный номер<input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} required /></label>
                <label>Дата выхода<input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></label>
                <label>Отдел<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Без отдела</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Должность<select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}><option value="">Не указана</option>{positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Грейд<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Junior, Middle, Senior" /></label>
                <label>Статус<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, dismissal_date: e.target.value === "dismissed" ? (form.dismissal_date || new Date().toISOString().slice(0, 10)) : "" })}><option value="employed">Работает</option><option value="probation">Испытательный срок</option><option value="dismissed" disabled={!editing}>Уволен</option></select></label>
                {form.status === "dismissed" && <label>Дата увольнения<input type="date" value={form.dismissal_date} onChange={(e) => setForm({ ...form, dismissal_date: e.target.value })} required /></label>}
                {form.status === "dismissed" && <div className="employee-dismissal-warning"><span>Доступ будет заблокирован</span><small>История, документы и результаты обучения сохранятся.</small></div>}
                <label>План развития, %<input type="number" min="0" max="100" value={form.development_progress} onChange={(e) => setForm({ ...form, development_progress: e.target.value })} /></label>
                <label>Чек-лист, %<input type="number" min="0" max="100" value={form.checklist_score} onChange={(e) => setForm({ ...form, checklist_score: e.target.value })} /></label>
                {canViewCompensation && <><label>Оклад<input type="number" min="0" value={form.salary_base} onChange={(e) => setForm({ ...form, salary_base: e.target.value })} /></label><label>Месячная премия<input type="number" min="0" value={form.monthly_bonus} onChange={(e) => setForm({ ...form, monthly_bonus: e.target.value })} /></label><label>Квартальная премия<input type="number" min="0" value={form.quarterly_bonus} onChange={(e) => setForm({ ...form, quarterly_bonus: e.target.value })} /></label></>}
                <label className="hcm-form__wide">Компетенции<textarea value={form.competencies} onChange={(e) => setForm({ ...form, competencies: e.target.value })} placeholder="Ключевые навыки сотрудника" /></label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <footer><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const emptyCandidateForm = {
  full_name: "", email: "", phone: "", telegram: "", desired_position: "", desired_salary: "",
  skills: "", source: "", stage: "", department: "", vacancy: "", comment: "",
};
const emptyVacancyForm = {
  title: "", staff_position: "", department: "", position: "", openings: "1",
  status: "open", deadline: "", description: "", requirements: "",
};
const emptyHireForm = {
  corporate_email: "", first_name: "", last_name: "", employee_number: "",
  hire_date: new Date().toISOString().slice(0, 10), grade: "",
};
const dateFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const emptyOfferForm = {
  position_title: "", salary: "", start_date: dateFromNow(21), valid_until: dateFromNow(7),
  probation_months: "3", work_format: "office", conditions: "",
};

function RecruitmentView({ token, user }: { token: string; user: User }) {
  const [stages, setStages] = useState<CandidateStage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [staff, setStaff] = useState<StaffPosition[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<CandidateOffer[]>([]);
  const [interviewOptions, setInterviewOptions] = useState<{
    participants: Array<{ id: number; name: string; role: string }>;
    default_questions: string[];
  }>({ participants: [], default_questions: [] });
  const [selectedVacancy, setSelectedVacancy] = useState<number | "all">("all");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vacancyDialog, setVacancyDialog] = useState<Vacancy | "new" | null>(null);
  const [hiring, setHiring] = useState<Candidate | null>(null);
  const [scheduling, setScheduling] = useState<Candidate | null>(null);
  const [activeInterview, setActiveInterview] = useState<Interview | null>(null);
  const [offerDialog, setOfferDialog] = useState<{ candidate: Candidate; offer: CandidateOffer | null } | null>(null);
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyCandidateForm);
  const [vacancyForm, setVacancyForm] = useState(emptyVacancyForm);
  const [hireForm, setHireForm] = useState(emptyHireForm);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [interviewForm, setInterviewForm] = useState({
    title: "Интервью с руководителем",
    scheduled_at: "",
    duration_minutes: "60",
    format: "online",
    location: "",
    meeting_url: "",
    participants: [] as number[],
    questions: [] as string[],
  });
  const [feedbackForm, setFeedbackForm] = useState({
    answers: [] as Array<{ score: number; note: string }>,
    overall_score: 4,
    recommendation: "advance",
    comment: "",
  });
  const [decisionForm, setDecisionForm] = useState({ decision: "advance", summary: "" });

  async function load() {
    try {
      const [nextStages, nextCandidates, nextDepartments, nextPositions, nextStaff, nextVacancies, nextInterviews, nextOffers] = await Promise.all([
        apiRequest<CandidateStage[]>("/candidate-stages/", token),
        apiRequest<Candidate[]>("/candidates/", token),
        apiRequest<OrgDepartment[]>("/org/departments/", token),
        apiRequest<Position[]>("/positions/", token),
        apiRequest<StaffPosition[]>("/org/staff-positions/", token),
        apiRequest<Vacancy[]>("/vacancies/", token),
        apiRequest<Interview[]>("/interviews/", token),
        apiRequest<CandidateOffer[]>("/offers/", token),
      ]);
      setStages(nextStages);
      setCandidates(nextCandidates);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setStaff(nextStaff);
      setVacancies(nextVacancies);
      setInterviews(nextInterviews);
      setOffers(nextOffers);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить подбор");
    }
  }

  useEffect(() => { void load(); }, [token]);

  function openCandidate(candidate?: Candidate) {
    setError("");
    setEditing(candidate || null);
    setForm(candidate ? {
      full_name: candidate.full_name,
      email: candidate.email || "",
      phone: candidate.phone || "",
      telegram: candidate.telegram || "",
      desired_position: candidate.desired_position,
      desired_salary: candidate.desired_salary || "",
      skills: candidate.skills || "",
      source: candidate.source || "",
      stage: String(candidate.stage),
      department: candidate.department ? String(candidate.department) : "",
      vacancy: candidate.vacancy ? String(candidate.vacancy) : "",
      comment: candidate.comment || "",
    } : {
      ...emptyCandidateForm,
      stage: stages[0] ? String(stages[0].id) : "",
      vacancy: selectedVacancy === "all" ? "" : String(selectedVacancy),
      desired_position: selectedVacancy === "all" ? "" : vacancies.find((item) => item.id === selectedVacancy)?.position_name || "",
      department: selectedVacancy === "all" ? "" : String(vacancies.find((item) => item.id === selectedVacancy)?.department || ""),
    });
    setShowForm(true);
  }

  function selectCandidateVacancy(value: string) {
    const vacancy = vacancies.find((item) => item.id === Number(value));
    setForm({
      ...form,
      vacancy: value,
      desired_position: vacancy?.position_name || form.desired_position,
      department: vacancy ? String(vacancy.department) : form.department,
    });
  }

  async function saveCandidate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest<Candidate>(editing ? `/candidates/${editing.id}/` : "/candidates/", token, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({
          ...form,
          stage: Number(form.stage),
          department: form.department ? Number(form.department) : null,
          vacancy: form.vacancy ? Number(form.vacancy) : null,
          desired_salary: form.desired_salary || null,
        }),
      });
      setShowForm(false);
      setEditing(null);
      setForm(emptyCandidateForm);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить кандидата");
    } finally {
      setSaving(false);
    }
  }

  async function changeCandidateStage(candidate: Candidate, stage: string) {
    setError("");
    try {
      await apiRequest<Candidate>(`/candidates/${candidate.id}/`, token, {
        method: "PATCH",
        body: JSON.stringify({ stage: Number(stage) }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сменить этап");
    }
  }

  function openVacancy(vacancy?: Vacancy) {
    setError("");
    setVacancyDialog(vacancy || "new");
    setVacancyForm(vacancy ? {
      title: vacancy.title,
      staff_position: vacancy.staff_position ? String(vacancy.staff_position) : "",
      department: String(vacancy.department),
      position: String(vacancy.position),
      openings: String(vacancy.openings),
      status: vacancy.status,
      deadline: vacancy.deadline || "",
      description: vacancy.description,
      requirements: vacancy.requirements,
    } : emptyVacancyForm);
  }

  function selectStaffPosition(value: string) {
    const row = staff.find((item) => item.id === Number(value));
    setVacancyForm({
      ...vacancyForm,
      staff_position: value,
      department: row ? String(row.department) : "",
      position: row ? String(row.position) : "",
      title: row?.position_name || vacancyForm.title,
      openings: row ? String(Math.max(row.vacancies, 1)) : vacancyForm.openings,
    });
  }

  async function saveVacancy(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const editingVacancy = vacancyDialog !== "new" && vacancyDialog;
    try {
      await apiRequest<Vacancy>(editingVacancy ? `/vacancies/${editingVacancy.id}/` : "/vacancies/", token, {
        method: editingVacancy ? "PATCH" : "POST",
        body: JSON.stringify({
          ...vacancyForm,
          staff_position: vacancyForm.staff_position ? Number(vacancyForm.staff_position) : null,
          department: Number(vacancyForm.department),
          position: Number(vacancyForm.position),
          openings: Number(vacancyForm.openings),
          deadline: vacancyForm.deadline || null,
        }),
      });
      setVacancyDialog(null);
      setVacancyForm(emptyVacancyForm);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить вакансию");
    } finally {
      setSaving(false);
    }
  }

  function openHire(candidate: Candidate) {
    const nameParts = candidate.full_name.trim().split(/\s+/);
    setError("");
    setHiring(candidate);
    setHireForm({
      corporate_email: candidate.email || "",
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" "),
      employee_number: "",
      hire_date: new Date().toISOString().slice(0, 10),
      grade: "",
    });
  }

  async function hireCandidate(event: FormEvent) {
    event.preventDefault();
    if (!hiring) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/candidates/${hiring.id}/hire/`, token, {
        method: "POST",
        body: JSON.stringify(hireForm),
      });
      setHiring(null);
      setHireForm(emptyHireForm);
      setSelectedVacancy("all");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось оформить сотрудника");
    } finally {
      setSaving(false);
    }
  }

  function openOffer(candidate: Candidate) {
    const offer = offers.find((item) => item.candidate === candidate.id) || null;
    setError("");
    setOfferDialog({ candidate, offer });
    setOfferFile(null);
    setOfferForm(offer ? {
      position_title: offer.position_title,
      salary: offer.salary || "",
      start_date: offer.start_date || dateFromNow(21),
      valid_until: offer.valid_until || dateFromNow(7),
      probation_months: String(offer.probation_months),
      work_format: offer.work_format,
      conditions: offer.conditions,
    } : {
      ...emptyOfferForm,
      position_title: candidate.vacancy_title || candidate.desired_position,
      salary: candidate.desired_salary || "",
    });
  }

  async function saveOffer(event: FormEvent) {
    event.preventDefault();
    if (!offerDialog) return;
    setSaving(true);
    setError("");
    const body = new FormData();
    body.append("candidate", String(offerDialog.candidate.id));
    Object.entries(offerForm).forEach(([key, value]) => body.append(key, value));
    if (offerFile) body.append("file", offerFile);
    try {
      const current = offerDialog.offer;
      const saved = await apiUpload<CandidateOffer>(
        current ? `/offers/${current.id}/` : "/offers/",
        token,
        body,
        current ? "PATCH" : "POST",
      );
      setOfferDialog({ candidate: offerDialog.candidate, offer: saved });
      setOfferFile(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить оффер");
    } finally {
      setSaving(false);
    }
  }

  async function changeOfferStatus(action: "submit" | "approve" | "accepted" | "declined") {
    if (!offerDialog?.offer) return;
    setSaving(true);
    setError("");
    try {
      const path = action === "submit"
        ? `/offers/${offerDialog.offer.id}/submit/`
        : action === "approve"
          ? `/offers/${offerDialog.offer.id}/approve/`
          : `/offers/${offerDialog.offer.id}/outcome/`;
      const updated = await apiRequest<CandidateOffer>(path, token, {
        method: "POST",
        body: JSON.stringify(action === "accepted" || action === "declined" ? { outcome: action } : {}),
      });
      setOfferDialog({ candidate: offerDialog.candidate, offer: updated });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить статус оффера");
    } finally {
      setSaving(false);
    }
  }

  function localDateTimeInput(date: Date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  async function openSchedule(candidate: Candidate) {
    setError("");
    try {
      const options = interviewOptions.participants.length
        ? interviewOptions
        : await apiRequest<typeof interviewOptions>("/interviews/options/", token);
      setInterviewOptions(options);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(10, 0, 0, 0);
      setInterviewForm({
        title: `Интервью: ${candidate.desired_position}`,
        scheduled_at: localDateTimeInput(tomorrow),
        duration_minutes: "60",
        format: "online",
        location: "",
        meeting_url: "",
        participants: options.participants[0] ? [options.participants[0].id] : [],
        questions: options.default_questions,
      });
      setScheduling(candidate);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось подготовить встречу");
    }
  }

  async function scheduleInterview(event: FormEvent) {
    event.preventDefault();
    if (!scheduling) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest<Interview>("/interviews/", token, {
        method: "POST",
        body: JSON.stringify({
          ...interviewForm,
          candidate: scheduling.id,
          duration_minutes: Number(interviewForm.duration_minutes),
        }),
      });
      setScheduling(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось запланировать собеседование");
    } finally {
      setSaving(false);
    }
  }

  function openInterview(interview: Interview) {
    const ownFeedback = interview.feedback.find((item) => item.participant === user.id);
    setActiveInterview(interview);
    setFeedbackForm({
      answers: interview.questions.map((_, index) => ({
        score: ownFeedback?.answers[index]?.score || 4,
        note: ownFeedback?.answers[index]?.note || "",
      })),
      overall_score: ownFeedback?.overall_score || 4,
      recommendation: ownFeedback?.recommendation || "advance",
      comment: ownFeedback?.comment || "",
    });
    setDecisionForm({
      decision: interview.decision === "pending" ? "advance" : interview.decision,
      summary: interview.summary || "",
    });
  }

  async function submitInterviewFeedback(event: FormEvent) {
    event.preventDefault();
    if (!activeInterview) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest<Interview>(`/interviews/${activeInterview.id}/feedback/`, token, {
        method: "POST",
        body: JSON.stringify(feedbackForm),
      });
      openInterview(updated);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить оценку");
    } finally {
      setSaving(false);
    }
  }

  async function completeInterview(event: FormEvent) {
    event.preventDefault();
    if (!activeInterview) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest<Interview>(`/interviews/${activeInterview.id}/complete/`, token, {
        method: "POST",
        body: JSON.stringify(decisionForm),
      });
      setActiveInterview(updated);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось завершить интервью");
    } finally {
      setSaving(false);
    }
  }

  const visibleCandidates = selectedVacancy === "all"
    ? candidates
    : candidates.filter((item) => item.vacancy === selectedVacancy);
  const openVacancies = vacancies.filter((item) => item.status === "open");
  const upcomingInterviews = interviews
    .filter((item) => item.status === "scheduled" || item.status === "in_progress")
    .sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at));

  return (
    <>
      <PageHeader
        title="Подбор"
        subtitle="Вакансии из штатного расписания и воронка кандидатов"
        action={<div className="page-actions"><button className="secondary-button" type="button" onClick={() => openVacancy()}><BriefcaseBusiness /> Новая вакансия</button><button className="primary-button" type="button" onClick={() => openCandidate()}><Plus /> Кандидат</button></div>}
      />
      {error && <p className="form-error">{error}</p>}
      <section className="panel interview-agenda">
        <header><div><span className="eyebrow">Ближайшие встречи</span><h2>Собеседования</h2></div><strong>{upcomingInterviews.length}</strong></header>
        <div>
          {upcomingInterviews.slice(0, 4).map((interview) => (
            <button type="button" onClick={() => openInterview(interview)} key={interview.id}>
              <CalendarDays />
              <span><strong>{interview.candidate_name}</strong><small>{interview.title} · {new Date(interview.scheduled_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></span>
              <b className={`interview-status interview-status--${interview.status}`}>{interview.status_label}</b>
              <ChevronRight />
            </button>
          ))}
          {!upcomingInterviews.length && <p>Запланированных собеседований пока нет. Назначьте встречу из карточки кандидата.</p>}
        </div>
      </section>
      <section className="vacancy-strip">
        <button type="button" className={selectedVacancy === "all" ? "vacancy-card vacancy-card--active" : "vacancy-card"} onClick={() => setSelectedVacancy("all")}>
          <span>Все вакансии</span><strong>{candidates.length}</strong><small>кандидатов в работе</small>
        </button>
        {openVacancies.map((vacancy) => (
          <article key={vacancy.id} className={selectedVacancy === vacancy.id ? "vacancy-card vacancy-card--active" : "vacancy-card"}>
            <button className="vacancy-card__main" type="button" onClick={() => setSelectedVacancy(vacancy.id)}>
              <span>{vacancy.department_name}</span><strong>{vacancy.title}</strong><small>{vacancy.candidates_count} в воронке · мест: {vacancy.openings}</small>
            </button>
            <button className="vacancy-card__edit" type="button" aria-label={`Редактировать вакансию ${vacancy.title}`} onClick={() => openVacancy(vacancy)}><Pencil /></button>
          </article>
        ))}
        {!openVacancies.length && <div className="vacancy-strip__empty"><BriefcaseBusiness /><span>Открытых вакансий нет</span></div>}
      </section>
      <div className="recruitment-filter-note">
        <span>{selectedVacancy === "all" ? "Все кандидаты" : vacancies.find((item) => item.id === selectedVacancy)?.title}</span>
        <small>{visibleCandidates.length} в воронке</small>
      </div>
      <section className="recruitment-board">
        {stages.map((stage) => (
          <div className="recruitment-column" key={stage.id}>
            <header><span>{stage.name}</span><small>{visibleCandidates.filter((item) => item.stage === stage.id).length}</small></header>
            <div>
              {visibleCandidates.filter((item) => item.stage === stage.id).map((candidate) => (
                <article className="candidate-card" key={candidate.id}>
                  <header><strong>{candidate.full_name}</strong><button className="candidate-card__edit" type="button" onClick={() => openCandidate(candidate)} aria-label={`Редактировать ${candidate.full_name}`}><Pencil /></button></header>
                  <p>{candidate.vacancy_title || candidate.desired_position}</p>
                  <label>Этап<select value={candidate.stage} onChange={(event) => void changeCandidateStage(candidate, event.target.value)}>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <footer><span>{candidate.department_name || "Без отдела"}</span><small>{candidate.source || "Источник не указан"}</small></footer>
                  {!candidate.hired_employee && (() => {
                    const candidateInterviews = interviews.filter((item) => item.candidate === candidate.id && item.status !== "cancelled");
                    const activeMeeting = candidateInterviews.find((item) => item.status === "scheduled" || item.status === "in_progress");
                    const lastCompleted = [...candidateInterviews].reverse().find((item) => item.status === "completed");
                    if (activeMeeting) return <button className="candidate-card__interview" type="button" onClick={() => openInterview(activeMeeting)}><CalendarDays />Открыть интервью</button>;
                    if (lastCompleted) return <div className="candidate-card__interview-actions"><button type="button" onClick={() => openInterview(lastCompleted)}>Итоги</button><button type="button" onClick={() => void openSchedule(candidate)}><Plus />Следующее</button></div>;
                    return <button className="candidate-card__interview" type="button" onClick={() => void openSchedule(candidate)}><CalendarDays />Запланировать интервью</button>;
                  })()}
                  {!candidate.hired_employee && (() => {
                    const candidateOffer = offers.find((item) => item.candidate === candidate.id);
                    const interviewCompleted = interviews.some((item) => item.candidate === candidate.id && item.status === "completed");
                    if (!candidateOffer && !interviewCompleted) return null;
                    return <button className={`candidate-card__offer candidate-card__offer--${candidateOffer?.status || "new"}`} type="button" onClick={() => openOffer(candidate)}><FileText /><span>{candidateOffer ? `Оффер · ${candidateOffer.status_label}` : "Подготовить оффер"}</span></button>;
                  })()}
                  {candidate.hired_employee ? (
                    <div className="candidate-card__hired"><CheckCircle2 /> Оформлен как сотрудник</div>
                  ) : stages.find((item) => item.id === candidate.stage)?.is_terminal && candidate.vacancy ? (
                    <button className="candidate-card__hire" type="button" onClick={() => openHire(candidate)}>Оформить сотрудника</button>
                  ) : null}
                </article>
              ))}
              {!visibleCandidates.some((item) => item.stage === stage.id) && <p className="recruitment-empty">Нет кандидатов</p>}
            </div>
          </div>
        ))}
      </section>
      {scheduling && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setScheduling(null); }}>
          <section className="hcm-dialog interview-schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="interview-schedule-title">
            <header><div><span className="eyebrow">Кандидат · {scheduling.full_name}</span><h2 id="interview-schedule-title">Запланировать собеседование</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setScheduling(null)}><X /></button></header>
            <form className="hcm-form" onSubmit={scheduleInterview}>
              <div className="hcm-form__grid">
                <label className="hcm-form__wide">Название<input value={interviewForm.title} onChange={(event) => setInterviewForm({ ...interviewForm, title: event.target.value })} required /></label>
                <label>Дата и время<input type="datetime-local" value={interviewForm.scheduled_at} onChange={(event) => setInterviewForm({ ...interviewForm, scheduled_at: event.target.value })} required /></label>
                <label>Продолжительность<input type="number" min="15" max="240" step="15" value={interviewForm.duration_minutes} onChange={(event) => setInterviewForm({ ...interviewForm, duration_minutes: event.target.value })} required /></label>
                <label>Формат<select value={interviewForm.format} onChange={(event) => setInterviewForm({ ...interviewForm, format: event.target.value })}><option value="online">Онлайн</option><option value="office">В офисе</option><option value="phone">Телефон</option></select></label>
                <label>{interviewForm.format === "online" ? "Ссылка на встречу" : "Место или номер"}<input type={interviewForm.format === "online" ? "url" : "text"} value={interviewForm.format === "online" ? interviewForm.meeting_url : interviewForm.location} onChange={(event) => setInterviewForm(interviewForm.format === "online" ? { ...interviewForm, meeting_url: event.target.value } : { ...interviewForm, location: event.target.value })} placeholder={interviewForm.format === "online" ? "https://telemost.yandex.ru/…" : ""} /></label>
                <fieldset className="hcm-form__wide interview-participants"><legend>Участники</legend><div>{interviewOptions.participants.map((participant) => <label key={participant.id}><input type="checkbox" checked={interviewForm.participants.includes(participant.id)} onChange={(event) => setInterviewForm({ ...interviewForm, participants: event.target.checked ? [...interviewForm.participants, participant.id] : interviewForm.participants.filter((id) => id !== participant.id) })} /><span><strong>{participant.name}</strong><small>{participant.role}</small></span></label>)}</div></fieldset>
                <fieldset className="hcm-form__wide interview-questions-editor"><legend>Сценарий вопросов</legend>{interviewForm.questions.map((question, index) => <div key={index}><span>{index + 1}</span><input value={question} onChange={(event) => setInterviewForm({ ...interviewForm, questions: interviewForm.questions.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} required /><button className="icon-button" type="button" aria-label={`Удалить вопрос ${index + 1}`} disabled={interviewForm.questions.length === 1} onClick={() => setInterviewForm({ ...interviewForm, questions: interviewForm.questions.filter((_, itemIndex) => itemIndex !== index) })}><X /></button></div>)}<button className="secondary-button" type="button" onClick={() => setInterviewForm({ ...interviewForm, questions: [...interviewForm.questions, ""] })}><Plus />Добавить вопрос</button></fieldset>
              </div>
              {error && <p className="form-error">{error}</p>}
              <footer><button className="secondary-button" type="button" onClick={() => setScheduling(null)}>Отмена</button><button className="primary-button" type="submit" disabled={saving || !interviewForm.participants.length}>{saving ? "Планируем…" : "Запланировать"}</button></footer>
            </form>
          </section>
        </div>
      )}
      {activeInterview && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveInterview(null); }}>
          <section className="hcm-dialog interview-workspace" role="dialog" aria-modal="true" aria-labelledby="interview-workspace-title">
            <header><div><span className="eyebrow">{activeInterview.candidate_name} · {activeInterview.vacancy_title || "Без вакансии"}</span><h2 id="interview-workspace-title">{activeInterview.title}</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setActiveInterview(null)}><X /></button></header>
            <div className="interview-workspace__summary">
              <div><CalendarDays /><span><strong>{new Date(activeInterview.scheduled_at).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}</strong><small>{activeInterview.duration_minutes} мин · {activeInterview.format_label}</small></span></div>
              <div><Users /><span><strong>{activeInterview.participant_names.join(", ")}</strong><small>Участники</small></span></div>
              <span className={`interview-status interview-status--${activeInterview.status}`}>{activeInterview.status_label}</span>
              {activeInterview.meeting_url && <a className="primary-button" href={activeInterview.meeting_url} target="_blank" rel="noreferrer"><PlayCircle />Открыть встречу</a>}
            </div>
            <div className="interview-workspace__body">
              <section className="interview-script"><span className="eyebrow">Сценарий</span><h3>Вопросы интервью</h3>{activeInterview.questions.map((question, index) => <article key={question}><span>{index + 1}</span><p>{question}</p></article>)}</section>
              <section className="interview-assessment">
                {activeInterview.can_submit_feedback && activeInterview.status !== "completed" ? (
                  <form onSubmit={submitInterviewFeedback}>
                    <div><span className="eyebrow">Моя оценка</span><h3>{activeInterview.my_feedback_id ? "Обновить обратную связь" : "Заполнить обратную связь"}</h3></div>
                    {activeInterview.questions.map((question, index) => <fieldset key={question}><legend>{index + 1}. {question}</legend><label>Оценка<select value={feedbackForm.answers[index]?.score || 4} onChange={(event) => setFeedbackForm({ ...feedbackForm, answers: feedbackForm.answers.map((item, itemIndex) => itemIndex === index ? { ...item, score: Number(event.target.value) } : item) })}>{[1, 2, 3, 4, 5].map((score) => <option value={score} key={score}>{score} — {score === 1 ? "слабо" : score === 5 ? "отлично" : "оценка"}</option>)}</select></label><label>Комментарий<input value={feedbackForm.answers[index]?.note || ""} onChange={(event) => setFeedbackForm({ ...feedbackForm, answers: feedbackForm.answers.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item) })} /></label></fieldset>)}
                    <div className="interview-assessment__final"><label>Общая оценка<select value={feedbackForm.overall_score} onChange={(event) => setFeedbackForm({ ...feedbackForm, overall_score: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((score) => <option value={score} key={score}>{score} из 5</option>)}</select></label><label>Рекомендация<select value={feedbackForm.recommendation} onChange={(event) => setFeedbackForm({ ...feedbackForm, recommendation: event.target.value })}><option value="advance">Рекомендую дальше</option><option value="hold">Дополнительная оценка</option><option value="reject">Не рекомендую</option></select></label><label className="interview-assessment__wide">Общий комментарий<textarea value={feedbackForm.comment} onChange={(event) => setFeedbackForm({ ...feedbackForm, comment: event.target.value })} /></label></div>
                    <button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить оценку"}</button>
                  </form>
                ) : (
                  <div className="interview-feedback-list"><span className="eyebrow">Обратная связь</span><h3>Оценки участников</h3>{activeInterview.feedback.map((feedback) => <article key={feedback.id}><header><strong>{feedback.participant_name}</strong><b>{feedback.overall_score}/5</b></header><span>{feedback.recommendation_label}</span>{feedback.comment && <p>{feedback.comment}</p>}</article>)}{!activeInterview.feedback.length && <p>Оценки пока не добавлены.</p>}</div>
                )}
                {activeInterview.feedback.length > 0 && activeInterview.status !== "completed" && <div className="interview-feedback-compact"><span>Получено оценок: {activeInterview.feedback.length}</span><strong>Средняя: {activeInterview.average_score}/5</strong></div>}
                {activeInterview.status !== "completed" ? (
                  <form className="interview-decision" onSubmit={completeInterview}><span className="eyebrow">Решение HR</span><h3>Завершить собеседование</h3><label>Решение<select value={decisionForm.decision} onChange={(event) => setDecisionForm({ ...decisionForm, decision: event.target.value })}><option value="advance">Перевести дальше</option><option value="hold">Оставить в резерве</option><option value="reject">Отказать</option></select></label><label>Итоговый комментарий<textarea value={decisionForm.summary} onChange={(event) => setDecisionForm({ ...decisionForm, summary: event.target.value })} /></label><button className="secondary-button" type="submit" disabled={saving}>{saving ? "Завершаем…" : "Зафиксировать решение"}</button></form>
                ) : <div className={`interview-result interview-result--${activeInterview.decision}`}><CheckCircle2 /><span><small>Итоговое решение</small><strong>{activeInterview.decision_label}</strong>{activeInterview.summary && <p>{activeInterview.summary}</p>}</span></div>}
              </section>
            </div>
          </section>
        </div>
      )}
      {showForm && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowForm(false);
        }}>
          <section className="hcm-dialog" role="dialog" aria-modal="true" aria-labelledby="candidate-dialog-title">
            <header>
              <div><h2 id="candidate-dialog-title">{editing ? "Карточка кандидата" : "Новый кандидат"}</h2><p>Контакты, вакансия и текущий этап</p></div>
              <button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Закрыть"><X /></button>
            </header>
            <form className="hcm-form" onSubmit={saveCandidate}>
              <div className="hcm-form__grid">
                <label className="hcm-form__wide">ФИО<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
                <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label>Телефон<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label>Telegram<input value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" /></label>
                <label>Источник<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Рекомендация, hh.ru" /></label>
                <label className="hcm-form__wide">Вакансия<select value={form.vacancy} onChange={(e) => selectCandidateVacancy(e.target.value)}><option value="">Без привязки</option>{vacancies.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.department_name}</option>)}</select></label>
                <label className="hcm-form__wide">Желаемая позиция<input value={form.desired_position} onChange={(e) => setForm({ ...form, desired_position: e.target.value })} required /></label>
                <label>Этап<select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} required><option value="" disabled>Выберите этап</option>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Отдел<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Без отдела</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Ожидания по зарплате<input type="number" min="0" value={form.desired_salary} onChange={(e) => setForm({ ...form, desired_salary: e.target.value })} /></label>
                <label className="hcm-form__wide">Навыки<textarea value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></label>
                <label className="hcm-form__wide">Комментарий<textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <footer><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить"}</button></footer>
            </form>
          </section>
        </div>
      )}
      {vacancyDialog && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setVacancyDialog(null); }}>
          <section className="hcm-dialog" role="dialog" aria-modal="true" aria-labelledby="vacancy-dialog-title">
            <header><div><h2 id="vacancy-dialog-title">{vacancyDialog === "new" ? "Новая вакансия" : "Карточка вакансии"}</h2><p>Свяжите подбор со штатной потребностью</p></div><button className="icon-button" type="button" onClick={() => setVacancyDialog(null)} aria-label="Закрыть"><X /></button></header>
            <form className="hcm-form" onSubmit={saveVacancy}>
              <div className="hcm-form__grid">
                <label className="hcm-form__wide">Штатная позиция<select value={vacancyForm.staff_position} onChange={(event) => selectStaffPosition(event.target.value)}><option value="">Без привязки</option>{staff.filter((item) => (item.vacancies > 0 && item.open_vacancy_count === 0) || Number(vacancyForm.staff_position) === item.id).map((item) => <option key={item.id} value={item.id}>{item.department_name} · {item.position_name} · свободно {item.vacancies}</option>)}</select></label>
                <label className="hcm-form__wide">Название<input value={vacancyForm.title} onChange={(event) => setVacancyForm({ ...vacancyForm, title: event.target.value })} required /></label>
                <label>Отдел<select value={vacancyForm.department} onChange={(event) => setVacancyForm({ ...vacancyForm, department: event.target.value })} required><option value="">Выберите отдел</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Должность<select value={vacancyForm.position} onChange={(event) => setVacancyForm({ ...vacancyForm, position: event.target.value })} required><option value="">Выберите должность</option>{positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Количество мест<input type="number" min="1" value={vacancyForm.openings} onChange={(event) => setVacancyForm({ ...vacancyForm, openings: event.target.value })} required /></label>
                <label>Статус<select value={vacancyForm.status} onChange={(event) => setVacancyForm({ ...vacancyForm, status: event.target.value })}><option value="open">Открыта</option><option value="paused">Приостановлена</option><option value="closed">Закрыта</option></select></label>
                <label>Плановая дата закрытия<input type="date" value={vacancyForm.deadline} onChange={(event) => setVacancyForm({ ...vacancyForm, deadline: event.target.value })} /></label>
                <label className="hcm-form__wide">Описание<textarea value={vacancyForm.description} onChange={(event) => setVacancyForm({ ...vacancyForm, description: event.target.value })} /></label>
                <label className="hcm-form__wide">Требования<textarea value={vacancyForm.requirements} onChange={(event) => setVacancyForm({ ...vacancyForm, requirements: event.target.value })} /></label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <footer><button className="secondary-button" type="button" onClick={() => setVacancyDialog(null)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить вакансию"}</button></footer>
            </form>
          </section>
        </div>
      )}
      {offerDialog && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOfferDialog(null); }}>
          <section className="hcm-dialog offer-dialog" role="dialog" aria-modal="true" aria-labelledby="offer-dialog-title">
            <header>
              <div><span className="eyebrow">{offerDialog.candidate.full_name}</span><h2 id="offer-dialog-title">Оффер кандидату</h2></div>
              <button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setOfferDialog(null)}><X /></button>
            </header>
            {offerDialog.offer && <div className="offer-status-row"><span className={`offer-status offer-status--${offerDialog.offer.status}`}>{offerDialog.offer.status_label}</span><small>Версия от {new Date(offerDialog.offer.updated_at || Date.now()).toLocaleDateString("ru-RU")}</small></div>}
            {(!offerDialog.offer || offerDialog.offer.status === "draft") ? (
              <>
                <form className="hcm-form" onSubmit={saveOffer}>
                  <div className="hcm-form__grid">
                    <label className="hcm-form__wide">Должность<input value={offerForm.position_title} onChange={(event) => setOfferForm({ ...offerForm, position_title: event.target.value })} required /></label>
                    <label>Оклад<input type="number" min="0" value={offerForm.salary} onChange={(event) => setOfferForm({ ...offerForm, salary: event.target.value })} required /></label>
                    <label>Формат<select value={offerForm.work_format} onChange={(event) => setOfferForm({ ...offerForm, work_format: event.target.value })}><option value="office">Офис</option><option value="hybrid">Гибрид</option><option value="remote">Удалённо</option></select></label>
                    <label>Плановая дата выхода<input type="date" value={offerForm.start_date} onChange={(event) => setOfferForm({ ...offerForm, start_date: event.target.value })} required /></label>
                    <label>Ответ до<input type="date" max={offerForm.start_date} value={offerForm.valid_until} onChange={(event) => setOfferForm({ ...offerForm, valid_until: event.target.value })} required /></label>
                    <label>Испытательный срок<input type="number" min="0" max="12" value={offerForm.probation_months} onChange={(event) => setOfferForm({ ...offerForm, probation_months: event.target.value })} /></label>
                    <label className="offer-file-field">Файл PDF/DOCX<input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setOfferFile(event.target.files?.[0] || null)} /></label>
                    <label className="hcm-form__wide">Условия<textarea value={offerForm.conditions} onChange={(event) => setOfferForm({ ...offerForm, conditions: event.target.value })} placeholder="График, бонусы, ДМС и дополнительные договорённости" /></label>
                  </div>
                  {offerDialog.offer?.file_url && <a className="offer-file-link" href={offerDialog.offer.file_url} target="_blank" rel="noreferrer"><FileText />{offerDialog.offer.file_original_name || "Открыть текущий файл"}</a>}
                  {error && <p className="form-error">{error}</p>}
                  <footer><button className="secondary-button" type="button" onClick={() => setOfferDialog(null)}>Закрыть</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Сохраняем…" : offerDialog.offer ? "Сохранить изменения" : "Создать черновик"}</button></footer>
                </form>
                {offerDialog.offer && <button className="offer-next-action" type="button" disabled={saving} onClick={() => void changeOfferStatus("submit")}>Отправить на согласование <ChevronRight /></button>}
              </>
            ) : (
              <div className="offer-review">
                <dl>
                  <div><dt>Должность</dt><dd>{offerDialog.offer.position_title}</dd></div>
                  <div><dt>Оклад</dt><dd>{offerDialog.offer.salary ? `${Number(offerDialog.offer.salary).toLocaleString("ru-RU")} ₽` : "Не указан"}</dd></div>
                  <div><dt>Формат</dt><dd>{offerDialog.offer.work_format_label}</dd></div>
                  <div><dt>Дата выхода</dt><dd>{offerDialog.offer.start_date ? new Date(`${offerDialog.offer.start_date}T00:00:00`).toLocaleDateString("ru-RU") : "Не указана"}</dd></div>
                  <div><dt>Ответ до</dt><dd>{offerDialog.offer.valid_until ? new Date(`${offerDialog.offer.valid_until}T00:00:00`).toLocaleDateString("ru-RU") : "Не указан"}</dd></div>
                  <div><dt>Испытательный срок</dt><dd>{offerDialog.offer.probation_months} мес.</dd></div>
                </dl>
                {offerDialog.offer.conditions && <div className="offer-review__conditions"><span>Условия</span><p>{offerDialog.offer.conditions}</p></div>}
                {offerDialog.offer.file_url && <a className="offer-file-link" href={offerDialog.offer.file_url} target="_blank" rel="noreferrer"><FileText />{offerDialog.offer.file_original_name || "Открыть файл оффера"}</a>}
                {error && <p className="form-error">{error}</p>}
                <div className="offer-review__actions">
                  {offerDialog.offer.status === "pending" && <button className="primary-button" type="button" disabled={saving} onClick={() => void changeOfferStatus("approve")}><CheckCircle2 />Согласовать</button>}
                  {offerDialog.offer.status === "approved" && <><button className="secondary-button" type="button" disabled={saving} onClick={() => void changeOfferStatus("declined")}>Кандидат отказался</button><button className="primary-button" type="button" disabled={saving} onClick={() => void changeOfferStatus("accepted")}><CheckCircle2 />Кандидат принял</button></>}
                  {(offerDialog.offer.status === "accepted" || offerDialog.offer.status === "declined") && <div className="offer-outcome"><CheckCircle2 /><span><strong>{offerDialog.offer.status_label}</strong><small>Результат зафиксирован в истории подбора</small></span></div>}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      {hiring && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHiring(null); }}>
          <section className="hcm-dialog hire-dialog" role="dialog" aria-modal="true" aria-labelledby="hire-dialog-title">
            <header><div><h2 id="hire-dialog-title">Оформление сотрудника</h2><p>{hiring.full_name} · {hiring.vacancy_title}</p></div><button className="icon-button" type="button" onClick={() => setHiring(null)} aria-label="Закрыть"><X /></button></header>
            <div className="hire-dialog__notice"><CheckCircle2 /><span>Будут созданы учётная запись, карточка сотрудника и запись в кадровой истории.</span></div>
            <form className="hcm-form" onSubmit={hireCandidate}>
              <div className="hcm-form__grid">
                <label>Имя<input value={hireForm.first_name} onChange={(event) => setHireForm({ ...hireForm, first_name: event.target.value })} required /></label>
                <label>Фамилия<input value={hireForm.last_name} onChange={(event) => setHireForm({ ...hireForm, last_name: event.target.value })} required /></label>
                <label className="hcm-form__wide">Корпоративная почта<input type="email" value={hireForm.corporate_email} onChange={(event) => setHireForm({ ...hireForm, corporate_email: event.target.value })} required /></label>
                <label>Табельный номер<input value={hireForm.employee_number} onChange={(event) => setHireForm({ ...hireForm, employee_number: event.target.value })} required /></label>
                <label>Дата выхода<input type="date" value={hireForm.hire_date} onChange={(event) => setHireForm({ ...hireForm, hire_date: event.target.value })} required /></label>
                <label>Грейд<input value={hireForm.grade} onChange={(event) => setHireForm({ ...hireForm, grade: event.target.value })} placeholder="Junior, Middle, Senior" /></label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <footer><button className="secondary-button" type="button" onClick={() => setHiring(null)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Оформляем…" : "Оформить и пригласить"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function HrAnalyticsView({ token }: { token: string }) {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [summary, setSummary] = useState<HcmSummary | null>(null);
  const [dashboard, setDashboard] = useState<HcmDashboard | null>(null);
  const [error, setError] = useState("");
  const [showLearningImport, setShowLearningImport] = useState(false);
  const [learningImport, setLearningImport] = useState<LearningImportPreview | null>(null);
  const [learningMapping, setLearningMapping] = useState<Record<string, string>>({});
  const [learningReview, setLearningReview] = useState<LearningImportReview | null>(null);
  const [learningHistory, setLearningHistory] = useState<LearningImportBatch[]>([]);
  const [learningImportBusy, setLearningImportBusy] = useState(false);
  const [learningImportNotice, setLearningImportNotice] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<EmployeeProfile[]>("/employees/", token),
      apiRequest<HcmSummary>("/hcm/summary/", token),
      apiRequest<HcmDashboard>("/hcm/dashboard/", token),
    ]).then(([people, totals, nextDashboard]) => {
      setEmployees(people);
      setSummary(totals);
      setDashboard(nextDashboard);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить аналитику"));
  }, [token]);

  const departments = Array.from(new Set(employees.map((item) => item.department_name || "Без отдела")))
    .map((name) => ({ name, count: employees.filter((item) => (item.department_name || "Без отдела") === name).length }));
  const maxDepartment = Math.max(...departments.map((item) => item.count), 1);
  const maxFunnel = Math.max(...(dashboard?.funnel.map((item) => item.count) || []), 1);
  const dashboardMetrics = [
    { label: "Активный онбординг", value: dashboard?.metrics.active_onboarding ?? "—", note: `${dashboard?.metrics.overdue_onboarding ?? 0} просрочено`, alert: Boolean(dashboard?.metrics.overdue_onboarding) },
    { label: "Испытательный срок", value: dashboard?.metrics.probation ?? "—", note: "сотрудников" },
    { label: "Открытые вакансии", value: dashboard?.metrics.open_vacancies ?? "—", note: `${dashboard?.metrics.active_candidates ?? 0} кандидатов` },
    { label: "Развитие команды", value: summary ? `${summary.average_development_progress}%` : "—", note: "средний прогресс" },
  ];

  function openLearningImport() {
    setError("");
    setLearningImport(null);
    setLearningMapping({});
    setLearningReview(null);
    setLearningImportNotice("");
    setShowLearningImport(true);
    void apiRequest<LearningImportBatch[]>("/learning-imports/ispring/", token)
      .then(setLearningHistory)
      .catch(() => setLearningHistory([]));
  }

  async function uploadLearningReport(file: File) {
    setLearningImportBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const preview = await apiUpload<LearningImportPreview>("/learning-imports/ispring/", token, body);
      setLearningImport(preview);
      setLearningMapping(preview.mapping);
      setLearningReview(preview.review);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось прочитать отчёт iSpring");
    } finally {
      setLearningImportBusy(false);
    }
  }

  async function reviewLearningReport() {
    if (!learningImport) return;
    setLearningImportBusy(true);
    setError("");
    try {
      const review = await apiRequest<LearningImportReview>("/learning-imports/ispring/", token, {
        method: "POST",
        body: JSON.stringify({
          batch_id: learningImport.batch_id,
          rows: learningImport.rows,
          mapping: learningMapping,
          commit: false,
        }),
      });
      setLearningReview(review);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проверить отчёт");
    } finally {
      setLearningImportBusy(false);
    }
  }

  async function commitLearningReport() {
    if (!learningImport || !learningReview || learningReview.error_count) return;
    setLearningImportBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ total: number; created: number; updated: number }>("/learning-imports/ispring/", token, {
        method: "POST",
        body: JSON.stringify({
          batch_id: learningImport.batch_id,
          rows: learningImport.rows,
          mapping: learningMapping,
          commit: true,
        }),
      });
      setLearningImportNotice(`Синхронизация завершена: добавлено ${result.created}, обновлено ${result.updated}`);
      setLearningHistory(await apiRequest<LearningImportBatch[]>("/learning-imports/ispring/", token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось импортировать результаты");
    } finally {
      setLearningImportBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="HR-дашборд"
        subtitle="Задачи и показатели, которые требуют внимания HR"
        action={<button className="secondary-button" type="button" onClick={openLearningImport}><RefreshCw />Синхронизация iSpring</button>}
      />
      <section className="hr-dashboard-metrics">
        {dashboardMetrics.map((item) => (
          <article key={item.label} className={item.alert ? "hr-dashboard-metric hr-dashboard-metric--alert" : "hr-dashboard-metric"}>
            <span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small>
          </article>
        ))}
      </section>
      {error && <p className="form-error">{error}</p>}
      <section className="hr-dashboard-grid">
        <article className="panel hr-attention-panel">
          <div className="section-heading"><div><h2>Онбординг под контролем</h2><p>Ближайшие сроки и просроченные планы</p></div></div>
          <div className="hr-attention-list">
            {dashboard?.onboarding.map((item) => (
              <div key={item.id} className={`hr-attention-row hr-attention-row--${item.severity}`}>
                <span className="hr-attention-row__avatar">{item.employee_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <div><strong>{item.employee_name}</strong><small>{item.department_name} · {item.responsible_name || "Без ответственного"}</small></div>
                <div className="hr-attention-row__progress"><span><i style={{ width: `${item.progress}%` }} /></span><small>{item.progress}%</small></div>
                <b>{item.days_left < 0 ? `Просрочено ${Math.abs(item.days_left)} д.` : item.days_left === 0 ? "Сегодня" : `${item.days_left} д.`}</b>
              </div>
            ))}
            {!dashboard?.onboarding.length && <div className="hcm-empty"><CheckCircle2 /><p>Активных планов адаптации нет</p></div>}
          </div>
        </article>
        <article className="panel hr-funnel-panel">
          <div className="section-heading"><div><h2>Воронка подбора</h2><p>Активные кандидаты по этапам</p></div></div>
          <div className="hr-funnel">
            {dashboard?.funnel.map((item) => (
              <div key={item.id}><span>{item.name}</span><div><i style={{ width: `${item.count / maxFunnel * 100}%` }} /></div><strong>{item.count}</strong></div>
            ))}
          </div>
        </article>
      </section>
      <section className="hr-dashboard-grid hr-dashboard-grid--lower">
        <article className="panel">
          <div className="section-heading"><div><h2>Испытательный срок</h2><p>Сотрудники и ближайшие контрольные даты</p></div></div>
          <div className="hr-simple-list">
            {dashboard?.probation.map((item) => (
              <div key={item.id}><span><strong>{item.employee_name}</strong><small>{item.position_name} · {item.department_name}</small></span><b>{item.days_left < 0 ? "Срок истёк" : `${item.days_left} д.`}</b></div>
            ))}
            {!dashboard?.probation.length && <div className="hcm-empty"><CheckCircle2 /><p>Нет сотрудников на испытательном сроке</p></div>}
          </div>
        </article>
        <article className="panel">
          <div className="section-heading"><div><h2>Открытые вакансии</h2><p>Нагрузка и активность подбора</p></div></div>
          <div className="hr-simple-list">
            {dashboard?.vacancies.map((item) => (
              <div key={item.id}><span><strong>{item.title}</strong><small>{item.department_name} · кандидаты: {item.candidates_count} · места: {item.openings}</small></span><b className={item.is_stale ? "hr-stale" : ""}>{item.is_stale ? "Нет движения" : item.deadline ? displayDate(item.deadline) : "В работе"}</b></div>
            ))}
            {!dashboard?.vacancies.length && <div className="hcm-empty"><BriefcaseBusiness /><p>Открытых вакансий нет</p></div>}
          </div>
        </article>
      </section>
      <section className="hcm-analytics-grid">
        <article className="panel hcm-chart">
          <div className="section-heading"><div><h2>Команда по отделам</h2><p>Распределение активных сотрудников</p></div></div>
          <div className="hcm-bars">
            {departments.map((department) => <div key={department.name}><span>{department.name}</span><div><i style={{ width: `${department.count / maxDepartment * 100}%` }} /></div><strong>{department.count}</strong></div>)}
          </div>
        </article>
        <article className="panel hcm-chart">
          <div className="section-heading"><div><h2>Развитие команды</h2><p>Среднее выполнение индивидуальных планов</p></div></div>
          <div className="hcm-ring" style={{ "--progress": `${summary?.average_development_progress ?? 0}%` } as React.CSSProperties}><strong>{summary?.average_development_progress ?? 0}%</strong><span>выполнено</span></div>
        </article>
      </section>
      {showLearningImport && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !learningImportBusy) setShowLearningImport(false);
        }}>
          <section className="hcm-dialog employee-import-dialog learning-import-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-import-title">
            <header>
              <div>
                <span className="eyebrow">Параллельная работа систем</span>
                <h2 id="learning-import-title">Синхронизация результатов iSpring</h2>
                <p>Сопоставляем сотрудника по корпоративной почте, а курс — по точному названию</p>
              </div>
              <button className="icon-button" type="button" disabled={learningImportBusy} onClick={() => setShowLearningImport(false)} aria-label="Закрыть"><X /></button>
            </header>
            {!learningImport ? (
              <>
                <div className="learning-import-note">
                  <RefreshCw />
                  <div><strong>Временный файловый мост</strong><p>Загрузите отчёт CSV/XLSX из iSpring. После получения доступа тот же процесс можно переключить на API без изменения карточек сотрудников.</p></div>
                </div>
                <label className={learningImportBusy ? "employee-import-upload employee-import-upload--busy" : "employee-import-upload"}>
                  <Upload />
                  <strong>{learningImportBusy ? "Читаем отчёт…" : "Выберите отчёт iSpring"}</strong>
                  <span>Нужны колонки с корпоративной почтой и названием курса · до 1000 строк и 5 МБ</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={learningImportBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadLearningReport(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {!!learningHistory.length && (
                  <section className="employee-import-history">
                    <div className="section-heading"><div><h3>Последние синхронизации</h3><p>Повторная загрузка того же файла блокируется</p></div></div>
                    <div>
                      {learningHistory.slice(0, 5).map((batch) => (
                        <article key={batch.id}>
                          <span className="employee-import-history__source employee-import-history__source--one-c">iSpring</span>
                          <div><strong>{batch.filename}</strong><small>{new Intl.DateTimeFormat("ru-RU").format(new Date(batch.completed_at))} · {batch.imported_by_name || "Администратор"}</small></div>
                          <span>{batch.created_count} добавлено · {batch.updated_count} обновлено</span>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : learningImportNotice ? (
              <div className="employee-import-complete">
                <CheckCircle2 />
                <h3>Данные iSpring обновлены</h3>
                <p>{learningImportNotice}. Результаты уже доступны в разделе «Обучение» карточек сотрудников.</p>
              </div>
            ) : (
              <>
                <div className="employee-import-file">
                  <FileText />
                  <div><strong>{learningImport.filename}</strong><span>{learningImport.rows.length} строк из отчёта</span></div>
                  <button className="secondary-button" type="button" disabled={learningImportBusy} onClick={() => {
                    setLearningImport(null);
                    setLearningReview(null);
                  }}>Другой файл</button>
                </div>
                <section className="employee-import-mapping">
                  <div className="section-heading"><div><h3>Сопоставление колонок</h3><p>Проверьте, откуда брать email, курс и показатели прохождения</p></div></div>
                  <div>
                    {learningImport.fields.map((field) => (
                      <label key={field.key}>
                        <span>{field.label}{field.required && <i>обязательно</i>}</span>
                        <select value={learningMapping[field.key] || ""} onChange={(event) => setLearningMapping({ ...learningMapping, [field.key]: event.target.value })}>
                          <option value="">Не импортировать</option>
                          {learningImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
                {learningReview && (
                  <>
                    <div className="employee-import-summary">
                      <div><span>Всего строк</span><strong>{learningReview.total}</strong></div>
                      <div><span>Новые результаты</span><strong>{learningReview.create_count}</strong></div>
                      <div><span>Обновления</span><strong>{learningReview.update_count}</strong></div>
                      <div className={learningReview.error_count ? "employee-import-summary__error" : ""}><span>С ошибками</span><strong>{learningReview.error_count}</strong></div>
                    </div>
                    <div className="employee-import-table">
                      <table>
                        <thead><tr><th>Строка</th><th>Сотрудник</th><th>Курс</th><th>Результат</th><th>Действие</th></tr></thead>
                        <tbody>
                          {learningReview.rows.map((row) => (
                            <tr key={row.row_number}>
                              <td>{row.row_number}</td>
                              <td><strong>{row.preview.employee_name || "Не найден"}</strong><span>{row.preview.employee_email}</span></td>
                              <td><strong>{row.preview.course_title || "Не указан"}</strong></td>
                              <td><strong>{row.preview.progress}%</strong><span>{row.preview.score === null ? "Без оценки" : `${row.preview.score} баллов`}</span></td>
                              <td>
                                <span className={`employee-import-status employee-import-status--${row.action}`}>{row.action === "create" ? "Добавить" : row.action === "update" ? "Обновить" : "Ошибка"}</span>
                                {!!Object.keys(row.errors).length && <small>{Object.values(row.errors).flat().join(" · ")}</small>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
            <footer className="employee-import-dialog__footer">
              <button className="secondary-button" type="button" disabled={learningImportBusy} onClick={() => setShowLearningImport(false)}>Закрыть</button>
              {learningImport && !learningImportNotice && (
                <>
                  <button className="secondary-button" type="button" disabled={learningImportBusy} onClick={() => void reviewLearningReport()}>{learningImportBusy ? "Проверяем…" : "Проверить"}</button>
                  <button className="primary-button" type="button" disabled={learningImportBusy || !learningReview || Boolean(learningReview.error_count)} onClick={() => void commitLearningReport()}><RefreshCw />Обновить результаты</button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

const lessonTypeLabels: Record<Lesson["lesson_type"], string> = {
  text: "Текст",
  video: "Видео",
  link: "Ссылка",
  file: "Файл",
  quiz: "Тест",
  scorm: "SCORM 1.2",
};

const quizQuestionTypeLabels: Record<QuizQuestionType, string> = {
  single_choice: "Один ответ",
  multiple_choice: "Несколько ответов",
  true_false: "Верно / неверно",
  matching: "Сопоставление",
  ordering: "Порядок",
  short_text: "Короткий ответ",
  fill_blank: "Пропуск в тексте",
};

function questionType(question: QuizQuestion): QuizQuestionType {
  return question.type || "single_choice";
}

function createQuizQuestion(type: QuizQuestionType = "single_choice"): QuizQuestion {
  const base: QuizQuestion = {
    type,
    prompt: type === "fill_blank" ? "Вставьте пропущенное слово: ___" : "",
    image_url: "",
    image_asset_id: null,
    image_original_name: "",
    options: [],
  };
  if (type === "single_choice" || type === "multiple_choice") {
    return { ...base, options: [{ text: "", correct: true }, { text: "", correct: false }] };
  }
  if (type === "true_false") return { ...base, correct_boolean: true };
  if (type === "matching") return { ...base, pairs: [{ left: "", right: "" }, { left: "", right: "" }] };
  if (type === "ordering") return { ...base, options: [{ text: "", correct: false }, { text: "", correct: false }] };
  return { ...base, accepted_answers: [""] };
}

function emptyQuiz(): QuizData {
  return {
    passing_score: 80,
    max_attempts: 3,
    questions: [createQuizQuestion()],
  };
}

function newLesson(position: number): Lesson {
  return {
    client_key: crypto.randomUUID(),
    title: "",
    lesson_type: "text",
    content: "",
    media_url: "",
    video_url: "",
    video_original_name: "",
    video_size: 0,
    duration_minutes: 5,
    position,
    is_required: true,
    quiz_data: emptyQuiz(),
  };
}

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1 ? `${megabytes.toFixed(1)} МБ` : `${Math.ceil(bytes / 1024)} КБ`;
}

function chapterCountLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  const word = last === 1 && lastTwo !== 11 ? "глава"
    : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "главы" : "глав";
  return `${count} ${word}`;
}

function normalizeQuizText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function rotatedQuizItems<T>(items: T[]) {
  return items.length < 2 ? items : [...items.slice(1), items[0]];
}

function displayedOrdering(question: QuizQuestion) {
  const items = (question.options || []).map((option) => option.text);
  return question.learner_view ? items : rotatedQuizItems(items);
}

function matchingSides(question: QuizQuestion) {
  const left = question.left_items || (question.pairs || []).map((pair) => pair.left);
  const storedRight = question.right_items || (question.pairs || []).map((pair) => pair.right);
  return { left, right: question.learner_view ? storedRight : rotatedQuizItems(storedRight) };
}

function defaultQuizAnswer(question: QuizQuestion): QuizAnswer | undefined {
  if (questionType(question) === "ordering") return displayedOrdering(question);
  if (questionType(question) === "matching") return Array(matchingSides(question).left.length).fill("");
  if (questionType(question) === "multiple_choice") return [];
  return undefined;
}

function quizAnswerComplete(question: QuizQuestion, answer: QuizAnswer | undefined) {
  const kind = questionType(question);
  if (kind === "single_choice") return typeof answer === "number";
  if (kind === "multiple_choice") return Array.isArray(answer) && answer.length > 0;
  if (kind === "true_false") return typeof answer === "boolean";
  if (kind === "matching") return Array.isArray(answer) && answer.length === matchingSides(question).left.length && answer.every(Boolean);
  if (kind === "ordering") return Array.isArray(answer) && answer.length === question.options.length;
  return typeof answer === "string" && Boolean(answer.trim());
}

function previewAnswerCorrect(question: QuizQuestion, answer: QuizAnswer | undefined) {
  const kind = questionType(question);
  if (kind === "single_choice") return typeof answer === "number" && Boolean(question.options[answer]?.correct);
  if (kind === "multiple_choice" && Array.isArray(answer)) {
    const expected = question.options.map((option, index) => option.correct ? index : -1).filter((index) => index >= 0);
    return answer.length === expected.length && answer.every((index) => expected.includes(Number(index)));
  }
  if (kind === "true_false") return answer === question.correct_boolean;
  if (kind === "matching" && Array.isArray(answer)) {
    return answer.every((item, index) => normalizeQuizText(item) === normalizeQuizText(question.pairs?.[index]?.right));
  }
  if (kind === "ordering" && Array.isArray(answer)) {
    return answer.every((item, index) => normalizeQuizText(item) === normalizeQuizText(question.options[index]?.text));
  }
  if ((kind === "short_text" || kind === "fill_blank") && typeof answer === "string") {
    return (question.accepted_answers || []).some((item) => normalizeQuizText(item) === normalizeQuizText(answer));
  }
  return false;
}

function correctAnswerSummary(question: QuizQuestion) {
  const kind = questionType(question);
  if (kind === "single_choice" || kind === "multiple_choice") return question.options.filter((option) => option.correct).map((option) => option.text).join(", ");
  if (kind === "true_false") return question.correct_boolean ? "Верно" : "Неверно";
  if (kind === "matching") return (question.pairs || []).map((pair) => `${pair.left} — ${pair.right}`).join("; ");
  if (kind === "ordering") return question.options.map((option) => option.text).join(" → ");
  return (question.accepted_answers || []).join(", ");
}

function moveQuizItem<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function QuizAnswerFields({
  question,
  answer,
  onChange,
  disabled = false,
  reveal = false,
}: {
  question: QuizQuestion;
  answer: QuizAnswer | undefined;
  onChange: (answer: QuizAnswer) => void;
  disabled?: boolean;
  reveal?: boolean;
}) {
  const kind = questionType(question);
  const choice = typeof answer === "number" ? answer : undefined;
  const multiple = Array.isArray(answer) ? answer.map(Number) : [];
  const matching = Array.isArray(answer) ? answer.map(String) : Array(matchingSides(question).left.length).fill("");
  const ordering = Array.isArray(answer) && answer.length ? answer.map(String) : displayedOrdering(question);
  const text = typeof answer === "string" ? answer : "";

  return (
    <>
      {question.image_url && <img className="quiz-question__image" src={question.image_url} alt="" />}
      {(kind === "single_choice" || kind === "multiple_choice") && (
        <div className="quiz-options">
          {question.options.map((option, optionIndex) => {
            const chosen = kind === "single_choice" ? choice === optionIndex : multiple.includes(optionIndex);
            const resultClass = reveal && option.correct ? " quiz-option--correct"
              : reveal && chosen ? " quiz-option--incorrect" : "";
            return (
              <label className={`quiz-option${chosen ? " quiz-option--chosen" : ""}${resultClass}`} key={`${option.text}-${optionIndex}`}>
                <input
                  type={kind === "single_choice" ? "radio" : "checkbox"}
                  name={kind === "single_choice" ? `quiz-choice-${question.prompt}` : undefined}
                  checked={chosen}
                  disabled={disabled}
                  onChange={() => {
                    if (kind === "single_choice") onChange(optionIndex);
                    else onChange(chosen ? multiple.filter((item) => item !== optionIndex) : [...multiple, optionIndex]);
                  }}
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      )}
      {kind === "true_false" && (
        <div className="quiz-boolean" role="group" aria-label="Выберите верно или неверно">
          {[true, false].map((value) => <button className={answer === value ? "quiz-boolean__button quiz-boolean__button--active" : "quiz-boolean__button"} type="button" disabled={disabled} onClick={() => onChange(value)} key={String(value)}>{value ? "Верно" : "Неверно"}</button>)}
        </div>
      )}
      {kind === "matching" && (
        <div className="quiz-matching">
          {matchingSides(question).left.map((left, index) => (
            <div key={`${left}-${index}`}><strong>{left}</strong><ChevronRight /><select aria-label={`Пара для ${left}`} value={matching[index] || ""} disabled={disabled} onChange={(event) => onChange(matching.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}><option value="">Выберите пару</option>{matchingSides(question).right.map((right) => <option value={right} key={right}>{right}</option>)}</select></div>
          ))}
        </div>
      )}
      {kind === "ordering" && (
        <div className="quiz-ordering">
          {ordering.map((item, index) => (
            <div key={`${item}-${index}`}><span>{index + 1}</span><strong>{item}</strong><button className="mini-button" type="button" disabled={disabled || index === 0} onClick={() => onChange(moveQuizItem(ordering, index, -1))} aria-label={`Поднять ${item}`}><ArrowUp /></button><button className="mini-button" type="button" disabled={disabled || index === ordering.length - 1} onClick={() => onChange(moveQuizItem(ordering, index, 1))} aria-label={`Опустить ${item}`}><ArrowDown /></button></div>
          ))}
        </div>
      )}
      {(kind === "short_text" || kind === "fill_blank") && <label className="quiz-text-answer">Ваш ответ<input value={text} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={kind === "fill_blank" ? "Слово или фраза для пропуска" : "Введите ответ"} /></label>}
    </>
  );
}

function QuizPreview({ lesson }: { lesson: Lesson }) {
  const questions = lesson.quiz_data?.questions || [];
  const passingScore = lesson.quiz_data?.passing_score ?? 80;
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const correctCount = questions.reduce((total, question, index) => total + (previewAnswerCorrect(question, answers[index]) ? 1 : 0), 0);
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const question = questions[currentQuestion];
  const chosenAnswer = answers[currentQuestion] ?? (question ? defaultQuizAnswer(question) : undefined);
  const isCorrect = question ? previewAnswerCorrect(question, chosenAnswer) : false;

  useEffect(() => {
    setAnswers({});
    setCurrentQuestion(0);
    setQuestionSubmitted(false);
    setFinished(false);
  }, [lesson.id, lesson.client_key]);

  function restartQuiz() {
    setAnswers({});
    setCurrentQuestion(0);
    setQuestionSubmitted(false);
    setFinished(false);
  }

  function continueQuiz() {
    if (currentQuestion >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrentQuestion((current) => current + 1);
    setQuestionSubmitted(false);
  }

  if (!questions.length) return <div className="native-preview-placeholder"><CheckCircle2 /><p>Вопросы теста пока не добавлены.</p></div>;

  if (finished) {
    return (
      <div className={score >= passingScore ? "quiz-result quiz-result--passed" : "quiz-result quiz-result--failed"} role="status">
        <CheckCircle2 />
        <div><strong>{score >= passingScore ? "Тест пройден" : "Тест пока не пройден"}</strong><span>Результат: {score}% · правильных ответов {correctCount} из {questions.length}</span></div>
        <button className="secondary-button" type="button" onClick={restartQuiz}>Пройти ещё раз</button>
      </div>
    );
  }

  return (
    <div className="quiz-preview">
      <div className="quiz-preview__progress"><div><span>Вопрос {currentQuestion + 1} из {questions.length}</span><strong>{quizQuestionTypeLabels[questionType(question)]}</strong></div><span><i style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} /></span></div>
      <p className="quiz-preview__intro">Отвечайте последовательно. Для прохождения нужно набрать не менее {passingScore}%.</p>
      <fieldset className="quiz-question" key={`${question.prompt}-${currentQuestion}`}>
        <legend>{currentQuestion + 1}. {question.prompt}</legend>
        <QuizAnswerFields question={question} answer={chosenAnswer} onChange={(answer) => setAnswers((current) => ({ ...current, [currentQuestion]: answer }))} disabled={questionSubmitted} reveal={questionSubmitted} />
      </fieldset>
      {!questionSubmitted ? (
        <button className="primary-button quiz-preview__submit" type="button" disabled={!quizAnswerComplete(question, chosenAnswer)} onClick={() => { if (chosenAnswer !== undefined) setAnswers((current) => ({ ...current, [currentQuestion]: chosenAnswer })); setQuestionSubmitted(true); }}>Ответить</button>
      ) : (
        <div className={isCorrect ? "quiz-feedback quiz-feedback--correct" : "quiz-feedback quiz-feedback--incorrect"} role="status">
          <CheckCircle2 /><div><strong>{isCorrect ? "Верно" : "Ответ неверный"}</strong><span>{isCorrect ? "Ответ принят — можно продолжать." : `Правильный ответ: ${correctAnswerSummary(question) || "не указан"}`}</span></div>
          <button className="primary-button" type="button" onClick={continueQuiz}>{currentQuestion >= questions.length - 1 ? "Показать результат" : "Следующий вопрос"}<ChevronRight /></button>
        </div>
      )}
    </div>
  );
}

function QuizEditor({ value, onChange, token }: { value: QuizData; onChange: (value: QuizData) => void; token: string }) {
  const quiz = value?.questions?.length ? value : emptyQuiz();
  const [uploadingQuestion, setUploadingQuestion] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");
  const updateQuestion = (questionIndex: number, update: Partial<QuizQuestion>) => onChange({ ...quiz, questions: quiz.questions.map((question, index) => index === questionIndex ? { ...question, ...update } : question) });
  const replaceQuestionType = (questionIndex: number, type: QuizQuestionType) => {
    const current = quiz.questions[questionIndex];
    const replacement = createQuizQuestion(type);
    onChange({ ...quiz, questions: quiz.questions.map((question, index) => index === questionIndex ? {
      ...replacement,
      prompt: type === "fill_blank" ? replacement.prompt : current.prompt,
      image_url: current.image_url || "",
      image_asset_id: current.image_asset_id || null,
      image_original_name: current.image_original_name || "",
    } : question) });
  };

  async function uploadQuestionImage(questionIndex: number, file: File) {
    setImageError("");
    setUploadingQuestion(questionIndex);
    try {
      const body = new FormData();
      body.append("image", file);
      const uploaded = await apiUpload<{ id: number; url: string; original_name: string; size: number }>(
        "/courses/question-image/",
        token,
        body,
      );
      const previousAssetId = quiz.questions[questionIndex]?.image_asset_id;
      updateQuestion(questionIndex, {
        image_url: uploaded.url,
        image_asset_id: uploaded.id,
        image_original_name: uploaded.original_name,
      });
      if (previousAssetId) {
        await apiRequest(`/courses/question-image/?asset_id=${previousAssetId}`, token, { method: "DELETE" }).catch(() => undefined);
      }
    } catch (reason) {
      setImageError(reason instanceof Error ? reason.message : "Не удалось загрузить изображение");
    } finally {
      setUploadingQuestion(null);
    }
  }

  async function removeQuestionImage(questionIndex: number) {
    const assetId = quiz.questions[questionIndex]?.image_asset_id;
    setImageError("");
    try {
      if (assetId) {
        await apiRequest(`/courses/question-image/?asset_id=${assetId}`, token, { method: "DELETE" });
      }
      updateQuestion(questionIndex, { image_url: "", image_asset_id: null, image_original_name: "" });
    } catch (reason) {
      setImageError(reason instanceof Error ? reason.message : "Не удалось удалить изображение");
    }
  }

  async function removeQuizQuestion(questionIndex: number) {
    const assetId = quiz.questions[questionIndex]?.image_asset_id;
    setImageError("");
    try {
      if (assetId) {
        await apiRequest(`/courses/question-image/?asset_id=${assetId}`, token, { method: "DELETE" });
      }
      onChange({ ...quiz, questions: quiz.questions.filter((_, index) => index !== questionIndex) });
    } catch (reason) {
      setImageError(reason instanceof Error ? reason.message : "Не удалось удалить вопрос");
    }
  }

  return (
    <div className="quiz-editor">
      <div className="quiz-editor__heading">
        <div><h2>Вопросы теста</h2><p>Семь форматов вопросов · сотрудник видит их по одному</p></div>
        <div className="quiz-editor__rules">
          <label>Проходной балл<span className="quiz-editor__score"><input type="number" min="0" max="100" value={quiz.passing_score} onChange={(event) => onChange({ ...quiz, passing_score: Number(event.target.value) })} /><b>%</b></span></label>
          <label>Попыток<span className="quiz-editor__score"><input type="number" min="1" max="20" value={quiz.max_attempts ?? 3} onChange={(event) => onChange({ ...quiz, max_attempts: Number(event.target.value) })} /></span></label>
        </div>
      </div>
      {quiz.questions.map((question, questionIndex) => {
        const kind = questionType(question);
        return (
          <fieldset className="quiz-editor__question" key={questionIndex}>
            <div className="quiz-editor__question-top"><span>Вопрос {questionIndex + 1}</span><div><select aria-label={`Тип вопроса ${questionIndex + 1}`} value={kind} onChange={(event) => replaceQuestionType(questionIndex, event.target.value as QuizQuestionType)}>{Object.entries(quizQuestionTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{quiz.questions.length > 1 && <button className="mini-button mini-button--danger" type="button" onClick={() => void removeQuizQuestion(questionIndex)} aria-label={`Удалить вопрос ${questionIndex + 1}`}><Trash2 /></button>}</div></div>
            <input value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder={kind === "fill_blank" ? "Используйте ___ для обозначения пропуска" : "Введите вопрос"} aria-label={`Текст вопроса ${questionIndex + 1}`} required />
            <div className={question.image_url ? "quiz-editor__image quiz-editor__image--filled" : "quiz-editor__image"}>
              {question.image_url ? (
                <>
                  <img src={question.image_url} alt="" />
                  <div>
                    <strong>{question.image_original_name || "Изображение вопроса"}</strong>
                    <span>Картинка будет показана перед вариантами ответа</span>
                    <div className="quiz-editor__image-actions">
                      <label className="secondary-button">
                        <Upload /> Заменить
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          disabled={uploadingQuestion === questionIndex}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadQuestionImage(questionIndex, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <button className="secondary-button" type="button" onClick={() => void removeQuestionImage(questionIndex)}><Trash2 /> Удалить</button>
                    </div>
                  </div>
                </>
              ) : (
                <label className="quiz-editor__image-empty">
                  <Upload />
                  <span><strong>{uploadingQuestion === questionIndex ? "Загружаем…" : "Добавить изображение"}</strong><small>JPG, PNG или WebP · до 10 МБ</small></span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    disabled={uploadingQuestion === questionIndex}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadQuestionImage(questionIndex, file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
              <details>
                <summary>Или вставить ссылку</summary>
                <input value={question.image_url || ""} onChange={(event) => updateQuestion(questionIndex, { image_url: event.target.value })} placeholder="https://…" aria-label={`Ссылка на изображение вопроса ${questionIndex + 1}`} />
              </details>
            </div>
            {(kind === "single_choice" || kind === "multiple_choice") && <>
              <div className="quiz-editor__options">{question.options.map((option, optionIndex) => <div className="quiz-editor__option" key={optionIndex}><input className="quiz-editor__correct" type={kind === "single_choice" ? "radio" : "checkbox"} name={kind === "single_choice" ? `correct-${questionIndex}` : undefined} checked={option.correct} onChange={() => updateQuestion(questionIndex, { options: question.options.map((item, index) => ({ ...item, correct: kind === "single_choice" ? index === optionIndex : index === optionIndex ? !item.correct : item.correct })) })} aria-label={`Правильный ответ ${optionIndex + 1}`} /><input value={option.text} onChange={(event) => updateQuestion(questionIndex, { options: question.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item) })} placeholder={`Вариант ${optionIndex + 1}`} required />{question.options.length > 2 && <button className="mini-button mini-button--danger" type="button" onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} aria-label={`Удалить вариант ${optionIndex + 1}`}><X /></button>}</div>)}</div>
              <button className="secondary-button quiz-editor__add-option" type="button" onClick={() => updateQuestion(questionIndex, { options: [...question.options, { text: "", correct: false }] })}><Plus /> Добавить вариант</button>
            </>}
            {kind === "true_false" && <div className="quiz-editor__boolean"><span>Правильный ответ</span><label><input type="radio" name={`boolean-${questionIndex}`} checked={question.correct_boolean === true} onChange={() => updateQuestion(questionIndex, { correct_boolean: true })} />Верно</label><label><input type="radio" name={`boolean-${questionIndex}`} checked={question.correct_boolean === false} onChange={() => updateQuestion(questionIndex, { correct_boolean: false })} />Неверно</label></div>}
            {kind === "matching" && <><div className="quiz-editor__pairs">{(question.pairs || []).map((pair, pairIndex) => <div key={pairIndex}><input value={pair.left} onChange={(event) => updateQuestion(questionIndex, { pairs: (question.pairs || []).map((item, index) => index === pairIndex ? { ...item, left: event.target.value } : item) })} placeholder="Понятие" required /><ChevronRight /><input value={pair.right} onChange={(event) => updateQuestion(questionIndex, { pairs: (question.pairs || []).map((item, index) => index === pairIndex ? { ...item, right: event.target.value } : item) })} placeholder="Соответствие" required />{(question.pairs || []).length > 2 && <button className="mini-button mini-button--danger" type="button" onClick={() => updateQuestion(questionIndex, { pairs: (question.pairs || []).filter((_, index) => index !== pairIndex) })}><X /></button>}</div>)}</div><button className="secondary-button quiz-editor__add-option" type="button" onClick={() => updateQuestion(questionIndex, { pairs: [...(question.pairs || []), { left: "", right: "" }] })}><Plus /> Добавить пару</button></>}
            {kind === "ordering" && <><p className="quiz-editor__hint">Расположите элементы сразу в правильном порядке.</p><div className="quiz-editor__ordering">{question.options.map((option, optionIndex) => <div key={optionIndex}><span>{optionIndex + 1}</span><input value={option.text} onChange={(event) => updateQuestion(questionIndex, { options: question.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item) })} placeholder={`Этап ${optionIndex + 1}`} required /><button className="mini-button" type="button" disabled={optionIndex === 0} onClick={() => updateQuestion(questionIndex, { options: moveQuizItem(question.options, optionIndex, -1) })}><ArrowUp /></button><button className="mini-button" type="button" disabled={optionIndex === question.options.length - 1} onClick={() => updateQuestion(questionIndex, { options: moveQuizItem(question.options, optionIndex, 1) })}><ArrowDown /></button>{question.options.length > 2 && <button className="mini-button mini-button--danger" type="button" onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })}><X /></button>}</div>)}</div><button className="secondary-button quiz-editor__add-option" type="button" onClick={() => updateQuestion(questionIndex, { options: [...question.options, { text: "", correct: false }] })}><Plus /> Добавить этап</button></>}
            {(kind === "short_text" || kind === "fill_blank") && <label>Принимаемые ответы<input value={(question.accepted_answers || []).join(", ")} onChange={(event) => updateQuestion(questionIndex, { accepted_answers: event.target.value.split(",").map((item) => item.trim()) })} placeholder="Smartis, Смартис" required /><small>Можно указать несколько вариантов через запятую. Регистр не учитывается.</small></label>}
          </fieldset>
        );
      })}
      {imageError && <p className="form-error quiz-editor__image-error">{imageError}</p>}
      <button className="secondary-button quiz-editor__add-question" type="button" onClick={() => onChange({ ...quiz, questions: [...quiz.questions, createQuizQuestion()] })}><Plus /> Добавить вопрос</button>
    </div>
  );
}

function CoursePreviewModal({
  course,
  onClose,
  scormLaunchUrl,
  scormRuntime,
  scormFrameRef,
}: {
  course: Course;
  onClose: () => void;
  scormLaunchUrl: string;
  scormRuntime: { status: string; score: string };
  scormFrameRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const previewSectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeSection, setActiveSection] = useState(-1);
  const isLastSection = activeSection >= course.lessons.length - 1;
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => {
    previewScrollRef.current?.scrollTo({ top: 0 });
    setActiveSection(-1);
  }, [course.id]);

  function continueLongread() {
    if (isLastSection) {
      onClose();
      return;
    }
    const nextSection = activeSection + 1;
    setActiveSection(nextSection);
    previewSectionRefs.current[nextSection + 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className="course-preview-overlay" role="dialog" aria-modal="true" aria-label={`Предпросмотр курса ${course.title}`}>
      <section className="course-preview-modal">
        <header className="course-preview-header">
          <div><span>Предпросмотр</span><strong>{course.title}</strong></div>
          {course.source_format === "scorm_12" && (
            <div className="scorm-runtime-summary"><span>{scormRuntime.status}</span><strong>Баллы: {scormRuntime.score}</strong></div>
          )}
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть предпросмотр"><X /></button>
        </header>
        {course.source_format === "scorm_12" ? (
          scormLaunchUrl ? (
            <iframe
              ref={scormFrameRef}
              className="scorm-preview-frame"
              src={scormLaunchUrl}
              title={`SCORM: ${course.title}`}
              sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
              allow="fullscreen"
            />
          ) : <div className="course-preview-loading">Подготавливаем SCORM-курс…</div>
        ) : (
          <div className="native-course-preview">
            <div className="native-preview-scroll" ref={previewScrollRef}>
              <div className="native-preview-document">
                <article
                  className={course.cover_style === "custom" && course.cover_url ? "native-preview-page native-preview-cover native-preview-cover--image" : "native-preview-page native-preview-cover"}
                  ref={(node) => { previewSectionRefs.current[0] = node; }}
                >
                  {course.cover_style === "custom" && course.cover_url && <img className="native-preview-cover-image" src={course.cover_url} alt="" />}
                  <div className="native-preview-cover-content">
                    <span className="longread-eyebrow">SMARTIS · ОБУЧЕНИЕ</span>
                    <h1>{course.title}</h1>
                    <p>{course.description || "Описание курса пока не добавлено"}</p>
                    <div className="longread-cover-meta"><span><BookOpen />{chapterCountLabel(course.lessons.length)}</span><span><Clock3 />{course.estimated_minutes} минут</span></div>
                  </div>
                </article>
                {course.lessons.map((lesson, lessonIndex) => (
                  <article
                    className="native-preview-page native-preview-lesson"
                    key={lesson.id ?? lesson.client_key ?? lessonIndex}
                    ref={(node) => { previewSectionRefs.current[lessonIndex + 1] = node; }}
                  >
                    <div className="longread-chapter-kicker"><span>Глава {lessonIndex + 1}</span><span>{lessonTypeLabels[lesson.lesson_type]}</span></div>
                    <h1>{lesson.title}</h1>
                    {lesson.lesson_type === "quiz" ? (
                      <QuizPreview lesson={lesson} />
                    ) : lesson.lesson_type === "text" ? (
                      <div className="native-preview-content" dangerouslySetInnerHTML={{ __html: lesson.content || "<p>Содержание пока не добавлено.</p>" }} />
                    ) : lesson.lesson_type === "video" ? (
                      lesson.video_url ? <video className="native-preview-video" src={lesson.video_url} controls /> : <div className="native-preview-placeholder"><Video /><p>Видео появится после сохранения и загрузки файла.</p></div>
                    ) : lesson.lesson_type === "scorm" ? (
                      <div className="native-preview-placeholder"><FileArchive /><p>SCORM-пакет открывается в отдельном режиме просмотра.</p></div>
                    ) : (
                      <div className="native-preview-placeholder"><Link2 /><p>Материал откроется в новой вкладке.</p><a className="primary-button" href={lesson.media_url} target="_blank" rel="noreferrer">Открыть материал</a></div>
                    )}
                  </article>
                ))}
              </div>
            </div>
            <footer className="native-preview-navigation native-preview-navigation--longread">
              <span>{activeSection < 0 ? "Обложка" : `Глава ${activeSection + 1} из ${course.lessons.length}`}</span>
              <button className="primary-button" type="button" onClick={continueLongread}>
                {isLastSection ? "Завершить" : "Продолжить"}{isLastSection ? <CheckCircle2 /> : <ArrowDown />}
              </button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}

function LearningCourseModal({
  enrollment,
  token,
  onClose,
  onUpdated,
}: {
  enrollment: CourseEnrollment;
  token: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [current, setCurrent] = useState(enrollment);
  const [lessonIndex, setLessonIndex] = useState(() => {
    const index = enrollment.lessons.findIndex((lesson) => !lesson.completed);
    return index < 0 ? Math.max(enrollment.lessons.length - 1, 0) : index;
  });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; attempts_left: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lesson = current.lessons[lessonIndex];
  const questions = lesson?.quiz_data?.questions || [];
  const activeQuestion = questions[questionIndex];
  const selectedAnswer = answers[questionIndex] ?? (activeQuestion ? defaultQuizAnswer(activeQuestion) : undefined);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void apiRequest<CourseEnrollment>(`/my-learning/${enrollment.id}/start/`, token, { method: "POST" })
      .then(setCurrent)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось начать курс"));
    return () => { document.body.style.overflow = previousOverflow; };
  }, [enrollment.id, token]);

  function moveForward(next: CourseEnrollment) {
    setCurrent(next);
    const nextIndex = next.lessons.findIndex((item, index) => index > lessonIndex && !item.completed);
    if (nextIndex >= 0) setLessonIndex(nextIndex);
    setQuestionIndex(0);
    setAnswers({});
    setQuizResult(null);
  }

  async function completeLesson() {
    if (!lesson) return;
    if (lesson.completed) {
      const nextIndex = current.lessons.findIndex((item, index) => index > lessonIndex && !item.completed);
      if (nextIndex >= 0) setLessonIndex(nextIndex);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = await apiRequest<CourseEnrollment>(
        `/my-learning/${current.id}/lessons/${lesson.id}/complete/`,
        token,
        { method: "POST" },
      );
      moveForward(next);
      await onUpdated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить прогресс");
    } finally {
      setSaving(false);
    }
  }

  async function submitQuiz() {
    if (!lesson || questions.some((question, index) => !quizAnswerComplete(question, answers[index] ?? defaultQuizAnswer(question)))) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest<{
        score: number;
        passed: boolean;
        attempts_left: number;
        enrollment: CourseEnrollment;
      }>(`/my-learning/${current.id}/lessons/${lesson.id}/submit-quiz/`, token, {
        method: "POST",
        body: JSON.stringify({ answers: questions.map((question, index) => answers[index] ?? defaultQuizAnswer(question)) }),
      });
      setCurrent(result.enrollment);
      setQuizResult(result);
      await onUpdated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отправить тест");
    } finally {
      setSaving(false);
    }
  }

  function restartQuiz() {
    setAnswers({});
    setQuestionIndex(0);
    setQuizResult(null);
  }

  if (!lesson && current.status !== "completed") {
    return <div className="course-preview-overlay"><section className="course-preview-modal learning-player"><div className="update-empty">В курсе пока нет уроков.</div></section></div>;
  }

  return (
    <div className="course-preview-overlay" role="dialog" aria-modal="true" aria-label={`Прохождение курса ${current.course_title}`}>
      <section className="course-preview-modal learning-player">
        <header className="course-preview-header">
          <div><span>{current.learning_path_title || "Назначенный курс"}</span><strong>{current.course_title}</strong></div>
          <div className="learning-player__header-progress"><span>{current.progress}%</span><i><b style={{ width: `${current.progress}%` }} /></i></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть курс"><X /></button>
        </header>
        <div className="learning-player__body">
          <aside className="learning-player__outline">
            <span className="eyebrow">Содержание</span>
            {current.lessons.map((item, index) => (
              <button
                className={index === lessonIndex ? "learning-player__lesson learning-player__lesson--active" : "learning-player__lesson"}
                type="button"
                disabled={!item.completed && index > lessonIndex}
                onClick={() => { if (item.completed || index <= lessonIndex) setLessonIndex(index); }}
                key={item.id}
              >
                <span>{item.completed ? <CheckCircle2 /> : index + 1}</span>
                <div><strong>{item.title}</strong><small>{item.lesson_type_label}</small></div>
              </button>
            ))}
          </aside>
          <main className="learning-player__content">
            {current.status === "completed" && current.lessons.every((item) => item.completed) ? (
              <div className="learning-player__completed"><CheckCircle2 /><span className="eyebrow">Курс завершён</span><h1>{current.course_title}</h1><p>Прогресс сохранён. Следующий курс траектории уже открыт.</p>{current.score !== null && <strong>Итоговый результат: {current.score}%</strong>}<button className="primary-button" type="button" onClick={onClose}>Вернуться к траектории</button></div>
            ) : lesson ? (
              <article className="learning-player__page">
                <div className="longread-chapter-kicker"><span>Урок {lessonIndex + 1} из {current.lessons.length}</span><span>{lesson.lesson_type_label}</span></div>
                <h1>{lesson.title}</h1>
                {error && <div className="form-error">{error}</div>}
                {lesson.lesson_type === "quiz" ? (
                  quizResult ? (
                    <div className={quizResult.passed ? "quiz-result quiz-result--passed" : "quiz-result quiz-result--failed"}>
                      <CheckCircle2 />
                      <div><strong>{quizResult.passed ? "Тест пройден" : "Проходной балл не набран"}</strong><span>Результат: {quizResult.score}% · осталось попыток: {quizResult.attempts_left}</span></div>
                      {quizResult.passed
                        ? <button className="primary-button" type="button" onClick={() => moveForward(current)}>Продолжить <ChevronRight /></button>
                        : quizResult.attempts_left > 0 && <button className="secondary-button" type="button" onClick={restartQuiz}>Повторить тест</button>}
                    </div>
                  ) : (
                    <div className="quiz-preview learning-quiz">
                      <div className="quiz-preview__progress"><div><span>Вопрос {questionIndex + 1} из {questions.length}</span><strong>{lesson.attempts_count + 1} попытка</strong></div><span><i style={{ width: `${((questionIndex + 1) / Math.max(questions.length, 1)) * 100}%` }} /></span></div>
                      <p className="quiz-preview__intro">Проходной балл {lesson.quiz_data.passing_score}% · доступно попыток {lesson.quiz_data.max_attempts}</p>
                      <fieldset className="quiz-question">
                        <legend>{questionIndex + 1}. {activeQuestion?.prompt}</legend>
                        {activeQuestion && <QuizAnswerFields question={activeQuestion} answer={selectedAnswer} onChange={(answer) => setAnswers({ ...answers, [questionIndex]: answer })} />}
                      </fieldset>
                      {questionIndex < questions.length - 1
                        ? <button className="primary-button quiz-preview__submit" type="button" disabled={!activeQuestion || !quizAnswerComplete(activeQuestion, selectedAnswer)} onClick={() => { if (activeQuestion && selectedAnswer !== undefined) setAnswers({ ...answers, [questionIndex]: selectedAnswer }); setQuestionIndex((value) => value + 1); }}>Следующий вопрос <ChevronRight /></button>
                        : <button className="primary-button quiz-preview__submit" type="button" disabled={!activeQuestion || !quizAnswerComplete(activeQuestion, selectedAnswer) || saving} onClick={() => { if (activeQuestion && selectedAnswer !== undefined) setAnswers({ ...answers, [questionIndex]: selectedAnswer }); void submitQuiz(); }}>{saving ? "Проверяем…" : "Завершить тест"} <CheckCircle2 /></button>}
                    </div>
                  )
                ) : lesson.lesson_type === "text" ? (
                  <div className="native-preview-content" dangerouslySetInnerHTML={{ __html: lesson.content || "<p>Содержание пока не добавлено.</p>" }} />
                ) : lesson.lesson_type === "video" ? (
                  lesson.video_url ? <video className="native-preview-video" src={lesson.video_url} controls /> : <div className="native-preview-placeholder"><Video /><p>Видеофайл недоступен.</p></div>
                ) : lesson.lesson_type === "scorm" ? (
                  <div className="native-preview-placeholder"><FileArchive /><p>Изучите материал SCORM, затем отметьте урок завершённым.</p></div>
                ) : (
                  <div className="native-preview-placeholder"><Link2 /><p>Материал откроется в новой вкладке.</p><a className="primary-button" href={lesson.media_url} target="_blank" rel="noreferrer">Открыть материал</a></div>
                )}
                {lesson.lesson_type !== "quiz" && <footer className="learning-player__continue"><span>{lesson.completed ? "Урок завершён" : "Прогресс сохранится автоматически"}</span><button className="primary-button" type="button" disabled={saving} onClick={() => void completeLesson()}>{saving ? "Сохраняем…" : lessonIndex === current.lessons.length - 1 ? "Завершить курс" : "Продолжить"} <ChevronRight /></button></footer>}
              </article>
            ) : null}
          </main>
        </div>
      </section>
    </div>
  );
}

function TrajectoryView({ token, user }: { token: string; user: User }) {
  const [learning, setLearning] = useState<MyLearning>({ paths: [], standalone: [] });
  const [opened, setOpened] = useState<CourseEnrollment | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignmentOptions, setAssignmentOptions] = useState<{
    users: Array<{ id: number; name: string; email: string }>;
    paths: Array<{ id: number; title: string }>;
    courses: Array<{ id: number; title: string }>;
  }>({ users: [], paths: [], courses: [] });
  const [assignment, setAssignment] = useState({ user_id: "", kind: "path", material_id: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const next = await apiRequest<MyLearning>("/my-learning/", token);
      setLearning(next);
      if (opened) {
        const fresh = [...next.paths.flatMap((path) => path.courses), ...next.standalone].find((item) => item.id === opened.id);
        if (fresh) setOpened(fresh);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить обучение");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token]);
  const canAssign = user.role === "admin" || user.role === "hr";
  const allCourses = [...learning.paths.flatMap((path) => path.courses), ...learning.standalone];
  const completed = allCourses.filter((item) => item.status === "completed").length;

  async function openAssignment() {
    setError("");
    try {
      const options = await apiRequest<typeof assignmentOptions>("/my-learning/assignment-options/", token);
      setAssignmentOptions(options);
      setAssignment({
        user_id: options.users[0] ? String(options.users[0].id) : "",
        kind: options.paths.length ? "path" : "course",
        material_id: String(options.paths[0]?.id || options.courses[0]?.id || ""),
      });
      setShowAssign(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось открыть назначения");
    }
  }

  function changeAssignmentKind(kind: string) {
    const list = kind === "path" ? assignmentOptions.paths : assignmentOptions.courses;
    setAssignment({ ...assignment, kind, material_id: String(list[0]?.id || "") });
  }

  async function assignLearning(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest(
        assignment.kind === "path" ? "/my-learning/assign-path/" : "/my-learning/assign-course/",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            user_id: Number(assignment.user_id),
            [assignment.kind === "path" ? "learning_path_id" : "course_id"]: Number(assignment.material_id),
          }),
        },
      );
      setShowAssign(false);
      if (Number(assignment.user_id) === user.id) await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось назначить обучение");
    }
  }

  return (
    <>
      <PageHeader title="Траектория обучения" subtitle="Назначенные курсы открываются последовательно" action={canAssign ? <button className="primary-button" type="button" onClick={() => void openAssignment()}><Plus />Назначить обучение</button> : undefined} />
      {error && <div className="form-error">{error}</div>}
      <section className="learning-overview">
        <article><span>Общий прогресс</span><strong>{allCourses.length ? Math.round(allCourses.reduce((sum, item) => sum + item.progress, 0) / allCourses.length) : 0}%</strong></article>
        <article><span>Завершено курсов</span><strong>{completed} из {allCourses.length}</strong></article>
        <article><span>Активные траектории</span><strong>{learning.paths.filter((path) => path.status !== "completed").length}</strong></article>
      </section>
      <div className="learning-path-list">
        {learning.paths.map((path) => (
          <section className="panel learner-path" key={path.id}>
            <header><div><span className="eyebrow">{path.status === "completed" ? "Завершена" : "Траектория"}</span><h2>{path.title}</h2><p>{path.description}</p></div><strong>{path.progress}%</strong></header>
            <div className="learner-path__progress"><i style={{ width: `${path.progress}%` }} /></div>
            <div className="learning-path-courses">
              {path.courses.map((course, index) => (
                <article className={`learning-course-row learning-course-row--${course.status}`} key={course.id}>
                  <span className="learning-course-row__number">{course.status === "completed" ? <CheckCircle2 /> : index + 1}</span>
                  <div><strong>{course.course_title}</strong><span>{course.lessons.length} уроков · {course.course_minutes} мин · {course.status_label}</span></div>
                  <div className="mini-progress"><i style={{ width: `${course.progress}%` }} /></div>
                  <strong>{course.progress}%</strong>
                  <button className={course.status === "locked" ? "secondary-button" : "primary-button"} type="button" disabled={course.status === "locked"} onClick={() => setOpened(course)}>{course.status === "completed" ? "Повторить" : course.status === "in_progress" ? "Продолжить" : course.status === "available" ? "Начать" : "Недоступен"}</button>
                </article>
              ))}
            </div>
          </section>
        ))}
        {learning.standalone.length > 0 && <section className="panel learner-path"><header><div><span className="eyebrow">Отдельные назначения</span><h2>Мои курсы</h2></div></header><div className="learning-path-courses">{learning.standalone.map((course, index) => <article className={`learning-course-row learning-course-row--${course.status}`} key={course.id}><span className="learning-course-row__number">{course.status === "completed" ? <CheckCircle2 /> : index + 1}</span><div><strong>{course.course_title}</strong><span>{course.lessons.length} уроков · {course.status_label}</span></div><div className="mini-progress"><i style={{ width: `${course.progress}%` }} /></div><strong>{course.progress}%</strong><button className="primary-button" type="button" onClick={() => setOpened(course)}>{course.status === "completed" ? "Повторить" : course.status === "in_progress" ? "Продолжить" : "Начать"}</button></article>)}</div></section>}
        {!loading && !allCourses.length && <section className="panel learning-empty"><Route /><h2>Обучение пока не назначено</h2><p>После назначения курса или траектории они появятся здесь.</p></section>}
      </div>
      {opened && <LearningCourseModal enrollment={opened} token={token} onClose={() => setOpened(null)} onUpdated={load} />}
      {showAssign && <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAssign(false); }}><section className="hcm-dialog learning-assignment-dialog" role="dialog" aria-modal="true"><header><div><span className="eyebrow">Ручное назначение</span><h2>Назначить обучение</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowAssign(false)}><X /></button></header><form className="hcm-form" onSubmit={assignLearning}><div className="hcm-form__grid"><label className="hcm-form__wide">Сотрудник<select value={assignment.user_id} onChange={(event) => setAssignment({ ...assignment, user_id: event.target.value })} required>{assignmentOptions.users.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Тип назначения<select value={assignment.kind} onChange={(event) => changeAssignmentKind(event.target.value)}><option value="path" disabled={!assignmentOptions.paths.length}>Траектория</option><option value="course" disabled={!assignmentOptions.courses.length}>Отдельный курс</option></select></label><label>{assignment.kind === "path" ? "Траектория" : "Курс"}<select value={assignment.material_id} onChange={(event) => setAssignment({ ...assignment, material_id: event.target.value })} required>{(assignment.kind === "path" ? assignmentOptions.paths : assignmentOptions.courses).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label></div><footer><button className="secondary-button" type="button" onClick={() => setShowAssign(false)}>Отмена</button><button className="primary-button" type="submit" disabled={!assignment.user_id || !assignment.material_id}>Назначить</button></footer></form></section></div>}
    </>
  );
}

function CoursesView({ token, user }: { token: string; user: User }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [folders, setFolders] = useState<ContentFolder[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | "all" | "unassigned">("all");
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [contentFilter, setContentFilter] = useState<"all" | "courses" | "paths">("all");
  const [createDialog, setCreateDialog] = useState<"project" | "folder" | "path" | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creatingContent, setCreatingContent] = useState(false);
  const [editingId, setEditingId] = useState<number | null | "new">(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    estimated_minutes: 30,
    project: null as number | null,
    folder: null as number | null,
    lessons: [newLesson(0)],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [videoFiles, setVideoFiles] = useState<Record<string, File>>({});
  const [activeSection, setActiveSection] = useState<string>("cover");
  const [coverStyle, setCoverStyle] = useState<"standard" | "custom">("standard");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [importingScorm, setImportingScorm] = useState(false);
  const [replacingScormId, setReplacingScormId] = useState<number | null>(null);
  const [convertingScormId, setConvertingScormId] = useState<number | null>(null);
  const [exportingScormId, setExportingScormId] = useState<number | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [scormLaunchUrl, setScormLaunchUrl] = useState("");
  const [scormRuntime, setScormRuntime] = useState({ status: "Не начат", score: "—" });
  const [courseView, setCourseView] = useState<"cards" | "compact" | "list">(
    () => (localStorage.getItem("smartis-course-view") as "cards" | "compact" | "list") || "cards",
  );
  const [longreadToolbarDock, setLongreadToolbarDock] = useState<HTMLDivElement | null>(null);
  const scormFrameRef = useRef<HTMLIFrameElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [nextCourses, nextProjects, nextFolders, nextPaths] = await Promise.all([
        apiRequest<Course[]>("/courses/", token),
        apiRequest<ContentProject[]>("/projects/", token),
        apiRequest<ContentFolder[]>("/folders/", token),
        apiRequest<LearningPath[]>("/learning-paths/", token),
      ]);
      setCourses(nextCourses);
      setProjects(nextProjects);
      setFolders(nextFolders);
      setLearningPaths(nextPaths);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить курсы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    localStorage.setItem("smartis-course-view", courseView);
  }, [courseView]);

  const selectedProjectRecord = typeof selectedProject === "number"
    ? projects.find((project) => project.id === selectedProject) || null
    : null;
  const selectedFolderRecord = selectedFolder === null
    ? null
    : folders.find((folder) => folder.id === selectedFolder) || null;
  const visibleFolders = selectedProjectRecord
    ? folders.filter((folder) => folder.project === selectedProjectRecord.id && folder.parent === selectedFolder)
    : [];
  const visibleCourses = courses.filter((course) => {
    if (selectedProject === "all") return true;
    if (selectedProject === "unassigned") return course.project === null;
    return course.project === selectedProject && course.folder === selectedFolder;
  });
  const visiblePaths = learningPaths.filter((path) => {
    if (selectedProject === "all") return true;
    if (selectedProject === "unassigned") return path.project === null;
    return path.project === selectedProject && path.folder === selectedFolder;
  });

  function openProject(project: number | "all" | "unassigned") {
    setSelectedProject(project);
    setSelectedFolder(null);
    setEditingId(null);
  }

  function openCreateDialog(type: "project" | "folder" | "path") {
    setCreateDialog(type);
    setCreateName("");
    setCreateDescription("");
    setError("");
  }

  async function createLibraryContent(event: FormEvent) {
    event.preventDefault();
    if (!createDialog || !createName.trim()) return;
    setCreatingContent(true);
    setError("");
    try {
      if (createDialog === "project") {
        const project = await apiRequest<ContentProject>("/projects/", token, {
          method: "POST",
          body: JSON.stringify({ name: createName.trim(), description: createDescription.trim() }),
        });
        setSelectedProject(project.id);
        setSelectedFolder(null);
        setNotice(`Проект «${project.name}» создан`);
      } else if (createDialog === "folder" && selectedProjectRecord) {
        const folder = await apiRequest<ContentFolder>("/folders/", token, {
          method: "POST",
          body: JSON.stringify({
            name: createName.trim(),
            project: selectedProjectRecord.id,
            parent: selectedFolder,
          }),
        });
        setNotice(`Папка «${folder.name}» создана`);
      } else if (createDialog === "path") {
        const path = await apiRequest<LearningPath>("/learning-paths/", token, {
          method: "POST",
          body: JSON.stringify({
            title: createName.trim(),
            description: createDescription.trim(),
            project: typeof selectedProject === "number" ? selectedProject : null,
            folder: typeof selectedProject === "number" ? selectedFolder : null,
            course_ids: [],
          }),
        });
        setNotice(`Траектория «${path.title}» создана`);
      }
      setCreateDialog(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать материал");
    } finally {
      setCreatingContent(false);
    }
  }

  function placementValue(project: number | null, folder: number | null) {
    return folder !== null ? `f:${folder}` : project !== null ? `p:${project}` : "unassigned";
  }

  function placementPayload(value: string) {
    if (value === "unassigned") return { project: null, folder: null };
    const [kind, rawId] = value.split(":");
    const id = Number(rawId);
    if (kind === "p") return { project: id, folder: null };
    const folder = folders.find((item) => item.id === id);
    return { project: folder?.project ?? null, folder: folder?.id ?? null };
  }

  async function moveCourse(course: Course, value: string) {
    try {
      await apiRequest<Course>(`/courses/${course.id}/`, token, {
        method: "PATCH",
        body: JSON.stringify(placementPayload(value)),
      });
      setNotice(`Курс «${course.title}» перемещён`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось переместить курс");
    }
  }

  async function moveLearningPath(path: LearningPath, value: string) {
    try {
      await apiRequest<LearningPath>(`/learning-paths/${path.id}/`, token, {
        method: "PATCH",
        body: JSON.stringify(placementPayload(value)),
      });
      setNotice(`Траектория «${path.title}» перемещена`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось переместить траекторию");
    }
  }

  useEffect(() => {
    if (!previewCourse || previewCourse.source_format !== "scorm_12") return undefined;
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== scormFrameRef.current?.contentWindow || event.data?.type !== "smartis-scorm-1.2") return;
      if (event.data.action === "initialize") {
        setScormRuntime((current) => ({ ...current, status: "В процессе" }));
      }
      if (event.data.action === "set" && event.data.key === "cmi.core.lesson_status") {
        const labels: Record<string, string> = { completed: "Завершён", passed: "Пройден", failed: "Не пройден", incomplete: "В процессе" };
        setScormRuntime((current) => ({ ...current, status: labels[event.data.value] || event.data.value }));
      }
      if (event.data.action === "set" && event.data.key === "cmi.core.score.raw") {
        setScormRuntime((current) => ({ ...current, score: event.data.value || "—" }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewCourse]);

  function createCourse() {
    setEditingId("new");
    setForm({
      title: "",
      description: "",
      estimated_minutes: 30,
      project: typeof selectedProject === "number" ? selectedProject : null,
      folder: typeof selectedProject === "number" ? selectedFolder : null,
      lessons: [newLesson(0)],
    });
    setError("");
    setNotice("");
    setVideoFiles({});
    setActiveSection("cover");
    setCoverStyle("standard");
    setCoverFile(null);
    setCoverPreview("");
  }

  function editCourse(course: Course) {
    setEditingId(course.id);
    setForm({
      title: course.title,
      description: course.description,
      estimated_minutes: course.estimated_minutes,
      project: course.project,
      folder: course.folder,
      lessons: course.lessons.map((lesson, position) => ({
        ...lesson,
        quiz_data: lesson.quiz_data || emptyQuiz(),
        client_key: `lesson-${lesson.id ?? crypto.randomUUID()}`,
        position,
      })),
    });
    setError("");
    setNotice("");
    setVideoFiles({});
    setActiveSection("cover");
    setCoverStyle(course.cover_style || "standard");
    setCoverFile(null);
    setCoverPreview(course.cover_url || "");
  }

  function addLesson() {
    const lesson = newLesson(form.lessons.length);
    setForm((current) => ({ ...current, lessons: [...current.lessons, lesson] }));
    setActiveSection(lesson.client_key);
  }

  function updateLesson(index: number, update: Partial<Lesson>) {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, lessonIndex) =>
        lessonIndex === index ? { ...lesson, ...update } : lesson,
      ),
    }));
  }

  function removeLesson(index: number) {
    const removedKey = form.lessons[index]?.client_key;
    if (removedKey) {
      setVideoFiles((current) => {
        const next = { ...current };
        delete next[removedKey];
        return next;
      });
    }
    setForm((current) => ({
      ...current,
      lessons: current.lessons.filter((_, lessonIndex) => lessonIndex !== index)
        .map((lesson, position) => ({ ...lesson, position })),
    }));
    if (removedKey === activeSection) {
      setActiveSection(form.lessons[index - 1]?.client_key ?? form.lessons[index + 1]?.client_key ?? "cover");
    }
  }

  function moveLesson(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.lessons.length) return current;
      const lessons = [...current.lessons];
      const [lesson] = lessons.splice(index, 1);
      lessons.splice(target, 0, lesson);
      return { ...current, lessons: lessons.map((item, position) => ({ ...item, position })) };
    });
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setActiveSection("cover");
      setError("Добавьте название курса");
      return;
    }
    if (!form.lessons.length) {
      setError("Добавьте хотя бы один урок");
      return;
    }
    const untitledLesson = form.lessons.find((lesson) => !lesson.title.trim());
    if (untitledLesson) {
      setActiveSection(untitledLesson.client_key);
      setError("Добавьте название главы");
      return;
    }
    if (coverStyle === "custom" && !coverFile && !coverPreview) {
      setActiveSection("cover");
      setError("Загрузите изображение для своей обложки");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const isNew = editingId === "new";
      const pendingUploads = form.lessons.map((lesson, position) => ({
        position,
        clientKey: lesson.client_key,
        file: videoFiles[lesson.client_key],
      })).filter((item) => item.file);
      let saved = await apiRequest<Course>(
        isNew ? "/courses/" : `/courses/${editingId}/`,
        token,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify({
            ...form,
            cover_style: coverStyle,
            lessons: form.lessons.map((lesson, position) => ({
              id: lesson.id,
              title: lesson.title,
              lesson_type: lesson.lesson_type,
              content: lesson.content,
              media_url: lesson.media_url,
              quiz_data: lesson.quiz_data,
              duration_minutes: lesson.duration_minutes,
              position,
              is_required: lesson.is_required,
            })),
          }),
        },
      );
      if (coverStyle === "custom" && coverFile) {
        const coverBody = new FormData();
        coverBody.append("cover", coverFile);
        saved = await apiUpload<Course>(`/courses/${saved.id}/cover/`, token, coverBody);
      }
      let savedLessons = saved.lessons.map((lesson, position) => ({
        ...lesson,
        client_key: form.lessons[position]?.client_key ?? `lesson-${lesson.id ?? crypto.randomUUID()}`,
      }));
      setEditingId(saved.id);
      setForm({
        title: saved.title,
        description: saved.description,
        estimated_minutes: saved.estimated_minutes,
        project: saved.project,
        folder: saved.folder,
        lessons: savedLessons,
      });
      for (const upload of pendingUploads) {
        const savedLesson = savedLessons[upload.position];
        if (!savedLesson.id || !upload.file) continue;
        const body = new FormData();
        body.append("video", upload.file);
        const uploaded = await apiUpload<Lesson>(
          `/courses/${saved.id}/lessons/${savedLesson.id}/video/`,
          token,
          body,
        );
        savedLessons = savedLessons.map((lesson) => lesson.id === uploaded.id
          ? { ...uploaded, client_key: upload.clientKey }
          : lesson);
      }
      setForm({
        title: saved.title,
        description: saved.description,
        estimated_minutes: saved.estimated_minutes,
        project: saved.project,
        folder: saved.folder,
        lessons: savedLessons,
      });
      setVideoFiles({});
      setCoverStyle(saved.cover_style);
      setCoverPreview(saved.cover_url);
      setCoverFile(null);
      setNotice(
        editingCourse?.status === "published" && saved.status === "draft"
          ? "Новая версия сохранена как черновик — проверьте её и опубликуйте"
          : coverFile && pendingUploads.length
          ? `Изменения сохранены · загружены обложка и видео: ${pendingUploads.length}`
          : coverFile
          ? "Изменения сохранены · обложка загружена"
          : pendingUploads.length
          ? `Изменения сохранены · загружено видео: ${pendingUploads.length}`
          : isNew ? "Курс создан и сохранён как черновик" : "Изменения сохранены",
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить курс");
    } finally {
      setSaving(false);
    }
  }

  async function changePublication(course: Course) {
    setError("");
    setNotice("");
    try {
      const action = course.status === "published" ? "unpublish" : "publish";
      const saved = await apiRequest<Course>(`/courses/${course.id}/${action}/`, token, { method: "POST" });
      setNotice(saved.status === "published" ? "Курс опубликован" : "Курс возвращён в черновики");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить статус курса");
    }
  }

  async function importScorm(file: File) {
    setImportingScorm(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("package", file);
      if (typeof selectedProject === "number") body.append("project", String(selectedProject));
      if (selectedFolder !== null) body.append("folder", String(selectedFolder));
      const imported = await apiUpload<Course>("/courses/import-scorm/", token, body);
      setNotice(`Курс «${imported.title}» импортирован из SCORM 1.2`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось импортировать SCORM-пакет");
    } finally {
      setImportingScorm(false);
    }
  }

  async function replaceScorm(course: Course, file: File) {
    setReplacingScormId(course.id);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("package", file);
      const replaced = await apiUpload<Course>(`/courses/${course.id}/replace-scorm/`, token, body);
      setNotice(`Пакет заменён · курс обновлён до версии ${replaced.version}`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось заменить SCORM-пакет");
    } finally {
      setReplacingScormId(null);
    }
  }

  async function convertScorm(course: Course) {
    setConvertingScormId(course.id);
    setError("");
    setNotice("");
    try {
      const converted = await apiRequest<Course>(`/courses/${course.id}/convert-to-native/`, token, { method: "POST" });
      await load();
      editCourse(converted);
      setNotice(`Редактируемая копия «${converted.title}» готова · изображения и исходный SCORM сохранены`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось преобразовать SCORM в редактируемый курс");
    } finally {
      setConvertingScormId(null);
    }
  }

  async function exportScorm(course: Course) {
    setExportingScormId(course.id);
    setError("");
    try {
      const response = await fetch(`${API}/courses/${course.id}/export-scorm/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Не удалось экспортировать курс");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${course.title.replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, "-") || `course-${course.id}`}-scorm-1.2.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice(`Курс «${course.title}» экспортирован в SCORM 1.2`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось экспортировать курс");
    } finally {
      setExportingScormId(null);
    }
  }

  async function openCoursePreview(course: Course) {
    setError("");
    try {
      let launchUrl = "";
      if (course.source_format === "scorm_12") {
        const launch = await apiRequest<{ launch_url: string }>(`/courses/${course.id}/scorm-launch/`, token);
        launchUrl = launch.launch_url;
      }
      setScormRuntime({ status: "Не начат", score: "—" });
      setScormLaunchUrl(launchUrl);
      setPreviewCourse(course);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось открыть предпросмотр");
    }
  }

  function previewCurrentCourse() {
    const draftCourse: Course = {
      ...(editingCourse || {
        id: 0,
        author: 0,
        author_name: "",
        project: form.project,
        project_name: projects.find((project) => project.id === form.project)?.name || "",
        folder: form.folder,
        folder_name: folders.find((folder) => folder.id === form.folder)?.name || "",
        status: "draft",
        status_label: "Черновик",
        version: 1,
        updated_at: "",
        source_format: "native",
        scorm_identifier: "",
        scorm_entry_point: "",
        scorm_original_name: "",
        scorm_size: 0,
        cover_original_name: "",
        cover_size: 0,
        lessons_count: form.lessons.length,
        lessons: form.lessons,
      }),
      title: form.title || "Курс без названия",
      description: form.description,
      estimated_minutes: form.estimated_minutes,
      cover_style: coverStyle,
      cover_url: coverStyle === "custom" ? coverPreview : "",
      lessons_count: form.lessons.length,
      lessons: form.lessons,
    };
    if (draftCourse.source_format === "scorm_12" && draftCourse.id) {
      void openCoursePreview(draftCourse);
      return;
    }
    setScormLaunchUrl("");
    setPreviewCourse(draftCourse);
  }

  const editingCourse = typeof editingId === "number"
    ? courses.find((course) => course.id === editingId)
    : undefined;

  const activeLessonIndex = form.lessons.findIndex((lesson) => lesson.client_key === activeSection);
  const activeLesson = activeLessonIndex >= 0 ? form.lessons[activeLessonIndex] : undefined;

  function lessonIcon(type: Lesson["lesson_type"]) {
    if (type === "video") return <Video />;
    if (type === "link") return <Link2 />;
    if (type === "file") return <FileText />;
    if (type === "quiz") return <CheckCircle2 />;
    if (type === "scorm") return <FileArchive />;
    return <Type />;
  }

  const previewModal = previewCourse ? (
    <CoursePreviewModal
      course={previewCourse}
      onClose={() => { setPreviewCourse(null); setScormLaunchUrl(""); }}
      scormLaunchUrl={scormLaunchUrl}
      scormRuntime={scormRuntime}
      scormFrameRef={scormFrameRef}
    />
  ) : null;

  if (editingId !== null) {
    return (
      <form className="longread-editor" onSubmit={saveCourse}>
        <header className="longread-editor__topbar">
          <button className="longread-back" type="button" onClick={() => setEditingId(null)}>
            <ChevronLeft /> К курсам
          </button>
          <div className="longread-editor__identity">
            <span>{editingCourse?.source_format === "scorm_12" ? "Редактор SCORM 1.2" : "Редактор лонгрида"}</span>
            <strong>{form.title || "Курс без названия"}</strong>
          </div>
          <div className="longread-editor__actions">
            <button className="secondary-button" type="button" onClick={previewCurrentCourse}>
              <Eye /> Предпросмотр
            </button>
            {editingCourse && (
              <button className="secondary-button" type="button" onClick={() => void changePublication(editingCourse)}>
                {editingCourse.status === "published" ? "Снять с публикации" : "Опубликовать"}
              </button>
            )}
            <button className="primary-button" type="submit" disabled={saving}>
              <Save />{saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </header>

        {error && <p className="form-error longread-message">{error}</p>}
        {notice && <p className="form-notice longread-message"><CheckCircle2 />{notice}</p>}

        <div className="longread-workspace">
          <aside className="longread-outline">
            <div className="longread-panel-heading">
              <div><span>Структура</span><strong>{chapterCountLabel(form.lessons.length)}</strong></div>
              {editingCourse?.source_format !== "scorm_12" && (
                <button className="mini-button" type="button" onClick={addLesson} aria-label="Добавить главу"><Plus /></button>
              )}
            </div>
            <nav className="longread-sections" aria-label="Структура курса">
              <button
                className={activeSection === "cover" ? "longread-section longread-section--active" : "longread-section"}
                type="button"
                onClick={() => setActiveSection("cover")}
              >
                <span className="longread-section__icon"><BookOpen /></span>
                <span><strong>Обложка</strong><small>Название и описание</small></span>
              </button>
              {form.lessons.map((lesson, index) => (
                <button
                  className={activeSection === lesson.client_key ? "longread-section longread-section--active" : "longread-section"}
                  type="button"
                  key={lesson.client_key}
                  onClick={() => setActiveSection(lesson.client_key)}
                >
                  <GripVertical className="longread-section__grip" />
                  <span className="longread-section__number">{index + 1}</span>
                  <span><strong>{lesson.title || "Новая глава"}</strong><small>{lessonTypeLabels[lesson.lesson_type]} · {lesson.duration_minutes} мин</small></span>
                </button>
              ))}
            </nav>
            {editingCourse?.source_format !== "scorm_12" && (
              <button className="longread-add-chapter" type="button" onClick={addLesson}><Plus /> Добавить главу</button>
            )}
          </aside>

          <main className="longread-canvas-wrap">
            {activeSection === "cover" ? (
              <article className={coverStyle === "custom" && coverPreview ? "longread-page longread-page--cover longread-page--custom-cover" : "longread-page longread-page--cover"}>
                {coverStyle === "custom" && coverPreview && <img className="longread-cover-image" src={coverPreview} alt="" />}
                <div className="longread-cover-content">
                <span className="longread-eyebrow">SMARTIS · ОБУЧЕНИЕ</span>
                <textarea
                  className="longread-title-input"
                  rows={2}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Название курса"
                  aria-label="Название курса"
                  required
                />
                <textarea
                  className="longread-lead-input"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Коротко расскажите, чему научится сотрудник и зачем ему этот курс"
                  aria-label="Описание курса"
                />
                <div className="longread-cover-meta">
                  <span><BookOpen />{chapterCountLabel(form.lessons.length)}</span>
                  <span><Clock3 />{form.estimated_minutes} минут</span>
                </div>
                </div>
                <div className="longread-cover-decoration" aria-hidden="true"><span /><span /><span /></div>
              </article>
            ) : activeLesson ? (
              <article className="longread-page longread-page--chapter">
                <div className="longread-chapter-kicker">
                  <span>Глава {activeLessonIndex + 1}</span>
                  <span>{lessonTypeLabels[activeLesson.lesson_type]}</span>
                </div>
                <textarea
                  className="longread-title-input longread-title-input--chapter"
                  rows={2}
                  value={activeLesson.title}
                  onChange={(event) => updateLesson(activeLessonIndex, { title: event.target.value })}
                  placeholder="Название главы"
                  aria-label="Название главы"
                  required
                />
                {activeLesson.lesson_type === "text" ? (
                  <Suspense fallback={<div className="rich-editor rich-editor--loading">Загружаем редактор…</div>}>
                    <RichTextEditor
                      value={activeLesson.content}
                      onChange={(content) => updateLesson(activeLessonIndex, { content })}
                      label={`Содержание главы ${activeLessonIndex + 1}`}
                      variant="longread"
                      toolbarContainer={longreadToolbarDock}
                    />
                  </Suspense>
                ) : activeLesson.lesson_type === "quiz" ? (
                  <QuizEditor value={activeLesson.quiz_data} onChange={(quiz_data) => updateLesson(activeLessonIndex, { quiz_data })} token={token} />
                ) : activeLesson.lesson_type === "video" ? (
                  <div className="longread-media-editor">
                    {activeLesson.video_url && !videoFiles[activeLesson.client_key] && (
                      <video className="video-preview" controls preload="metadata" src={activeLesson.video_url}>
                        Ваш браузер не поддерживает просмотр видео.
                      </video>
                    )}
                    <label className="longread-upload-zone">
                      <span className="longread-media-icon"><Upload /></span>
                      <strong>{activeLesson.video_url ? "Заменить видео" : "Загрузить видео"}</strong>
                      <span>MP4, WebM, MOV или M4V · до 500 МБ</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) setVideoFiles((current) => ({ ...current, [activeLesson.client_key]: file }));
                        }}
                      />
                    </label>
                    {(videoFiles[activeLesson.client_key] || activeLesson.video_original_name) && (
                      <div className="longread-file-chip">
                        <Video />
                        <span><strong>{videoFiles[activeLesson.client_key]?.name || activeLesson.video_original_name}</strong><small>{videoFiles[activeLesson.client_key] ? `${formatFileSize(videoFiles[activeLesson.client_key].size)} · загрузится при сохранении` : `${formatFileSize(activeLesson.video_size)} · хранится на платформе`}</small></span>
                      </div>
                    )}
                  </div>
                ) : activeLesson.lesson_type === "scorm" ? (
                  <div className="longread-media-editor longread-scorm-editor">
                    <span className="longread-media-icon"><FileArchive /></span>
                    <h2>Курс SCORM 1.2</h2>
                    <p>Пакет импортирован целиком. Его внутреннее содержимое нельзя редактировать как обычный лонгрид, но название, обложку и параметры курса можно изменить.</p>
                    <div className="longread-file-chip">
                      <FileArchive />
                      <span><strong>{editingCourse?.scorm_original_name || "SCORM-пакет"}</strong><small>{formatFileSize(editingCourse?.scorm_size || 0)} · хранится на платформе</small></span>
                    </div>
                    {editingCourse && (
                      <div className="scorm-edit-actions">
                        <button
                          className="primary-button"
                          type="button"
                          disabled={convertingScormId === editingCourse.id}
                          onClick={() => void convertScorm(editingCourse)}
                        >
                          <Copy /> {convertingScormId === editingCourse.id ? "Преобразуем…" : "Создать редактируемую копию"}
                        </button>
                        <p>Для лонгридов iSpring перенесём заголовки, текст, списки, вкладки и вопросы теста. Исходный SCORM останется без изменений.</p>
                        <label className={replacingScormId === editingCourse.id ? "longread-upload-zone scorm-import--busy" : "longread-upload-zone"}>
                          <span className="longread-media-icon"><Upload /></span>
                          <strong>{replacingScormId === editingCourse.id ? "Заменяем пакет…" : "Загрузить новую версию ZIP"}</strong>
                          <span>Курс, назначения и карточка сохранятся</span>
                          <input
                            type="file"
                            accept="application/zip,.zip"
                            disabled={replacingScormId === editingCourse.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void replaceScorm(editingCourse, file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    )}
                    <div className="longread-info-card scorm-edit-capabilities">
                      <span>Можно изменить</span><strong>Название, описание, обложку, длительность</strong>
                      <span>Содержимое</span><strong>Через редактируемую копию или замену ZIP</strong>
                    </div>
                  </div>
                ) : (
                  <div className="longread-media-editor">
                    <span className="longread-media-icon">{lessonIcon(activeLesson.lesson_type)}</span>
                    <h2>{activeLesson.lesson_type === "link" ? "Добавьте ссылку" : "Добавьте материал"}</h2>
                    <p>Сотрудник откроет материал прямо из этой главы курса.</p>
                    <input
                      type="url"
                      value={activeLesson.media_url}
                      onChange={(event) => updateLesson(activeLessonIndex, { media_url: event.target.value })}
                      placeholder="https://…"
                      aria-label="Ссылка на материал"
                      required
                    />
                  </div>
                )}
                {editingCourse?.source_format !== "scorm_12" && (
                  <button className="longread-add-divider" type="button" onClick={addLesson}>
                    <span><Plus /></span> Добавить следующую главу
                  </button>
                )}
              </article>
            ) : null}
          </main>

          <aside className={activeLesson?.lesson_type === "text" ? "longread-settings longread-settings--with-editor" : "longread-settings"}>
            <div className="longread-panel-heading">
              <div><span>Настройки</span><strong>{activeSection === "cover" ? "Курс" : "Глава"}</strong></div>
              <Settings2 />
            </div>
            {activeSection === "cover" ? (
              <div className="longread-settings__body">
                <div className="longread-cover-setting">
                  <span className="field-label">Оформление</span>
                  <div className="longread-cover-toggle">
                    <button className={coverStyle === "standard" ? "longread-cover-option longread-cover-option--active" : "longread-cover-option"} type="button" onClick={() => setCoverStyle("standard")}>Стандартная</button>
                    <button className={coverStyle === "custom" ? "longread-cover-option longread-cover-option--active" : "longread-cover-option"} type="button" onClick={() => setCoverStyle("custom")}>Своя</button>
                  </div>
                  {coverStyle === "custom" && (
                    <label className="longread-cover-upload">
                      <Upload />
                      <span><strong>{coverFile || coverPreview ? "Заменить изображение" : "Загрузить изображение"}</strong><small>{coverFile?.name || editingCourse?.cover_original_name || "JPG, PNG или WebP · до 10 МБ"}</small></span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
                          setCoverFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                        }}
                      />
                    </label>
                  )}
                </div>
                <label>Ожидаемая длительность, минут<input type="number" min="1" value={form.estimated_minutes} onChange={(event) => setForm({ ...form, estimated_minutes: Number(event.target.value) })} required /></label>
                <label>Проект<select value={form.project ?? ""} onChange={(event) => setForm({ ...form, project: event.target.value ? Number(event.target.value) : null, folder: null })}>
                  <option value="">Без проекта</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select></label>
                <label>Папка<select value={form.folder ?? ""} disabled={form.project === null} onChange={(event) => setForm({ ...form, folder: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">Корень проекта</option>
                  {folders.filter((folder) => folder.project === form.project).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select></label>
                <div className="longread-info-card">
                  <span>Статус</span><strong>{editingCourse?.status_label || "Черновик"}</strong>
                  <span>Версия</span><strong>{editingCourse?.version || 1}</strong>
                </div>
                <p className="longread-help">Обложка, название и описание будут первыми элементами, которые увидит сотрудник.</p>
              </div>
            ) : activeLesson ? (
              <div className="longread-settings__body">
                <label>Формат<select disabled={activeLesson.lesson_type === "scorm"} value={activeLesson.lesson_type} onChange={(event) => updateLesson(activeLessonIndex, { lesson_type: event.target.value as Lesson["lesson_type"] })}>
                  {Object.entries(lessonTypeLabels).filter(([value]) => value !== "scorm" || activeLesson.lesson_type === "scorm").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label>Время, мин<input type="number" min="1" value={activeLesson.duration_minutes} onChange={(event) => updateLesson(activeLessonIndex, { duration_minutes: Number(event.target.value) })} required /></label>
                <label className="check-field"><input type="checkbox" checked={activeLesson.is_required} onChange={(event) => updateLesson(activeLessonIndex, { is_required: event.target.checked })} /> Обязательная глава</label>
                {editingCourse?.source_format !== "scorm_12" && (
                  <>
                    <div className="longread-settings__actions">
                      <span>Положение в курсе</span>
                      <div>
                        <button className="mini-button" type="button" disabled={activeLessonIndex === 0} onClick={() => moveLesson(activeLessonIndex, -1)} aria-label="Переместить выше"><ArrowUp /></button>
                        <button className="mini-button" type="button" disabled={activeLessonIndex === form.lessons.length - 1} onClick={() => moveLesson(activeLessonIndex, 1)} aria-label="Переместить ниже"><ArrowDown /></button>
                      </div>
                    </div>
                    <button className="longread-delete" type="button" onClick={() => removeLesson(activeLessonIndex)}><Trash2 /> Удалить главу</button>
                  </>
                )}
              </div>
            ) : null}
            {activeLesson?.lesson_type === "text" && <div className="longread-toolbar-dock" ref={setLongreadToolbarDock} />}
          </aside>
        </div>
        {previewModal}
      </form>
    );
  }

  return (
    <>
      <PageHeader
        title="Курсы"
        subtitle="Проекты, папки, курсы и траектории в одном рабочем пространстве"
        action={
          <div className="page-actions">
            <button className="secondary-button" type="button" onClick={() => openCreateDialog("project")}>
              <FolderPlus /> Новый проект
            </button>
            <label className={importingScorm ? "secondary-button scorm-import scorm-import--busy" : "secondary-button scorm-import"}>
              <FileArchive /> {importingScorm ? "Импортируем…" : "Импорт SCORM 1.2"}
              <input
                type="file"
                accept="application/zip,.zip"
                disabled={importingScorm}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importScorm(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button className="primary-button" type="button" onClick={createCourse}>
              <Plus /> Создать курс
            </button>
          </div>
        }
      />
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-notice"><CheckCircle2 />{notice}</p>}
      {createDialog && (
        <div className="library-dialog-backdrop" role="presentation" onMouseDown={() => setCreateDialog(null)}>
          <form className="library-dialog" onSubmit={createLibraryContent} onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <h2>{createDialog === "project" ? "Новый проект" : createDialog === "folder" ? "Новая папка" : "Новая траектория"}</h2>
                <p>{createDialog === "project" ? "Личное рабочее пространство автора" : selectedProjectRecord?.name || "Без проекта"}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setCreateDialog(null)} aria-label="Закрыть окно"><X /></button>
            </div>
            <label>{createDialog === "path" ? "Название траектории" : "Название"}<input autoFocus value={createName} onChange={(event) => setCreateName(event.target.value)} required /></label>
            {createDialog !== "folder" && (
              <label>Описание<textarea value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Коротко опишите назначение" /></label>
            )}
            <div className="library-dialog__actions">
              <button className="secondary-button" type="button" onClick={() => setCreateDialog(null)}>Отмена</button>
              <button className="primary-button" type="submit" disabled={creatingContent}>{creatingContent ? "Создаём…" : "Создать"}</button>
            </div>
          </form>
        </div>
      )}
      {editingId !== null && (
        <form className="panel course-editor" onSubmit={saveCourse}>
          <div className="section-heading">
            <div>
              <h2>{editingId === "new" ? "Новый курс" : "Редактирование курса"}</h2>
              <p>{editingCourse ? `${editingCourse.status_label} · версия ${editingCourse.version}` : "Заполните основную информацию"}</p>
            </div>
            <button className="icon-button" type="button" onClick={() => setEditingId(null)} aria-label="Закрыть редактор"><X /></button>
          </div>
          <div className="course-fields">
            <label>Название курса<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Например, Основы продукта Smartis" required /></label>
            <label>Длительность, минут<input type="number" min="1" value={form.estimated_minutes} onChange={(event) => setForm({ ...form, estimated_minutes: Number(event.target.value) })} required /></label>
            <label className="field-wide">Краткое описание<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Что сотрудник узнает и чему научится" /></label>
          </div>
          <div className="lesson-heading">
            <div><h2>Уроки</h2><p>{form.lessons.length} в курсе</p></div>
            <button className="secondary-button" type="button" onClick={() => setForm({ ...form, lessons: [...form.lessons, newLesson(form.lessons.length)] })}><Plus /> Добавить урок</button>
          </div>
          <div className="lesson-list">
            {form.lessons.map((lesson, index) => (
              <article className="lesson-editor" key={lesson.client_key}>
                <div className="lesson-editor__top">
                  <span className="lesson-number">{index + 1}</span>
                  <strong>{lesson.title || "Новый урок"}</strong>
                  <div className="lesson-actions">
                    <button className="mini-button" type="button" disabled={index === 0} onClick={() => moveLesson(index, -1)} aria-label="Переместить выше"><ArrowUp /></button>
                    <button className="mini-button" type="button" disabled={index === form.lessons.length - 1} onClick={() => moveLesson(index, 1)} aria-label="Переместить ниже"><ArrowDown /></button>
                    <button className="mini-button mini-button--danger" type="button" onClick={() => removeLesson(index)} aria-label="Удалить урок"><Trash2 /></button>
                  </div>
                </div>
                <div className="lesson-fields">
                  <label>Название<input value={lesson.title} onChange={(event) => updateLesson(index, { title: event.target.value })} required /></label>
                  <label>Формат<select value={lesson.lesson_type} onChange={(event) => updateLesson(index, { lesson_type: event.target.value as Lesson["lesson_type"] })}>
                    {Object.entries(lessonTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                  <label>Минут<input type="number" min="1" value={lesson.duration_minutes} onChange={(event) => updateLesson(index, { duration_minutes: Number(event.target.value) })} required /></label>
                  {lesson.lesson_type === "text" ? (
                    <div className="field-wide rich-editor-field">
                      <span className="field-label">Содержание</span>
                      <Suspense fallback={<div className="rich-editor rich-editor--loading">Загружаем редактор…</div>}>
                        <RichTextEditor value={lesson.content} onChange={(content) => updateLesson(index, { content })} />
                      </Suspense>
                    </div>
                  ) : lesson.lesson_type === "quiz" ? (
                    <div className="field-wide"><QuizEditor value={lesson.quiz_data} onChange={(quiz_data) => updateLesson(index, { quiz_data })} token={token} /></div>
                  ) : lesson.lesson_type === "video" ? (
                    <div className="field-wide video-upload-field">
                      <span className="field-label">Видеофайл</span>
                      {lesson.video_url && !videoFiles[lesson.client_key] && (
                        <video className="video-preview" controls preload="metadata" src={lesson.video_url}>
                          Ваш браузер не поддерживает просмотр видео.
                        </video>
                      )}
                      <div className="video-upload-row">
                        <label className="upload-button">
                          <Upload /> {lesson.video_url ? "Заменить видео" : "Выбрать видео"}
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) setVideoFiles((current) => ({ ...current, [lesson.client_key]: file }));
                            }}
                          />
                        </label>
                        <div className="video-file-info">
                          {videoFiles[lesson.client_key] ? (
                            <><strong>{videoFiles[lesson.client_key].name}</strong><span>{formatFileSize(videoFiles[lesson.client_key].size)} · загрузится при сохранении</span></>
                          ) : lesson.video_original_name ? (
                            <><strong>{lesson.video_original_name}</strong><span>{formatFileSize(lesson.video_size)} · хранится на платформе</span></>
                          ) : (
                            <span>MP4, WebM, MOV или M4V · до 500 МБ</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="field-wide">Ссылка на материал<input type="url" value={lesson.media_url} onChange={(event) => updateLesson(index, { media_url: event.target.value })} placeholder="https://…" required /></label>
                  )}
                  <label className="check-field"><input type="checkbox" checked={lesson.is_required} onChange={(event) => updateLesson(index, { is_required: event.target.checked })} /> Обязательный урок</label>
                </div>
              </article>
            ))}
            {!form.lessons.length && <div className="empty-lessons"><FileText /><p>В курсе пока нет уроков</p></div>}
          </div>
          <div className="editor-footer">
            <button className="primary-button" type="submit" disabled={saving}><Save />{saving ? "Сохраняем…" : "Сохранить"}</button>
            {editingCourse && (
              <button className="secondary-button" type="button" onClick={() => void changePublication(editingCourse)}>
                {editingCourse.status === "published" ? "Снять с публикации" : "Опубликовать"}
              </button>
            )}
          </div>
        </form>
      )}
      <div className="library-layout">
        <aside className="library-projects">
          <div className="library-projects__heading"><span>Проекты</span><button className="mini-button" type="button" onClick={() => openCreateDialog("project")} aria-label="Создать проект"><Plus /></button></div>
          <button className={selectedProject === "all" ? "library-project library-project--active" : "library-project"} type="button" onClick={() => openProject("all")}>
            <LayoutGrid /><span><strong>Все материалы</strong><small>{courses.length + learningPaths.length}</small></span>
          </button>
          {projects.map((project) => (
            <button className={selectedProject === project.id ? "library-project library-project--active" : "library-project"} type="button" key={project.id} onClick={() => openProject(project.id)}>
              <FolderOpen /><span><strong>{project.name}</strong><small>{project.course_count + project.path_count} материалов</small></span>
            </button>
          ))}
          <button className={selectedProject === "unassigned" ? "library-project library-project--active" : "library-project"} type="button" onClick={() => openProject("unassigned")}>
            <Folder /><span><strong>Без проекта</strong><small>{courses.filter((course) => course.project === null).length}</small></span>
          </button>
          <p className="library-projects__hint">{user.role === "admin" ? "Администратор видит проекты всех авторов" : "Здесь отображаются только ваши проекты"}</p>
        </aside>

        <section className="library-content">
          <header className="library-content__header">
            <div className="library-breadcrumbs">
              {selectedFolderRecord && <button type="button" onClick={() => setSelectedFolder(selectedFolderRecord.parent)}><ChevronLeft />Назад</button>}
              <div><span>{selectedProjectRecord ? "Проект" : selectedProject === "unassigned" ? "Материалы" : "Библиотека"}</span><h2>{selectedFolderRecord?.name || selectedProjectRecord?.name || (selectedProject === "unassigned" ? "Без проекта" : "Все материалы")}</h2></div>
            </div>
            <div className="library-content__actions">
              {selectedProjectRecord && <button className="secondary-button" type="button" onClick={() => openCreateDialog("folder")}><FolderPlus /> Папка</button>}
              <button className="secondary-button" type="button" onClick={() => openCreateDialog("path")}><Route /> Траектория</button>
              <button className="primary-button" type="button" onClick={createCourse}><Plus /> Курс</button>
            </div>
          </header>

          {visibleFolders.length > 0 && (
            <section className="library-folders" aria-label="Папки">
              {visibleFolders.map((folder) => (
                <button className="library-folder" type="button" key={folder.id} onClick={() => setSelectedFolder(folder.id)}>
                  <FolderOpen /><span><strong>{folder.name}</strong><small>{folder.course_count + folder.path_count} материалов</small></span><ChevronRight />
                </button>
              ))}
            </section>
          )}

          <div className="course-view-toolbar library-toolbar" role="group" aria-label="Фильтр и вид материалов">
            <div className="library-filters">
              <button className={contentFilter === "all" ? "course-view-button course-view-button--active" : "course-view-button"} type="button" onClick={() => setContentFilter("all")} aria-pressed={contentFilter === "all"}>Все</button>
              <button className={contentFilter === "courses" ? "course-view-button course-view-button--active" : "course-view-button"} type="button" onClick={() => setContentFilter("courses")} aria-pressed={contentFilter === "courses"}>Курсы</button>
              <button className={contentFilter === "paths" ? "course-view-button course-view-button--active" : "course-view-button"} type="button" onClick={() => setContentFilter("paths")} aria-pressed={contentFilter === "paths"}>Траектории</button>
            </div>
            <div className="library-view-controls">
              <button className={courseView === "cards" ? "course-view-button course-view-button--active" : "course-view-button"} type="button" onClick={() => setCourseView("cards")} aria-pressed={courseView === "cards"} title="Прямоугольные карточки"><Rows3 /><span>Карточки</span></button>
              <button className={courseView === "compact" ? "course-view-button course-view-button--active" : "course-view-button"} type="button" onClick={() => setCourseView("compact")} aria-pressed={courseView === "compact"} title="Компактные значки"><LayoutGrid /><span>Значки</span></button>
              <button className={courseView === "list" ? "course-view-button course-view-button--active" : "course-view-button"} type="button" onClick={() => setCourseView("list")} aria-pressed={courseView === "list"} title="Список"><List /><span>Список</span></button>
            </div>
          </div>
          {(contentFilter === "all" || contentFilter === "courses") && (
          <section className={`course-grid course-grid--${courseView}`} aria-busy={loading}>
        {visibleCourses.map((course) => (
          <article className="panel course-card" key={course.id}>
            <div className="course-card__top">
              <div className="course-card__badges">
                <span className={`status status--${course.status}`}>{course.status_label}</span>
                {course.source_format === "scorm_12" && <span className="status status--scorm">SCORM 1.2</span>}
              </div>
              <button className="icon-button" type="button" onClick={() => editCourse(course)} aria-label={`Редактировать ${course.title}`}><Pencil /></button>
            </div>
            <div className="course-card__title"><h2>{course.title}</h2></div>
            <div className="course-meta"><span><FileText />{chapterCountLabel(course.lessons_count)}</span><span><Clock3 />{course.estimated_minutes} мин</span></div>
            <div className="course-card__actions">
              <button className="primary-button course-card__open-scorm" type="button" onClick={() => void openCoursePreview(course)}>
                <Eye /> Предпросмотр
              </button>
              <details className="course-card__more">
                <summary className="secondary-button"><MoreHorizontal /> Ещё</summary>
                <div className="course-card__menu">
                  <label className="content-placement">Переместить<select aria-label={`Расположение курса ${course.title}`} value={placementValue(course.project, course.folder)} onChange={(event) => void moveCourse(course, event.target.value)}>
                    <option value="unassigned">Без проекта</option>
                    {projects.map((project) => <option key={`course-project-${project.id}`} value={`p:${project.id}`}>{project.name} · корень</option>)}
                    {folders.map((folder) => <option key={`course-folder-${folder.id}`} value={`f:${folder.id}`}>{folder.project_name} / {folder.name}</option>)}
                  </select></label>
                  <button type="button" disabled={exportingScormId === course.id} onClick={() => void exportScorm(course)}>
                    <Download /> {exportingScormId === course.id ? "Экспортируем…" : "Экспорт SCORM 1.2"}
                  </button>
                  <button type="button" onClick={() => void changePublication(course)}>
                    {course.status === "published" ? <><CheckCircle2 /> Снять с публикации</> : <><PlayCircle /> Опубликовать</>}
                  </button>
                </div>
              </details>
            </div>
          </article>
        ))}
        {!loading && !visibleCourses.length && contentFilter === "courses" && (
          <section className="panel empty course-empty"><BookOpen /><h2>Создайте первый курс</h2><p>Добавьте уроки и опубликуйте курс для сотрудников.</p><button className="primary-button" type="button" onClick={createCourse}><Plus /> Создать курс</button></section>
        )}
          </section>
          )}

          {(contentFilter === "all" || contentFilter === "paths") && (
            <section className="learning-path-grid" aria-label="Траектории">
              {visiblePaths.map((path) => (
                <article className="learning-path-card" key={path.id}>
                  <div className="learning-path-card__icon"><Route /></div>
                  <div className="learning-path-card__body">
                    <div className="course-card__badges"><span className={`status status--${path.status}`}>{path.status_label}</span><span className="status">Траектория</span></div>
                    <h2>{path.title}</h2>
                    <p>{path.description || "Описание пока не добавлено"}</p>
                    <span>{path.course_count} курсов · {path.author_name}</span>
                  </div>
                  <label className="content-placement">Расположение<select aria-label={`Расположение траектории ${path.title}`} value={placementValue(path.project, path.folder)} onChange={(event) => void moveLearningPath(path, event.target.value)}>
                    <option value="unassigned">Без проекта</option>
                    {projects.map((project) => <option key={`path-project-${project.id}`} value={`p:${project.id}`}>{project.name} · корень</option>)}
                    {folders.map((folder) => <option key={`path-folder-${folder.id}`} value={`f:${folder.id}`}>{folder.project_name} / {folder.name}</option>)}
                  </select></label>
                </article>
              ))}
            </section>
          )}
          {!loading && !visibleCourses.length && !visiblePaths.length && visibleFolders.length === 0 && (
            <section className="library-empty"><FolderOpen /><h2>Здесь пока пусто</h2><p>Создайте папку, курс или траекторию.</p></section>
          )}
        </section>
      </div>
      {previewModal}
    </>
  );
}

function ProductUpdatesView({ token }: { token: string }) {
  const [items, setItems] = useState<ProductUpdate[]>([]);
  const [selected, setSelected] = useState<ProductUpdate | null>(null);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", effective_date: localDateKey(new Date()),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function selectUpdate(update: ProductUpdate | null) {
    setSelected(update);
    setSelections(Object.fromEntries(
      (update?.analysis.targets || [])
        .filter((target) => target.suggested_lesson_id)
        .map((target) => [target.course_id, target.suggested_lesson_id as number]),
    ));
  }

  async function load(preferredId?: number) {
    try {
      const updates = await apiRequest<ProductUpdate[]>("/product-updates/", token);
      setItems(updates);
      selectUpdate(updates.find((item) => item.id === preferredId) || updates[0] || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить обновления");
    }
  }

  useEffect(() => { void load(); }, [token]);

  async function createUpdate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await apiRequest<ProductUpdate>("/product-updates/", token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ title: "", description: "", effective_date: localDateKey(new Date()) });
      await load(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проанализировать обновление");
    } finally {
      setSaving(false);
    }
  }

  async function applyUpdate() {
    if (!selected) return;
    const targets = Object.entries(selections)
      .filter(([, lessonId]) => lessonId)
      .map(([courseId, lessonId]) => ({ course_id: Number(courseId), lesson_id: lessonId }));
    if (!targets.length) {
      setError("Выберите хотя бы один урок");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/product-updates/${selected.id}/apply/`, token, {
        method: "POST",
        body: JSON.stringify({ targets }),
      });
      await load(selected.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось применить обновление");
    } finally {
      setSaving(false);
    }
  }

  const awaiting = items.filter((item) => item.status === "analyzed").length;
  const affected = items.reduce((sum, item) => sum + item.affected_courses, 0);

  return (
    <>
      <PageHeader title="Обновления продукта" subtitle="Единая точка изменений для всех курсов" action={<button className="primary-button" type="button" onClick={() => setShowCreate(true)}><Plus />Новое обновление</button>} />
      {error && <div className="form-error">{error}</div>}
      <section className="update-metrics">
        <article><span>Всего обновлений</span><strong>{items.length}</strong></article>
        <article className={awaiting ? "update-metric--attention" : ""}><span>Ждут проверки</span><strong>{awaiting}</strong></article>
        <article><span>Затронуто курсов</span><strong>{affected}</strong></article>
        <article><span>Применено</span><strong>{items.filter((item) => item.status === "applied").length}</strong></article>
      </section>
      <div className="update-layout">
        <aside className="panel update-history">
          <header><span className="eyebrow">Журнал</span><h2>Изменения продукта</h2></header>
          <div>{items.map((item) => <button className={selected?.id === item.id ? "update-history__item update-history__item--active" : "update-history__item"} type="button" onClick={() => selectUpdate(item)} key={item.id}><strong>{item.title}</strong><span>с {displayDate(item.effective_date)}</span><small className={`update-status update-status--${item.status}`}>{item.status_label}</small></button>)}{!items.length && <div className="update-history__empty">Обновлений пока нет.</div>}</div>
        </aside>
        <section className="update-detail">
          {selected ? <>
            <section className="panel update-summary">
              <div><span className="eyebrow">Действует с {displayDate(selected.effective_date)}</span><h2>{selected.title}</h2><p>{selected.description}</p></div>
              <span className={`update-status update-status--${selected.status}`}>{selected.status_label}</span>
              <div className="update-keywords">{selected.analysis.keywords.map((term) => <span key={term}>{term}</span>)}</div>
            </section>
            <section className="panel update-targets">
              <header><div><span className="eyebrow">Результат анализа</span><h2>Затронутые материалы</h2></div>{selected.status === "analyzed" && <button className="primary-button" type="button" onClick={() => void applyUpdate()} disabled={saving}>{saving ? "Применяем…" : "Применить выбранное"}</button>}</header>
              <div>
                {selected.analysis.targets.map((target) => {
                  const checked = Boolean(selections[target.course_id]);
                  const candidates = target.lesson_candidates.length ? target.lesson_candidates : target.suggested_lesson_id ? [{ lesson_id: target.suggested_lesson_id, lesson_title: target.suggested_lesson_title, matched_terms: target.matched_terms }] : [];
                  return <article key={target.course_id}><label className="update-target__check"><input type="checkbox" disabled={selected.status === "applied" || !candidates.length} checked={checked} onChange={(event) => setSelections({ ...selections, [target.course_id]: event.target.checked ? (target.suggested_lesson_id || candidates[0]?.lesson_id || 0) : 0 })} /><span /></label><div className="update-target__course"><strong>{target.course_title}</strong><span>Версия {target.course_version} · совпадения: {target.matched_terms.join(", ")}</span></div><div className="update-confidence"><span><i style={{ width: `${target.confidence}%` }} /></span><strong>{target.confidence}%</strong></div>{selected.status === "analyzed" ? <label>Разместить в уроке<select value={selections[target.course_id] || ""} disabled={!checked || !candidates.length} onChange={(event) => setSelections({ ...selections, [target.course_id]: Number(event.target.value) })}>{!candidates.length && <option value="">Нет уроков</option>}{candidates.map((lesson) => <option value={lesson.lesson_id} key={lesson.lesson_id}>{lesson.lesson_title}</option>)}</select></label> : <span className="update-target__applied">{selected.applied_targets.some((item) => item.course_id === target.course_id) ? "Обновлено" : "Не выбрано"}</span>}</article>;
                })}
                {!selected.analysis.targets.length && <div className="update-empty">Совпадений не найдено. Уточните описание обновления или добавьте нужный курс вручную в следующей версии.</div>}
              </div>
            </section>
          </> : <section className="panel update-welcome"><RefreshCw /><h2>Добавьте изменение продукта</h2><p>Система определит, в какие курсы и уроки следует добавить новую информацию.</p></section>}
        </section>
      </div>
      {showCreate && <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="hcm-dialog update-dialog" role="dialog" aria-modal="true"><header><div><span className="eyebrow">Единая точка обновления</span><h2>Новое изменение продукта</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowCreate(false)}><X /></button></header><form className="hcm-form" onSubmit={createUpdate}><div className="hcm-form__grid"><label className="hcm-form__wide">Название<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Коротко опишите изменение" required /></label><label>Действует с<input type="date" value={form.effective_date} onChange={(event) => setForm({ ...form, effective_date: event.target.value })} required /></label><span /><label className="hcm-form__wide">Что изменилось<textarea className="update-description-input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Подробности, новые правила и значения…" required /></label></div><footer><button className="secondary-button" type="button" onClick={() => setShowCreate(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Ищем материалы…" : "Найти затронутые курсы"}</button></footer></form></section></div>}
    </>
  );
}

function DailyAnalyticsView({ token, user }: { token: string; user: User }) {
  const canAnalyze = ["admin", "hr", "author"].includes(user.role);
  const canChooseDepartment = user.role === "admin" || user.role === "hr";
  const [items, setItems] = useState<DailyTranscript[]>([]);
  const [selected, setSelected] = useState<DailyTranscript | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", meeting_date: localDateKey(new Date()), department: "", raw_text: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(preferredId?: number) {
    try {
      const [transcripts, nextDepartments] = await Promise.all([
        apiRequest<DailyTranscript[]>("/daily-transcripts/", token),
        canChooseDepartment ? apiRequest<Department[]>("/departments/", token) : Promise.resolve([]),
      ]);
      setItems(transcripts);
      setDepartments(nextDepartments);
      setSelected(transcripts.find((item) => item.id === preferredId) || transcripts[0] || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить аналитику");
    }
  }

  useEffect(() => { void load(); }, [token, canChooseDepartment]);

  async function analyzeTranscript(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("title", form.title);
      body.append("meeting_date", form.meeting_date);
      if (form.department) body.append("department", form.department);
      if (file) body.append("file", file);
      else body.append("raw_text", form.raw_text);
      const created = await apiUpload<DailyTranscript>("/daily-transcripts/", token, body);
      setShowUpload(false);
      setFile(null);
      setForm({ title: "", meeting_date: localDateKey(new Date()), department: "", raw_text: "" });
      await load(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проанализировать дэйлик");
    } finally {
      setSaving(false);
    }
  }

  const matches = selected?.analysis.course_matches || [];
  const gaps = selected?.analysis.gaps || [];
  const coverage = selected?.coverage_percent || 0;

  return (
    <>
      <PageHeader
        title="Аналитика дэйликов"
        subtitle="Сравнение рабочих обсуждений с содержанием текущих курсов"
        action={canAnalyze ? <button className="primary-button" type="button" onClick={() => setShowUpload(true)}><Upload />Добавить расшифровку</button> : undefined}
      />
      {error && <div className="form-error">{error}</div>}
      <section className="daily-metrics">
        <article><span>Расшифровок</span><strong>{items.length}</strong></article>
        <article><span>Покрытие курсами</span><strong>{selected ? `${coverage}%` : "—"}</strong></article>
        <article><span>Подходящих курсов</span><strong>{matches.length}</strong></article>
        <article className={gaps.length ? "daily-metric--attention" : ""}><span>Пробелов в материалах</span><strong>{gaps.length}</strong></article>
      </section>

      <div className="daily-layout">
        <aside className="panel daily-history">
          <header><span className="eyebrow">История</span><h2>Дэйлики</h2></header>
          <div>
            {items.map((item) => (
              <button className={selected?.id === item.id ? "daily-history__item daily-history__item--active" : "daily-history__item"} type="button" onClick={() => setSelected(item)} key={item.id}>
                <strong>{item.title}</strong>
                <span>{displayDate(item.meeting_date)}{item.department_name ? ` · ${item.department_name}` : ""}</span>
                <small>{item.coverage_percent}% покрытия</small>
              </button>
            ))}
            {!items.length && <div className="daily-history__empty">Расшифровок пока нет.</div>}
          </div>
        </aside>

        <section className="daily-analysis">
          {selected ? <>
            <section className="panel daily-overview">
              <div className="daily-coverage" style={{ "--coverage": `${coverage}%` } as React.CSSProperties}><strong>{coverage}%</strong><span>покрыто</span></div>
              <div><span className="eyebrow">{displayDate(selected.meeting_date)} · {selected.source_label}</span><h2>{selected.title}</h2><p>{selected.text_preview}</p></div>
            </section>
            <section className="panel daily-courses">
              <header><div><span className="eyebrow">Сопоставление</span><h2>Курсы по темам дэйлика</h2></div><span>{matches.length}</span></header>
              <div>
                {matches.map((course) => <article key={course.course_id}><div><strong>{course.course_title}</strong><span>{course.lessons_count} уроков · {course.matched_terms.join(", ")}</span></div><div className="daily-course-progress"><span><i style={{ width: `${course.coverage_percent}%` }} /></span><strong>{course.coverage_percent}%</strong></div></article>)}
                {!matches.length && <div className="daily-empty">Подходящих курсов пока не найдено.</div>}
              </div>
            </section>
            <section className="daily-topics">
              <article className="panel"><span className="eyebrow">Покрытые темы</span><div className="daily-chips">{selected.analysis.keywords.filter((item) => item.covered).map((item) => <span className="daily-chip daily-chip--covered" key={item.term}>{item.term}<small>{item.count}</small></span>)}</div></article>
              <article className="panel"><span className="eyebrow">Пробелы в обучении</span><div className="daily-chips">{gaps.map((term) => <span className="daily-chip daily-chip--gap" key={term}>{term}</span>)}</div>{!gaps.length && <p>Все основные темы уже встречаются в курсах.</p>}</article>
            </section>
          </> : <section className="panel daily-welcome"><ChartNoAxesCombined /><h2>Добавьте первый дэйлик</h2><p>Система выделит темы, найдёт связанные курсы и покажет, каких материалов не хватает.</p></section>}
        </section>
      </div>

      {showUpload && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUpload(false); }}>
          <section className="hcm-dialog daily-dialog" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">Новый анализ</span><h2>Добавить расшифровку дэйлика</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowUpload(false)}><X /></button></header>
            <form className="hcm-form" onSubmit={analyzeTranscript}>
              <div className="hcm-form__grid">
                <label className="hcm-form__wide">Название<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Например, Дэйлик команды маркетинга" required /></label>
                <label>Дата<input type="date" value={form.meeting_date} onChange={(event) => setForm({ ...form, meeting_date: event.target.value })} required /></label>
                {canChooseDepartment && <label>Отдел<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">Все отделы</option>{departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label>}
                <label className="hcm-form__wide">Расшифровка<textarea className="daily-transcript-input" value={form.raw_text} onChange={(event) => { setForm({ ...form, raw_text: event.target.value }); if (event.target.value) setFile(null); }} disabled={Boolean(file)} placeholder="Вставьте текст встречи…" required={!file} /></label>
                <label className="hcm-form__wide document-file-field"><span>Или загрузите TXT, SRT либо VTT до 5 МБ</span><input type="file" accept=".txt,.srt,.vtt" onChange={(event) => { const next = event.target.files?.[0] || null; setFile(next); if (next) setForm({ ...form, raw_text: "" }); }} /></label>
              </div>
              <footer><button className="secondary-button" type="button" onClick={() => setShowUpload(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Анализируем…" : "Проанализировать"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const inboxCategoryLabels: Record<InboxItem["category"], string> = {
  documents: "Документы",
  performance: "Оценка",
  learning: "Обучение",
  onboarding: "Адаптация",
  absences: "Отсутствия",
  goals: "Цели",
  employment: "Кадровые события",
  interviews: "Собеседования",
  users: "Доступы",
};

function TaskCenterView({
  inbox,
  error,
  onNavigate,
  onReadInbox,
}: {
  inbox: Inbox;
  error: string;
  onNavigate: (view: ViewId) => void;
  onReadInbox: (itemIds: string[]) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | "unread" | "urgent" | InboxItem["category"]>("all");

  const visible = inbox.items.filter((item) =>
    filter === "all" ? true : filter === "unread" ? !item.is_read : filter === "urgent" ? item.priority === "danger" : item.category === filter
  );
  const today = localDateKey(new Date());
  const dueToday = inbox.items.filter((item) => item.due_date === today).length;

  return (
    <>
      <PageHeader
        title="Задачи и уведомления"
        subtitle="Единая очередь обучения, собеседований и работы с персоналом"
        action={inbox.unread > 0 ? <button className="secondary-button" type="button" onClick={() => void onReadInbox(inbox.items.map((item) => item.id))}><CheckCircle2 />Прочитать все</button> : undefined}
      />
      {error && <div className="form-error">{error}</div>}
      <section className="task-metrics">
        <article><span>Всего задач</span><strong>{inbox.total}</strong></article>
        <article><span>Непрочитанные</span><strong>{inbox.unread}</strong></article>
        <article className={inbox.urgent ? "task-metric--danger" : ""}><span>Срочные</span><strong>{inbox.urgent}</strong></article>
        <article><span>На сегодня</span><strong>{dueToday}</strong></article>
      </section>
      <section className="panel task-center">
        <header>
          <div><span className="eyebrow">Входящие</span><h2>Что требует внимания</h2></div>
          <div className="task-filters">
            {([
              ["all", "Все"],
              ["unread", "Непрочитанные"],
              ["urgent", "Срочные"],
              ["documents", "Документы"],
              ["performance", "Оценка"],
              ["learning", "Обучение"],
              ["onboarding", "Адаптация"],
              ["absences", "Отсутствия"],
              ["interviews", "Собеседования"],
              ["goals", "Цели"],
              ["employment", "Кадровые события"],
              ["users", "Доступы"],
            ] as const).map(([value, label]) => (
              <button className={filter === value ? "task-filter task-filter--active" : "task-filter"} type="button" key={value} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </header>
        <div className="task-list">
          {visible.map((item) => (
            <article className={item.is_read ? "" : "task-list__item--unread"} key={item.id}>
              <div className={`task-list__icon task-list__icon--${item.category}`}><Bell /></div>
              <div className="task-list__main"><strong>{!item.is_read && <i aria-label="Новое" />}{item.title}</strong><span>{item.description}</span></div>
              <span className="task-list__category">{inboxCategoryLabels[item.category]}</span>
              <div className="task-list__due">
                <Clock3 />
                <span>{item.due_date ? (item.due_date < today ? `Просрочено · ${displayDate(item.due_date)}` : `До ${displayDate(item.due_date)}`) : "Без срока"}</span>
              </div>
              <span className={`task-priority task-priority--${item.priority}`}>{item.priority === "danger" ? "Срочно" : item.priority === "warning" ? "Важно" : "Планово"}</span>
              <button className={item.priority === "danger" ? "primary-button" : "secondary-button"} type="button" onClick={() => { void onReadInbox([item.id]); onNavigate(item.target_view); }}>{item.action_label}<ChevronRight /></button>
            </article>
          ))}
          {!visible.length && <div className="task-empty"><CheckCircle2 /><strong>Всё выполнено</strong><span>В выбранной категории нет активных задач.</span></div>}
        </div>
      </section>
    </>
  );
}

function PerformanceView({ token, user }: { token: string; user: User }) {
  const canManage = user.role === "admin" || user.role === "hr";
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [reviewing, setReviewing] = useState<PerformanceReview | null>(null);
  const [showCycle, setShowCycle] = useState(false);
  const [showCompetency, setShowCompetency] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [summary, setSummary] = useState("");
  const [developmentPlan, setDevelopmentPlan] = useState("");
  const [cycleForm, setCycleForm] = useState({ title: "", start_date: localDateKey(new Date()), end_date: localDateKey(new Date()) });
  const [competencyForm, setCompetencyForm] = useState({ name: "", category: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [nextReviews, nextCycles, nextCompetencies] = await Promise.all([
        apiRequest<PerformanceReview[]>("/performance/reviews/", token),
        canManage ? apiRequest<PerformanceCycle[]>("/performance/cycles/", token) : Promise.resolve([]),
        canManage ? apiRequest<Competency[]>("/performance/competencies/", token) : Promise.resolve([]),
      ]);
      setReviews(nextReviews);
      setCycles(nextCycles);
      setCompetencies(nextCompetencies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить оценки");
    }
  }

  useEffect(() => { void load(); }, [token, canManage]);

  function openReview(item: PerformanceReview) {
    const managerMode = item.can_manager_submit;
    setReviewing(item);
    setScores(Object.fromEntries(item.scores.map((score) => [
      score.competency,
      (managerMode ? score.manager_score : score.self_score) || 0,
    ])));
    setComments(Object.fromEntries(item.scores.map((score) => [
      score.competency,
      managerMode ? score.manager_comment : score.self_comment,
    ])));
    setSummary(managerMode ? item.manager_summary : item.self_summary);
    setDevelopmentPlan(item.development_plan);
  }

  async function saveAssessment(event: FormEvent) {
    event.preventDefault();
    if (!reviewing) return;
    const managerMode = reviewing.can_manager_submit;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/performance/reviews/${reviewing.id}/${managerMode ? "manager" : "self"}/`, token, {
        method: "POST",
        body: JSON.stringify({
          scores: reviewing.scores.map((score) => ({
            competency: score.competency,
            score: scores[score.competency] || 0,
            comment: comments[score.competency] || "",
          })),
          summary,
          development_plan: managerMode ? developmentPlan : "",
        }),
      });
      setReviewing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить оценку");
    } finally {
      setSaving(false);
    }
  }

  async function createCycle(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/performance/cycles/", token, {
        method: "POST",
        body: JSON.stringify(cycleForm),
      });
      setShowCycle(false);
      setCycleForm({ title: "", start_date: localDateKey(new Date()), end_date: localDateKey(new Date()) });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать цикл");
    } finally {
      setSaving(false);
    }
  }

  async function createCompetency(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiRequest("/performance/competencies/", token, {
        method: "POST",
        body: JSON.stringify(competencyForm),
      });
      setShowCompetency(false);
      setCompetencyForm({ name: "", category: "", description: "" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить компетенцию");
    } finally {
      setSaving(false);
    }
  }

  async function launchCycle(cycle: PerformanceCycle) {
    try {
      await apiRequest(`/performance/cycles/${cycle.id}/launch/`, token, { method: "POST", body: "{}" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось запустить цикл");
    }
  }

  const pending = reviews.filter((item) => item.status !== "completed").length;
  const completed = reviews.filter((item) => item.status === "completed");
  const average = completed.flatMap((item) => item.scores.map((score) => score.manager_score).filter((value): value is number => value !== null));
  const averageScore = average.length ? (average.reduce((sum, value) => sum + value, 0) / average.length).toFixed(1) : "—";

  return (
    <>
      <PageHeader
        title="Оценка и развитие"
        subtitle={canManage ? "Циклы оценки, компетенции и планы развития сотрудников" : "Ваши задачи по оценке и результаты"}
        action={canManage ? <div className="page-actions"><button className="secondary-button" type="button" onClick={() => setShowCompetency(true)}><Plus />Компетенция</button><button className="primary-button" type="button" onClick={() => setShowCycle(true)}><Plus />Новый цикл</button></div> : undefined}
      />
      {error && <div className="form-error">{error}</div>}
      <section className="performance-metrics">
        <article><span>Оценок в работе</span><strong>{pending}</strong></article>
        <article><span>Завершено</span><strong>{completed.length}</strong></article>
        <article><span>Средняя оценка</span><strong>{averageScore}</strong></article>
      </section>

      {canManage && (
        <section className="panel performance-cycles">
          <header><div><span className="eyebrow">Управление</span><h2>Циклы оценки</h2></div><span>{competencies.length} компетенций</span></header>
          <div>
            {cycles.map((cycle) => (
              <article key={cycle.id}>
                <div><strong>{cycle.title}</strong><span>{displayDate(cycle.start_date)} — {displayDate(cycle.end_date)}</span></div>
                <div className="performance-cycle__progress"><span><i style={{ width: `${cycle.review_count ? cycle.completed_count / cycle.review_count * 100 : 0}%` }} /></span><small>{cycle.completed_count} из {cycle.review_count}</small></div>
                <span className={`performance-status performance-status--${cycle.status}`}>{cycle.status_label}</span>
                {cycle.status === "draft" && <button className="primary-button" type="button" onClick={() => void launchCycle(cycle)}>Запустить</button>}
              </article>
            ))}
            {!cycles.length && <div className="performance-empty">Создайте первый цикл оценки.</div>}
          </div>
        </section>
      )}

      <section className="panel performance-reviews">
        <header><div><span className="eyebrow">Задачи</span><h2>{canManage ? "Оценки сотрудников" : "Мои оценки"}</h2></div></header>
        <div>
          {reviews.map((item) => (
            <article key={item.id}>
              <div className="performance-review__avatar">{(item.employee_name || item.employee_email).slice(0, 1)}</div>
              <div className="performance-review__person"><strong>{item.employee_name || item.employee_email}</strong><span>{item.position_name || item.department_name || item.cycle_title}</span></div>
              <div><strong>{item.cycle_title}</strong><span>до {displayDate(item.cycle_end_date)}</span></div>
              <div className="performance-review__score"><strong>{item.manager_average ?? item.self_average ?? "—"}</strong><span>из 5</span></div>
              <span className={`performance-status performance-status--${item.status}`}>{item.status_label}</span>
              <button className={item.can_self_submit || item.can_manager_submit ? "primary-button" : "secondary-button"} type="button" onClick={() => openReview(item)}>{item.can_self_submit ? "Самооценка" : item.can_manager_submit ? "Оценить" : "Результаты"}</button>
            </article>
          ))}
          {!reviews.length && <div className="performance-empty">Активных оценок пока нет.</div>}
        </div>
      </section>

      {showCycle && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCycle(false); }}>
          <section className="hcm-dialog performance-dialog" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">Новый цикл</span><h2>Запланировать оценку</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowCycle(false)}><X /></button></header>
            <form className="hcm-form" onSubmit={createCycle}><div className="hcm-form__grid"><label className="hcm-form__wide">Название<input value={cycleForm.title} onChange={(event) => setCycleForm({ ...cycleForm, title: event.target.value })} required /></label><label>Начало<input type="date" value={cycleForm.start_date} onChange={(event) => setCycleForm({ ...cycleForm, start_date: event.target.value })} required /></label><label>Окончание<input type="date" min={cycleForm.start_date} value={cycleForm.end_date} onChange={(event) => setCycleForm({ ...cycleForm, end_date: event.target.value })} required /></label></div><footer><button className="secondary-button" type="button" onClick={() => setShowCycle(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>Создать</button></footer></form>
          </section>
        </div>
      )}

      {showCompetency && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCompetency(false); }}>
          <section className="hcm-dialog performance-dialog" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">Модель компетенций</span><h2>Добавить компетенцию</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowCompetency(false)}><X /></button></header>
            <form className="hcm-form" onSubmit={createCompetency}><div className="hcm-form__grid"><label>Название<input value={competencyForm.name} onChange={(event) => setCompetencyForm({ ...competencyForm, name: event.target.value })} required /></label><label>Категория<input value={competencyForm.category} onChange={(event) => setCompetencyForm({ ...competencyForm, category: event.target.value })} /></label><label className="hcm-form__wide">Описание<textarea value={competencyForm.description} onChange={(event) => setCompetencyForm({ ...competencyForm, description: event.target.value })} /></label></div><footer><button className="secondary-button" type="button" onClick={() => setShowCompetency(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>Добавить</button></footer></form>
          </section>
        </div>
      )}

      {reviewing && (
        <div className="hcm-dialog-backdrop">
          <section className="hcm-dialog performance-assessment-dialog" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">{reviewing.cycle_title}</span><h2>{reviewing.can_manager_submit ? `Оценка: ${reviewing.employee_name}` : reviewing.can_self_submit ? "Самооценка" : "Результаты оценки"}</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setReviewing(null)}><X /></button></header>
            <form className="performance-assessment" onSubmit={saveAssessment}>
              {reviewing.scores.map((item) => {
                const editable = reviewing.can_self_submit || reviewing.can_manager_submit;
                const current = editable ? scores[item.competency] : item.manager_score || item.self_score || 0;
                return <article key={item.id}><div><strong>{item.competency_name}</strong><span>{item.competency_category || item.competency_description}</span></div><div className="score-scale">{[1, 2, 3, 4, 5].map((value) => <button className={current === value ? "score-scale__item score-scale__item--active" : "score-scale__item"} type="button" disabled={!editable} onClick={() => setScores({ ...scores, [item.competency]: value })} key={value}>{value}</button>)}</div>{editable && <textarea value={comments[item.competency] || ""} onChange={(event) => setComments({ ...comments, [item.competency]: event.target.value })} placeholder="Комментарий к оценке" />}</article>;
              })}
              {(reviewing.can_self_submit || reviewing.can_manager_submit) && <label>Итоговый комментарий<textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label>}
              {reviewing.can_manager_submit && <label>Индивидуальный план развития<textarea value={developmentPlan} onChange={(event) => setDevelopmentPlan(event.target.value)} placeholder="Цели, навыки и следующие шаги" /></label>}
              {!reviewing.can_self_submit && !reviewing.can_manager_submit && <div className="performance-result"><div><span>Самооценка</span><strong>{reviewing.self_average ?? "—"}</strong></div><div><span>Руководитель</span><strong>{reviewing.manager_average ?? "—"}</strong></div>{reviewing.development_plan && <p><strong>План развития</strong>{reviewing.development_plan}</p>}</div>}
              <footer><button className="secondary-button" type="button" onClick={() => setReviewing(null)}>Закрыть</button>{(reviewing.can_self_submit || reviewing.can_manager_submit) && <button className="primary-button" type="submit" disabled={saving}>{reviewing.can_manager_submit ? "Завершить оценку" : "Отправить руководителю"}</button>}</footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function DocumentsView({ token, user }: { token: string; user: User }) {
  const canManage = user.role === "admin" || user.role === "hr";
  const [items, setItems] = useState<EmployeeDocument[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [filter, setFilter] = useState<"all" | EmployeeDocument["status"]>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [decision, setDecision] = useState<{ item: EmployeeDocument; action: "sign" | "decline" } | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee: "", title: "", document_type: "", number: "",
    issue_date: "", expires_at: "", requires_signature: true,
  });

  async function load() {
    try {
      const [documents, people] = await Promise.all([
        apiRequest<EmployeeDocument[]>("/documents/", token),
        canManage ? apiRequest<EmployeeProfile[]>("/employees/", token) : Promise.resolve([]),
      ]);
      setItems(documents);
      setEmployees(people);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить документы");
    }
  }

  useEffect(() => { void load(); }, [token, canManage]);

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Выберите файл документа");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("employee", form.employee);
      body.append("title", form.title);
      body.append("document_type", form.document_type);
      body.append("number", form.number);
      if (form.issue_date) body.append("issue_date", form.issue_date);
      if (form.expires_at) body.append("expires_at", form.expires_at);
      body.append("requires_signature", String(form.requires_signature));
      body.append("file", file);
      await apiUpload<EmployeeDocument>("/documents/", token, body);
      setShowUpload(false);
      setFile(null);
      setForm({ employee: "", title: "", document_type: "", number: "", issue_date: "", expires_at: "", requires_signature: true });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить документ");
    } finally {
      setSaving(false);
    }
  }

  async function documentAction(item: EmployeeDocument, action: "send" | "archive") {
    try {
      await apiRequest(`/documents/${item.id}/${action}/`, token, { method: "POST", body: "{}" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить документ");
    }
  }

  async function submitDecision(event: FormEvent) {
    event.preventDefault();
    if (!decision) return;
    setSaving(true);
    try {
      await apiRequest(`/documents/${decision.item.id}/decision/`, token, {
        method: "POST",
        body: JSON.stringify({ action: decision.action, comment: decisionComment }),
      });
      setDecision(null);
      setDecisionComment("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось подтвердить документ");
    } finally {
      setSaving(false);
    }
  }

  async function downloadDocument(item: EmployeeDocument) {
    try {
      const response = await fetch(`${API}/documents/${item.id}/download/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!response.ok) throw new Error("Не удалось открыть файл");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = item.file_original_name || item.title;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось открыть файл");
    }
  }

  const visible = filter === "all" ? items : items.filter((item) => item.status === filter);
  const awaiting = items.filter((item) => item.status === "awaiting").length;
  const signed = items.filter((item) => item.status === "signed").length;

  return (
    <>
      <PageHeader
        title="Документы"
        subtitle={canManage ? "Кадровые документы и контроль подтверждения сотрудниками" : "Ваши кадровые документы и запросы на подтверждение"}
        action={canManage ? <button className="primary-button" type="button" onClick={() => setShowUpload(true)}><Upload />Загрузить документ</button> : undefined}
      />
      {error && <div className="form-error">{error}</div>}
      <section className="document-metrics">
        <article><span>Всего документов</span><strong>{items.length}</strong></article>
        <article className={awaiting ? "document-metric--attention" : ""}><span>Ожидают подтверждения</span><strong>{awaiting}</strong></article>
        <article><span>Подтверждены</span><strong>{signed}</strong></article>
      </section>
      <section className="panel document-register">
        <header>
          <div><span className="eyebrow">Реестр</span><h2>{canManage ? "Документы сотрудников" : "Мои документы"}</h2></div>
          <div className="document-filters">
            {([["all", "Все"], ["awaiting", "Ожидают"], ["signed", "Подтверждены"], ["draft", "Черновики"]] as const).map(([value, label]) => (
              <button className={filter === value ? "document-filter document-filter--active" : "document-filter"} type="button" onClick={() => setFilter(value)} key={value}>{label}</button>
            ))}
          </div>
        </header>
        <div className="document-list">
          {visible.map((item) => (
            <article key={item.id}>
              <div className="document-list__icon"><FileText /></div>
              <div className="document-list__main">
                <strong>{item.title}</strong>
                <span>{item.document_type || "Кадровый документ"}{item.number ? ` · № ${item.number}` : ""}</span>
              </div>
              {canManage && <div className="document-list__employee"><strong>{item.employee_name || item.employee_email}</strong><span>{item.department_name || "Без отдела"}</span></div>}
              <div className="document-list__file">
                <strong>{item.file_original_name || "Файл не прикреплён"}</strong>
                <span>{item.file_size ? formatFileSize(item.file_size) : item.issue_date ? `от ${displayDate(item.issue_date)}` : "—"}</span>
              </div>
              <span className={`document-status document-status--${item.status}`}>{item.status_label}</span>
              <div className="document-list__actions">
                {item.has_file && <button className="secondary-button" type="button" onClick={() => void downloadDocument(item)}><Download />Скачать</button>}
                {item.can_manage && item.requires_signature && ["draft", "declined"].includes(item.status) && <button className="primary-button" type="button" onClick={() => void documentAction(item, "send")}>Отправить сотруднику</button>}
                {item.can_sign && <>
                  <button className="primary-button" type="button" onClick={() => { setDecision({ item, action: "sign" }); setDecisionComment(""); }}><CheckCircle2 />Подтвердить</button>
                  <button className="secondary-button" type="button" onClick={() => { setDecision({ item, action: "decline" }); setDecisionComment(""); }}>Отклонить</button>
                </>}
                {item.can_manage && item.status !== "archived" && <button className="text-button" type="button" onClick={() => void documentAction(item, "archive")}>В архив</button>}
              </div>
              {item.decision_comment && <p className="document-list__comment">Комментарий: {item.decision_comment}</p>}
            </article>
          ))}
          {!visible.length && <div className="document-empty"><FileText /><strong>Документов пока нет</strong><span>{filter === "all" ? "Новые документы появятся здесь." : "В этом статусе документов нет."}</span></div>}
        </div>
      </section>

      {showUpload && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUpload(false); }}>
          <section className="hcm-dialog document-dialog" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
            <header><div><span className="eyebrow">Кадровый документ</span><h2 id="document-upload-title">Загрузить сотруднику</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowUpload(false)}><X /></button></header>
            <form className="hcm-form" onSubmit={uploadDocument}>
              <div className="hcm-form__grid">
                <label className="hcm-form__wide">Сотрудник<select value={form.employee} onChange={(event) => setForm({ ...form, employee: event.target.value })} required><option value="">Выберите сотрудника</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.full_name || employee.email}</option>)}</select></label>
                <label className="hcm-form__wide">Название<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
                <label>Тип<input value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })} placeholder="Приказ, заявление…" /></label>
                <label>Номер<input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} /></label>
                <label>Дата документа<input type="date" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} /></label>
                <label>Действует до<input type="date" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} /></label>
                <label className="hcm-form__wide document-file-field"><span>Файл до 20 МБ · PDF, Word, Excel, JPG или PNG</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} required /></label>
                <label className="document-signature-option"><input type="checkbox" checked={form.requires_signature} onChange={(event) => setForm({ ...form, requires_signature: event.target.checked })} /><span><strong>Запросить подтверждение</strong><small>После загрузки документ можно отправить сотруднику.</small></span></label>
              </div>
              <footer><button className="secondary-button" type="button" onClick={() => setShowUpload(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Загружаем…" : "Загрузить"}</button></footer>
            </form>
          </section>
        </div>
      )}

      {decision && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDecision(null); }}>
          <section className="hcm-dialog document-decision-dialog" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">Подтверждение документа</span><h2>{decision.item.title}</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setDecision(null)}><X /></button></header>
            <p>{decision.action === "sign" ? "Подтвердите, что ознакомились с документом." : "Укажите причину отклонения документа."}</p>
            <form className="hcm-form" onSubmit={submitDecision}>
              <label>Комментарий<textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} required={decision.action === "decline"} placeholder={decision.action === "decline" ? "Что необходимо исправить" : "Необязательно"} /></label>
              <footer><button className="secondary-button" type="button" onClick={() => setDecision(null)}>Отмена</button><button className={decision.action === "sign" ? "primary-button" : "danger-button"} type="submit" disabled={saving}>{decision.action === "sign" ? "Подтвердить" : "Отклонить"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

const absenceTypes = [
  ["vacation", "Отпуск"],
  ["sick", "Больничный"],
  ["remote", "Удалённая работа"],
  ["unpaid", "За свой счёт"],
  ["other", "Другое"],
] as const;

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
    .format(new Date(`${value}T00:00:00`));
}

function AbsencesView({ token, user }: { token: string; user: User }) {
  const today = localDateKey(new Date());
  const canSelectEmployee = user.role === "admin" || user.role === "hr";
  const [items, setItems] = useState<AbsenceRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showCreate, setShowCreate] = useState(false);
  const [decision, setDecision] = useState<{ item: AbsenceRequest; action: "approve" | "reject" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    absence_type: "vacation",
    start_date: today,
    end_date: today,
    comment: "",
  });

  async function load() {
    try {
      const requests = await apiRequest<AbsenceRequest[]>("/absences/", token);
      setItems(requests);
      if (canSelectEmployee) {
        setEmployees(await apiRequest<EmployeeProfile[]>("/employees/", token));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить отсутствия");
    }
  }

  useEffect(() => { void load(); }, [token, canSelectEmployee]);

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest<AbsenceRequest>("/absences/", token, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          ...(canSelectEmployee ? { employee: Number(form.employee) } : {}),
        }),
      });
      setShowCreate(false);
      setForm({ employee: "", absence_type: "vacation", start_date: today, end_date: today, comment: "" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать заявку");
    } finally {
      setSaving(false);
    }
  }

  async function submitDecision(event: FormEvent) {
    event.preventDefault();
    if (!decision) return;
    setSaving(true);
    try {
      await apiRequest(`/absences/${decision.item.id}/decision/`, token, {
        method: "POST",
        body: JSON.stringify({ action: decision.action, note: decisionNote }),
      });
      setDecision(null);
      setDecisionNote("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обработать заявку");
    } finally {
      setSaving(false);
    }
  }

  async function cancelRequest(item: AbsenceRequest) {
    try {
      await apiRequest(`/absences/${item.id}/cancel/`, token, { method: "POST", body: "{}" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отменить заявку");
    }
  }

  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(month);
  const monthStartOffset = (month.getDay() + 6) % 7;
  const calendarStart = new Date(month.getFullYear(), month.getMonth(), 1 - monthStartOffset);
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
  const approved = items.filter((item) => item.status === "approved");
  const absentToday = approved.filter((item) => item.start_date <= today && item.end_date >= today);
  const upcomingDays = approved
    .filter((item) => item.end_date >= today)
    .reduce((total, item) => total + item.days, 0);

  return (
    <>
      <PageHeader
        title="Отпуска и отсутствия"
        subtitle={canSelectEmployee || user.role === "leader" ? "Заявки и календарь вашей зоны ответственности" : "Ваши заявки и согласованные даты"}
        action={<button className="primary-button" type="button" onClick={() => setShowCreate(true)}><Plus />Новая заявка</button>}
      />
      {error && <div className="form-error absence-error">{error}</div>}
      <section className="absence-metrics">
        <article><span>На согласовании</span><strong>{items.filter((item) => item.status === "pending").length}</strong></article>
        <article><span>Сегодня отсутствуют</span><strong>{absentToday.length}</strong></article>
        <article><span>Согласовано дней</span><strong>{upcomingDays}</strong></article>
      </section>

      <div className="absence-layout">
        <section className="panel absence-calendar">
          <header>
            <div><span className="eyebrow">Календарь команды</span><h2>{monthName}</h2></div>
            <div className="absence-calendar__controls">
              <button className="icon-button" type="button" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button>
              <button className="secondary-button" type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Сегодня</button>
              <button className="icon-button" type="button" aria-label="Следующий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button>
            </div>
          </header>
          <div className="absence-calendar__grid absence-calendar__weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="absence-calendar__grid">
            {calendarDays.map((day) => {
              const key = localDateKey(day);
              const dayItems = approved.filter((item) => item.start_date <= key && item.end_date >= key);
              return (
                <div className={`absence-day ${day.getMonth() !== month.getMonth() ? "absence-day--outside" : ""} ${key === today ? "absence-day--today" : ""}`} key={key}>
                  <time dateTime={key}>{day.getDate()}</time>
                  {dayItems.slice(0, 2).map((item) => (
                    <span className={`absence-event absence-event--${item.absence_type}`} title={`${item.employee_name}: ${item.absence_type_label}`} key={item.id}>
                      {item.employee_name || item.employee_email}
                    </span>
                  ))}
                  {dayItems.length > 2 && <small>+{dayItems.length - 2}</small>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel absence-register">
          <header><div><span className="eyebrow">Реестр</span><h2>Заявки</h2></div><span>{items.length}</span></header>
          <div className="absence-list">
            {items.map((item) => (
              <article key={item.id}>
                <div className={`absence-list__marker absence-list__marker--${item.absence_type}`}><CalendarDays /></div>
                <div className="absence-list__person">
                  <strong>{item.employee_name || item.employee_email}</strong>
                  <span>{item.department_name || item.absence_type_label}</span>
                </div>
                <div className="absence-list__period">
                  <strong>{formatShortDate(item.start_date)} — {formatShortDate(item.end_date)}</strong>
                  <span>{item.absence_type_label} · {item.days} дн.</span>
                </div>
                <span className={`absence-status absence-status--${item.status}`}>{item.status_label}</span>
                <div className="absence-list__actions">
                  {item.can_review && <>
                    <button type="button" className="text-button" onClick={() => { setDecision({ item, action: "approve" }); setDecisionNote(""); }}>Согласовать</button>
                    <button type="button" className="text-button text-button--danger" onClick={() => { setDecision({ item, action: "reject" }); setDecisionNote(""); }}>Отклонить</button>
                  </>}
                  {item.can_cancel && <button type="button" className="text-button" onClick={() => void cancelRequest(item)}>Отменить</button>}
                </div>
              </article>
            ))}
            {!items.length && <div className="absence-empty"><CalendarDays /><strong>Заявок пока нет</strong><span>Создайте первую заявку на отсутствие.</span></div>}
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <section className="hcm-dialog absence-dialog" role="dialog" aria-modal="true" aria-labelledby="absence-create-title">
            <header><div><span className="eyebrow">Новая заявка</span><h2 id="absence-create-title">Запланировать отсутствие</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setShowCreate(false)}><X /></button></header>
            <form className="hcm-form" onSubmit={createRequest}>
              <div className="hcm-form__grid">
                {canSelectEmployee && <label className="hcm-form__wide">Сотрудник<select value={form.employee} onChange={(event) => setForm({ ...form, employee: event.target.value })} required><option value="">Выберите сотрудника</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.full_name || employee.email}</option>)}</select></label>}
                <label>Тип<select value={form.absence_type} onChange={(event) => setForm({ ...form, absence_type: event.target.value })}>{absenceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <span />
                <label>Начало<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value, end_date: event.target.value > form.end_date ? event.target.value : form.end_date })} required /></label>
                <label>Окончание<input type="date" min={form.start_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required /></label>
                <label className="hcm-form__wide">Комментарий<textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="При необходимости добавьте детали" /></label>
              </div>
              <footer><button className="secondary-button" type="button" onClick={() => setShowCreate(false)}>Отмена</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Отправляем…" : "Отправить"}</button></footer>
            </form>
          </section>
        </div>
      )}

      {decision && (
        <div className="hcm-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDecision(null); }}>
          <section className="hcm-dialog absence-decision-dialog" role="dialog" aria-modal="true">
            <header><div><span className="eyebrow">Решение по заявке</span><h2>{decision.action === "approve" ? "Согласовать отсутствие" : "Отклонить заявку"}</h2></div><button className="icon-button" type="button" aria-label="Закрыть" onClick={() => setDecision(null)}><X /></button></header>
            <p>{decision.item.employee_name} · {formatShortDate(decision.item.start_date)} — {formatShortDate(decision.item.end_date)}</p>
            <form className="hcm-form" onSubmit={submitDecision}>
              <label>Комментарий<textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Необязательно" /></label>
              <footer><button className="secondary-button" type="button" onClick={() => setDecision(null)}>Отмена</button><button className={decision.action === "approve" ? "primary-button" : "danger-button"} type="submit" disabled={saving}>{saving ? "Сохраняем…" : decision.action === "approve" ? "Согласовать" : "Отклонить"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function Placeholder({ active }: { active: ViewId }) {
  const labels: Record<string, string> = {
    trajectory: "Траектория обучения", ranking: "Сеть развития", analytics: "Аналитика дэйликов",
    tasks: "Задачи",
    absences: "Отпуска и отсутствия",
    documents: "Документы",
    performance: "Оценка и развитие",
    courses: "Курсы", updates: "Обновления продукта", audit: "Журнал действий", settings: "Настройки", employees: "Сотрудники",
    organization: "Оргструктура", recruitment: "Подбор", hrAnalytics: "HR-аналитика",
  };
  return (
    <>
      <PageHeader title={labels[active]} subtitle="Раздел подключён к навигации" />
      <section className="panel empty"><Workflow /><h2>Следующий этап разработки</h2><p>Сюда добавим рабочие инструменты в следующем сценарии.</p></section>
    </>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("smartis-token"));
  const [user, setUser] = useState<User | null>(null);
  const [inbox, setInbox] = useState<Inbox>({ total: 0, urgent: 0, unread: 0, items: [] });
  const [inboxError, setInboxError] = useState("");
  const [active, setActive] = useState<ViewId>("home");
  const [dark, setDark] = useState(() => localStorage.getItem("smartis-theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("smartis-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!token) return;
    apiRequest<User>("/auth/me/", token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("smartis-token");
        setToken(null);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 60000);
    return () => window.clearInterval(timer);
  }, [token, user?.id]);

  async function loadInbox() {
    if (!token) return;
    try {
      setInbox(await apiRequest<Inbox>("/inbox/", token));
      setInboxError("");
    } catch (reason) {
      setInboxError(reason instanceof Error ? reason.message : "Не удалось загрузить уведомления");
    }
  }

  async function readInbox(itemIds: string[]) {
    if (!token || !itemIds.length) return;
    await apiRequest("/inbox/", token, {
      method: "POST",
      body: JSON.stringify({ item_ids: itemIds, read: true }),
    });
    await loadInbox();
  }

  function login(nextToken: string, nextUser: User) {
    localStorage.setItem("smartis-token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  async function logout() {
    if (token) await apiRequest("/auth/logout/", token, { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("smartis-token");
    setToken(null);
    setUser(null);
    setInbox({ total: 0, urgent: 0, unread: 0, items: [] });
  }

  function navigate(view: ViewId) {
    if (user && canAccessView(user, view)) setActive(view);
  }

  useEffect(() => {
    if (user && !canAccessView(user, active)) setActive("home");
  }, [user, active]);

  if (!token || !user) return <LoginPage onLogin={login} />;

  return (
    <div className={"app-shell " + (sidebarOpen ? "app-shell--sidebar-open" : "app-shell--sidebar-closed")}>
      <IconRail
        active={active}
        user={user}
        open={sidebarOpen}
        inbox={inbox}
        onNavigate={navigate}
        onOpen={() => setSidebarOpen((value) => !value)}
        onReadInbox={readInbox}
      />
      <Sidebar
        active={active}
        user={user}
        open={sidebarOpen}
        dark={dark}
        onNavigate={navigate}
        onTheme={() => setDark((value) => !value)}
        onLogout={() => void logout()}
      />
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <main className="main-content">
        {active === "home" ? (
          <HomeView user={user} token={token} onNavigate={navigate} />
        ) : active === "trajectory" ? (
          <TrajectoryView token={token} user={user} />
        ) : active === "ranking" ? (
          <DevelopmentNetworkView token={token} onNavigate={navigate} />
        ) : active === "tasks" ? (
          <TaskCenterView inbox={inbox} error={inboxError} onNavigate={navigate} onReadInbox={readInbox} />
        ) : active === "analytics" ? (
          <DailyAnalyticsView token={token} user={user} />
        ) : active === "performance" ? (
          <PerformanceView token={token} user={user} />
        ) : active === "documents" ? (
          <DocumentsView token={token} user={user} />
        ) : active === "absences" ? (
          <AbsencesView token={token} user={user} />
        ) : active === "users" ? (
          <UsersView token={token} />
        ) : active === "employees" ? (
          <EmployeesView token={token} user={user} />
        ) : active === "organization" ? (
          <OrganizationView token={token} />
        ) : active === "recruitment" ? (
          <RecruitmentView token={token} user={user} />
        ) : active === "hrAnalytics" ? (
          <HrAnalyticsView token={token} />
        ) : active === "courses" ? (
          <CoursesView token={token} user={user} />
        ) : active === "updates" ? (
          <ProductUpdatesView token={token} />
        ) : active === "audit" ? (
          <AuditLogView token={token} />
        ) : active === "settings" ? (
          <SettingsView token={token} />
        ) : (
          <Placeholder active={active} />
        )}
      </main>
    </div>
  );
}

export default App;
