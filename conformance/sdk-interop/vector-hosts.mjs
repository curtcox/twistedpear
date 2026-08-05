// Shared machinery for the SPEC-SDK vector suite: host construction over a
// chosen binding ("loopback" = the packaged SPEC-BIND-LOOPBACK binding,
// "reference" = the sdk-interop CI binding with disk-backed hyperbee and
// inline backends), step execution, and outcome normalization. Used by the
// vector generator (scripts/generate-sdk-vectors.mjs), by
// conformance/sdk-interop/run.mjs, and by conformance/bind-loopback/run.mjs.
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CorestoreBeeBackend,
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  createLoopbackBinding,
} from "../../packages/miniapp-runtime/dist/index.js";

export const PRESENCE = {
  peers: 2,
  onlineInterfaces: 1,
  preferredInterface: "auto",
};
export const RESOURCES = new Map([
  ["offer:demo", new TextEncoder().encode("hello-resource")],
]);
export const KV_QUOTA_BYTES = 96;
export const BEE_QUOTA_BYTES = 128;

function casBackend() {
  const blobs = new Map();
  return {
    put: async (_appId, bytes) => {
      const id = createHash("sha256").update(bytes).digest("hex");
      blobs.set(id, bytes.slice());
      return { t256: id };
    },
    get: async (_appId, id) => blobs.get(id)?.slice() ?? null,
  };
}

function appsBackend() {
  return {
    package: async () => ({ t256: "A".repeat(94) }),
    publish: async () => ({ published: true }),
    install: async () => ({ installed: true }),
    preview: async () => ({ launched: true }),
    stopPreview: async () => {},
  };
}

const CONFIRMATION_CHANNELS = {
  approve: { confirm: async () => ({ approved: true }) },
  deny: { confirm: async () => ({ approved: false }) },
  timeout: { confirm: async () => ({ approved: false, detail: "timeout" }) },
};

/**
 * hostKey selects the host configuration a vector runs against:
 *   standard        — full binding, no apps/ai, no confirmation channel
 *   apps-noconfirm  — apps backend, no confirmation channel
 *   apps-approve / apps-deny / apps-timeout — apps backend + scripted channel
 *   ai-configured   — stub AI chat backend
 */
export function createVectorHost(hostKey, bindingKind) {
  let substrate;
  let cleanup = () => {};
  if (bindingKind === "loopback") {
    substrate = createLoopbackBinding({
      beeQuotaBytes: BEE_QUOTA_BYTES,
      presence: PRESENCE,
      resources: RESOURCES,
    });
  } else if (bindingKind === "reference") {
    const beePath = mkdtempSync(join(tmpdir(), "sdk-vectors-bee-"));
    const beeBackend = new CorestoreBeeBackend(beePath, BEE_QUOTA_BYTES);
    substrate = {
      kvBackend: new MemoryKvStoreBackend(),
      beeBackend,
      resourceBackend: {
        fetch: async (_appId, request) => {
          const bytes = RESOURCES.get(request.resourceId);
          if (bytes === undefined)
            throw new Error(`Resource not found: ${request.resourceId}`);
          if (
            request.budgetBytes !== undefined &&
            bytes.length > request.budgetBytes
          ) {
            throw new Error(
              `Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`,
            );
          }
          return bytes;
        },
      },
      presenceBackend: { snapshot: async () => PRESENCE },
      ready: beeBackend.ready(),
      close: async () => {
        await beeBackend.close?.();
        rmSync(beePath, { recursive: true, force: true });
      },
    };
    cleanup = substrate.close;
  } else {
    throw new Error(`unknown binding kind: ${bindingKind}`);
  }

  const options = {
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(new MemoryKvStoreBackend()),
    kvBackend: substrate.kvBackend,
    beeBackend: substrate.beeBackend,
    resourceBackend: substrate.resourceBackend,
    presenceBackend: substrate.presenceBackend,
    ...(substrate.lxmfBackend === undefined
      ? {}
      : { lxmfBackend: substrate.lxmfBackend }),
    ...(substrate.announceService === undefined
      ? {}
      : { announceService: substrate.announceService }),
    kvQuotaBytes: KV_QUOTA_BYTES,
    casBackend: casBackend(),
  };

  if (hostKey.startsWith("apps-")) {
    options.appsBackend = appsBackend();
    const channel = CONFIRMATION_CHANNELS[hostKey.slice("apps-".length)];
    if (channel !== undefined) options.confirmationChannel = channel;
  }
  if (hostKey === "ai-configured") {
    options.aiBackend = {
      chat: async () => ({
        reply: "stubbed reply",
        usage: { inputTokens: 1, outputTokens: 2 },
      }),
    };
  }

  const host = new MiniappHost(options);
  return { host, ready: substrate.ready ?? Promise.resolve(), close: cleanup };
}

export function manifestFor(app) {
  return {
    name: app.name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: app.declared,
    publisherPublicKey: `publisher-${app.name}`,
  };
}

export function expandDirectives(value) {
  if (value !== null && typeof value === "object") {
    if (typeof value.$textBytes === "string")
      return new TextEncoder().encode(value.$textBytes);
    if (typeof value.$asciiString === "number")
      return "x".repeat(value.$asciiString);
    if (Array.isArray(value)) return value.map(expandDirectives);
    const out = {};
    for (const [key, item] of Object.entries(value))
      out[key] = expandDirectives(item);
    return out;
  }
  return value;
}

/** Strip timing and instance-local identifiers; encode bytes as {$bytes}. */
export function normalizeValue(value, key = "") {
  if (value instanceof Uint8Array) {
    return {
      $bytes: [...value].map((b) => b.toString(16).padStart(2, "0")).join(""),
    };
  }
  if (key === "receivedAt" || key === "seq") return 0;
  if (typeof value === "string" && /^lxmf-\d+-[0-9a-f]+$/.test(value))
    return "lxmf-<id>";
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const child of Object.keys(value).sort())
      out[child] = normalizeValue(value[child], child);
    return out;
  }
  return value;
}

let requestCounter = 0;

export async function executeStep(host, app, step) {
  const manifest = manifestFor(app);
  const repeat = step.repeat ?? 1;
  let response;
  for (let i = 0; i < repeat; i += 1) {
    requestCounter += 1;
    response = await host.dispatchRaw(
      {
        id: `vector-${requestCounter}`,
        namespace: step.call.namespace,
        method: step.call.method,
        ...(step.call.capability === undefined
          ? {}
          : { capability: step.call.capability }),
        ...(step.call.payload === undefined
          ? {}
          : { payload: expandDirectives(step.call.payload) }),
      },
      manifest,
      app.granted,
    );
  }
  return response;
}

export async function registerApp(host, app) {
  await host.setGrants(
    app.name,
    `publisher-${app.name}`,
    app.declared,
    app.granted,
  );
}
