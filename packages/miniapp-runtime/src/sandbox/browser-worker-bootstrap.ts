/**
 * Shared browser Worker bootstrap for Bare and web-iframe sandbox backends.
 * The host injects `bundleSource` via an `init` message before running the app.
 */
export function createBrowserWorkerBootstrapSource(): string {
  return `
const pending = new Map();
let requestId = 0;
let alive = true;
let uiEventHandler = null;
let bundleSource = null;

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
  share: { put: (content) => callHost('share.cas', 'put', { content }, 'share:cas'), get: (t256) => callHost('share.cas', 'get', { t256 }, 'share:cas').then((r) => r.content) },
  peers: { request: (options) => callHost('peers', 'request', options, 'peer:connect'), listen: (options) => callHost('peers', 'listen', options, 'peer:connect'), diagnostics: () => callHost('peers', 'diagnostics', {}, 'peer:connect'), info: (handle) => callHost('peers', 'info', { handle }, 'peer:connect'), close: (handle) => callHost('peers', 'close', { handle }, 'peer:connect').then(() => undefined) }
};

function runBundle() {
  if (bundleSource === null) {
    return;
  }

  globalThis.__miniapp_sdk__ = sdk;
  const moduleSource = \`const sdk = globalThis.__miniapp_sdk__;
\${bundleSource}
export {}\`;
  const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
  import(moduleUrl)
    .catch((error) => {
      self.postMessage({ type: "app-error", message: error instanceof Error ? error.message : String(error) });
    })
    .finally(() => {
      URL.revokeObjectURL(moduleUrl);
    });
}

self.onmessage = (event) => {
  const message = event.data;
  if (!alive) {
    return;
  }

  if (message.type === 'init') {
    bundleSource = message.bundleSource;
    runBundle();
    return;
  }

  if (message.type === 'broker-response' && message.id) {
    const waiter = pending.get(message.id);
    if (!waiter) {
      return;
    }

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
    return;
  }

  if (message.type === 'ui-event' && uiEventHandler !== null) {
    void Promise.resolve(uiEventHandler({ nodeId: message.nodeId, event: message.event, value: message.value }));
  }
};
`;
}
