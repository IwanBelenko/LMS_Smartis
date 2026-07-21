import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PlayCircle,
  Plus,
  Route,
  Save,
  Settings,
  Trash2,
  Trophy,
  Upload,
  Users,
  Workflow,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { lazy, Suspense, useEffect, useState } from "react";

const RichTextEditor = lazy(() => import("./RichTextEditor"));

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
  lesson_type: "text" | "video" | "link" | "file";
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
        <div className="brand brand--login">
          <span className="brand__mark">S</span>
          <span>Smartis LMS</span>
        </div>
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
      <div className="brand"><span className="brand__mark">S</span><span className="brand__name">Smartis LMS</span></div>
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

  function createCourse() {
    setEditingId("new");
    setForm({ title: "", description: "", estimated_minutes: 30, lessons: [newLesson(0)] });
    setError("");
    setNotice("");
    setVideoFiles({});
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
    if (!form.lessons.length) {
      setError("Добавьте хотя бы один урок");
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
      const saved = await apiRequest<Course>(
        isNew ? "/courses/" : `/courses/${editingId}/`,
        token,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify({
            ...form,
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
      setNotice(
        editingCourse?.status === "published" && saved.status === "draft"
          ? "Новая версия сохранена как черновик — проверьте её и опубликуйте"
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

  const editingCourse = typeof editingId === "number"
    ? courses.find((course) => course.id === editingId)
    : undefined;

  return (
    <>
      <PageHeader
        title="Курсы"
        subtitle="Создание, редактирование и публикация учебных материалов"
        action={
          <button className="primary-button" type="button" onClick={createCourse}>
            <Plus /> Создать курс
          </button>
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
              <span className={`status status--${course.status}`}>{course.status_label}</span>
              <button className="icon-button" type="button" onClick={() => editCourse(course)} aria-label={`Редактировать ${course.title}`}><Pencil /></button>
            </div>
            <div><h2>{course.title}</h2><p>{course.description || "Описание пока не добавлено"}</p></div>
            <div className="course-meta"><span><FileText />{course.lessons_count} уроков</span><span><Clock3 />{course.estimated_minutes} мин</span></div>
            <div className="course-card__footer"><span>{course.author_name}</span><span>Версия {course.version}</span></div>
            <button className={course.status === "published" ? "secondary-button" : "primary-button"} type="button" onClick={() => void changePublication(course)}>
              {course.status === "published" ? <><CheckCircle2 /> Опубликован</> : <><PlayCircle /> Опубликовать</>}
            </button>
          </article>
        ))}
        {!loading && !courses.length && (
          <section className="panel empty course-empty"><BookOpen /><h2>Создайте первый курс</h2><p>Добавьте уроки и опубликуйте курс для сотрудников.</p><button className="primary-button" type="button" onClick={createCourse}><Plus /> Создать курс</button></section>
        )}
      </section>
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
