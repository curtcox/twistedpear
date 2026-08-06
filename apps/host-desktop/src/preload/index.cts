import type { IpcRendererEvent } from "electron";
import type { HostToWorkletMessage } from "@twistedpear/host-core/protocol";

const { contextBridge, ipcRenderer } =
  require("electron") as typeof import("electron");

const FROZEN_HOST_API = [
  "getStatus",
  "send",
  "getNtfyStatus",
  "ntfyRequest",
  "saveIdentityBackup",
  "openIdentityBackup",
  "setIdentityContentProtection",
  "saveModerationReport",
  "onWorkletMessage",
  "onWorkletExit",
] as const;

contextBridge.exposeInMainWorld("twistedPearHost", {
  getStatus: () => ipcRenderer.invoke("host:get-status"),
  send: (message: HostToWorkletMessage) =>
    ipcRenderer.invoke("host:send", message),
  getNtfyStatus: () => ipcRenderer.invoke("host:ntfy-status"),
  ntfyRequest: (request: {
    readonly url: string;
    readonly method: string;
    readonly headers?: Record<string, string>;
    readonly body?: string;
  }) => ipcRenderer.invoke("host:ntfy-request", request),
  saveIdentityBackup: (backupHex: string) =>
    ipcRenderer.invoke("host:save-identity-backup", backupHex),
  openIdentityBackup: () => ipcRenderer.invoke("host:open-identity-backup"),
  setIdentityContentProtection: (enabled: boolean) =>
    ipcRenderer.invoke("host:set-identity-content-protection", enabled),
  saveModerationReport: (json: string) =>
    ipcRenderer.invoke("host:save-moderation-report", json),
  onWorkletMessage: (listener: (message: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, message: unknown) =>
      listener(message);
    ipcRenderer.on("worklet-message", handler);
    return () => ipcRenderer.removeListener("worklet-message", handler);
  },
  onWorkletExit: (
    listener: (detail: { code: number | null; signal: string | null }) => void,
  ) => {
    const handler = (
      _event: IpcRendererEvent,
      detail: { code: number | null; signal: string | null },
    ) => listener(detail);
    ipcRenderer.on("worklet-exit", handler);
    return () => ipcRenderer.removeListener("worklet-exit", handler);
  },
  frozenApi: FROZEN_HOST_API,
});
