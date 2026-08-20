const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bossaiCommercialAuth", {
  login: (payload) => ipcRenderer.invoke("bossai-funding:commercial-login", payload),
  confirmMfa: (payload) => ipcRenderer.invoke("bossai-funding:commercial-mfa", payload),
  cancel: () => ipcRenderer.send("bossai-funding:commercial-login-cancel"),
});
