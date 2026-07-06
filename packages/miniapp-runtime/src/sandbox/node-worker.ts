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
  presence: { snapshot: () => callHost("presence", "snapshot", undefined, "presence") }
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
          (response) => worker.postMessage({ type: "broker-response", ...(response as object) }),
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
