import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  powerMonitor,
  Tray,
  Menu,
  nativeImage,
  session,
} from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  WorkletStatus,
  WorkletToHostMessage,
} from "@twistedpear/host-core/protocol";
import { HostDesktopBridges } from "./bridges.js";
import { WorkletSupervisor } from "./supervisor.js";

const testCdpPort = process.env.TP_CDP_PORT;
if (testCdpPort !== undefined && /^\d+$/.test(testCdpPort)) {
  app.commandLine.appendSwitch("remote-debugging-port", testCdpPort);
  app.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1");
}
// Multipeer / CDP hosts need permissionless fake A/V so WebRTC track attach
// can record bytes without a physical camera or microphone.
if (
  process.env.TP_TEST_AGENT !== undefined ||
  (testCdpPort !== undefined && /^\d+$/.test(testCdpPort))
) {
  app.commandLine.appendSwitch("use-fake-device-for-media-stream");
  app.commandLine.appendSwitch("use-fake-ui-for-media-stream");
}

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

function ntfyConfiguration(): {
  readonly baseUrl: URL;
  readonly token: string | null;
} | null {
  const raw = process.env.TWISTEDPEAR_NTFY_URL?.trim();
  if (!raw) return null;
  try {
    const baseUrl = new URL(raw.endsWith("/") ? raw : `${raw}/`);
    const localHttp =
      baseUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
    if (baseUrl.protocol !== "https:" && !localHttp) return null;
    return {
      baseUrl,
      token: process.env.TWISTEDPEAR_NTFY_TOKEN?.trim() || null,
    };
  } catch {
    return null;
  }
}

function requestedMiniapp(): string | null {
  const argument = process.argv.find((value) => value.startsWith("--app="));
  const requested =
    argument?.slice("--app=".length) ?? process.env.TP_DESKTOP_APP ?? "";
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
  const testHarness = process.env.TP_TEST_AGENT !== undefined;
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: join(hostRoot, "dist/preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Sandbox has been observed to leave the renderer deaf to worklet
      // request/reply traffic under TP_TEST_AGENT (WebRTC signal + device bridge
      // both time out). Keep sandbox for normal launches.
      sandbox: !testHarness,
    },
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
    query: appId === null ? {} : { app: appId },
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
      if (process.env.TP_TEST_AGENT !== undefined && message.type === "log") {
        console.log(`[worklet] ${message.line}`);
      }

      broadcast("worklet-message", message);
    },
    onExit(code, signal) {
      broadcast("worklet-exit", { code, signal });
    },
  });

  const testAgent = parseTestAgentEnv(process.env.TP_TEST_AGENT);
  // Local multi-peer/conformance launches must also work from an unpackaged
  // checkout where Bare linked addon frameworks (notably bare-dns) are absent.
  // TP_TEST_AGENT is test-only, so default and shipped launches still prefer
  // the linked Bare worklet.
  supervisor.start(testAgent !== null);
  supervisor.send({
    type: "start",
    targetHost: "127.0.0.1",
    targetPort: 4242,
    multicastEntitled: true,
    bonjourEnabled: true,
  });
  supervisor.send({
    type: "set-interfaces",
    tcp: false,
    auto: true,
    ble: false,
    rnode: false,
  });

  // `TP_TEST_AGENT=host:port:label` puts this host into the single-machine
  // multi-peer environment: TCP to the local hub plus the test control agent.
  // Set only by `scripts/peers/adapters/desktop.mjs`; never in a shipped build,
  // and it overrides the opt-in TCP default above rather than replacing it.
  if (testAgent !== null) {
    const passphrase = process.env.TP_IDENTITY_PASSPHRASE;
    if (passphrase !== undefined) {
      supervisor.send({
        type: "identity-unlock",
        passphrase,
        confirmation: passphrase,
      });
    }
    supervisor.send({
      type: "set-interfaces",
      tcp: true,
      auto: true,
      ble: false,
      rnode: false,
    });
    supervisor.send({ type: "connect-test-agent", ...testAgent });
  }

  return supervisor;
}

function parseTestAgentEnv(
  value: string | undefined,
): { host: string; port: number; label: string } | null {
  if (value === undefined || value === "") {
    return null;
  }
  const [host, portText, label] = value.split(":");
  const port = Number.parseInt(portText ?? "", 10);
  if (host === undefined || host === "" || !Number.isFinite(port)) {
    console.error(`Ignoring malformed TP_TEST_AGENT: ${value}`);
    return null;
  }
  return {
    host,
    port,
    label: label === undefined || label === "" ? "desktop" : label,
  };
}

