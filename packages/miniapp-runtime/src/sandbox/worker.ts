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
  new (
    source: string | URL,
    options?: { type?: string; data?: unknown },
  ): BareWorkerLike;
}

export class BareWorkerSandboxBackend implements SandboxBackend {
  readonly name = "bare-worker";

  spawn(options: SandboxSpawnOptions): Promise<SandboxInstance> {
    const WorkerCtor = (globalThis as { Worker?: BareWorkerConstructor })
      .Worker;
    if (WorkerCtor === undefined) {
      return Promise.reject(new WorkerBackendUnavailableError());
    }

    const source = prepareBundleSource(
      new TextDecoder().decode(options.bundle),
    );
    const bootstrap = createBareBootstrapSource();
    const worker = new WorkerCtor(
      `data:text/javascript,${encodeURIComponent(bootstrap)}`,
      {
        type: "module",
        data: { appId: options.appId, bundleSource: source },
      },
    );

    const pending = new Map<
      string,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
    const pings = new SandboxPing();
    const checkpoints = createCheckpointCollector();
    let killed = false;
    let alive = true;
    let lastError: string | null = null;

    worker.onmessage = (event: { data: unknown }) => {
      if (checkpoints.handleMessage(event.data)) {
        return;
      }
      if (
        event.data !== null &&
        typeof event.data === "object" &&
        "type" in event.data &&
        (event.data as { type: string }).type === "app-error"
      ) {
        lastError = String(
          (event.data as { message?: unknown }).message ?? "app-error",
        );
        alive = false;
        return;
      }

      handleBareWorkerHostMessage(worker, options, pending, event.data);
    };

    return Promise.resolve({
      id: options.appId,
      lastError(): string | null {
        return lastError;
      },
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
      kill(reason: string): Promise<void> {
        if (killed) {
          return Promise.resolve();
        }

        killed = true;
        alive = false;
        pings.dispose();
        worker.postMessage({ type: "kill", reason });
        worker.terminate();
        return Promise.resolve();
      },
    });
  }
}

function handleBareWorkerHostMessage(
  worker: BareWorkerLike,
  options: SandboxSpawnOptions,
  pending: Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >,
  data: unknown,
): void {
  dispatchWorkerBrokerMessage(
    data as {
      type: string;
      id?: string;
      ok?: boolean;
      result?: unknown;
      error?: { message: string };
    },
    {
      worker,
      pending,
      endpoint: options.brokerEndpoint as {
        request?: (request: unknown) => Promise<unknown>;
      },
    },
  );
}

