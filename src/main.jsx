import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlarmClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Globe2,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Settings,
  TimerReset,
  Trash2,
  Wifi
} from "lucide-react";
import "./styles.css";

const api = window.deskToolkit;

const text = {
  appName: "\u8f7b\u5de5\u5177\u7bb1",
  appSub: "\u684c\u9762\u6548\u7387\u5c0f\u5de5\u5177",
  network: "\u7f51\u7edc\u5f52\u5c5e\u5730",
  pomodoro: "\u756a\u8304\u949f",
  todos: "\u5f85\u529e\u9879",
  settings: "\u8bbe\u7f6e",
  focus: "\u4e13\u6ce8",
  shortBreak: "\u77ed\u4f11\u606f",
  longBreak: "\u957f\u4f11\u606f",
  refresh: "\u5237\u65b0",
  checking: "\u68c0\u6d4b\u4e2d",
  start: "\u5f00\u59cb",
  pause: "\u6682\u505c",
  reset: "\u91cd\u7f6e",
  add: "\u6dfb\u52a0",
  save: "\u4fdd\u5b58",
  done: "\u77e5\u9053\u4e86",
  copied: "\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f",
  todoReminder: "\u5f85\u529e\u63d0\u9192\uff1a",
  noTodo: "\u4e0d\u7ed1\u5b9a",
  bindTodo: "\u7ed1\u5b9a\u5f85\u529e\u9879",
  todayDone: "\u4eca\u65e5\u5b8c\u6210",
  todayFocus: "\u4eca\u65e5\u4e13\u6ce8",
  weekFocus: "\u672c\u5468\u4e13\u6ce8",
  minutes: "\u5206\u949f",
  all: "\u5168\u90e8",
  open: "\u672a\u5b8c\u6210",
  completed: "\u5df2\u5b8c\u6210",
  low: "\u4f4e",
  normal: "\u666e\u901a",
  high: "\u9ad8"
};

const modeConfig = {
  focus: { label: text.focus, setting: "focusMinutes", fallback: 25 },
  shortBreak: { label: text.shortBreak, setting: "shortBreakMinutes", fallback: 5 },
  longBreak: { label: text.longBreak, setting: "longBreakMinutes", fallback: 15 }
};

