import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Download,
  Eye,
  FileArchive,
  FileText,
  GripVertical,
  Home,
  Link2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PlayCircle,
  Plus,
  Route,
  Save,
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
      <span className="visually-hidden">Smartis LMS</span>
    </div>
  );
}

type ViewId = "home" | "trajectory" | "ranking" | "analytics" | "users" | "courses" | "settings";
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
type Lesson = {
  id?: number;
  client_key: string;
  title: string;
  lesson_type: "text" | "video" | "link" | "file" | "scorm";
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
  status: "draft" | "published" | "archived";
  status_label: string;
  estimated_minutes: number;
  version: number;
  lessons_count: number;
  lessons: Lesson[];
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
        <div>
          <h1>Вход в систему</h1>
          <p>Используйте корпоративную почту</p>
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
const adminNav = [
  { id: "users" as const, label: "Пользователи", icon: Users },
  { id: "courses" as const, label: "Курсы", icon: BookOpen },
  { id: "settings" as const, label: "Настройки", icon: Settings },
];

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
  const visibleAdminNav = user.role === "admin"
    ? adminNav
    : user.role === "author"
      ? adminNav.filter((item) => item.id === "courses")
      : [];
  const group = (items: typeof nav | typeof adminNav) =>
    items.map(({ id, label, icon: Icon }) => (
      <button
        type="button"
        key={id}
        className={"nav-item " + (active === id ? "nav-item--active" : "")}
        onClick={() => onNavigate(id)}
      >
        <Icon aria-hidden="true" />
        <span className="nav-item__label">{label}</span>
      </button>
    ));
  return (
    <aside className="sidebar" aria-hidden={!open} inert={!open}>
      <Brand />
      <nav className="nav-group" aria-label="Обучение">
        <p>Обучение</p>
        {group(nav)}
      </nav>
      {visibleAdminNav.length > 0 && (
        <nav className="nav-group" aria-label="Администрирование">
          <p>Администрирование</p>
          {group(visibleAdminNav)}
        </nav>
      )}
      <div className="sidebar__footer">
        <div className="user-chip">
          <CircleUserRound aria-hidden="true" />
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
    <svg className="spider" style={{ left: "calc(" + progress + "% - 15px)" }} viewBox="0 0 30 22">
      <path d="M10 6 5 1M10 9 2 7M10 14 2 17M10 17 5 21M20 6l5-5M20 9l8-2M20 14l8 3M20 17l5 4" />
      <ellipse cx="15" cy="11" rx="7" ry="6.5" />
      <circle cx="13" cy="9.5" r="1" /><circle cx="17" cy="9.5" r="1" />
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
        subtitle="Сотрудники, роли, отделы и приглашения"
        action={
          <button className="primary-button" type="button" onClick={() => setShowForm(true)}>
            <Plus /> Добавить сотрудника
          </button>
        }
      />
      {showForm && (
        <section className="panel form-panel">
          <div className="section-heading">
            <div><h2>Новый сотрудник</h2><p>На почту будет подготовлено приглашение</p></div>
            <button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Закрыть"><X /></button>
          </div>
          <form className="user-form" onSubmit={createUser}>
            <label>Имя<input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></label>
            <label>Фамилия<input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Роль<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Сотрудник</option><option value="author">Автор</option>
              <option value="leader">Руководитель</option><option value="admin">Администратор</option>
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

const lessonTypeLabels: Record<Lesson["lesson_type"], string> = {
  text: "Текст",
  video: "Видео",
  link: "Ссылка",
  file: "Файл",
  scorm: "SCORM 1.2",
};

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

function CoursePreviewModal({
  course,
  step,
  onStep,
  onClose,
  scormLaunchUrl,
  scormRuntime,
  scormFrameRef,
}: {
  course: Course;
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
  scormLaunchUrl: string;
  scormRuntime: { status: string; score: string };
  scormFrameRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const lesson = step >= 0 ? course.lessons[step] : undefined;
  const isLastStep = step >= course.lessons.length - 1;
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
            {!lesson ? (
              <article
                className={course.cover_style === "custom" && course.cover_url ? "native-preview-page native-preview-cover native-preview-cover--image" : "native-preview-page native-preview-cover"}
                style={course.cover_style === "custom" && course.cover_url ? { backgroundImage: `linear-gradient(90deg, rgba(8,12,7,.82), rgba(8,12,7,.35)), url(${course.cover_url})` } : undefined}
              >
                <span className="longread-eyebrow">SMARTIS · ОБУЧЕНИЕ</span>
                <h1>{course.title}</h1>
                <p>{course.description || "Описание курса пока не добавлено"}</p>
                <div className="longread-cover-meta"><span><BookOpen />{chapterCountLabel(course.lessons.length)}</span><span><Clock3 />{course.estimated_minutes} минут</span></div>
              </article>
            ) : (
              <article className="native-preview-page native-preview-lesson">
                <div className="longread-chapter-kicker"><span>Глава {step + 1}</span><span>{lessonTypeLabels[lesson.lesson_type]}</span></div>
                <h1>{lesson.title}</h1>
                {lesson.lesson_type === "text" ? (
                  <div className="native-preview-content" dangerouslySetInnerHTML={{ __html: lesson.content || "<p>Содержание пока не добавлено.</p>" }} />
                ) : lesson.lesson_type === "video" ? (
                  lesson.video_url ? <video className="native-preview-video" src={lesson.video_url} controls /> : <div className="native-preview-placeholder"><Video /><p>Видео появится после сохранения и загрузки файла.</p></div>
                ) : lesson.lesson_type === "scorm" ? (
                  <div className="native-preview-placeholder"><FileArchive /><p>SCORM-пакет открывается в отдельном режиме просмотра.</p></div>
                ) : (
                  <div className="native-preview-placeholder"><Link2 /><p>Материал откроется в новой вкладке.</p><a className="primary-button" href={lesson.media_url} target="_blank" rel="noreferrer">Открыть материал</a></div>
                )}
              </article>
            )}
            <footer className="native-preview-navigation">
              <button className="secondary-button" type="button" disabled={step < 0} onClick={() => onStep(step - 1)}><ChevronLeft /> Назад</button>
              <span>{step < 0 ? "Обложка" : `${step + 1} / ${course.lessons.length}`}</span>
              <button className="primary-button" type="button" onClick={() => isLastStep ? onClose() : onStep(step + 1)}>
                {course.lessons.length === 0 || isLastStep ? "Завершить" : step < 0 ? "Начать" : "Далее"}<ChevronRight />
              </button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}

function CoursesView({ token }: { token: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingId, setEditingId] = useState<number | null | "new">(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    estimated_minutes: 30,
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
  const [exportingScormId, setExportingScormId] = useState<number | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [previewStep, setPreviewStep] = useState(-1);
  const [scormLaunchUrl, setScormLaunchUrl] = useState("");
  const [scormRuntime, setScormRuntime] = useState({ status: "Не начат", score: "—" });
  const scormFrameRef = useRef<HTMLIFrameElement>(null);

  async function load() {
    setLoading(true);
    try {
      setCourses(await apiRequest<Course[]>("/courses/", token));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить курсы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

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
    setForm({ title: "", description: "", estimated_minutes: 30, lessons: [newLesson(0)] });
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
      lessons: course.lessons.map((lesson, position) => ({
        ...lesson,
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
      setPreviewStep(-1);
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
    setPreviewStep(-1);
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
    if (type === "scorm") return <FileArchive />;
    return <Type />;
  }

  const previewModal = previewCourse ? (
    <CoursePreviewModal
      course={previewCourse}
      step={previewStep}
      onStep={setPreviewStep}
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
                    />
                  </Suspense>
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
                      <label className={replacingScormId === editingCourse.id ? "longread-upload-zone scorm-import--busy" : "longread-upload-zone"}>
                        <span className="longread-media-icon"><Upload /></span>
                        <strong>{replacingScormId === editingCourse.id ? "Заменяем пакет…" : "Загрузить новую версию"}</strong>
                        <span>ZIP · курс, назначения и карточка сохранятся</span>
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
                    )}
                    <div className="longread-info-card scorm-edit-capabilities">
                      <span>Можно изменить</span><strong>Название, описание, обложку, длительность</strong>
                      <span>Содержимое</span><strong>Через замену ZIP новой версией</strong>
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

          <aside className="longread-settings">
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
                <div className="longread-info-card">
                  <span>Статус</span><strong>{editingCourse?.status_label || "Черновик"}</strong>
                  <span>Версия</span><strong>{editingCourse?.version || 1}</strong>
                </div>
                <p className="longread-help">Обложка, название и описание будут первыми элементами, которые увидит сотрудник.</p>
              </div>
            ) : activeLesson ? (
              <div className="longread-settings__body">
                <label>Формат главы<select disabled={activeLesson.lesson_type === "scorm"} value={activeLesson.lesson_type} onChange={(event) => updateLesson(activeLessonIndex, { lesson_type: event.target.value as Lesson["lesson_type"] })}>
                  {Object.entries(lessonTypeLabels).filter(([value]) => value !== "scorm" || activeLesson.lesson_type === "scorm").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label>Время на изучение, минут<input type="number" min="1" value={activeLesson.duration_minutes} onChange={(event) => updateLesson(activeLessonIndex, { duration_minutes: Number(event.target.value) })} required /></label>
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
        subtitle="Создание, редактирование и публикация учебных материалов"
        action={
          <div className="page-actions">
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
      <section className="course-grid" aria-busy={loading}>
        {courses.map((course) => (
          <article className="panel course-card" key={course.id}>
            <div className="course-card__top">
              <div className="course-card__badges">
                <span className={`status status--${course.status}`}>{course.status_label}</span>
                {course.source_format === "scorm_12" && <span className="status status--scorm">SCORM 1.2</span>}
              </div>
              <button className="icon-button" type="button" onClick={() => editCourse(course)} aria-label={`Редактировать ${course.title}`}><Pencil /></button>
            </div>
            <div><h2>{course.title}</h2><p>{course.description || "Описание пока не добавлено"}</p></div>
            <div className="course-meta"><span><FileText />{chapterCountLabel(course.lessons_count)}</span><span><Clock3 />{course.estimated_minutes} мин</span></div>
            <div className="course-card__footer"><span>{course.author_name}</span><span>Версия {course.version}</span></div>
            <div className="course-card__actions">
              <button className="primary-button course-card__open-scorm" type="button" onClick={() => void openCoursePreview(course)}>
                <Eye /> Предпросмотр
              </button>
              <button className="secondary-button" type="button" disabled={exportingScormId === course.id} onClick={() => void exportScorm(course)}>
                <Download /> {exportingScormId === course.id ? "Экспорт…" : "SCORM 1.2"}
              </button>
              <button className={course.status === "published" ? "secondary-button" : "primary-button"} type="button" onClick={() => void changePublication(course)}>
                {course.status === "published" ? <><CheckCircle2 /> Опубликован</> : <><PlayCircle /> Опубликовать</>}
              </button>
            </div>
          </article>
        ))}
        {!loading && !courses.length && (
          <section className="panel empty course-empty"><BookOpen /><h2>Создайте первый курс</h2><p>Добавьте уроки и опубликуйте курс для сотрудников.</p><button className="primary-button" type="button" onClick={createCourse}><Plus /> Создать курс</button></section>
        )}
      </section>
      {previewModal}
    </>
  );
}

function Placeholder({ active }: { active: ViewId }) {
  const labels: Record<string, string> = {
    trajectory: "Траектория обучения", ranking: "Рейтинг", analytics: "Аналитика дэйликов",
    courses: "Курсы", settings: "Настройки",
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
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem("smartis-sidebar") !== "closed",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("smartis-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("smartis-sidebar", sidebarOpen ? "open" : "closed");
  }, [sidebarOpen]);

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
    setActive(view);
    if (window.matchMedia("(max-width: 760px)").matches) setSidebarOpen(false);
  }

  if (!token || !user) return <LoginPage onLogin={login} />;

  return (
    <div className={"app-shell " + (sidebarOpen ? "app-shell--sidebar-open" : "app-shell--sidebar-closed")}>
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
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Закрыть боковое меню"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <main className="main-content">
        <div className="app-toolbar">
          <button
            className="icon-button menu-button"
            type="button"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Скрыть боковое меню" : "Открыть боковое меню"}
            onClick={() => setSidebarOpen((value) => !value)}
          >
            {sidebarOpen ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          </button>
        </div>
        {active === "home" ? (
          <HomeView user={user} />
        ) : active === "users" ? (
          <UsersView token={token} />
        ) : active === "courses" ? (
          <CoursesView token={token} />
        ) : (
          <Placeholder active={active} />
        )}
      </main>
    </div>
  );
}

export default App;
