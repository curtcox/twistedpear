import { Worker } from "node:worker_threads";
import { prepareBundleSource } from "./prepare-bundle.js";
import type { SandboxBackend, SandboxInstance, SandboxSpawnOptions } from "./backend.js";

const WORKER_BOOTSTRAP = String.raw`
const { parentPort, workerData } = require("node:worker_threads");
let requestId = 0;
const pending = new Map();
let alive = true;
let uiEventHandler = null;
function callHost(namespace, method, payload, capability) {
  return new Promise((resolve, reject) => {
    const id = "req-" + requestId++;
    pending.set(id, { resolve, reject });
    parentPort.postMessage({ type: "broker-request", id, namespace, method, payload, capability, sentAt: Date.now() });
  });
}
const sdk = {
  ui: {
    render: (tree) => callHost("ui", "render", { tree }),
    subscribeEvents: (handlerId) => callHost("ui", "subscribe", { handlerId }),
    onEvent: (handler) => { uiEventHandler = handler; }
  },
  identity: { destinationHash: () => callHost("identity", "destinationHash", undefined, "identity"), sign: (payload) => callHost("identity", "sign", { payload }, "identity") },
  lxmf: { send: (request) => callHost("lxmf", "send", request, "lxmf:send"), receive: () => callHost("lxmf", "receive", undefined, "lxmf:receive") },
  announce: { publish: (appData, namespace) => callHost("announce", "publish", { appData, namespace }, "announce:publish"), subscribe: (namespace) => callHost("announce", "subscribe", { namespace }, "announce:subscribe") },
  storage: { kv: { get: (key) => callHost("storage.kv", "get", { key }, "storage:kv"), set: (key, value) => callHost("storage.kv", "set", { key, value }, "storage:kv"), delete: (key) => callHost("storage.kv", "delete", { key }, "storage:kv") }, bee: { open: () => callHost("storage.bee", "open", undefined, "storage:hyperbee"), get: (key) => callHost("storage.bee", "get", { key }, "storage:hyperbee"), put: (key, value) => callHost("storage.bee", "put", { key, value }, "storage:hyperbee"), del: (key) => callHost("storage.bee", "del", { key }, "storage:hyperbee"), list: (options) => callHost("storage.bee", "list", options ?? {}, "storage:hyperbee") } },
  resource: { fetch: (request) => callHost("resource", "fetch", request, "resource:fetch") },
  presence: { snapshot: () => callHost("presence", "snapshot", undefined, "presence") },
  workspace: { list: (prefix) => callHost("workspace", "list", { prefix }, "workspace"), read: (path) => callHost("workspace", "read", { path }, "workspace").then((r) => r.content), write: (path, content) => callHost("workspace", "write", { path, content }, "workspace"), remove: (path) => callHost("workspace", "delete", { path }, "workspace") },
  ai: { chat: (request) => callHost("ai", "chat", request, "ai:chat") },
  apps: { packageProject: (projectPrefix, manifest) => callHost("apps", "package", { projectPrefix, manifest }, "apps:package"), publish: (t256) => callHost("apps", "publish", { t256 }, "apps:publish"), install: (t256) => callHost("apps", "install", { t256 }, "apps:install"), preview: (projectPrefix, manifest, grants) => callHost("apps", "preview", { projectPrefix, manifest, grants }, "apps:preview"), stopPreview: () => callHost("apps", "stopPreview", undefined, "apps:preview") },
  share: { put: (content) => callHost("share.cas", "put", { content }, "share:cas"), get: (t256) => callHost("share.cas", "get", { t256 }, "share:cas").then((r) => r.content) }
};
parentPort.on("message", (message) => {
  if (!alive) return;
  if (message.type === "broker-response" && message.id !== undefined) {
    const waiter = pending.get(message.id);
    if (waiter === undefined) return;
    pending.delete(message.id);
    message.ok ? waiter.resolve(message.result) : waiter.reject(new Error(message.error?.message ?? "Broker request failed"));
    return;
  }
  if (message.type === "ping") {
    parentPort.postMessage({ type: "broker-response", id: message.id, ok: true, result: "pong" });
    return;
  }
  if (message.type === "kill") {
    alive = false;
    process.exit(0);
  }
  if (message.type === "ui-event" && uiEventHandler !== null) {
    void Promise.resolve(uiEventHandler({ nodeId: message.nodeId, event: message.event, value: message.value }));
  }
});
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
new AsyncFunction("sdk", workerData.bundleSource)(sdk).catch((error) => {
  parentPort.postMessage({ type: "app-error", message: error instanceof Error ? error.message : String(error) });
});
`;

