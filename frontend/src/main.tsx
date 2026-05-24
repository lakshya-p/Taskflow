import React, { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, authUrl, tokenStore } from "./api/client";
import "./styles.css";

type Theme = "light" | "dark";
type Page = "focus" | "workspaces" | "projects" | "tasks" | "activity";
type User = { id: string; name: string; email: string };
type Member = { id: string; role: string; user: User };
type Workspace = { id: string; name: string; description?: string; members?: Member[]; _count?: { projects: number; members: number } };
type Project = { id: string; name: string; status: string; workspaceId: string; _count?: { tasks: number } };
type Task = { id: string; title: string; status: string; priority: string; assignedTo?: string | null; assignee?: User | null };
type Activity = { id: string; action: string; entityType: string; createdAt: string; user?: User };

const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const projectStatuses = ["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"];
const workspaceRoles = ["ADMIN", "MEMBER", "VIEWER"];

const navItems: { id: Page; label: string }[] = [
  { id: "focus", label: "Today" },
  { id: "workspaces", label: "Workspaces" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "activity", label: "Activity" }
];

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("taskflow_theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char: string) => char.toUpperCase());
}

function SelectOption({ value, children }: { value: string; children?: ReactNode }) {
  return <option value={value}>{children || formatLabel(value)}</option>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusMeta(status: string) {
  const normalized = status.toLowerCase().replace(/_/g, "-");
  const labels: Record<string, string> = {
    TODO: "Queued",
    IN_PROGRESS: "In motion",
    IN_REVIEW: "Reviewing",
    DONE: "Closed",
    BLOCKED: "Blocked",
    PLANNED: "Planned",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    ARCHIVED: "Archived"
  };
  return { key: normalized, label: labels[status] || formatLabel(status) };
}

function priorityMeta(priority: string) {
  const map: Record<string, { key: string; label: string }> = {
    LOW: { key: "low", label: "Low" },
    MEDIUM: { key: "medium", label: "Medium" },
    HIGH: { key: "high", label: "High" },
    URGENT: { key: "urgent", label: "Urgent" }
  };
  return map[priority] || { key: "medium", label: formatLabel(priority) };
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outlined" | "quiet" }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="control" {...props} />;
}

function SelectControl(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const {
    children,
    value,
    defaultValue,
    onChange,
    name,
    disabled,
    className = "",
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const options = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => {
      const option = child as React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>;
      const optionValue = option.props.value === undefined ? String(option.props.children ?? "") : String(option.props.value);
      const label = React.Children.toArray(option.props.children).join("") || formatLabel(optionValue);
      return { value: optionValue, label, disabled: Boolean(option.props.disabled) };
    });
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const listId = useMemo(() => `select-${Math.random().toString(36).slice(2)}`, []);
  const selectedValue = String(isControlled ? value : internalValue);
  const selectedOption = options.find((option) => option.value === selectedValue) || options[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectValue(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.({ target: { value: nextValue, name }, currentTarget: { value: nextValue, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div className={`select-shell ${className}`} ref={shellRef}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        type="button"
        className="control select-control"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{selectedOption?.label || "Select"}</span>
      </button>
      {open && (
        <div className="select-menu" id={listId} role="listbox">
          {options.map((option) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              className={option.value === selectedValue ? "select-option selected" : "select-option"}
              role="option"
              aria-selected={option.value === selectedValue}
              disabled={option.disabled}
              onClick={() => selectValue(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TextareaControl(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="control textarea-control" {...props} />;
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button className="theme-switch" onClick={onToggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      <span />
      <strong>{theme === "dark" ? "Dark" : "Light"}</strong>
    </button>
  );
}

function Avatar({ user, muted = false }: { user: User; muted?: boolean }) {
  return <span className={`avatar ${muted ? "muted" : ""}`}>{initials(user.name)}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span className={`status-badge status-${meta.key}`}>
      <span />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = priorityMeta(priority);
  return (
    <span className={`priority-badge priority-${meta.key}`}>
      <span />
      {meta.label}
    </span>
  );
}

function Surface({ eyebrow, title, action, children, className = "" }: { eyebrow?: string; title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface ${className}`}>
      {(eyebrow || title || action) && (
        <div className="surface-head">
          <div>
            {eyebrow && <p className="label">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function EmptyState({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <div className="empty-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" aria-live="polite">
      <span />
      <span />
      <span />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-state" role="alert">
      <strong>Request interrupted</strong>
      <span>{message}</span>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return <main className="app-shell">{children}</main>;
}

function Sidebar({
  user,
  workspace,
  workspaceCount,
  open,
  onOpen,
  onClose,
  activePage,
  onNavigate
}: {
  user: User;
  workspace?: Workspace;
  workspaceCount: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <>
      <button className="mobile-rail-toggle" onClick={onOpen} aria-label="Open navigation">Menu</button>
      <aside className={`app-rail ${open ? "open" : ""}`}>
        <div className="rail-brand">
          <span className="wordmark" aria-label="TaskFlow">TaskFlow</span>
          <div>
            <small>Project operations</small>
          </div>
        </div>

        <nav className="rail-nav" aria-label="Workspace navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? "active" : ""}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <span aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="rail-context">
          <p className="label">Current workspace</p>
          <strong>{workspace?.name || "No workspace"}</strong>
          <span>{workspaceCount} spaces available</span>
        </div>

        <div className="rail-user">
          <Avatar user={user} />
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>
      </aside>
      {open && <button className="rail-scrim" aria-label="Close navigation index" onClick={onClose} />}
    </>
  );
}

function TopBar({
  theme,
  onTheme,
  onLogout,
  workspaceName,
  title,
  search,
  onSearch
}: {
  theme: Theme;
  onTheme: () => void;
  onLogout: () => void;
  workspaceName?: string;
  title: string;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <header className="top-bar">
      <div className="top-title">
        <span>TaskFlow</span>
        <strong>{title}</strong>
      </div>
      <div className="workspace-search" role="search">
        <span>Search</span>
        <input aria-label="Search current view" placeholder={`Search ${workspaceName || "TaskFlow"}...`} value={search} onChange={(event) => onSearch(event.target.value)} />
      </div>
      <div className="top-actions">
        <ThemeToggle theme={theme} onToggle={onTheme} />
        <Button variant="quiet" onClick={onLogout}>Sign out</Button>
      </div>
    </header>
  );
}

function AuthScreen({
  mode,
  theme,
  loading,
  error,
  onMode,
  onTheme,
  onSubmit
}: {
  mode: "login" | "register";
  theme: Theme;
  loading: boolean;
  error: string;
  onMode: (mode: "login" | "register") => void;
  onTheme: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-story" aria-label="TaskFlow product overview">
        <div className="auth-brand">
          <span className="wordmark wordmark-large" aria-label="TaskFlow">TaskFlow</span>
          <p className="label">TaskFlow / Project Operations</p>
        </div>
        <div className="flow-board" aria-hidden="true">
          <div className="flow-card large">
            <span>Workspace</span>
            <strong>Engineering</strong>
          </div>
          <div className="flow-card">
            <span>Project</span>
            <strong>API Launch</strong>
          </div>
          <div className="flow-card active">
            <span>Task</span>
            <strong>Review RBAC</strong>
          </div>
          <div className="flow-card muted">
            <span>Activity</span>
            <strong>Status changed</strong>
          </div>
        </div>
        <div className="auth-statement">
          <h1>Plan delivery, assign ownership, and keep the trail visible.</h1>
          <p>A focused workspace for teams, roles, tasks, status changes, and activity history.</p>
        </div>
      </section>

      <section className="auth-console" aria-labelledby="auth-title">
        <div className="auth-console-head">
          <div>
            <p className="label">Secure access</p>
            <h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your profile"}</h2>
          </div>
          <ThemeToggle theme={theme} onToggle={onTheme} />
        </div>

        <div className="mode-switch" role="tablist" aria-label="Authentication mode">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => onMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => onMode("register")}>Register</button>
        </div>

        <form className="console-form" onSubmit={onSubmit}>
          {mode === "register" && (
            <FormField label="Name">
              <TextInput name="name" placeholder="Maya Chen" autoComplete="name" required />
            </FormField>
          )}
          <FormField label="Email" hint="Demo operator: owner@taskflow.dev">
            <TextInput name="email" type="email" placeholder="you@company.com" defaultValue="owner@taskflow.dev" autoComplete="email" required />
          </FormField>
          <FormField label="Password" hint="Demo password: DemoPass123!">
            <TextInput name="password" type="password" placeholder="Enter password" defaultValue="DemoPass123!" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          </FormField>
          {error && <ErrorState message={error} />}
          <Button className="full-width" disabled={loading}>{loading ? "Checking credentials..." : mode === "login" ? "Open TaskFlow" : "Create profile"}</Button>
        </form>

        <div className="oauth-divider">
          <span />
          <small>or continue with</small>
          <span />
        </div>
        <div className="oauth-actions">
          <Button type="button" variant="outlined" onClick={() => { window.location.href = authUrl("/api/auth/oauth/google"); }}>
            Google
          </Button>
          <Button type="button" variant="outlined" onClick={() => { window.location.href = authUrl("/api/auth/oauth/github"); }}>
            GitHub
          </Button>
        </div>
      </section>
    </main>
  );
}

function FocusPanel({ workspace, project, activeTasks, doneTasks, activityCount }: { workspace?: Workspace; project?: Project; activeTasks: number; doneTasks: number; activityCount: number }) {
  const total = activeTasks + doneTasks;
  const donePercent = total ? Math.round((doneTasks / total) * 100) : 0;
  return (
    <section id="focus" className="focus-panel">
      <div className="focus-copy">
        <p className="label">Today&apos;s focus</p>
        <h1>{workspace?.name || "Choose a workspace"}</h1>
        <p>{project ? `${project.name} is ready for review, assignment, and status updates.` : "Select or create a project to start moving tasks."}</p>
      </div>
      <div className="focus-metrics" aria-label="Workspace summary">
        <Metric label="Open tasks" value={activeTasks} />
        <Metric label="Closed" value={doneTasks} />
        <Metric label="Log entries" value={activityCount} />
      </div>
      <div className="progress-signal">
        <span style={{ width: `${donePercent}%` }} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function WorkspaceCard({ workspace, selected, onSelect }: { workspace: Workspace; selected: boolean; onSelect: () => void }) {
  const members = workspace._count?.members ?? workspace.members?.length ?? 0;
  return (
    <button className={`workspace-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className="space-index">{workspace.name.slice(0, 2).toUpperCase()}</span>
      <span className="space-copy">
        <strong>{workspace.name}</strong>
        <small>{workspace.description || "Workspace for coordinated project work."}</small>
      </span>
      <span className="space-meta">{members} members</span>
    </button>
  );
}

function ProjectStrip({
  projects,
  selectedProject,
  onSelect,
  onStatus,
  onDelete
}: {
  projects: Project[];
  selectedProject: string;
  onSelect: (id: string) => void;
  onStatus: (projectId: string, status: string) => void;
  onDelete: (projectId: string) => void;
}) {
  if (projects.length === 0) {
    return <EmptyState compact title="Start your first project" message="Create a project to establish a work stream." />;
  }
  return (
    <div className="project-strip">
      {projects.map((project) => (
        <article key={project.id} className={`project-pill ${project.id === selectedProject ? "selected" : ""}`}>
          <button type="button" className="row-title-button" onClick={() => onSelect(project.id)}>
            {project.name}
          </button>
          <StatusBadge status={project.status} />
          <SelectControl value={project.status} aria-label={`Update status for ${project.name}`} onChange={(event) => onStatus(project.id, event.target.value)}>
            {projectStatuses.map((status) => <SelectOption key={status} value={status} />)}
          </SelectControl>
          <Button type="button" variant="quiet" onClick={() => onDelete(project.id)}>Delete</Button>
        </article>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  projectName,
  members,
  onStatus,
  onAssign,
  onRename,
  onDelete
}: {
  task: Task;
  projectName?: string;
  members: Member[];
  onStatus: (taskId: string, status: string) => void;
  onAssign: (taskId: string, assignedTo: string | null) => void;
  onRename: (taskId: string, title: string) => void;
  onDelete: (taskId: string) => void;
}) {
  return (
    <article className={`task-row status-rail-${statusMeta(task.status).key}`}>
      <div className="task-primary">
        <button type="button" className="row-title-button" onClick={() => {
          const title = window.prompt("Update task title", task.title);
          if (title?.trim()) onRename(task.id, title.trim());
        }}>{task.title}</button>
        <small>{projectName || "Selected project"}</small>
      </div>
      <PriorityBadge priority={task.priority} />
      <label className="task-assignee">
        {task.assignee ? <Avatar user={task.assignee} muted /> : <span className="avatar muted">NA</span>}
        <SelectControl value={task.assignedTo || ""} aria-label={`Assign ${task.title}`} onChange={(event) => onAssign(task.id, event.target.value || null)}>
          <option value="">Unassigned</option>
          {members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
        </SelectControl>
      </label>
      <StatusBadge status={task.status} />
      <SelectControl value={task.status} onChange={(event) => onStatus(task.id, event.target.value)} aria-label={`Update status for ${task.title}`}>
        {statuses.map((status) => <SelectOption key={status} value={status} />)}
      </SelectControl>
      <Button type="button" variant="quiet" onClick={() => onDelete(task.id)}>Delete</Button>
    </article>
  );
}

function TaskCard(props: {
  task: Task;
  projectName?: string;
  members: Member[];
  onStatus: (taskId: string, status: string) => void;
  onAssign: (taskId: string, assignedTo: string | null) => void;
  onRename: (taskId: string, title: string) => void;
  onDelete: (taskId: string) => void;
}) {
  return <TaskRow {...props} />;
}

function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="dialog-shell" role="dialog" aria-modal="true" aria-label={title} hidden>
      {children}
    </div>
  );
}

function ActivityItem({ item }: { item: Activity }) {
  return (
    <article className="activity-item">
      <time>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      <div>
        <strong>{formatLabel(item.action)}</strong>
        <span>{item.user?.name || "System"} on {formatLabel(item.entityType)}</span>
      </div>
    </article>
  );
}

function WorkspaceSettings({
  workspace,
  onUpdate,
  onDelete
}: {
  workspace?: Workspace;
  onUpdate: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  if (!workspace) return null;
  return (
    <form className="settings-form" onSubmit={onUpdate}>
      <FormField label="Workspace name">
        <TextInput name="name" defaultValue={workspace.name} required />
      </FormField>
      <FormField label="Workspace description">
        <TextareaControl name="description" defaultValue={workspace.description || ""} rows={2} />
      </FormField>
      <div className="inline-actions">
        <Button type="submit" variant="secondary">Update workspace</Button>
        <Button type="button" variant="quiet" onClick={onDelete}>Delete workspace</Button>
      </div>
    </form>
  );
}

function MembersPanel({
  members,
  onInvite,
  onRole,
  onRemove
}: {
  members: Member[];
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onRole: (memberId: string, role: string) => void;
  onRemove: (memberId: string) => void;
}) {
  return (
    <div className="members-panel">
      <form className="member-form" onSubmit={onInvite}>
        <FormField label="Add member by email">
          <TextInput name="email" type="email" placeholder="teammate@company.com" required />
        </FormField>
        <FormField label="Role">
          <SelectControl name="role" defaultValue="MEMBER">
            {workspaceRoles.map((role) => <SelectOption key={role} value={role} />)}
          </SelectControl>
        </FormField>
        <Button type="submit" variant="secondary">Add member</Button>
      </form>
      <div className="member-list">
        {members.map((member) => (
          <article className="member-row" key={member.id}>
            <Avatar user={member.user} muted />
            <div>
              <strong>{member.user.name}</strong>
              <small>{member.user.email}</small>
            </div>
            <SelectControl value={member.role} aria-label={`Change role for ${member.user.name}`} onChange={(event) => onRole(member.id, event.target.value)}>
              {["OWNER", "ADMIN", "MEMBER", "VIEWER"].map((role) => <SelectOption key={role} value={role} />)}
            </SelectControl>
            <Button type="button" variant="quiet" onClick={() => onRemove(member.id)}>Remove</Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [activePage, setActivePage] = useState<Page>("focus");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const currentWorkspace = useMemo(() => workspaces.find((workspace) => workspace.id === selectedWorkspace), [workspaces, selectedWorkspace]);
  const currentProject = useMemo(() => projects.find((project) => project.id === selectedProject), [projects, selectedProject]);
  const doneTasks = tasks.filter((task) => task.status === "DONE").length;
  const activeTasks = tasks.filter((task) => task.status !== "DONE").length;
  const assignedToMe = user ? tasks.filter((task) => task.assignedTo === user.id) : [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredWorkspaces = useMemo(() => {
    if (!normalizedSearch) return workspaces;
    return workspaces.filter((workspace) => `${workspace.name} ${workspace.description || ""}`.toLowerCase().includes(normalizedSearch));
  }, [workspaces, normalizedSearch]);
  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) return projects;
    return projects.filter((project) => `${project.name} ${project.status}`.toLowerCase().includes(normalizedSearch));
  }, [projects, normalizedSearch]);
  const filteredTasks = useMemo(() => {
    if (!normalizedSearch) return tasks;
    return tasks.filter((task) => `${task.title} ${task.status} ${task.priority} ${task.assignee?.name || ""}`.toLowerCase().includes(normalizedSearch));
  }, [tasks, normalizedSearch]);
  const filteredActivity = useMemo(() => {
    if (!normalizedSearch) return activity;
    return activity.filter((item) => `${item.action} ${item.entityType} ${item.user?.name || ""}`.toLowerCase().includes(normalizedSearch));
  }, [activity, normalizedSearch]);
  const pageTitle = navItems.find((item) => item.id === activePage)?.label || "Today";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("taskflow_theme", theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (accessToken && refreshToken) {
      tokenStore.set(accessToken, refreshToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadMe();
    }
  }, []);

  async function loadMe() {
    if (!tokenStore.accessToken) return;
    try {
      const data = await api<{ user: User }>("/api/auth/me");
      setUser(data.user);
    } catch {
      tokenStore.clear();
    }
  }

  async function loadWorkspaces() {
    const data = await api<{ items: Workspace[] }>("/api/workspaces");
    setWorkspaces(data.items);
    if ((!selectedWorkspace || !data.items.some((workspace) => workspace.id === selectedWorkspace)) && data.items[0]) {
      setSelectedWorkspace(data.items[0].id);
    }
  }

  async function loadProjects(workspaceId: string) {
    if (!workspaceId) {
      setProjects([]);
      setSelectedProject("");
      return;
    }
    const data = await api<{ items: Project[] }>(`/api/workspaces/${workspaceId}/projects`);
    setProjects(data.items);
    setSelectedProject(data.items[0]?.id || "");
  }

  async function loadTasks(projectId: string) {
    if (!projectId) {
      setTasks([]);
      return;
    }
    const data = await api<{ items: Task[] }>(`/api/projects/${projectId}/tasks?sortBy=createdAt&sortOrder=desc`);
    setTasks(data.items);
  }

  async function loadActivity(workspaceId: string) {
    if (!workspaceId) {
      setActivity([]);
      return;
    }
    const data = await api<{ items: Activity[] }>(`/api/workspaces/${workspaceId}/activity`);
    setActivity(data.items);
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    loadWorkspaces()
      .catch((err) => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    setDataLoading(true);
    Promise.all([loadProjects(selectedWorkspace), loadActivity(selectedWorkspace)])
      .catch((err) => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [selectedWorkspace]);

  useEffect(() => {
    setDataLoading(true);
    loadTasks(selectedProject)
      .catch((err) => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [selectedProject]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") })
        });
      }
      const login = await api<{ accessToken: string; refreshToken: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
      });
      tokenStore.set(login.accessToken, login.refreshToken);
      setUser(login.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api("/api/workspaces", { method: "POST", body: JSON.stringify({ name: form.get("name"), description: form.get("description") }) });
    formElement.reset();
    await loadWorkspaces();
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(`/api/workspaces/${selectedWorkspace}/projects`, { method: "POST", body: JSON.stringify({ name: form.get("name"), status: "ACTIVE" }) });
    formElement.reset();
    await loadProjects(selectedWorkspace);
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const assignedTo = form.get("assignedTo")?.toString() || null;
    await api(`/api/projects/${selectedProject}/tasks`, {
      method: "POST",
      body: JSON.stringify({ title: form.get("title"), priority: form.get("priority"), assignedTo })
    });
    formElement.reset();
    await loadTasks(selectedProject);
    await loadActivity(selectedWorkspace);
  }

  async function updateTaskStatus(taskId: string, status: string) {
    setError("");
    await api(`/api/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadTasks(selectedProject);
    await loadActivity(selectedWorkspace);
  }

  async function updateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspace) return;
    setError("");
    const form = new FormData(event.currentTarget);
    await api(`/api/workspaces/${selectedWorkspace}`, {
      method: "PATCH",
      body: JSON.stringify({ name: form.get("name"), description: form.get("description") || null })
    });
    await loadWorkspaces();
    await loadActivity(selectedWorkspace);
  }

  async function deleteWorkspace() {
    if (!selectedWorkspace || !window.confirm("Delete this workspace and all related projects/tasks?")) return;
    setError("");
    await api(`/api/workspaces/${selectedWorkspace}`, { method: "DELETE" });
    setSelectedWorkspace("");
    setSelectedProject("");
    await loadWorkspaces();
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkspace) return;
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(`/api/workspaces/${selectedWorkspace}/members/invite`, {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), role: form.get("role") })
    });
    formElement.reset();
    await loadWorkspaces();
    await loadActivity(selectedWorkspace);
  }

  async function updateMemberRole(memberId: string, role: string) {
    if (!selectedWorkspace) return;
    setError("");
    await api(`/api/workspaces/${selectedWorkspace}/members/${memberId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
    await loadWorkspaces();
    await loadActivity(selectedWorkspace);
  }

  async function removeMember(memberId: string) {
    if (!selectedWorkspace || !window.confirm("Remove this member from the workspace?")) return;
    setError("");
    await api(`/api/workspaces/${selectedWorkspace}/members/${memberId}`, { method: "DELETE" });
    await loadWorkspaces();
    await loadActivity(selectedWorkspace);
  }

  async function updateProjectStatus(projectId: string, status: string) {
    setError("");
    await api(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadProjects(selectedWorkspace);
    await loadActivity(selectedWorkspace);
  }

  async function deleteProject(projectId: string) {
    if (!window.confirm("Delete this project and its tasks?")) return;
    setError("");
    await api(`/api/projects/${projectId}`, { method: "DELETE" });
    await loadProjects(selectedWorkspace);
    await loadActivity(selectedWorkspace);
  }

  async function renameTask(taskId: string, title: string) {
    setError("");
    await api(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ title }) });
    await loadTasks(selectedProject);
    await loadActivity(selectedWorkspace);
  }

  async function assignTask(taskId: string, assignedTo: string | null) {
    setError("");
    await api(`/api/tasks/${taskId}/assign`, { method: "PATCH", body: JSON.stringify({ assignedTo }) });
    await loadTasks(selectedProject);
    await loadActivity(selectedWorkspace);
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    await api(`/api/tasks/${taskId}`, { method: "DELETE" });
    await loadTasks(selectedProject);
    await loadActivity(selectedWorkspace);
  }

  async function logout() {
    const refreshToken = tokenStore.refreshToken;
    if (refreshToken) {
      try {
        await api("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
      } catch {
        // Local sign-out should still complete if the token was already expired or revoked.
      }
    }
    tokenStore.clear();
    setUser(null);
    setWorkspaces([]);
    setProjects([]);
    setTasks([]);
    setActivity([]);
    setSelectedWorkspace("");
    setSelectedProject("");
  }

  if (!user) {
    return (
      <AuthScreen
        mode={mode}
        theme={theme}
        loading={loading}
        error={error}
        onMode={setMode}
        onTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onSubmit={submitAuth}
      />
    );
  }

  const workspaceCreateForm = (
    <form onSubmit={createWorkspace} className="compact-form">
      <FormField label="Name">
        <TextInput name="name" placeholder="Engineering" required />
      </FormField>
      <FormField label="Description">
        <TextareaControl name="description" placeholder="Optional operating context" rows={3} />
      </FormField>
      <Button>Create workspace</Button>
    </form>
  );

  const workspaceList = (
    <div id="workspaces" className="workspace-stack">
      {filteredWorkspaces.length === 0 ? (
        <EmptyState title={search ? "No workspaces match" : "Create your first workspace"} message="Organize projects, members, and task movement in one place." />
      ) : (
        filteredWorkspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} workspace={workspace} selected={workspace.id === selectedWorkspace} onSelect={() => setSelectedWorkspace(workspace.id)} />
        ))
      )}
    </div>
  );

  const projectCreateForm = (
    <form onSubmit={createProject} className="project-form">
      <FormField label="Project">
        <TextInput name="name" placeholder="API Launch" required disabled={!selectedWorkspace} />
      </FormField>
      <Button disabled={!selectedWorkspace}>Create project</Button>
    </form>
  );

  const projectList = (
    <div id="projects">
      <ProjectStrip projects={filteredProjects} selectedProject={selectedProject} onSelect={setSelectedProject} onStatus={updateProjectStatus} onDelete={deleteProject} />
    </div>
  );

  const taskCreateForm = (
    <form onSubmit={createTask} className="task-form">
      <FormField label="Task">
        <TextInput name="title" placeholder="Ship RBAC middleware" required disabled={!selectedProject} />
      </FormField>
      <FormField label="Priority">
        <SelectControl name="priority" defaultValue="MEDIUM">
          {priorities.map((priority) => <SelectOption key={priority} value={priority} />)}
        </SelectControl>
      </FormField>
      <FormField label="Owner">
        <SelectControl name="assignedTo">
          <option value="">Unassigned</option>
          {currentWorkspace?.members?.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
        </SelectControl>
      </FormField>
      <Button disabled={!selectedProject}>Create task</Button>
    </form>
  );

  const taskList = (
    <div id="tasks" className="task-stack">
      {filteredTasks.length === 0 ? (
        <EmptyState title={search ? "No tasks match" : "Nothing queued yet"} message="Create the first task for the selected project." />
      ) : (
        filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            projectName={currentProject?.name}
            members={currentWorkspace?.members || []}
            onStatus={updateTaskStatus}
            onAssign={assignTask}
            onRename={renameTask}
            onDelete={deleteTask}
          />
        ))
      )}
    </div>
  );

  const activityList = (
    <div id="activity" className="activity-timeline">
      {filteredActivity.length === 0 ? (
        <EmptyState compact title={search ? "No activity matches" : "No movement yet"} message="Workspace, member, project, and task changes will appear here." />
      ) : (
        filteredActivity.map((item) => <ActivityItem key={item.id} item={item} />)
      )}
    </div>
  );

  return (
    <AppShell>
      <Sidebar
        user={user}
        workspace={currentWorkspace}
        workspaceCount={workspaces.length}
        open={railOpen}
        onOpen={() => setRailOpen(true)}
        onClose={() => setRailOpen(false)}
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <section className="workbench">
        <TopBar
          theme={theme}
          onTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onLogout={logout}
          workspaceName={currentWorkspace?.name}
          title={pageTitle}
          search={search}
          onSearch={setSearch}
        />
        {error && <ErrorState message={error} />}
        {dataLoading && <LoadingSkeleton />}

        <header className="page-heading">
          <div>
            <p className="label">{currentWorkspace?.name || "TaskFlow"}</p>
            <h1>{pageTitle}</h1>
          </div>
          <p>{currentProject ? `${currentProject.name} is selected.` : "Select a workspace and project to manage work."}</p>
        </header>

        {activePage === "focus" && (
          <section className="page-stack">
            <FocusPanel workspace={currentWorkspace} project={currentProject} activeTasks={activeTasks} doneTasks={doneTasks} activityCount={activity.length} />
            <section className="overview-grid">
              <Surface eyebrow="Workspaces" title="Recent spaces" action={<Button variant="quiet" onClick={() => setActivePage("workspaces")}>Manage</Button>}>
                {workspaceList}
              </Surface>
              <Surface eyebrow="Tasks" title="Current queue" action={<Button variant="quiet" onClick={() => setActivePage("tasks")}>Open tasks</Button>}>
                {taskList}
              </Surface>
              <Surface eyebrow="Activity" title="Recent movement" action={<Button variant="quiet" onClick={() => setActivePage("activity")}>View all</Button>}>
                {activityList}
              </Surface>
            </section>
          </section>
        )}

        {activePage === "workspaces" && (
          <section className="page-grid two-column">
            <Surface eyebrow="Create" title="New workspace">
              {workspaceCreateForm}
            </Surface>
            <Surface eyebrow="Workspaces" title="Team spaces">
              {workspaceList}
            </Surface>
            <Surface eyebrow="Settings" title="Workspace details">
              <WorkspaceSettings workspace={currentWorkspace} onUpdate={updateWorkspace} onDelete={deleteWorkspace} />
            </Surface>
            <Surface eyebrow="Members" title="Access control">
              <MembersPanel members={currentWorkspace?.members || []} onInvite={inviteMember} onRole={updateMemberRole} onRemove={removeMember} />
            </Surface>
          </section>
        )}

        {activePage === "projects" && (
          <section className="page-stack">
            <Surface eyebrow="Create" title="New project">
              {projectCreateForm}
            </Surface>
            <Surface eyebrow="Projects" title="Active work">
              {projectList}
            </Surface>
          </section>
        )}

        {activePage === "tasks" && (
          <section className="page-stack">
            <Surface eyebrow="Create" title="New task" action={<span className="surface-count">{assignedToMe.length} assigned to me</span>}>
              {taskCreateForm}
            </Surface>
            <Surface eyebrow="Tasks" title="Task queue">
              {taskList}
            </Surface>
          </section>
        )}

        {activePage === "activity" && (
          <section className="page-stack">
            <Surface eyebrow="Activity" title="Recent movement">
              {activityList}
            </Surface>
          </section>
        )}
      </section>
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
