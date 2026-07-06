import { contextBridge, ipcRenderer } from "electron";
import type { HostToWorkletMessage } from "@twistedpear/host-core/protocol";

const FROZEN_HOST_API = ["getStatus", "send", "onWorkletMessage", "onWorkletExit"] as const;

contextBridge.exposeInMainWorld("twistedPearHost", {
  getStatus: () => ipcRenderer.invoke("host:get-status"),
  send: (message: HostToWorkletMessage) => ipcRenderer.invoke("host:send", message),
  onWorkletMessage: (listener: (message: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: unknown) => listener(message);
    ipcRenderer.on("worklet-message", handler);
    return () => ipcRenderer.removeListener("worklet-message", handler);
  },
  onWorkletExit: (listener: (detail: { code: number | null; signal: string | null }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, detail: { code: number | null; signal: string | null }) =>
      listener(detail);
    ipcRenderer.on("worklet-exit", handler);
    return () => ipcRenderer.removeListener("worklet-exit", handler);
  },
  frozenApi: FROZEN_HOST_API
});
