import type { IpcRendererEvent } from "electron";
import type { HostToWorkletMessage } from "@twistedpear/host-core/protocol";

const { contextBridge, ipcRenderer } = require("electron") as typeof import("electron");

const FROZEN_HOST_API = ["getStatus", "send", "saveIdentityBackup", "openIdentityBackup", "setIdentityContentProtection", "onWorkletMessage", "onWorkletExit"] as const;

contextBridge.exposeInMainWorld("twistedPearHost", {
  getStatus: () => ipcRenderer.invoke("host:get-status"),
  send: (message: HostToWorkletMessage) => ipcRenderer.invoke("host:send", message),
  saveIdentityBackup: (backupHex: string) => ipcRenderer.invoke("host:save-identity-backup", backupHex),
  openIdentityBackup: () => ipcRenderer.invoke("host:open-identity-backup"),
  setIdentityContentProtection: (enabled: boolean) => ipcRenderer.invoke("host:set-identity-content-protection", enabled),
  onWorkletMessage: (listener: (message: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, message: unknown) => listener(message);
    ipcRenderer.on("worklet-message", handler);
    return () => ipcRenderer.removeListener("worklet-message", handler);
  },
  onWorkletExit: (listener: (detail: { code: number | null; signal: string | null }) => void) => {
    const handler = (_event: IpcRendererEvent, detail: { code: number | null; signal: string | null }) =>
      listener(detail);
    ipcRenderer.on("worklet-exit", handler);
    return () => ipcRenderer.removeListener("worklet-exit", handler);
  },
  frozenApi: FROZEN_HOST_API
});
