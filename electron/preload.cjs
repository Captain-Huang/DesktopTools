const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskToolkit", {
  lookupIp: () => ipcRenderer.invoke("ip:lookup"),
  listTodos: () => ipcRenderer.invoke("todos:list"),
  createTodo: (payload) => ipcRenderer.invoke("todos:create", payload),
  updateTodo: (id, payload) => ipcRenderer.invoke("todos:update", id, payload),
  deleteTodo: (id) => ipcRenderer.invoke("todos:delete", id),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings) => ipcRenderer.invoke("settings:set", settings),
  addPomodoroSession: (session) => ipcRenderer.invoke("pomodoro:add-session", session),
  getPomodoroStats: () => ipcRenderer.invoke("pomodoro:stats")
});
