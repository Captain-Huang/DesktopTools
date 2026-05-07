import { app, BrowserWindow, Menu, Tray, ipcMain, shell, nativeImage } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import isDev from "electron-is-dev";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let tray;
let db;
let shouldQuit = false;

function createDatabase() {
  const dbPath = path.join(app.getPath("userData"), "desk-toolkit.sqlite");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      due_at TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER,
      mode TEXT NOT NULL,
      planned_seconds INTEGER NOT NULL,
      elapsed_seconds INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      FOREIGN KEY(todo_id) REFERENCES todos(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedSetting("focusMinutes", "25");
  seedSetting("shortBreakMinutes", "5");
  seedSetting("longBreakMinutes", "15");
  seedSetting("longBreakEvery", "4");
  seedSetting("closeToTray", "true");
  seedSetting("todoReminderMinutes", "10");
}

function seedSetting(key, value) {
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    title: "轻工具箱",
    backgroundColor: "#f6f7f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    const closeToTray = getSetting("closeToTray") !== "false";
    if (!shouldQuit && closeToTray) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    if (!shouldQuit) {
      shouldQuit = true;
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAjUlEQVR4AWP4//8/AyUYTFhYGBkYGP7Dw8MZgMR2dnZGBgYGJgYGBkY2NjYgMcxgYGBkYGBg+P//P8NgwAEmRgYGBjY2NgYGRgYGPz8/IzCMYGBgYGfHh4GLKysoD4KcAJoGJcEwcDAwMDA8P///wzDDAwMDAx8fHxcCjAAGiYmJhZmZmYwMDAAAE8qH4Lxg/wuAAAAAElFTkSuQmCC"
  );
  tray = new Tray(icon);
  tray.setToolTip("轻工具箱");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "打开轻工具箱", click: () => showMainWindow() },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        shouldQuit = true;
        app.quit();
      }
    }
  ]));
  tray.on("double-click", showMainWindow);
}

function showMainWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function getSetting(key) {
  return db.prepare("SELECT value FROM settings WHERE key = ?").get(key)?.value;
}

function serializeTodo(row) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    dueAt: row.due_at,
    priority: row.priority,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at
  };
}