function App() {
  const [activeView, setActiveView] = useState("network");
  const [todos, setTodos] = useState([]);
  const [settings, setSettings] = useState({});
  const [toast, setToast] = useState("");
  const remindedTodoIdsRef = useRef(new Set());

  async function refreshTodos() {
    setTodos(await api.listTodos());
  }

  async function refreshSettings() {
    setSettings(await api.getSettings());
  }

  useEffect(() => {
    refreshTodos();
    refreshSettings();
  }, []);

  useEffect(() => {
    function checkDueSoon() {
      const dueSoon = todos.find((todo) => {
        if (todo.completed || !todo.dueAt) return false;
        const due = new Date(todo.dueAt).getTime();
        const now = Date.now();
        const minutes = Number(settings.todoReminderMinutes || 10);
        return due >= now && due - now <= minutes * 60 * 1000;
      });
      if (dueSoon && !remindedTodoIdsRef.current.has(dueSoon.id)) {
        remindedTodoIdsRef.current.add(dueSoon.id);
        showToast(`${text.todoReminder}${dueSoon.title}`);
      }
    }

    checkDueSoon();
    const reminderTimer = window.setInterval(checkDueSoon, 60 * 1000);
    return () => window.clearInterval(reminderTimer);
  }, [todos, settings.todoReminderMinutes]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 4500);
  }

  const nav = [
    { id: "network", label: text.network, icon: Globe2 },
    { id: "pomodoro", label: text.pomodoro, icon: AlarmClock },
    { id: "todos", label: text.todos, icon: ClipboardList },
    { id: "settings", label: text.settings, icon: Settings }
  ];

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><TimerReset size={22} /></div>
          <div>
            <div className="brandName">{text.appName}</div>
            <div className="brandSub">{text.appSub}</div>
          </div>
        </div>
        <nav className="navList">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`navItem ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)} title={item.label}>
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{nav.find((item) => item.id === activeView)?.label}</h1>
            <p>{subtitleFor(activeView)}</p>
          </div>
        </header>
        {activeView === "network" && <NetworkView showToast={showToast} />}
        {activeView === "pomodoro" && <PomodoroView todos={todos} settings={settings} showToast={showToast} />}
        {activeView === "todos" && <TodoView todos={todos} refreshTodos={refreshTodos} showToast={showToast} />}
        {activeView === "settings" && <SettingsView settings={settings} refreshSettings={refreshSettings} showToast={showToast} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function subtitleFor(view) {
  return {
    network: "\u67e5\u770b\u5f53\u524d\u516c\u7f51 IP\u3001\u5f52\u5c5e\u5730\u3001\u8fd0\u8425\u5546\u4e0e\u4ee3\u7406\u72b6\u6001",
    pomodoro: "\u7ed1\u5b9a\u5f85\u529e\u9879\u8bb0\u5f55\u4e13\u6ce8\u7edf\u8ba1\uff0c\u7ed3\u675f\u540e\u5f39\u7a97\u63d0\u9192",
    todos: "\u7ba1\u7406\u5e26\u622a\u6b62\u65f6\u95f4\u548c\u4f18\u5148\u7ea7\u7684\u672c\u5730\u5f85\u529e",
    settings: "\u8c03\u6574\u756a\u8304\u949f\u3001\u63d0\u9192\u4e0e\u7a97\u53e3\u884c\u4e3a"
  }[view];
}

function NetworkView({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);

  async function lookup() {
    setLoading(true);
    setInfo(await api.lookupIp());
    setLoading(false);
  }

  useEffect(() => {
    lookup();
  }, []);

  async function copyText(value) {
    await navigator.clipboard.writeText(value);
    showToast(text.copied);
  }

  const fullText = info?.ok
    ? `IP: ${info.ip}\nLocation: ${info.location}\nISP: ${info.isp}\nType: ${info.networkType}\nProxy: ${info.proxyStatus}\nChecked: ${formatDateTime(info.checkedAt)}`
    : "";

  return (
    <section className="toolSurface">
      <div className="sectionHead">
        <div>
          <h2>{text.network}</h2>
          <p>{text.network}\u4ec5\u67e5\u8be2\u516c\u7f51 IP\u3002</p>
        </div>
        <button className="primaryButton" onClick={lookup} disabled={loading}>
          <RefreshCcw size={17} />
          {loading ? text.checking : text.refresh}
        </button>
      </div>
      <div className="networkPanel">
        <div className="networkBadge"><Wifi size={34} /></div>
        {info?.ok ? (
          <div className="infoGrid">
            <InfoItem label="\u516c\u7f51 IP" value={info.ip} strong />
            <InfoItem label="\u5f52\u5c5e\u5730" value={info.location || "\u672a\u77e5"} />
            <InfoItem label="\u8fd0\u8425\u5546" value={info.isp || "\u672a\u77e5"} />
            <InfoItem label="\u7f51\u7edc\u7c7b\u578b" value={info.networkType} />
            <InfoItem label="\u4ee3\u7406\u72b6\u6001" value={info.proxyStatus} />
            <InfoItem label="\u68c0\u6d4b\u65f6\u95f4" value={formatDateTime(info.checkedAt)} />
            <InfoItem label="\u6570\u636e\u6e90" value={info.source} />
          </div>
        ) : (
          <div className="emptyState">{loading ? "\u6b63\u5728\u83b7\u53d6\u5f53\u524d\u7f51\u7edc\u4fe1\u606f..." : info?.message || "\u6682\u65e0\u7f51\u7edc\u4fe1\u606f"}</div>
        )}
      </div>
      <div className="actionRow">
        <button className="ghostButton" disabled={!info?.ok} onClick={() => copyText(info.ip)}><Copy size={16} />\u590d\u5236 IP</button>
        <button className="ghostButton" disabled={!info?.ok} onClick={() => copyText(fullText)}><Copy size={16} />\u590d\u5236\u5b8c\u6574\u4fe1\u606f</button>
      </div>
    </section>
  );
}

function InfoItem({ label, value, strong }) {
  return (
    <div className="infoItem">
      <span>{label}</span>
      <strong className={strong ? "mono" : ""}>{value}</strong>
    </div>
  );
}

function PomodoroView({ todos, settings, showToast }) {
  const [mode, setMode] = useState("focus");
  const [selectedTodoId, setSelectedTodoId] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [stats, setStats] = useState({ todayCount: 0, todaySeconds: 0, weekSeconds: 0 });
  const [modal, setModal] = useState(null);
  const timerRef = useRef(null);

  const duration = useMemo(() => {
    const minutes = Number(settings[modeConfig[mode].setting] || modeConfig[mode].fallback);
    return Math.max(1, minutes) * 60;
  }, [mode, settings]);

  useEffect(() => {
    setSecondsLeft(duration);
    setRunning(false);
    setStartedAt(null);
  }, [duration, mode]);

  useEffect(() => {
    api.getPomodoroStats().then(setStats);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timerRef.current);
          completeSession(true, duration);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerRef.current);
  }, [running, mode, selectedTodoId, startedAt, duration]);

  function start() {
    if (!startedAt) setStartedAt(new Date().toISOString());
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  async function reset() {
    if (startedAt && secondsLeft < duration) await completeSession(false, duration - secondsLeft, true);
    setSecondsLeft(duration);
    setRunning(false);
    setStartedAt(null);
  }

  async function completeSession(completed, elapsedSeconds, silent = false) {
    setRunning(false);
    await api.addPomodoroSession({
      todoId: selectedTodoId ? Number(selectedTodoId) : null,
      mode,
      plannedSeconds: duration,
      elapsedSeconds: Math.max(0, Math.min(duration, elapsedSeconds)),
      completed,
      startedAt: startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString()
    });
    const nextStats = await api.getPomodoroStats();
    setStats(nextStats);
    if (completed) {
      setModal({
        title: mode === "focus" ? "\u4e13\u6ce8\u5b8c\u6210" : "\u4f11\u606f\u7ed3\u675f",
        body: mode === "focus" ? "\u4e00\u4e2a\u756a\u8304\u949f\u5df2\u5b8c\u6210\uff0c\u53ef\u4ee5\u4f11\u606f\u4e00\u4e0b\u3002" : "\u4f11\u606f\u65f6\u95f4\u7ed3\u675f\uff0c\u53ef\u4ee5\u56de\u5230\u8282\u594f\u91cc\u4e86\u3002"
      });
      if (mode === "focus" && selectedTodoId) {
        const todo = todos.find((item) => item.id === Number(selectedTodoId));
        if (todo) showToast(`\u5df2\u8bb0\u5f55\u5230\u5f85\u529e\uff1a${todo.title}`);
      }
    } else if (!silent) {
      showToast("\u672c\u6b21\u756a\u8304\u949f\u5df2\u8bb0\u5f55\u4e3a\u672a\u5b8c\u6210");
    }
    setStartedAt(null);
  }

  const activeTodos = todos.filter((todo) => !todo.completed);

  return (
    <section className="toolSurface">
      <div className="pomodoroLayout">
        <div className="timerPane">
          <div className="modeTabs">
            {Object.entries(modeConfig).map(([key, item]) => (
              <button key={key} className={mode === key ? "selected" : ""} onClick={() => setMode(key)}>{item.label}</button>
            ))}
          </div>
          <div className="timerRing">
            <div className="timerText">{formatDuration(secondsLeft)}</div>
            <div className="timerMode">{modeConfig[mode].label}</div>
          </div>
          <div className="timerControls">
            {!running ? <button className="primaryButton" onClick={start}><Play size={17} />{text.start}</button> : <button className="primaryButton" onClick={pause}><Pause size={17} />{text.pause}</button>}
            <button className="ghostButton" onClick={reset}><RotateCcw size={16} />{text.reset}</button>
          </div>
        </div>
        <div className="sidePane">
          <label className="field">
            <span>{text.bindTodo}</span>
            <select value={selectedTodoId} onChange={(event) => setSelectedTodoId(event.target.value)}>
              <option value="">{text.noTodo}</option>
              {activeTodos.map((todo) => <option key={todo.id} value={todo.id}>{todo.title}</option>)}
            </select>
          </label>
          <div className="statsGrid">
            <div><span>{text.todayDone}</span><strong>{stats.todayCount}</strong></div>
            <div><span>{text.todayFocus}</span><strong>{Math.round(stats.todaySeconds / 60)} {text.minutes}</strong></div>
            <div><span>{text.weekFocus}</span><strong>{Math.round(stats.weekSeconds / 60)} {text.minutes}</strong></div>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal">
            <CheckCircle2 size={34} />
            <h3>{modal.title}</h3>
            <p>{modal.body}</p>
            <div className="actionRow">
              <button className="primaryButton" onClick={() => setModal(null)}>{text.done}</button>
              {mode === "focus" && (
                <button className="ghostButton" onClick={() => {
                  setModal(null);
                  setMode(Number(stats.todayCount || 0) % Number(settings.longBreakEvery || 4) === 0 ? "longBreak" : "shortBreak");
                }}>\u5f00\u59cb\u4f11\u606f</button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TodoView({ todos, refreshTodos, showToast }) {
  const [filter, setFilter] = useState("open");
  const [draft, setDraft] = useState({ title: "", notes: "", dueAt: "", priority: "normal" });

  async function createTodo(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    await api.createTodo({ ...draft, dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null });
    setDraft({ title: "", notes: "", dueAt: "", priority: "normal" });
    await refreshTodos();
    showToast("\u5f85\u529e\u5df2\u6dfb\u52a0");
  }

  async function updateTodo(id, payload) {
    await api.updateTodo(id, payload);
    await refreshTodos();
  }

  async function removeTodo(id) {
    await api.deleteTodo(id);
    await refreshTodos();
    showToast("\u5f85\u529e\u5df2\u5220\u9664");
  }

  const visibleTodos = todos.filter((todo) => filter === "all" || (filter === "done" ? todo.completed : !todo.completed));

  return (
    <section className="toolSurface">
      <form className="todoComposer" onSubmit={createTodo}>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="\u8f93\u5165\u65b0\u7684\u5f85\u529e\u4e8b\u9879" />
        <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
          <option value="low">{text.low}</option>
          <option value="normal">{text.normal}</option>
          <option value="high">{text.high}</option>
        </select>
        <input type="datetime-local" value={draft.dueAt} onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })} />
        <button className="primaryButton"><Plus size={17} />{text.add}</button>
        <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="\u5907\u6ce8\uff0c\u53ef\u7559\u7a7a" />
      </form>
      <div className="filterTabs">
        {[["open", text.open], ["all", text.all], ["done", text.completed]].map(([key, label]) => (
          <button key={key} className={filter === key ? "selected" : ""} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      <div className="todoList">
        {visibleTodos.length === 0 && <div className="emptyState">\u6ca1\u6709\u5339\u914d\u7684\u5f85\u529e\u9879</div>}
        {visibleTodos.map((todo) => <TodoItem key={todo.id} todo={todo} updateTodo={updateTodo} removeTodo={removeTodo} />)}
      </div>
    </section>
  );
}

function TodoItem({ todo, updateTodo, removeTodo }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: todo.title,
    notes: todo.notes,
    dueAt: todo.dueAt ? toDateTimeLocal(todo.dueAt) : "",
    priority: todo.priority
  });

  async function save() {
    if (!draft.title.trim()) return;
    await updateTodo(todo.id, { ...draft, dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null });
    setEditing(false);
  }

  return (
    <article className={`todoItem ${todo.completed ? "completed" : ""}`}>
      <button className="checkButton" onClick={() => updateTodo(todo.id, { completed: !todo.completed })}>{todo.completed && <CheckCircle2 size={21} />}</button>
      {editing ? (
        <div className="todoEdit">
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          <div className="editRow">
            <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
              <option value="low">{text.low}</option>
              <option value="normal">{text.normal}</option>
              <option value="high">{text.high}</option>
            </select>
            <input type="datetime-local" value={draft.dueAt} onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })} />
            <button className="primaryButton" onClick={save}>{text.save}</button>
          </div>
        </div>
      ) : (
        <div className="todoBody" onDoubleClick={() => setEditing(true)}>
          <div className="todoTitleRow">
            <h3>{todo.title}</h3>
            <span className={`priority ${todo.priority}`}>{priorityText(todo.priority)}</span>
          </div>
          {todo.notes && <p>{todo.notes}</p>}
          <div className="todoMeta">{todo.dueAt ? `\u622a\u6b62\uff1a${formatDateTime(todo.dueAt)}` : "\u65e0\u622a\u6b62\u65f6\u95f4"}</div>
        </div>
      )}
      <div className="itemActions">
        <button className="iconButton" title="\u7f16\u8f91" onClick={() => setEditing((value) => !value)}><ClipboardList size={17} /></button>
        <button className="iconButton danger" title="\u5220\u9664" onClick={() => removeTodo(todo.id)}><Trash2 size={17} /></button>
      </div>
    </article>
  );
}

function SettingsView({ settings, refreshSettings, showToast }) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  async function save(event) {
    event.preventDefault();
    await api.setSettings(draft);
    await refreshSettings();
    showToast("\u8bbe\u7f6e\u5df2\u4fdd\u5b58");
  }

  return (
    <section className="toolSurface">
      <form className="settingsGrid" onSubmit={save}>
        <NumberField label="\u4e13\u6ce8\u65f6\u957f\uff08\u5206\u949f\uff09" value={draft.focusMinutes} onChange={(value) => setDraft({ ...draft, focusMinutes: value })} />
        <NumberField label="\u77ed\u4f11\u606f\uff08\u5206\u949f\uff09" value={draft.shortBreakMinutes} onChange={(value) => setDraft({ ...draft, shortBreakMinutes: value })} />
        <NumberField label="\u957f\u4f11\u606f\uff08\u5206\u949f\uff09" value={draft.longBreakMinutes} onChange={(value) => setDraft({ ...draft, longBreakMinutes: value })} />
        <NumberField label="\u6bcf\u51e0\u4e2a\u756a\u8304\u540e\u957f\u4f11\u606f" value={draft.longBreakEvery} onChange={(value) => setDraft({ ...draft, longBreakEvery: value })} />
        <NumberField label="\u5f85\u529e\u63d0\u524d\u63d0\u9192\uff08\u5206\u949f\uff09" value={draft.todoReminderMinutes} onChange={(value) => setDraft({ ...draft, todoReminderMinutes: value })} />
        <label className="switchField">
          <span>\u5173\u95ed\u7a97\u53e3\u65f6\u6700\u5c0f\u5316\u5230\u6258\u76d8</span>
          <input type="checkbox" checked={draft.closeToTray !== "false"} onChange={(event) => setDraft({ ...draft, closeToTray: String(event.target.checked) })} />
        </label>
        <button className="primaryButton settingsSave">\u4fdd\u5b58\u8bbe\u7f6e</button>
      </form>
    </section>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input min="1" type="number" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function priorityText(priority) {
  return { low: text.low, normal: text.normal, high: text.high }[priority] || text.normal;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

createRoot(document.getElementById("root")).render(<App />);
