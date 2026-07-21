import { prepareBundleSource } from "./prepare-bundle.js";
import type { SandboxBackend, SandboxInstance, SandboxSpawnOptions } from "./backend.js";

export class WorkerBackendUnavailableError extends Error {
  constructor() {
    super("Bare Worker backend is not available in this runtime.");
    this.name = "WorkerBackendUnavailableError";
  }
}

interface BareWorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

interface BareWorkerConstructor {
  new (source: string | URL, options?: { type?: string; data?: unknown }): BareWorkerLike;
}

export class BareWorkerSandboxBackend implements SandboxBackend {
  readonly name = "bare-worker";

  async spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    const WorkerCtor = (globalThis as { Worker?: BareWorkerConstructor }).Worker;
    if (WorkerCtor === undefined) {
      throw new WorkerBackendUnavailableError();
    }

    const source = prepareBundleSource(new TextDecoder().decode(options.bundle));
    const bootstrap = createBareBootstrapSource();
    const worker = new WorkerCtor(`data:text/javascript,${encodeURIComponent(bootstrap)}`, {
      type: "module",
      data: { appId: options.appId, bundleSource: source }
    });

    const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
    let killed = false;
    let alive = true;

    worker.onmessage = (event: { data: unknown }) => {
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
      };

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
    };

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
        worker.terminate();
      }
    };
  }
}

function createBareBootstrapSource(): string {
  return `
const pending = new Map();
let requestId = 0;
let alive = true;
let uiEventHandler = null;

function callHost(namespace, method, payload, capability) {
  return new Promise((resolve, reject) => {
    const id = 'req-' + (requestId++);
    pending.set(id, { resolve, reject });
    self.postMessage({ type: 'broker-request', id, namespace, method, payload, capability, sentAt: Date.now() });
  });
}
async function* chatStream(request) {
  const started = await callHost('ai', 'chatStreamStart', request, 'ai:chat');
  let completed = false;
  try {
    while (true) {
      const next = await callHost('ai', 'chatStreamNext', { streamId: started.streamId }, 'ai:chat');
      if (next.done === true) { completed = true; return; }
      yield next.value;
    }
  } finally {
    if (!completed) await callHost('ai', 'chatStreamCancel', { streamId: started.streamId }, 'ai:chat');
  }
}

const sdk = {
  ui: {
    render: (tree) => callHost('ui', 'render', { tree }),
    subscribeEvents: (id) => callHost('ui', 'subscribe', { handlerId: id }),
    onEvent: (handler) => { uiEventHandler = handler; }
  },
  identity: { destinationHash: () => callHost('identity', 'destinationHash', undefined, 'identity'), sign: (payload) => callHost('identity', 'sign', { payload }, 'identity') },
  lxmf: { send: (request) => callHost('lxmf', 'send', request, 'lxmf:send'), receive: () => callHost('lxmf', 'receive', undefined, 'lxmf:receive') },
  announce: { publish: (appData, namespace) => callHost('announce', 'publish', { appData, namespace }, 'announce:publish'), subscribe: (namespace) => callHost('announce', 'subscribe', { namespace }, 'announce:subscribe') },
  storage: { kv: { get: (key) => callHost('storage.kv', 'get', { key }, 'storage:kv'), set: (key, value) => callHost('storage.kv', 'set', { key, value }, 'storage:kv'), delete: (key) => callHost('storage.kv', 'delete', { key }, 'storage:kv') }, bee: { open: () => callHost('storage.bee', 'open', undefined, 'storage:hyperbee'), get: (key) => callHost('storage.bee', 'get', { key }, 'storage:hyperbee'), put: (key, value) => callHost('storage.bee', 'put', { key, value }, 'storage:hyperbee'), del: (key) => callHost('storage.bee', 'del', { key }, 'storage:hyperbee'), list: (options) => callHost('storage.bee', 'list', options ?? {}, 'storage:hyperbee') } },
  resource: { fetch: (request) => callHost('resource', 'fetch', request, 'resource:fetch') },
  presence: { snapshot: () => callHost('presence', 'snapshot', undefined, 'presence') },
  host: { info: () => callHost('host', 'info', undefined, 'presence') },
  workspace: { list: (prefix) => callHost('workspace', 'list', { prefix }, 'workspace'), read: (path) => callHost('workspace', 'read', { path }, 'workspace').then((r) => r.content), write: (path, content) => callHost('workspace', 'write', { path, content }, 'workspace'), patch: (path, baseLength, edits) => callHost('workspace', 'patch', { path, baseLength, edits }, 'workspace'), remove: (path) => callHost('workspace', 'delete', { path }, 'workspace') },
  ai: {
    chat: (request) => callHost('ai', 'chat', request, 'ai:chat'),
    chatStream,
    embed: (request) => callHost('ai', 'embed', request, 'ai:embed'),
    search: (request) => callHost('ai', 'search', request, 'ai:embed')
  },
  apps: { packageProject: (projectPrefix, manifest) => callHost('apps', 'package', { projectPrefix, manifest }, 'apps:package'), publish: (t256) => callHost('apps', 'publish', { t256 }, 'apps:publish'), install: (t256) => callHost('apps', 'install', { t256 }, 'apps:install'), preview: (projectPrefix, manifest, grants) => callHost('apps', 'preview', { projectPrefix, manifest, grants }, 'apps:preview'), stopPreview: () => callHost('apps', 'stopPreview', undefined, 'apps:preview') },
  share: { put: (content) => callHost('share.cas', 'put', { content }, 'share:cas'), get: (t256) => callHost('share.cas', 'get', { t256 }, 'share:cas').then((r) => r.content) }
};

self.onmessage = (event) => {
  const message = event.data;
  if (!alive) return;
  if (message.type === 'broker-response' && message.id) {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.ok ? waiter.resolve(message.result) : waiter.reject(new Error(message.error?.message ?? 'Broker request failed'));
    return;
  }
  if (message.type === 'ping') {
    self.postMessage({ type: 'broker-response', id: message.id, ok: true, result: 'pong' });
    return;
  }
  if (message.type === 'kill') {
    alive = false;
    self.close();
  }
  if (message.type === 'ui-event' && uiEventHandler !== null) {
    void Promise.resolve(uiEventHandler({ nodeId: message.nodeId, event: message.event, value: message.value }));
  }
};

const bundleSource = (typeof workerData !== 'undefined' ? workerData.bundleSource : self.bootstrapBundle);
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction('sdk', bundleSource)(sdk).catch((error) => self.postMessage({ type: 'app-error', message: String(error) }));
`;
}
