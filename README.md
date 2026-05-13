# Desk Toolkit(Windows版本)

Windows desktop toolkit built with Electron, React, and SQLite.

## Features

- Public IP location lookup with free public APIs and proxy/VPN hints.
- Pomodoro timer with focus, short break, long break, todo binding, and local stats.
- Todo management with title, notes, due time, priority, completion state, reminders, and SQLite storage.
- Tray behavior and editable timer/reminder settings.

## Run

```powershell
npm install
npm run dev
```

## Build Windows Installer

```powershell
npm run dist
```

The SQLite database is stored in Electron's `userData` directory as `desk-toolkit.sqlite`.
