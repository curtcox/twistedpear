// Shared broker call script for SPEC-BIND-LOOPBACK (and reused by the
// SPEC-SDK vector tooling): a fixed sequence of namespaced calls covering
// identity, storage, lxmf loopback delivery (self and cross-app), announce
// echo, presence, resource budgets, and a capability denial. Executed over a
// binding, it yields a normalized observable result list — identical across
// conforming bindings minus timing.

const text = (value) => new TextEncoder().encode(value);

export const APPS = {
  "app-a": [
    "identity",
    "lxmf:send",
    "lxmf:receive",
    "storage:kv",
    "storage:hyperbee",
    "announce:publish",
    "announce:subscribe",
    "resource:fetch",
    "presence"
  ],
  "app-b": [
    "identity",
    "lxmf:send",
    "lxmf:receive",
    "storage:kv",
    "storage:hyperbee",
    "announce:publish",
    "announce:subscribe",
    "resource:fetch",
    "presence"
  ],
  "app-c": ["identity"]
};

export const CALL_SCRIPT = [
  { app: "app-a", namespace: "identity", method: "destinationHash", capability: "identity" },
  { app: "app-b", namespace: "identity", method: "destinationHash", capability: "identity" },

  { app: "app-a", namespace: "storage.kv", method: "set", capability: "storage:kv", payload: { key: "greeting", value: text("hello") } },
  { app: "app-a", namespace: "storage.kv", method: "get", capability: "storage:kv", payload: { key: "greeting" } },
  { app: "app-b", namespace: "storage.kv", method: "get", capability: "storage:kv", payload: { key: "greeting" }, note: "cross-app isolation: null" },
  { app: "app-a", namespace: "storage.kv", method: "delete", capability: "storage:kv", payload: { key: "greeting" } },
  { app: "app-a", namespace: "storage.kv", method: "get", capability: "storage:kv", payload: { key: "greeting" } },

  { app: "app-a", namespace: "storage.bee", method: "open", capability: "storage:hyperbee" },
  { app: "app-a", namespace: "storage.bee", method: "put", capability: "storage:hyperbee", payload: { key: "post:1", value: text("first") } },
  { app: "app-a", namespace: "storage.bee", method: "get", capability: "storage:hyperbee", payload: { key: "post:1" } },
  { app: "app-a", namespace: "storage.bee", method: "list", capability: "storage:hyperbee", payload: { options: { limit: 10 } } },
  { app: "app-a", namespace: "storage.bee", method: "del", capability: "storage:hyperbee", payload: { key: "post:1" } },
  { app: "app-a", namespace: "storage.bee", method: "get", capability: "storage:hyperbee", payload: { key: "post:1" } },

  { app: "app-a", namespace: "lxmf", method: "send", capability: "lxmf:send", payload: { to: "app-b", subject: "hi", body: "hello b" } },
  { app: "app-b", namespace: "lxmf", method: "send", capability: "lxmf:send", payload: { to: "app-b", subject: "self", body: "note to self" } },
  { app: "app-b", namespace: "lxmf", method: "receive", capability: "lxmf:receive", note: "delivery to self and from app-a" },
  { app: "app-b", namespace: "lxmf", method: "receive", capability: "lxmf:receive", note: "inbox drained" },
  { app: "app-a", namespace: "lxmf", method: "receive", capability: "lxmf:receive", note: "nothing addressed to app-a" },

  { app: "app-a", namespace: "announce", method: "publish", capability: "announce:publish", payload: { appData: text("post-1"), namespace: "board" } },
  { app: "app-b", namespace: "announce", method: "subscribe", capability: "announce:subscribe", payload: { namespace: "board" } },

  { app: "app-a", namespace: "presence", method: "snapshot", capability: "presence" },

  { app: "app-a", namespace: "resource", method: "fetch", capability: "resource:fetch", payload: { resourceId: "offer:demo", budgetBytes: 4096 } },
  { app: "app-a", namespace: "resource", method: "fetch", capability: "resource:fetch", payload: { resourceId: "offer:demo", budgetBytes: 4 }, note: "budget exceeded" },
  { app: "app-a", namespace: "resource", method: "fetch", capability: "resource:fetch", payload: { resourceId: "offer:missing" }, note: "unknown resource" },

  { app: "app-c", namespace: "storage.kv", method: "get", capability: "storage:kv", payload: { key: "greeting" }, note: "capability denial" }
];

export function manifestFor(appId) {
  return {
    name: appId,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: APPS[appId],
    publisherPublicKey: `publisher-${appId}`
  };
}

export async function registerGrants(host) {
  for (const [appId, capabilities] of Object.entries(APPS)) {
    await host.setGrants(appId, `publisher-${appId}`, capabilities, capabilities);
  }
}

export async function runCallScript(host) {
  const results = [];
  for (const [index, call] of CALL_SCRIPT.entries()) {
    const manifest = manifestFor(call.app);
    const response = await host.dispatchRaw(
      {
        id: `call-${index}`,
        namespace: call.namespace,
        method: call.method,
        capability: call.capability,
        ...(call.payload === undefined ? {} : { payload: call.payload })
      },
      manifest,
      manifest.capabilities
    );
    results.push({
      call: `${call.app} ${call.namespace}.${call.method}${call.note === undefined ? "" : ` (${call.note})`}`,
      response
    });
  }
  return results;
}

/** Strip timing and instance-local identifiers so bindings compare equal. */
export function normalizeResults(results) {
  const normalize = (key, value) => {
    if (value instanceof Uint8Array) {
      return { $bytes: [...value].map((b) => b.toString(16).padStart(2, "0")).join("") };
    }
    if (key === "receivedAt" || key === "seq") return 0;
    if (typeof value === "string" && /^lxmf-\d+-[0-9a-f]+$/.test(value)) return "lxmf-<id>";
    return value;
  };
  const walk = (value, key = "") => {
    const replaced = normalize(key, value);
    if (replaced !== value) return replaced;
    if (Array.isArray(value)) return value.map((item) => walk(item));
    if (value !== null && typeof value === "object") {
      const out = {};
      for (const child of Object.keys(value).sort()) out[child] = walk(value[child], child);
      return out;
    }
    return value;
  };
  return walk(results);
}
