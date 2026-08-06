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

    const handleHostPortMessage = (event: MessageEvent) => {
      const message = event.data as {
        type: string;
        id?: string;
        ok?: boolean;
        result?: unknown;
        error?: { message: string };
        namespace?: string;
        method?: string;
        payload?: unknown;
        capability?: string;
        sentAt?: number;
        reason?: string;
        detail?: string;
        message?: string;
      };

      if (message.type === "sandbox-exit") {
        alive = false;
        lastExitReason =
          typeof message.reason === "string" ? message.reason : "sandbox-exit";
        lastExitDetail =
          typeof message.detail === "string" ? message.detail : null;
        this.lastSpawnDiagnostics = {
          reason: lastExitReason,
          detail: lastExitDetail,
        };
        return;
      }

      if (message.type === "app-error") {
        lastExitReason = "app-error";
        lastExitDetail =
          typeof message.message === "string" ? message.message : "app-error";
        this.lastSpawnDiagnostics = {
          reason: lastExitReason,
          detail: lastExitDetail,
        };
        return;
      }

      if (message.type === "broker-request" && message.id !== undefined) {
        const endpoint = options.brokerEndpoint as {
          request?: (request: unknown) => Promise<unknown>;
        };
        if (typeof endpoint?.request !== "function") {
          hostPort.postMessage({
            type: "broker-response",
            id: message.id,
            ok: false,
            error: { message: "Broker endpoint is not configured" },
          });
          return;
        }

        void endpoint.request(message).then(
          (response) =>
            hostPort.postMessage({
              type: "broker-response",
              ...normalizeBrokerResponse(response as BrokerWireResponse),
            }),
          (error: Error) =>
            hostPort.postMessage({
              type: "broker-response",
              id: message.id,
              ok: false,
              error: { message: error.message },
            }),
        );
        return;
      }

      if (message.type === "broker-response" && message.id !== undefined) {
        const waiter = pending.get(message.id);
        if (waiter === undefined) {
          return;
        }

        pending.delete(message.id);
        if (message.ok) {
          waiter.resolve(message.result);
        } else {
          waiter.reject(
            new Error(message.error?.message ?? "Broker request failed"),
          );
        }
      }
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

    return {
      id: options.appId,
      isAlive(): boolean {
        return alive && !killed;
      },
      async postMessage(message: unknown): Promise<void> {
        if (killed) {
          return;
        }

        hostPort.postMessage(message);
      },
      async ping(timeoutMs: number): Promise<boolean> {
        if (killed) {
          return false;
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
      async kill(reason: string): Promise<void> {
        if (killed) {
          return;
        }

        killed = true;
        alive = false;
        hostPort.postMessage({ type: "kill", reason });
        hostPort.removeEventListener("message", handleHostPortMessage);
        hostPort.close();
        iframe.remove();
      },
    };
  }
}

function normalizeBrokerResponse(
  response: BrokerWireResponse,
): BrokerWireResponse {
  if (!response.ok || response.result === undefined) {
    return response;
  }

  return { ...response, result: reviveJsonWireValue(response.result) };
}