function setupIpc() {
  ipcMain.handle("ip:lookup", async () => lookupIpLocation());

  ipcMain.handle("todos:list", () => {
    return db.prepare("SELECT * FROM todos ORDER BY completed ASC, due_at IS NULL, due_at ASC, created_at DESC")
      .all()
      .map(serializeTodo);
  });

  ipcMain.handle("todos:create", (_event, payload) => {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO todos (title, notes, due_at, priority, created_at, updated_at)
      VALUES (@title, @notes, @dueAt, @priority, @createdAt, @updatedAt)
    `).run({
      title: payload.title.trim(),
      notes: payload.notes?.trim() ?? "",
      dueAt: payload.dueAt || null,
      priority: payload.priority || "normal",
      createdAt: now,
      updatedAt: now
    });
    return serializeTodo(db.prepare("SELECT * FROM todos WHERE id = ?").get(info.lastInsertRowid));
  });

  ipcMain.handle("todos:update", (_event, id, payload) => {
    const current = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
    if (!current) return null;
    const next = {
      title: payload.title?.trim() ?? current.title,
      notes: payload.notes ?? current.notes,
      dueAt: hasOwn(payload, "dueAt") ? payload.dueAt || null : current.due_at,
      priority: payload.priority ?? current.priority,
      completed: hasOwn(payload, "completed") ? Number(payload.completed) : current.completed,
      completedAt: hasOwn(payload, "completed")
        ? payload.completed ? new Date().toISOString() : null
        : current.completed_at,
      updatedAt: new Date().toISOString(),
      id
    };
    db.prepare(`
      UPDATE todos
      SET title = @title, notes = @notes, due_at = @dueAt, priority = @priority,
          completed = @completed, completed_at = @completedAt, updated_at = @updatedAt
      WHERE id = @id
    `).run(next);
    return serializeTodo(db.prepare("SELECT * FROM todos WHERE id = ?").get(id));
  });

  ipcMain.handle("todos:delete", (_event, id) => {
    db.prepare("DELETE FROM todos WHERE id = ?").run(id);
    return true;
  });

  ipcMain.handle("settings:get", () => {
    const rows = db.prepare("SELECT key, value FROM settings").all();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  });

  ipcMain.handle("settings:set", (_event, settings) => {
    const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    const transaction = db.transaction((entries) => entries.forEach(([key, value]) => stmt.run(key, String(value))));
    transaction(Object.entries(settings));
    return true;
  });

  ipcMain.handle("pomodoro:add-session", (_event, session) => {
    db.prepare(`
      INSERT INTO pomodoro_sessions
        (todo_id, mode, planned_seconds, elapsed_seconds, completed, started_at, ended_at)
      VALUES
        (@todoId, @mode, @plannedSeconds, @elapsedSeconds, @completed, @startedAt, @endedAt)
    `).run({
      todoId: session.todoId || null,
      mode: session.mode,
      plannedSeconds: session.plannedSeconds,
      elapsedSeconds: session.elapsedSeconds,
      completed: Number(session.completed),
      startedAt: session.startedAt,
      endedAt: session.endedAt
    });
    return true;
  });

  ipcMain.handle("pomodoro:stats", () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
    const row = db.prepare(`
      SELECT
        SUM(CASE WHEN completed = 1 AND mode = 'focus' AND ended_at >= @today THEN 1 ELSE 0 END) AS todayCount,
        SUM(CASE WHEN completed = 1 AND mode = 'focus' AND ended_at >= @today THEN elapsed_seconds ELSE 0 END) AS todaySeconds,
        SUM(CASE WHEN completed = 1 AND mode = 'focus' AND ended_at >= @week THEN elapsed_seconds ELSE 0 END) AS weekSeconds
      FROM pomodoro_sessions
    `).get({ today: todayStart.toISOString(), week: weekStart.toISOString() });
    return {
      todayCount: row.todayCount ?? 0,
      todaySeconds: row.todaySeconds ?? 0,
      weekSeconds: row.weekSeconds ?? 0
    };
  });
}

async function lookupIpLocation() {
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch("http://ip-api.com/json/?fields=status,message,query,country,regionName,city,isp,org,as,timezone,proxy,hosting,mobile");
    const data = await response.json();
    if (data.status !== "success") throw new Error(data.message || "IP 查询失败");
    return {
      ok: true,
      ip: data.query,
      location: [data.country, data.regionName, data.city].filter(Boolean).join(" "),
      isp: data.isp || data.org || "",
      networkType: "IPv4",
      proxyStatus: describeProxy(data),
      checkedAt: startedAt,
      source: "ip-api.com"
    };
  } catch (primaryError) {
    try {
      const fallback = await fetch("https://ipwho.is/");
      const data = await fallback.json();
      if (!data.success) throw new Error(data.message || "IP 查询失败");
      return {
        ok: true,
        ip: data.ip,
        location: [data.country, data.region, data.city].filter(Boolean).join(" "),
        isp: data.connection?.isp || data.connection?.org || "",
        networkType: data.type?.toUpperCase() || "未知",
        proxyStatus: describeFallbackProxy(data),
        checkedAt: startedAt,
        source: "ipwho.is"
      };
    } catch (fallbackError) {
      return {
        ok: false,
        message: fallbackError.message || primaryError.message || "无法获取公网 IP，请检查网络",
        checkedAt: startedAt
      };
    }
  }
}

function describeProxy(data) {
  if (data.proxy || data.hosting) return "可能使用代理/VPN/机房网络";
  if (data.mobile) return "移动网络，未发现明显代理特征";
  return "未发现明显代理特征";
}

function describeFallbackProxy(data) {
  const security = data.security || {};
  if (security.proxy || security.vpn || security.tor || security.hosting) return "可能使用代理/VPN/机房网络";
  return "未发现明显代理特征";
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

app.whenReady().then(() => {
  createDatabase();
  setupIpc();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    showMainWindow();
  });
});

app.on("before-quit", () => {
  shouldQuit = true;
});

app.on("window-all-closed", () => {
  if (shouldQuit) app.quit();
});
