/**
 * Shared browser Worker bootstrap for Bare and web-iframe sandbox backends.
 * The host injects `bundleSource` via an `init` message before running the app.
 */
import { lifecycleWorkerFragment } from "./lifecycle-worker-fragment.js";
import {
  appErrorFragment,
  consoleShimFragment,
  forbiddenGlobalsFragment,
  pushHandlerFragment,
} from "./bootstrap-fragments.js";
import { timeShimsFragment } from "../time-shims.js";

export function createBrowserWorkerBootstrapSource(): string {
  return `
const pending = new Map();
let requestId = 0;
let alive = true;
let uiEventHandler = null;
let bundleSource = null;
${appErrorFragment("self.postMessage")}
${consoleShimFragment("self.postMessage")}
${forbiddenGlobalsFragment()}
${timeShimsFragment("self.postMessage")}
${pushHandlerFragment()}
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
  lxmf: { send: (request) => callHost('lxmf', 'send', request, 'lxmf:send'), receive: () => callHost('lxmf', 'receive', undefined, 'lxmf:receive'), onMessage: (handler) => { lxmfMessageHandler = handler; } },
  announce: { publish: (appData, namespace) => callHost('announce', 'publish', { appData, namespace }, 'announce:publish'), subscribe: (namespace) => callHost('announce', 'subscribe', { namespace }, 'announce:subscribe'), onEvent: (handler) => { announceEventHandler = handler; } },
  storage: { kv: { get: (key) => callHost('storage.kv', 'get', { key }, 'storage:kv'), set: (key, value) => callHost('storage.kv', 'set', { key, value }, 'storage:kv'), delete: (key) => callHost('storage.kv', 'delete', { key }, 'storage:kv') }, bee: { open: () => callHost('storage.bee', 'open', undefined, 'storage:hyperbee'), get: (key) => callHost('storage.bee', 'get', { key }, 'storage:hyperbee'), put: (key, value) => callHost('storage.bee', 'put', { key, value }, 'storage:hyperbee'), del: (key) => callHost('storage.bee', 'del', { key }, 'storage:hyperbee'), list: (options) => callHost('storage.bee', 'list', options ?? {}, 'storage:hyperbee') }, sync: { open: (topic) => callHost('storage.sync', 'open', { topic }, 'storage:sync'), append: (topic, payload, extra) => callHost('storage.sync', 'append', Object.assign({ topic, payload }, extra ?? {}), 'storage:sync'), view: (topic) => callHost('storage.sync', 'view', { topic }, 'storage:sync') } },
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
  apps: { compile: (projectPrefix) => callHost('apps', 'compile', { projectPrefix }, 'apps:package'), format: (content) => callHost('apps', 'format', { content }, 'apps:package'), diagnostics: (projectPrefix, path) => callHost('apps', 'diagnostics', { projectPrefix, path }, 'apps:package'), packageProject: (projectPrefix, manifest) => callHost('apps', 'package', { projectPrefix, manifest }, 'apps:package'), publish: (t256) => callHost('apps', 'publish', { t256 }, 'apps:publish'), install: (t256) => callHost('apps', 'install', { t256 }, 'apps:install'), preview: (projectPrefix, manifest, grants) => callHost('apps', 'preview', { projectPrefix, manifest, grants }, 'apps:preview'), stopPreview: () => callHost('apps', 'stopPreview', undefined, 'apps:preview'), channel: { open: (destination) => callHost('apps.channel', 'open', destination, 'apps:channel'), send: (destination, payload) => callHost('apps.channel', 'send', Object.assign({}, destination, { payload: payload }), 'apps:channel'), receive: () => callHost('apps.channel', 'receive', undefined, 'apps:channel'), close: (destination) => callHost('apps.channel', 'close', destination, 'apps:channel'), peers: () => callHost('apps.channel', 'peers', undefined, 'apps:channel'), onMessage: (handler) => { channelMessageHandler = handler; } } },
  share: { put: (content) => callHost('share.cas', 'put', { content }, 'share:cas'), get: (t256) => callHost('share.cas', 'get', { t256 }, 'share:cas').then((r) => r.content) },
  freenet: { get: (keyHex) => callHost('freenet', 'get', { keyHex }, 'freenet:contract'), put: (options) => callHost('freenet', 'put', options, 'freenet:contract'), update: (options) => callHost('freenet', 'update', options, 'freenet:contract') },
  relay: { setMode: (mode) => callHost('relay', 'setMode', { mode }, 'relay:configure'), enable: (kind, options) => callHost('relay', 'enable', { kind, options }, 'relay:configure'), disable: (kind) => callHost('relay', 'disable', { kind }, 'relay:configure'), setDirection: (kind, direction) => callHost('relay', 'setDirection', { kind, direction }, 'relay:configure'), configure: (kind, patch) => callHost('relay', 'configure', { kind, patch }, 'relay:configure'), setPolicy: (policy) => callHost('relay', 'setPolicy', { policy }, 'relay:configure'), list: () => callHost('relay', 'list', {}, 'relay:read'), status: () => callHost('relay', 'status', {}, 'relay:read'), diagnostics: () => callHost('relay', 'diagnostics', {}, 'relay:read') },
  peers: { request: (options) => callHost('peers', 'request', options, 'peer:connect'), listen: (options) => callHost('peers', 'listen', options, 'peer:connect'), diagnostics: () => callHost('peers', 'diagnostics', {}, 'peer:connect'), info: (handle) => callHost('peers', 'info', { handle }, 'peer:connect'), close: (handle) => callHost('peers', 'close', { handle }, 'peer:connect').then(() => undefined) },
  links: { peers: () => callHost('links', 'peers', {}, 'link:observe'), watch: async function* () { let cursor; while (true) { const batch = await callHost('links', 'watch', { cursor }, 'link:observe'); cursor = batch.cursor; for (const event of batch.events) yield event; } }, probe: (peer, options) => callHost('links', 'probe', { peer, options }, 'link:probe') },
  device: { inventory: () => callHost('device', 'inventory'), diagnostics: () => callHost('device', 'diagnostics'), open: (request) => callHost('device', 'open', request), close: (handle) => callHost('device', 'close', { handle: typeof handle === 'string' ? handle : handle.handle }), read: (handle) => callHost('device', 'read', { handle: typeof handle === 'string' ? handle : handle.handle }), write: (handle, command) => callHost('device', 'write', { handle: typeof handle === 'string' ? handle : handle.handle, command }), stream: (handle, peer, constraints) => callHost('device', 'stream', { handle: typeof handle === 'string' ? handle : handle.handle, peer, constraints }), closeStream: (handle) => callHost('device', 'closeStream', { handle: typeof handle === 'string' ? handle : handle.handle }), streams: () => callHost('device', 'streams', {}, 'device:stream'), shareOffers: () => callHost('device', 'shareOffers', {}, 'device:share-policy:read'), requestShareOffer: (purpose) => callHost('device', 'requestShareOffer', { purpose }, 'device:stream'), revokeShareOffer: (id) => callHost('device', 'revokeShareOffer', { id }, 'device:stream').then((result) => result.revoked), incoming: async function* () { let cursor; while (true) { const batch = await callHost('device', 'incoming', { cursor }, 'device:stream'); cursor = batch.cursor; for (const offer of batch.offers) yield offer; } }, accept: (offer, sink) => callHost('device', 'accept', { offerId: typeof offer === 'string' ? offer : offer.id, sink }, 'device:stream'), decline: (offer, reason) => callHost('device', 'decline', { offerId: typeof offer === 'string' ? offer : offer.id, reason }, 'device:stream') },
  notify: { post: (request) => callHost('notify', 'post', request, 'notify:post') },
  crypto: { randomBytes: (n) => callHost('crypto', 'randomBytes', { n }), hash: (alg, bytes) => callHost('crypto', 'hash', { alg, bytes }), hmac: (alg, key, bytes) => callHost('crypto', 'hmac', { alg, key, bytes }), timingSafeEqual: (a, b) => callHost('crypto', 'timingSafeEqual', { a, b }) }
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
      reportAppError("bundle", error);
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

  if (__tpHandleTimeShimMessage(message)) return;
  if (handleLifecycleMessage(message)) return;
  if (dispatchPush(message)) return;
  dispatchUiEvent(message);
};
`;
}
