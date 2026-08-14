import { prepareBundleSource } from "./prepare-bundle.js";
import { createBrowserWorkerBootstrapSource } from "./browser-worker-bootstrap.js";
import { reviveJsonWireValue } from "./json-wire.js";
import type {
  SandboxBackend,
  SandboxInstance,
  SandboxSpawnOptions,
} from "./backend.js";

export class WebSandboxBackendUnavailableError extends Error {
  constructor() {
    super("Web sandbox backend is not available outside a browser document.");
    this.name = "WebSandboxBackendUnavailableError";
  }
}

const SANDBOX_IFRAME_SRCDOC = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob: 'unsafe-inline'; connect-src 'none'" />
</head>
<body>
<script>
let worker = null;
let hostPort = null;

function relayToHost(message) {
  if (hostPort !== null) {
    hostPort.postMessage(message);
  }
}

function terminateWorker() {
  if (worker !== null) {
    worker.terminate();
    worker = null;
  }
}

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'sandbox-init') {
    return;
  }

  hostPort = event.ports[0];
  if (hostPort === undefined) {
    return;
  }

  hostPort.start();

  hostPort.onmessage = (portEvent) => {
    const message = portEvent.data;
    if (message?.type === 'kill') {
      terminateWorker();
      relayToHost({ type: 'sandbox-exit', reason: message.reason ?? 'kill' });
      return;
    }

    worker?.postMessage(message);
  };

  const bootstrap = event.data.workerBootstrap;
  worker = new Worker(URL.createObjectURL(new Blob([bootstrap], { type: 'text/javascript' })));
  worker.onmessage = (workerEvent) => relayToHost(workerEvent.data);
  worker.onerror = (event) => {
    terminateWorker();
    relayToHost({
      type: "sandbox-exit",
      reason: "worker-error",
      detail: event instanceof ErrorEvent ? event.message : "worker-error"
    });
  };
  worker.postMessage({ type: 'init', bundleSource: event.data.bundleSource });
});
</script>
</body>
</html>`;

interface BrokerWireResponse {
  readonly id?: string;
  readonly ok?: boolean;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
}

export class WebSandboxBackend implements SandboxBackend {
  readonly name = "web-iframe-worker";
  lastSpawnDiagnostics: {
    readonly reason: string | null;
    readonly detail: string | null;
  } | null = null;

  async spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    if (typeof document === "undefined") {
      throw new WebSandboxBackendUnavailableError();
    }

    const source = prepareBundleSource(
      new TextDecoder().decode(options.bundle),
    );
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("title", `miniapp-sandbox-${options.appId}`);
    iframe.hidden = true;
    document.body.appendChild(iframe);

    const channel = new MessageChannel();
    const hostPort = channel.port1;
    hostPort.start();

    this.lastSpawnDiagnostics = null;
    const pending = new Map<
      string,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
    let killed = false;
    let alive = true;
    let lastExitReason: string | null = null;
    let lastExitDetail: string | null = null;

    const spawnState: SpawnPortState = {
      hostPort,
      pending,
      options,
      backend: this,
      get killed() {
        return killed;
      },
      get alive() {
        return alive;
      },
      setAlive(next: boolean) {
        alive = next;
      },
      setExit(reason: string, detail: string | null) {
        lastExitReason = reason;
        lastExitDetail = detail;
      },
    };

    const handleHostPortMessage = (event: MessageEvent) => {
      handleSandboxHostPortMessage(spawnState, event);
    };

    hostPort.addEventListener("message", handleHostPortMessage);

    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Sandbox iframe failed to load"));
      iframe.srcdoc = SANDBOX_IFRAME_SRCDOC;
    });

    const contentWindow = iframe.contentWindow;
    if (contentWindow === null) {
      iframe.remove();
      throw new Error("Sandbox iframe has no content window");
    }

    contentWindow.postMessage(
      {
        type: "sandbox-init",
        bundleSource: source,
        workerBootstrap: createBrowserWorkerBootstrapSource(),
      },
      "*",
      [channel.port2],
    );

    return createSandboxInstance({
      appId: options.appId,
      hostPort,
      iframe,
      pending,
      handleHostPortMessage,
      isKilled: () => killed,
      isAlive: () => alive && !killed,
      markKilled: () => {
        killed = true;
        alive = false;
      },
    });
  }
}

interface SpawnPortState {
  readonly hostPort: MessagePort;
  readonly pending: Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >;
  readonly options: SandboxSpawnOptions;
  readonly backend: WebSandboxBackend;
  readonly killed: boolean;
  readonly alive: boolean;
  setAlive(next: boolean): void;
  setExit(reason: string, detail: string | null): void;
}

function handleSandboxHostPortMessage(
  state: SpawnPortState,
  event: MessageEvent,
): void {
  const message = event.data as {
    type: string;
    id?: string;
    ok?: boolean;
    result?: unknown;
    error?: { message: string };
    reason?: string;
    detail?: string;
    message?: string;
  };

  if (message.type === "sandbox-exit") {
    state.setAlive(false);
    const reason =
      typeof message.reason === "string" ? message.reason : "sandbox-exit";
    const detail = typeof message.detail === "string" ? message.detail : null;
    state.setExit(reason, detail);
    state.backend.lastSpawnDiagnostics = { reason, detail };
    return;
  }

  if (message.type === "app-error") {
    const detail =
      typeof message.message === "string" ? message.message : "app-error";
    state.setExit("app-error", detail);
    state.backend.lastSpawnDiagnostics = {
      reason: "app-error",
      detail,
    };
    return;
  }

  if (message.type === "broker-request" && message.id !== undefined) {
    handleSandboxBrokerRequest(state, message);
    return;
  }

  if (message.type === "broker-response" && message.id !== undefined) {
    handleSandboxBrokerResponse(state, message);
  }
}

function handleSandboxBrokerRequest(
  state: SpawnPortState,
  message: { id?: string },
): void {
  const endpoint = state.options.brokerEndpoint as {
    request?: (request: unknown) => Promise<unknown>;
  };
  if (typeof endpoint.request !== "function") {
    state.hostPort.postMessage({
      type: "broker-response",
      id: message.id,
      ok: false,
      error: { message: "Broker endpoint is not configured" },
    });
    return;
  }

  void endpoint.request(message).then(
    (response) =>
      state.hostPort.postMessage({
        type: "broker-response",
        ...normalizeBrokerResponse(response as BrokerWireResponse),
      }),
    (error: Error) =>
      state.hostPort.postMessage({
        type: "broker-response",
        id: message.id,
        ok: false,
        error: { message: error.message },
      }),
  );
}

function handleSandboxBrokerResponse(
  state: SpawnPortState,
  message: {
    id?: string;
    ok?: boolean;
    result?: unknown;
    error?: { message: string };
  },
): void {
  if (message.id === undefined) {
    return;
  }
  const waiter = state.pending.get(message.id);
  if (waiter === undefined) {
    return;
  }
  state.pending.delete(message.id);
  if (message.ok) {
    waiter.resolve(message.result);
  } else {
    waiter.reject(new Error(message.error?.message ?? "Broker request failed"));
  }
}

function createSandboxInstance(input: {
  appId: string;
  hostPort: MessagePort;
  iframe: HTMLIFrameElement;
  pending: Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >;
  handleHostPortMessage: (event: MessageEvent) => void;
  isKilled: () => boolean;
  isAlive: () => boolean;
  markKilled: () => void;
}): SandboxInstance {
  const {
    appId,
    hostPort,
    iframe,
    pending,
    handleHostPortMessage,
    isKilled,
    isAlive,
    markKilled,
  } = input;
  return {
    id: appId,
    isAlive,
    postMessage(message: unknown): Promise<void> {
      if (isKilled()) {
        return Promise.resolve();
      }
      hostPort.postMessage(message);
      return Promise.resolve();
    },
    ping(timeoutMs: number): Promise<boolean> {
      if (isKilled()) {
        return Promise.resolve(false);
      }
      return new Promise((resolve) => {
        const id = `ping-${Date.now()}`;
        const timer = setTimeout(() => {
          pending.delete(id);
          resolve(false);
        }, timeoutMs);
        pending.set(id, {
          resolve: () => {
            clearTimeout(timer);
            resolve(true);
          },
          reject: () => {
            clearTimeout(timer);
            resolve(false);
          },
        });
        hostPort.postMessage({ type: "ping", id });
      });
    },
    kill(reason: string): Promise<void> {
      if (isKilled()) {
        return Promise.resolve();
      }
      markKilled();
      hostPort.postMessage({ type: "kill", reason });
      hostPort.removeEventListener("message", handleHostPortMessage);
      hostPort.close();
      iframe.remove();
      return Promise.resolve();
    },
  };
}

function normalizeBrokerResponse(
  response: BrokerWireResponse,
): BrokerWireResponse {
  if (!response.ok || response.result === undefined) {
    return response;
  }

  return { ...response, result: reviveJsonWireValue(response.result) };
}
