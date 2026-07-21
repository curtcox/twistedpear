import { app, BrowserWindow, dialog, ipcMain, powerMonitor, Tray, Menu, nativeImage, session } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkletStatus, WorkletToHostMessage } from "@twistedpear/host-core/protocol";
import { HostDesktopBridges } from "./bridges.js";
import { WorkletSupervisor } from "./supervisor.js";

const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let supervisor: WorkletSupervisor | null = null;
let bridges: HostDesktopBridges | null = null;
let latestStatus: WorkletStatus | null = null;
let quitToTray = true;
let isQuitting = false;
let networkSnapshot = JSON.stringify(networkInterfaces());
let networkPollTimer: ReturnType<typeof setInterval> | null = null;

function requestedMiniapp(): string | null {
  const argument = process.argv.find((value) => value.startsWith("--app="));
  const requested = argument?.slice("--app=".length) ?? process.env.TP_DESKTOP_APP ?? "";
  return /^[a-z0-9][a-z0-9._-]*$/.test(requested) ? requested : null;
}

function checkNetworkChange(): void {
  const next = JSON.stringify(networkInterfaces());
  if (next === networkSnapshot) {
    return;
  }

  networkSnapshot = next;
  supervisor?.send({ type: "network-change" });
}

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: join(hostRoot, "dist/preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.on("close", (event) => {
    if (isQuitting || !quitToTray) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
  });

  const appId = requestedMiniapp();
  void mainWindow.loadFile(join(hostRoot, "src/renderer/index.html"), {
    query: appId === null ? {} : { app: appId }
  });
}

function ensureSupervisor(): WorkletSupervisor {
  if (supervisor !== null) {
    return supervisor;
  }

  bridges = new HostDesktopBridges((message) => {
    supervisor?.send(message);
  });

  supervisor = new WorkletSupervisor({
    onMessage(message: WorkletToHostMessage) {
      if (bridges?.isBridgeMessage(message)) {
        void bridges.handleWorkletMessage(message);
        return;
      }

      if (message.type === "status") {
        latestStatus = message.status;
      }

      broadcast("worklet-message", message);
    },
    onExit(code, signal) {
      broadcast("worklet-exit", { code, signal });
    }
  });

  supervisor.start();
  supervisor.send({
    type: "start",
    targetHost: "127.0.0.1",
    targetPort: 4242,
    multicastEntitled: true,
    bonjourEnabled: true
  });
  supervisor.send({
    type: "set-interfaces",
    tcp: true,
    auto: true,
    ble: false,
    rnode: false
  });

  return supervisor;
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) =>
    permission === "media" && details.mediaType === "video" && requestingOrigin.startsWith("file://")
  );
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const fromHostWindow = webContents === mainWindow?.webContents && details.requestingUrl.startsWith("file://");
    const cameraOnly = "mediaTypes" in details && details.mediaTypes?.includes("video") === true &&
      details.mediaTypes.includes("audio") === false;
    callback(permission === "media" && fromHostWindow && cameraOnly);
  });
  if (process.platform === "darwin" || process.platform === "win32") {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
  }

  createWindow();
  ensureSupervisor();

  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("TwistedPear Host");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show", click: () => mainWindow?.show() },
      {
        label: "Quit",
        click: () => {
          supervisor?.stop();
          app.quit();
        }
      }
    ])
  );

  powerMonitor.on("suspend", () => {
    supervisor?.send({ type: "suspend-node" });
  });

  powerMonitor.on("resume", () => {
    supervisor?.send({ type: "resume-node" });
  });

  networkPollTimer = setInterval(checkNetworkChange, 5_000);
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    return;
  }

  if (!quitToTray) {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;

  if (networkPollTimer !== null) {
    clearInterval(networkPollTimer);
    networkPollTimer = null;
  }

  void bridges?.stop();
  supervisor?.stop();
});

if (process.platform === "darwin") {
  app.on("activate", () => {
    mainWindow?.show();
  });
}

ipcMain.handle("host:get-status", () => latestStatus);
ipcMain.handle("host:send", (_event, message) => {
  ensureSupervisor().send(message);
});
ipcMain.handle("host:save-identity-backup", async (_event, backupHex: string) => {
  const selected = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: "identity.tpidentity",
    filters: [{ name: "TwistedPear identity", extensions: ["tpidentity"] }]
  });
  if (selected.canceled || selected.filePath === "") return false;
  await writeFile(selected.filePath, Buffer.from(backupHex, "hex"), { mode: 0o600 });
  return true;
});
ipcMain.handle("host:open-identity-backup", async () => {
  const selected = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [{ name: "TwistedPear identity", extensions: ["tpidentity"] }]
  });
  const path = selected.filePaths[0];
  return selected.canceled || path === undefined ? null : (await readFile(path)).toString("hex");
});
ipcMain.handle("host:set-identity-content-protection", (_event, enabled: boolean) => {
  mainWindow?.setContentProtection(enabled);
});
ipcMain.handle("host:save-moderation-report", async (_event, json: string) => {
  const selected = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: "twistedpear-local-reports.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (selected.canceled || selected.filePath === "") return false;
  await writeFile(selected.filePath, json, { encoding: "utf8", mode: 0o600 });
  return true;
});
