import {
  ArrowDown,
  ArrowUp,
  BarChart3,
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
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Plus,
  Route,
  Rows3,
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
import type { FormEvent } from "react";
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
  | "home" | "trajectory" | "ranking" | "analytics" | "absences"
  | "organization" | "employees" | "recruitment" | "hrAnalytics"
  | "users" | "courses" | "settings";
type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_label: string;
  status: string;
  status_label: string;
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
  id: number; title: string; document_type: string; number: string;
  issue_date: string | null; expires_at: string | null;
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
type QuizQuestion = { prompt: string; options: QuizOption[] };
type QuizData = { passing_score: number; questions: QuizQuestion[] };
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

async function apiUpload<T>(path: string, token: string, body: FormData): Promise<T> {
  const response = await fetch(API + path, {
    method: "POST",
    headers: { Authorization: "Token " + token },
    body,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Не удалось загрузить файл");
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
  const [email, setEmail] = useState("admin@smartis.local");
  const [password, setPassword] = useState("SmartisDemo123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
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

  return (
    <main className="login-page">
      <section className="login-card">
        <Brand login />
        <div className="login-intro">
          <h1>Управление и обучение персонала</h1>
          <p>Единая корпоративная система HCM / LMS Smartis</p>
        </div>
        <form onSubmit={submit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
        <p className="login-note">Демонстрационный вход уже заполнен</p>
      </section>
    </main>
  );
}

const nav = [
  { id: "home" as const, label: "Главная", icon: Home },
  { id: "trajectory" as const, label: "Траектория", icon: Route },
  { id: "ranking" as const, label: "Рейтинг", icon: Trophy },
  { id: "analytics" as const, label: "Аналитика", icon: BarChart3 },
  { id: "absences" as const, label: "Отсутствия", icon: CalendarDays },
];
const hcmNav = [
  { id: "organization" as const, label: "Оргструктура", icon: Building2 },
  { id: "employees" as const, label: "Сотрудники", icon: ContactRound },
  { id: "recruitment" as const, label: "Подбор", icon: BriefcaseBusiness },
  { id: "hrAnalytics" as const, label: "HR-аналитика", icon: ChartNoAxesCombined },
];
const adminNav = [
  { id: "users" as const, label: "Пользователи", icon: Users },
  { id: "courses" as const, label: "Курсы", icon: BookOpen },
  { id: "settings" as const, label: "Настройки", icon: Settings },
];

function visibleHcmNav(user: User) {
  return user.role === "admin" || user.role === "hr" ? hcmNav : [];
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
      <nav className="nav-group" aria-label="Обучение">
        <p>Обучение</p>
        {group(nav)}
      </nav>
      {availableHcmNav.length > 0 && (
        <nav className="nav-group" aria-label="Персонал">
          <p>Персонал</p>
          {group(availableHcmNav)}
        </nav>
      )}
      {availableAdminNav.length > 0 && (
        <nav className="nav-group" aria-label="Администрирование">
          <p>Администрирование</p>
          {group(availableAdminNav)}
        </nav>
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
  onNavigate,
  onOpen,
}: {
  active: ViewId;
  user: User;
  open: boolean;
  onNavigate: (view: ViewId) => void;
  onOpen: () => void;
}) {
  const availableHcmNav = visibleHcmNav(user);
  const availableAdminNav = visibleAdminNav(user);
  const railGroup = (items: typeof nav | typeof hcmNav | typeof adminNav) => items.map(({ id, label, icon: Icon }) => (
    <button
      className={active === id ? "icon-rail__item icon-rail__item--active" : "icon-rail__item"}
      type="button"
      key={id}
      aria-label={label}
      data-tooltip={label}
      onClick={() => onNavigate(id)}
    >
      <Icon aria-hidden="true" />
    </button>
  ));
  return (
    <aside className="icon-rail" aria-label="Быстрая навигация">
      <button
        className="icon-rail__toggle"
        type="button"
        aria-label={open ? "Скрыть полное меню" : "Открыть полное меню"}
        aria-expanded={open}
        data-tooltip={open ? "Скрыть меню" : "Открыть меню"}
        onClick={onOpen}
      >
        <CurtainToggleIcon open={open} />
      </button>
      <nav className="icon-rail__group" aria-label="Обучение">{railGroup(nav)}</nav>
      {availableHcmNav.length > 0 && (
        <>
          <span className="icon-rail__divider" aria-hidden="true" />
          <nav className="icon-rail__group" aria-label="Персонал">{railGroup(availableHcmNav)}</nav>
        </>
      )}
      {availableAdminNav.length > 0 && (
        <>
          <span className="icon-rail__divider" aria-hidden="true" />
          <nav className="icon-rail__group" aria-label="Администрирование">{railGroup(availableAdminNav)}</nav>
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

function Spider({ progress }: { progress: number }) {
  return (
    <svg className="spider" style={{ left: "calc(" + progress + "% - 19px)" }} viewBox="0 0 44 34" aria-hidden="true">
      <path d="M15 13C10 11 8 7 6 4M13 17 3 14M15 21c-5 2-7 6-8 9M29 13c5-2 7-6 9-9M31 17l10-3M29 21c5 2 7 6 8 9" />
      <ellipse cx="22" cy="18" rx="12.5" ry="9" />
    </svg>
  );
}

function HomeView({ user }: { user: User }) {
  const ranking = [
    ["Анна", 82], ["Вы", 54], ["Максим", 41], ["Ольга", 28],
  ] as const;
  return (
    <>
      <PageHeader title={"Добрый день, " + (user.first_name || user.email)} subtitle="Траектория «Аналитик Smartis»" />
      <section className="stats">
        {[
          ["Ближайший срок", "4 дня", "Модели атрибуции"],
          ["Курсы", "7 / 16", "Пройдено"],
          ["Проверка", "1", "Задание отправлено"],
        ].map(([label, value, note]) => (
          <article className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
        ))}
      </section>
      <section className="panel current-course">
        <div><span className="eyebrow">Текущий курс</span><h2>Модели атрибуции</h2><p>Урок 4 из 7 · срок 24 июля</p></div>
        <button className="primary-button" type="button">Продолжить <ChevronRight /></button>
        <div className="progress"><span style={{ width: "54%" }} /></div>
      </section>
      <section className="panel">
        <div className="section-heading"><div><h2>Рейтинг</h2><p>Участники курса внутри вашего отдела</p></div><Trophy /></div>
        <div className="ranking">
          {ranking.map(([name, progress], index) => (
            <div className="rank-row" key={name}>
              <strong>{index + 1}</strong><span>{name}</span>
              <div className="track"><Spider progress={progress} /><span>⚑</span></div>
              <strong>{progress}%</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const roleAccessCards = [
  { role: "employee", title: "Сотрудник", access: "Проходит курсы, траектории и тесты. Не видит данные персонала." },
  { role: "author", title: "Автор курсов", access: "Создаёт и редактирует свои курсы и проекты обучения." },
  { role: "hr", title: "HR-менеджер", access: "Работает с сотрудниками, подбором и HR-аналитикой." },
  { role: "admin", title: "Администратор", access: "Полный доступ, пользователи, роли, HCM и все курсы." },
  { role: "leader", title: "Руководитель", access: "Проходит обучение как сотрудник; управленческие отчёты добавим отдельно." },
];

function UsersView({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "", first_name: "", last_name: "", role: "employee", department: "",
  });
  const [departmentName, setDepartmentName] = useState("");

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
    try {
      await apiRequest<User>("/users/", token, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          department: form.department ? Number(form.department) : null,
        }),
      });
      setForm({ email: "", first_name: "", last_name: "", role: "employee", department: "" });
      setShowForm(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать сотрудника");
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
            <label>Роль<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Сотрудник</option><option value="hr">HR-менеджер</option>
              <option value="admin">Администратор</option><option value="author">Автор курсов</option>
              <option value="leader">Руководитель</option>
            </select></label>
            <label>Отдел<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Без отдела</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
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
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Сотрудник</th><th>Отдел</th><th>Роль</th><th>Статус</th></tr></thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.first_name} {item.last_name}</strong><span>{item.email}</span></td>
                  <td>{item.department_name || "—"}</td><td>{item.role_label}</td>
                  <td><span className={"status status--" + item.status}>{item.status_label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function HcmMetricCards({ summary }: { summary: HcmSummary | null }) {
  const metrics = [
    ["Сотрудники", summary?.employees_total ?? "—", "Активные карточки"],
    ["Испытательный срок", summary?.on_probation ?? "—", "Требуют внимания"],
    ["План развития", summary ? `${summary.average_development_progress}%` : "—", "Средний прогресс"],
    ["Кандидаты", summary?.candidates_total ?? "—", `${summary?.open_positions ?? "—"} открытых позиций`],
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
                      <input type="checkbox" checked={item.done} onChange={() => void toggleOnboardingItem(item.id)} />
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
  grade: "", birth_date: "", hire_date: "", education: "", competencies: "", status: "employed",
  checklist_score: "0", development_progress: "0", salary_base: "", monthly_bonus: "", quarterly_bonus: "",
};

function EmployeesView({ token, user }: { token: string; user: User }) {
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
        checklist_score: Number(form.checklist_score),
        development_progress: Number(form.development_progress),
        salary_base: form.salary_base || null,
        monthly_bonus: form.monthly_bonus || null,
        quarterly_bonus: form.quarterly_bonus || null,
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
          <button className="primary-button" type="button" onClick={() => openEmployee()}>
            <Plus /> Добавить сотрудника
          </button>
        ) : undefined}
      />
      <HcmMetricCards summary={summary} />
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
                <label>Статус<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="employed">Работает</option><option value="probation">Испытательный срок</option><option value="dismissed">Уволен</option></select></label>
                <label>План развития, %<input type="number" min="0" max="100" value={form.development_progress} onChange={(e) => setForm({ ...form, development_progress: e.target.value })} /></label>
                <label>Чек-лист, %<input type="number" min="0" max="100" value={form.checklist_score} onChange={(e) => setForm({ ...form, checklist_score: e.target.value })} /></label>
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

function RecruitmentView({ token }: { token: string }) {
  const [stages, setStages] = useState<CandidateStage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [staff, setStaff] = useState<StaffPosition[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState<number | "all">("all");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [vacancyDialog, setVacancyDialog] = useState<Vacancy | "new" | null>(null);
  const [hiring, setHiring] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyCandidateForm);
  const [vacancyForm, setVacancyForm] = useState(emptyVacancyForm);
  const [hireForm, setHireForm] = useState(emptyHireForm);

  async function load() {
    try {
      const [nextStages, nextCandidates, nextDepartments, nextPositions, nextStaff, nextVacancies] = await Promise.all([
        apiRequest<CandidateStage[]>("/candidate-stages/", token),
        apiRequest<Candidate[]>("/candidates/", token),
        apiRequest<OrgDepartment[]>("/org/departments/", token),
        apiRequest<Position[]>("/positions/", token),
        apiRequest<StaffPosition[]>("/org/staff-positions/", token),
        apiRequest<Vacancy[]>("/vacancies/", token),
      ]);
      setStages(nextStages);
      setCandidates(nextCandidates);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setStaff(nextStaff);
      setVacancies(nextVacancies);
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

  const visibleCandidates = selectedVacancy === "all"
    ? candidates
    : candidates.filter((item) => item.vacancy === selectedVacancy);
  const openVacancies = vacancies.filter((item) => item.status === "open");

  return (
    <>
      <PageHeader
        title="Подбор"
        subtitle="Вакансии из штатного расписания и воронка кандидатов"
        action={<div className="page-actions"><button className="secondary-button" type="button" onClick={() => openVacancy()}><BriefcaseBusiness /> Новая вакансия</button><button className="primary-button" type="button" onClick={() => openCandidate()}><Plus /> Кандидат</button></div>}
      />
      {error && <p className="form-error">{error}</p>}
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

  return (
    <>
      <PageHeader title="HR-дашборд" subtitle="Задачи и показатели, которые требуют внимания HR" />
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

function emptyQuiz(): QuizData {
  return {
    passing_score: 80,
    questions: [{
      prompt: "",
      options: [{ text: "", correct: true }, { text: "", correct: false }],
    }],
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

function QuizPreview({ lesson }: { lesson: Lesson }) {
  const questions = lesson.quiz_data?.questions || [];
  const passingScore = lesson.quiz_data?.passing_score ?? 80;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [finished, setFinished] = useState(false);
  const correctCount = questions.reduce(
    (total, question, index) => total + (question.options[answers[index]]?.correct ? 1 : 0),
    0,
  );
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const question = questions[currentQuestion];
  const chosenAnswer = answers[currentQuestion];
  const chosenOption = question?.options[chosenAnswer];

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

  if (!questions.length) {
    return <div className="native-preview-placeholder"><CheckCircle2 /><p>Вопросы теста пока не добавлены.</p></div>;
  }

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
      <div className="quiz-preview__progress">
        <div><span>Вопрос {currentQuestion + 1} из {questions.length}</span><strong>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</strong></div>
        <span><i style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} /></span>
      </div>
      <p className="quiz-preview__intro">Отвечайте последовательно. Для прохождения нужно набрать не менее {passingScore}%.</p>
      <fieldset className="quiz-question" key={`${question.prompt}-${currentQuestion}`}>
        <legend>{currentQuestion + 1}. {question.prompt}</legend>
        <div className="quiz-options">
          {question.options.map((option, optionIndex) => {
            const chosen = chosenAnswer === optionIndex;
            const resultClass = questionSubmitted && option.correct ? " quiz-option--correct"
              : questionSubmitted && chosen ? " quiz-option--incorrect" : "";
            return (
              <label className={`quiz-option${chosen ? " quiz-option--chosen" : ""}${resultClass}`} key={`${option.text}-${optionIndex}`}>
                <input
                  type="radio"
                  name={`preview-question-${currentQuestion}`}
                  checked={chosen}
                  disabled={questionSubmitted}
                  onChange={() => setAnswers((current) => ({ ...current, [currentQuestion]: optionIndex }))}
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {!questionSubmitted ? (
        <button
          className="primary-button quiz-preview__submit"
          type="button"
          disabled={chosenAnswer === undefined}
          onClick={() => setQuestionSubmitted(true)}
        >
          Ответить
        </button>
      ) : (
        <div className={chosenOption?.correct ? "quiz-feedback quiz-feedback--correct" : "quiz-feedback quiz-feedback--incorrect"} role="status">
          <CheckCircle2 />
          <div>
            <strong>{chosenOption?.correct ? "Верно" : "Ответ неверный"}</strong>
            <span>{chosenOption?.correct ? "Ответ принят — можно продолжать." : `Правильный ответ: ${question.options.find((option) => option.correct)?.text || "не указан"}`}</span>
          </div>
          <button className="primary-button" type="button" onClick={continueQuiz}>
            {currentQuestion >= questions.length - 1 ? "Показать результат" : "Следующий вопрос"}<ChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

function QuizEditor({ value, onChange }: { value: QuizData; onChange: (value: QuizData) => void }) {
  const quiz = value?.questions?.length ? value : emptyQuiz();
  const updateQuestion = (questionIndex: number, update: Partial<QuizQuestion>) => {
    onChange({
      ...quiz,
      questions: quiz.questions.map((question, index) => index === questionIndex ? { ...question, ...update } : question),
    });
  };

  return (
    <div className="quiz-editor">
      <div className="quiz-editor__heading">
        <div><h2>Вопросы теста</h2><p>Один вариант ответа на каждый вопрос</p></div>
        <label>Проходной балл
          <span className="quiz-editor__score"><input type="number" min="0" max="100" value={quiz.passing_score} onChange={(event) => onChange({ ...quiz, passing_score: Number(event.target.value) })} /><b>%</b></span>
        </label>
      </div>
      {quiz.questions.map((question, questionIndex) => (
        <fieldset className="quiz-editor__question" key={questionIndex}>
          <div className="quiz-editor__question-top">
            <span>Вопрос {questionIndex + 1}</span>
            {quiz.questions.length > 1 && (
              <button className="mini-button mini-button--danger" type="button" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, index) => index !== questionIndex) })} aria-label={`Удалить вопрос ${questionIndex + 1}`}><Trash2 /></button>
            )}
          </div>
          <input value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder="Введите вопрос" aria-label={`Текст вопроса ${questionIndex + 1}`} required />
          <div className="quiz-editor__options">
            {question.options.map((option, optionIndex) => (
              <div className="quiz-editor__option" key={optionIndex}>
                <input
                  className="quiz-editor__correct"
                  type="radio"
                  name={`correct-${questionIndex}`}
                  checked={option.correct}
                  onChange={() => updateQuestion(questionIndex, {
                    options: question.options.map((item, index) => ({ ...item, correct: index === optionIndex })),
                  })}
                  aria-label={`Правильный ответ ${optionIndex + 1}`}
                />
                <input
                  value={option.text}
                  onChange={(event) => updateQuestion(questionIndex, {
                    options: question.options.map((item, index) => index === optionIndex ? { ...item, text: event.target.value } : item),
                  })}
                  placeholder={`Вариант ${optionIndex + 1}`}
                  aria-label={`Вариант ответа ${optionIndex + 1}`}
                  required
                />
                {question.options.length > 2 && (
                  <button className="mini-button mini-button--danger" type="button" onClick={() => updateQuestion(questionIndex, { options: question.options.filter((_, index) => index !== optionIndex) })} aria-label={`Удалить вариант ${optionIndex + 1}`}><X /></button>
                )}
              </div>
            ))}
          </div>
          <button className="secondary-button quiz-editor__add-option" type="button" onClick={() => updateQuestion(questionIndex, { options: [...question.options, { text: "", correct: false }] })}><Plus /> Добавить вариант</button>
        </fieldset>
      ))}
      <button className="secondary-button quiz-editor__add-question" type="button" onClick={() => onChange({ ...quiz, questions: [...quiz.questions, emptyQuiz().questions[0]] })}><Plus /> Добавить вопрос</button>
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
                  <QuizEditor value={activeLesson.quiz_data} onChange={(quiz_data) => updateLesson(activeLessonIndex, { quiz_data })} />
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
                    <div className="field-wide"><QuizEditor value={lesson.quiz_data} onChange={(quiz_data) => updateLesson(index, { quiz_data })} /></div>
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
    trajectory: "Траектория обучения", ranking: "Рейтинг", analytics: "Аналитика дэйликов",
    absences: "Отпуска и отсутствия",
    courses: "Курсы", settings: "Настройки", employees: "Сотрудники",
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
        onNavigate={navigate}
        onOpen={() => setSidebarOpen((value) => !value)}
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
          <HomeView user={user} />
        ) : active === "absences" ? (
          <AbsencesView token={token} user={user} />
        ) : active === "users" ? (
          <UsersView token={token} />
        ) : active === "employees" ? (
          <EmployeesView token={token} user={user} />
        ) : active === "organization" ? (
          <OrganizationView token={token} />
        ) : active === "recruitment" ? (
          <RecruitmentView token={token} />
        ) : active === "hrAnalytics" ? (
          <HrAnalyticsView token={token} />
        ) : active === "courses" ? (
          <CoursesView token={token} user={user} />
        ) : (
          <Placeholder active={active} />
        )}
      </main>
    </div>
  );
}

export default App;
