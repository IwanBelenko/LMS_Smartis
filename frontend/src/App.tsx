import {
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleUserRound,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Route,
  Settings,
  Trophy,
  Users,
  Workflow,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

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
      <nav className="nav-group" aria-label="Администрирование">
        <p>Администрирование</p>
        {group(adminNav)}
      </nav>
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
        {active === "home" ? <HomeView user={user} /> : active === "users" ? <UsersView token={token} /> : <Placeholder active={active} />}
      </main>
    </div>
  );
}

export default App;
