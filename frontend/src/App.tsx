import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
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
  | "home" | "trajectory" | "ranking" | "analytics"
  | "employees" | "recruitment" | "hrAnalytics"
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
  skills: string;
  source: string;
  stage: number;
  stage_name: string;
  department: number | null;
  department_name: string | null;
  next_action_at: string | null;
  comment: string;
};
type HcmSummary = {
  employees_total: number;
  on_probation: number;
  average_development_progress: number;
  candidates_total: number;
  open_positions: number;
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
];
const hcmNav = [
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

type EmployeeProfileTab = "overview" | "learning" | "history" | "goals" | "documents";

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
      const [nextGoals, nextHistory, nextLearning, nextDocuments, nextCourses] = await Promise.all([
        apiRequest<EmployeeGoal[]>(`/employees/${employee.id}/goals/`, token),
        apiRequest<EmploymentEvent[]>(`/employees/${employee.id}/history/`, token),
        apiRequest<EmployeeLearning[]>(`/employees/${employee.id}/learning/`, token),
        apiRequest<EmployeeDocument[]>(`/employees/${employee.id}/documents/`, token),
        apiRequest<Course[]>("/courses/", token),
      ]);
      setGoals(nextGoals);
      setHistory(nextHistory);
      setLearning(nextLearning);
      setDocuments(nextDocuments);
      setCourses(nextCourses);
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

  const availableCourses = courses.filter((course) => !learning.some((item) => item.course === course.id));
  const tabs: { id: EmployeeProfileTab; label: string }[] = [
    { id: "overview", label: "Обзор" }, { id: "learning", label: "Обучение" },
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
          <header><div><h2>{tabs.find((item) => item.id === tab)?.label}</h2><p>{tab === "learning" ? "Назначенные курсы и результаты" : tab === "history" ? "Хронология кадровых изменений" : tab === "goals" ? "Индивидуальный план развития" : "Реестр документов сотрудника"}</p></div>{canManage && addLabels[tab] && <button className="primary-button" type="button" onClick={() => setShowAdd((value) => !value)}><Plus /> {addLabels[tab]}</button>}</header>

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
  skills: "", source: "", stage: "", department: "", comment: "",
};

function RecruitmentView({ token }: { token: string }) {
  const [stages, setStages] = useState<CandidateStage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyCandidateForm);

  async function load() {
    try {
      const [nextStages, nextCandidates, nextDepartments] = await Promise.all([
        apiRequest<CandidateStage[]>("/candidate-stages/", token),
        apiRequest<Candidate[]>("/candidates/", token),
        apiRequest<Department[]>("/departments/", token),
      ]);
      setStages(nextStages);
      setCandidates(nextCandidates);
      setDepartments(nextDepartments);
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
      comment: candidate.comment || "",
    } : { ...emptyCandidateForm, stage: stages[0] ? String(stages[0].id) : "" });
    setShowForm(true);
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

  return (
    <>
      <PageHeader
        title="Подбор"
        subtitle="Кандидаты и этапы найма в одном рабочем пространстве"
        action={<button className="primary-button" type="button" onClick={() => openCandidate()}><Plus /> Добавить кандидата</button>}
      />
      {error && <p className="form-error">{error}</p>}
      <section className="recruitment-board">
        {stages.map((stage) => (
          <div className="recruitment-column" key={stage.id}>
            <header><span>{stage.name}</span><small>{candidates.filter((item) => item.stage === stage.id).length}</small></header>
            <div>
              {candidates.filter((item) => item.stage === stage.id).map((candidate) => (
                <article className="candidate-card" key={candidate.id}>
                  <header><strong>{candidate.full_name}</strong><button className="candidate-card__edit" type="button" onClick={() => openCandidate(candidate)} aria-label={`Редактировать ${candidate.full_name}`}><Pencil /></button></header>
                  <p>{candidate.desired_position}</p>
                  <label>Этап<select value={candidate.stage} onChange={(event) => void changeCandidateStage(candidate, event.target.value)}>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <footer><span>{candidate.department_name || "Без отдела"}</span><small>{candidate.source || "Источник не указан"}</small></footer>
                </article>
              ))}
              {!candidates.some((item) => item.stage === stage.id) && <p className="recruitment-empty">Нет кандидатов</p>}
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
    </>
  );
}

function HrAnalyticsView({ token }: { token: string }) {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [summary, setSummary] = useState<HcmSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<EmployeeProfile[]>("/employees/", token),
      apiRequest<HcmSummary>("/hcm/summary/", token),
    ]).then(([people, totals]) => {
      setEmployees(people);
      setSummary(totals);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить аналитику"));
  }, [token]);

  const departments = Array.from(new Set(employees.map((item) => item.department_name || "Без отдела")))
    .map((name) => ({ name, count: employees.filter((item) => (item.department_name || "Без отдела") === name).length }));
  const maxDepartment = Math.max(...departments.map((item) => item.count), 1);

  return (
    <>
      <PageHeader title="HR-аналитика" subtitle="Состояние команды, найма и развития сотрудников" />
      <HcmMetricCards summary={summary} />
      {error && <p className="form-error">{error}</p>}
      <section className="hcm-analytics-grid">
        <article className="panel hcm-chart">
          <div className="section-heading"><div><h2>Команда по отделам</h2><p>Распределение активных сотрудников</p></div></div>
          <div className="hcm-bars">
            {departments.map((department) => (
              <div key={department.name}>
                <span>{department.name}</span>
                <div><i style={{ width: `${department.count / maxDepartment * 100}%` }} /></div>
                <strong>{department.count}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel hcm-chart">
          <div className="section-heading"><div><h2>Развитие команды</h2><p>Среднее выполнение индивидуальных планов</p></div></div>
          <div className="hcm-ring" style={{ "--progress": `${summary?.average_development_progress ?? 0}%` } as React.CSSProperties}>
            <strong>{summary?.average_development_progress ?? 0}%</strong>
            <span>выполнено</span>
          </div>
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

function Placeholder({ active }: { active: ViewId }) {
  const labels: Record<string, string> = {
    trajectory: "Траектория обучения", ranking: "Рейтинг", analytics: "Аналитика дэйликов",
    courses: "Курсы", settings: "Настройки", employees: "Сотрудники",
    recruitment: "Подбор", hrAnalytics: "HR-аналитика",
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
        ) : active === "users" ? (
          <UsersView token={token} />
        ) : active === "employees" ? (
          <EmployeesView token={token} user={user} />
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