function configureMediaPermissions(): void {
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) =>
      permission === "media" &&
      (details.mediaType === "video" || details.mediaType === "audio") &&
      requestingOrigin.startsWith("file://"),
  );
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const fromHostWindow =
        webContents === mainWindow?.webContents &&
        details.requestingUrl.startsWith("file://");
      const trustedMediaOnly =
        "mediaTypes" in details &&
        (details.mediaTypes?.length ?? 0) > 0 &&
        details.mediaTypes?.every(
          (mediaType) => mediaType === "video" || mediaType === "audio",
        ) === true;
      callback(permission === "media" && fromHostWindow && trustedMediaOnly);
    },
  );
}

function installTray(): void {
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
        },
      },
    ]),
  );
}

app
  .whenReady()
  .then(() => {
    configureMediaPermissions();
    if (process.platform === "darwin" || process.platform === "win32") {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    }

    createWindow();
    ensureSupervisor();
    installTray();

    powerMonitor.on("suspend", () => {
      supervisor?.send({ type: "suspend-node" });
    });

    powerMonitor.on("resume", () => {
      supervisor?.send({ type: "resume-node" });
    });

    networkPollTimer = setInterval(checkNetworkChange, 5_000);
  })
  .catch((error: unknown) => {
    // Without this the host silently half-starts: anything thrown while wiring
    // up sessions, windows, tray, or the supervisor was discarded.
    console.error("Desktop host failed during app initialisation:", error);
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
ipcMain.handle("host:ntfy-status", () => {
  const config = ntfyConfiguration();
  return config === null
    ? { configured: false }
    : {
        configured: true,
        server: `${config.baseUrl.origin}${config.baseUrl.pathname}`,
      };
});
ipcMain.handle("host:ntfy-request", (_event, request) =>
  handleNtfyRequest(request),
);

async function handleNtfyRequest(request: {
  readonly url: string;
  readonly method: string;
  readonly headers?: Record<string, string>;
  readonly body?: string;
}): Promise<{
  status: number;
  body: string;
  contentLength: string | null;
}> {
  const config = ntfyConfiguration();
  if (config === null) throw new Error("ntfy is not configured");
  const requested = new URL(request.url);
  assertNtfyRequestAllowed(config.baseUrl, requested, request);
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  if (config.token !== null)
    headers.set("Authorization", `Bearer ${config.token}`);
  const response = await fetch(requested, {
    method: request.method,
    headers,
    ...(request.body === undefined ? {} : { body: request.body }),
    redirect: "error",
  });
  return readNtfyResponse(response);
}

function assertNtfyRequestAllowed(
  baseUrl: URL,
  requested: URL,
  request: { readonly method: string; readonly body?: string },
): void {
  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;
  if (
    requested.origin !== baseUrl.origin ||
    !requested.pathname.startsWith(basePath) ||
    requested.username !== "" ||
    requested.password !== "" ||
    requested.hash !== "" ||
    !["GET", "POST"].includes(request.method) ||
    new TextEncoder().encode(request.body ?? "").length > 40_000
  ) {
    throw new Error("ntfy request is outside the configured host policy");
  }
}

async function readNtfyResponse(response: Response): Promise<{
  status: number;
  body: string;
  contentLength: string | null;
}> {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 256_000)
    throw new Error("ntfy response exceeds host budget");
  const body = await response.text();
  if (new TextEncoder().encode(body).length > 256_000)
    throw new Error("ntfy response exceeds host budget");
  return {
    status: response.status,
    body,
    contentLength: response.headers.get("content-length"),
  };
}

ipcMain.handle(
  "host:save-identity-backup",
  async (_event, backupHex: string) => {
    const selected = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: "identity.tpidentity",
      filters: [{ name: "TwistedPear identity", extensions: ["tpidentity"] }],
    });
    if (selected.canceled || selected.filePath === "") return false;
    await writeFile(selected.filePath, Buffer.from(backupHex, "hex"), {
      mode: 0o600,
    });
    return true;
  },
);
ipcMain.handle("host:open-identity-backup", async () => {
  const selected = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: [{ name: "TwistedPear identity", extensions: ["tpidentity"] }],
  });
  const path = selected.filePaths[0];
  return selected.canceled || path === undefined
    ? null
    : (await readFile(path)).toString("hex");
});
ipcMain.handle(
  "host:set-identity-content-protection",
  (_event, enabled: boolean) => {
    mainWindow?.setContentProtection(enabled);
  },
);
ipcMain.handle("host:save-moderation-report", async (_event, json: string) => {
  const selected = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: "twistedpear-local-reports.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (selected.canceled || selected.filePath === "") return false;
  await writeFile(selected.filePath, json, { encoding: "utf8", mode: 0o600 });
  return true;
});