function createBareBootstrapSource(): string {
  return `
const pending = new Map();
let requestId = 0;
let alive = true;
let uiEventHandler = null;
${lifecycleWorkerFragment("self.postMessage")}
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
  host: Object.assign({ info: () => callHost('host', 'info', undefined, 'presence') }, lifecycleHost),
  workspace: { list: (prefix) => callHost('workspace', 'list', { prefix }, 'workspace'), read: (path) => callHost('workspace', 'read', { path }, 'workspace').then((r) => r.content), write: (path, content) => callHost('workspace', 'write', { path, content }, 'workspace'), patch: (path, baseLength, edits) => callHost('workspace', 'patch', { path, baseLength, edits }, 'workspace'), remove: (path) => callHost('workspace', 'delete', { path }, 'workspace') },
  ai: {
    chat: (request) => callHost('ai', 'chat', request, 'ai:chat'),
    chatStream,
    embed: (request) => callHost('ai', 'embed', request, 'ai:embed'),
    search: (request) => callHost('ai', 'search', request, 'ai:embed')
  },
  apps: { compile: (projectPrefix) => callHost('apps', 'compile', { projectPrefix }, 'apps:package'), packageProject: (projectPrefix, manifest) => callHost('apps', 'package', { projectPrefix, manifest }, 'apps:package'), publish: (t256) => callHost('apps', 'publish', { t256 }, 'apps:publish'), install: (t256) => callHost('apps', 'install', { t256 }, 'apps:install'), preview: (projectPrefix, manifest, grants) => callHost('apps', 'preview', { projectPrefix, manifest, grants }, 'apps:preview'), stopPreview: () => callHost('apps', 'stopPreview', undefined, 'apps:preview') },
  share: { put: (content) => callHost('share.cas', 'put', { content }, 'share:cas'), get: (t256) => callHost('share.cas', 'get', { t256 }, 'share:cas').then((r) => r.content) },
  freenet: { get: (keyHex) => callHost('freenet', 'get', { keyHex }, 'freenet:contract'), put: (options) => callHost('freenet', 'put', options, 'freenet:contract'), update: (options) => callHost('freenet', 'update', options, 'freenet:contract') },
  relay: { setMode: (mode) => callHost('relay', 'setMode', { mode }, 'relay:configure'), enable: (kind, options) => callHost('relay', 'enable', { kind, options }, 'relay:configure'), disable: (kind) => callHost('relay', 'disable', { kind }, 'relay:configure'), setDirection: (kind, direction) => callHost('relay', 'setDirection', { kind, direction }, 'relay:configure'), configure: (kind, patch) => callHost('relay', 'configure', { kind, patch }, 'relay:configure'), setPolicy: (policy) => callHost('relay', 'setPolicy', { policy }, 'relay:configure'), list: () => callHost('relay', 'list', {}, 'relay:read'), status: () => callHost('relay', 'status', {}, 'relay:read'), diagnostics: () => callHost('relay', 'diagnostics', {}, 'relay:read') },
  peers: { request: (options) => callHost('peers', 'request', options, 'peer:connect'), listen: (options) => callHost('peers', 'listen', options, 'peer:connect'), diagnostics: () => callHost('peers', 'diagnostics', {}, 'peer:connect'), info: (handle) => callHost('peers', 'info', { handle }, 'peer:connect'), close: (handle) => callHost('peers', 'close', { handle }, 'peer:connect').then(() => undefined) },
  links: { peers: () => callHost('links', 'peers', {}, 'link:observe'), watch: async function* () { let cursor; while (true) { const batch = await callHost('links', 'watch', { cursor }, 'link:observe'); cursor = batch.cursor; for (const event of batch.events) yield event; } }, probe: (peer, options) => callHost('links', 'probe', { peer, options }, 'link:probe') },
  device: { inventory: () => callHost('device', 'inventory'), diagnostics: () => callHost('device', 'diagnostics'), open: (request) => callHost('device', 'open', request), close: (handle) => callHost('device', 'close', { handle: typeof handle === 'string' ? handle : handle.handle }), read: (handle) => callHost('device', 'read', { handle: typeof handle === 'string' ? handle : handle.handle }), write: (handle, command) => callHost('device', 'write', { handle: typeof handle === 'string' ? handle : handle.handle, command }), stream: (handle, peer, constraints) => callHost('device', 'stream', { handle: typeof handle === 'string' ? handle : handle.handle, peer, constraints }), closeStream: (handle) => callHost('device', 'closeStream', { handle: typeof handle === 'string' ? handle : handle.handle }), streams: () => callHost('device', 'streams', {}, 'device:stream'), shareOffers: () => callHost('device', 'shareOffers', {}, 'device:share-policy:read'), requestShareOffer: (purpose) => callHost('device', 'requestShareOffer', { purpose }, 'device:stream'), revokeShareOffer: (id) => callHost('device', 'revokeShareOffer', { id }, 'device:stream').then((result) => result.revoked), incoming: async function* () { let cursor; while (true) { const batch = await callHost('device', 'incoming', { cursor }, 'device:stream'); cursor = batch.cursor; for (const offer of batch.offers) yield offer; } }, accept: (offer, sink) => callHost('device', 'accept', { offerId: typeof offer === 'string' ? offer : offer.id, sink }, 'device:stream'), decline: (offer, reason) => callHost('device', 'decline', { offerId: typeof offer === 'string' ? offer : offer.id, reason }, 'device:stream') }
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
  if (handleLifecycleMessage(message)) return;
  if (message.type === 'ui-event' && uiEventHandler !== null) {
    void Promise.resolve(uiEventHandler({ nodeId: message.nodeId, event: message.event, value: message.value }));
  }
};

const bundleSource = (typeof workerData !== 'undefined' ? workerData.bundleSource : self.bootstrapBundle);
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction('sdk', bundleSource)(sdk).catch((error) => self.postMessage({ type: 'app-error', message: String(error) }));
`;
}