export class NodeWorkerSandboxBackend implements SandboxBackend {
  readonly name = "node-worker";

  async spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    const source = prepareBundleSource(new TextDecoder().decode(options.bundle));
    const resourceLimits =
      options.limits?.memoryBytes !== undefined
        ? { maxOldGenerationSizeMb: Math.max(1, Math.floor(options.limits.memoryBytes / (1024 * 1024))) }
        : undefined;
    const worker = new Worker(WORKER_BOOTSTRAP, {
      eval: true,
      workerData: {
        appId: options.appId,
        bundleSource: source
      },
      resourceLimits
    });

    const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
    let killed = false;
    let alive = true;

    worker.on("exit", () => {
      alive = false;
    });

    worker.on("message", (message: { type: string; id?: string; ok?: boolean; result?: unknown; error?: { message: string } }) => {
      if (message.type === "broker-request" && message.id !== undefined) {
        const endpoint = options.brokerEndpoint as {
          request?: (request: unknown) => Promise<unknown>;
        };
        if (typeof endpoint?.request !== "function") {
          worker.postMessage({
            type: "broker-response",
            id: message.id,
            ok: false,
            error: { message: "Broker endpoint is not configured" }
          });
          return;
        }

        void endpoint.request(message).then(
          (response) =>
            worker.postMessage({
              type: "broker-response",
              ...normalizeBrokerResponse(response as BrokerWireResponse)
            }),
          (error: Error) =>
            worker.postMessage({
              type: "broker-response",
              id: message.id,
              ok: false,
              error: { message: error.message }
            })
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
          waiter.reject(new Error(message.error?.message ?? "Broker request failed"));
        }
      }
    });

    worker.on("error", (error) => {
      alive = false;
      for (const [, waiter] of pending) {
        waiter.reject(error);
      }
      pending.clear();
    });

    return {
      id: options.appId,
      isAlive(): boolean {
        return alive && !killed;
      },
      async postMessage(message: unknown): Promise<void> {
        if (killed) {
          return;
        }

        worker.postMessage(message);
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
            }
          });
          worker.postMessage({ type: "ping", id });
        });
      },
      async kill(reason: string): Promise<void> {
        if (killed) {
          return;
        }

        killed = true;
        alive = false;
        worker.postMessage({ type: "kill", reason });
        await worker.terminate();
      }
    };
  }
}

interface BrokerWireResponse {
  readonly id?: string;
  readonly ok?: boolean;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
}

function normalizeBrokerResponse(response: BrokerWireResponse): BrokerWireResponse {
  if (!response.ok || response.result === undefined) {
    return response;
  }

  return { ...response, result: normalizeWireValue(response.result) };
}

function normalizeWireValue(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (Array.isArray(value)) {
    // Only all-numeric arrays are byte payloads; structured results
    // (e.g. workspace.list) must survive as arrays of objects.
    if (value.length > 0 && value.every((item) => typeof item === "number")) {
      return new Uint8Array(value);
    }

    return value.map(normalizeWireValue);
  }

  if (value !== null && typeof value === "object") {
    const record = value as { type?: string; data?: ReadonlyArray<number> };
    if (record.type === "Buffer" && Array.isArray(record.data)) {
      return new Uint8Array(record.data);
    }
  }

  return value;
}
