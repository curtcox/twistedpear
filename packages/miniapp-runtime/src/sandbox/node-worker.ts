import { Worker } from "node:worker_threads";
import { prepareBundleSource } from "./prepare-bundle.js";
import { dispatchWorkerBrokerMessage } from "./broker-dispatch.js";
import { SandboxPing } from "./ping.js";
import { createCheckpointCollector } from "./checkpoint.js";
import { lifecycleWorkerFragment } from "./lifecycle-worker-fragment.js";
import type {
  SandboxBackend,
  SandboxInstance,
  SandboxSpawnOptions,
} from "./backend.js";

const WORKER_BOOTSTRAP = `
const { parentPort, workerData } = require("node:worker_threads");
let requestId = 0;
const pending = new Map();
let alive = true;
let uiEventHandler = null;
${lifecycleWorkerFragment("parentPort.postMessage")}
function callHost(namespace, method, payload, capability) {
  return new Promise((resolve, reject) => {
    const id = "req-" + requestId++;
    pending.set(id, { resolve, reject });
    parentPort.postMessage({ type: "broker-request", id, namespace, method, payload, capability, sentAt: Date.now() });
  });
}
async function* chatStream(request) {
  const started = await callHost("ai", "chatStreamStart", request, "ai:chat");
  let completed = false;
  try {
    while (true) {
      const next = await callHost("ai", "chatStreamNext", { streamId: started.streamId }, "ai:chat");
      if (next.done === true) { completed = true; return; }
      yield next.value;
    }
  } finally {
    if (!completed) await callHost("ai", "chatStreamCancel", { streamId: started.streamId }, "ai:chat");
  }
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
  host: Object.assign({ info: () => callHost("host", "info", undefined, "presence") }, lifecycleHost),
  workspace: { list: (prefix) => callHost("workspace", "list", { prefix }, "workspace"), read: (path) => callHost("workspace", "read", { path }, "workspace").then((r) => r.content), write: (path, content) => callHost("workspace", "write", { path, content }, "workspace"), patch: (path, baseLength, edits) => callHost("workspace", "patch", { path, baseLength, edits }, "workspace"), remove: (path) => callHost("workspace", "delete", { path }, "workspace") },
  ai: {
    chat: (request) => callHost("ai", "chat", request, "ai:chat"),
    chatStream,
    embed: (request) => callHost("ai", "embed", request, "ai:embed"),
    search: (request) => callHost("ai", "search", request, "ai:embed")
  },
  apps: { compile: (projectPrefix) => callHost("apps", "compile", { projectPrefix }, "apps:package"), format: (content) => callHost("apps", "format", { content }, "apps:package"), diagnostics: (projectPrefix, path) => callHost("apps", "diagnostics", { projectPrefix, path }, "apps:package"), packageProject: (projectPrefix, manifest) => callHost("apps", "package", { projectPrefix, manifest }, "apps:package"), publish: (t256) => callHost("apps", "publish", { t256 }, "apps:publish"), install: (t256) => callHost("apps", "install", { t256 }, "apps:install"), preview: (projectPrefix, manifest, grants) => callHost("apps", "preview", { projectPrefix, manifest, grants }, "apps:preview"), stopPreview: () => callHost("apps", "stopPreview", undefined, "apps:preview") },
  share: { put: (content) => callHost("share.cas", "put", { content }, "share:cas"), get: (t256) => callHost("share.cas", "get", { t256 }, "share:cas").then((r) => r.content) },
  freenet: { get: (keyHex) => callHost("freenet", "get", { keyHex }, "freenet:contract"), put: (options) => callHost("freenet", "put", options, "freenet:contract"), update: (options) => callHost("freenet", "update", options, "freenet:contract") },
  relay: { setMode: (mode) => callHost("relay", "setMode", { mode }, "relay:configure"), enable: (kind, options) => callHost("relay", "enable", { kind, options }, "relay:configure"), disable: (kind) => callHost("relay", "disable", { kind }, "relay:configure"), setDirection: (kind, direction) => callHost("relay", "setDirection", { kind, direction }, "relay:configure"), configure: (kind, patch) => callHost("relay", "configure", { kind, patch }, "relay:configure"), setPolicy: (policy) => callHost("relay", "setPolicy", { policy }, "relay:configure"), list: () => callHost("relay", "list", {}, "relay:read"), status: () => callHost("relay", "status", {}, "relay:read"), diagnostics: () => callHost("relay", "diagnostics", {}, "relay:read") },
  peers: { request: (options) => callHost("peers", "request", options, "peer:connect"), listen: (options) => callHost("peers", "listen", options, "peer:connect"), diagnostics: () => callHost("peers", "diagnostics", {}, "peer:connect"), info: (handle) => callHost("peers", "info", { handle }, "peer:connect"), close: (handle) => callHost("peers", "close", { handle }, "peer:connect").then(() => undefined) },
  links: { peers: () => callHost("links", "peers", {}, "link:observe"), watch: async function* () { let cursor; while (true) { const batch = await callHost("links", "watch", { cursor }, "link:observe"); cursor = batch.cursor; for (const event of batch.events) yield event; } }, probe: (peer, options) => callHost("links", "probe", { peer, options }, "link:probe") },
  device: { inventory: () => callHost("device", "inventory"), diagnostics: () => callHost("device", "diagnostics"), open: (request) => callHost("device", "open", request), close: (handle) => callHost("device", "close", { handle: typeof handle === "string" ? handle : handle.handle }), read: (handle) => callHost("device", "read", { handle: typeof handle === "string" ? handle : handle.handle }), write: (handle, command) => callHost("device", "write", { handle: typeof handle === "string" ? handle : handle.handle, command }), stream: (handle, peer, constraints) => callHost("device", "stream", { handle: typeof handle === "string" ? handle : handle.handle, peer, constraints }), closeStream: (handle) => callHost("device", "closeStream", { handle: typeof handle === "string" ? handle : handle.handle }), streams: () => callHost("device", "streams", {}, "device:stream"), shareOffers: () => callHost("device", "shareOffers", {}, "device:share-policy:read"), requestShareOffer: (purpose) => callHost("device", "requestShareOffer", { purpose }, "device:stream"), revokeShareOffer: (id) => callHost("device", "revokeShareOffer", { id }, "device:stream").then((result) => result.revoked), incoming: async function* () { let cursor; while (true) { const batch = await callHost("device", "incoming", { cursor }, "device:stream"); cursor = batch.cursor; for (const offer of batch.offers) yield offer; } }, accept: (offer, sink) => callHost("device", "accept", { offerId: typeof offer === "string" ? offer : offer.id, sink }, "device:stream"), decline: (offer, reason) => callHost("device", "decline", { offerId: typeof offer === "string" ? offer : offer.id, reason }, "device:stream") }
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
  if (handleLifecycleMessage(message)) return;
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

  spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    const source = prepareBundleSource(
      new TextDecoder().decode(options.bundle),
    );
    const resourceLimits =
      options.limits?.memoryBytes !== undefined
        ? {
            maxOldGenerationSizeMb: Math.max(
              1,
              Math.floor(options.limits.memoryBytes / (1024 * 1024)),
            ),
          }
        : undefined;
    const worker = new Worker(WORKER_BOOTSTRAP, {
      eval: true,
      workerData: {
        appId: options.appId,
        bundleSource: source,
      },
      resourceLimits,
    });

    const pending = new Map<
      string,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
    const pings = new SandboxPing();
    const checkpoints = createCheckpointCollector();
    let killed = false;
    let alive = true;

    worker.on("exit", () => {
      alive = false;
      pings.dispose();
    });
    worker.on("message", (message: BrokerWireMessage) => {
      if (checkpoints.handleMessage(message)) {
        return;
      }

      handleNodeWorkerMessage(worker, options, pending, message);
    });

    worker.on("error", (error: Error) => {
      alive = false;
      pings.dispose();
      for (const [, waiter] of pending) {
        waiter.reject(error);
      }
      pending.clear();
    });

    return Promise.resolve({
      id: options.appId,
      isAlive(): boolean {
        return alive && !killed;
      },
      postMessage(message: unknown): Promise<void> {
        if (killed) {
          return Promise.resolve();
        }

        worker.postMessage(message);
        return Promise.resolve();
      },
      ping(timeoutMs: number): Promise<boolean> {
        if (killed) {
          return Promise.resolve(false);
        }

        return pings.request(
          (message) => worker.postMessage(message),
          pending,
          timeoutMs,
        );
      },
      checkpoint(budgetMs: number) {
        if (killed) {
          return Promise.resolve({ ok: false as const });
        }

        return checkpoints.request(
          (message) => worker.postMessage(message),
          budgetMs,
        );
      },
      async kill(reason: string): Promise<void> {
        if (killed) {
          return;
        }

        killed = true;
        alive = false;
        pings.dispose();
        worker.postMessage({ type: "kill", reason });
        await worker.terminate();
      },
    });
  }
}

interface BrokerWireMessage {
  readonly type: string;
  readonly id?: string;
  readonly ok?: boolean;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
}

interface BrokerWireResponse {
  readonly id?: string;
  readonly ok?: boolean;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
}

type PendingBroker = Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>;

function handleNodeWorkerMessage(
  worker: Worker,
  options: SandboxSpawnOptions,
  pending: PendingBroker,
  message: BrokerWireMessage,
): void {
  dispatchWorkerBrokerMessage(message, {
    worker,
    pending,
    endpoint: options.brokerEndpoint as
      { request?: (request: unknown) => Promise<unknown> } | undefined,
    normalizeResponse: (response) =>
      normalizeBrokerResponse(response as BrokerWireResponse),
  });
}

function normalizeBrokerResponse(
  response: BrokerWireResponse,
): BrokerWireResponse {
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
