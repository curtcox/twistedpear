/**
 * W-S2 browser spike: opaque-origin iframe + worker sandbox isolation and killability.
 * Bundled for Playwright; reports status on window.__WEB_SANDBOX__.
 */

import { MiniappLifecycle } from "../../packages/miniapp-runtime/dist/lifecycle.js";
import { WebSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/web.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createProbeLifecycle(bundle, appId = "probe") {
  let capturedProbes = null;
  const backend = new WebSandboxBackend();
  const lifecycle = new MiniappLifecycle(backend,
    {
    appId,
    version: "1.0.0",
    entryPath: "bundle.js",
    bundle,
    brokerEndpoint: {
      request: async (request) => {
        if (request.namespace === "__probe__" && request.method === "report") {
          capturedProbes = request.payload?.probes ?? null;
          return { id: request.id, ok: true, result: "recorded" };
        }

        return { id: request.id, ok: true, result: "ok" };
      }
    }
  },
    { now: () => Date.now(), delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) });

  return {
    backend,
    lifecycle,
    getProbes: () => capturedProbes
  };
}

const smokeBundle = new TextEncoder().encode(`
self.postMessage({
  type: "broker-request",
  id: "probe-smoke",
  namespace: "__probe__",
  method: "report",
  payload: { probes: ["smoke-ok"] },
  sentAt: Date.now()
});
`);

const isolationBundle = new TextEncoder().encode(`
const probes = [];

try {
  void parent.localStorage;
  probes.push("parent-localStorage-leaked");
} catch {
  probes.push("parent-localStorage-blocked");
}

try {
  void parent.indexedDB;
  probes.push("parent-idb-leaked");
} catch {
  probes.push("parent-idb-blocked");
}

try {
  const marker = parent.localStorage.getItem("twistedpear-host-marker");
  if (marker === "host-secret") {
    probes.push("host-marker-leaked");
  } else {
    probes.push("host-marker-unreachable");
  }
} catch {
  probes.push("host-marker-blocked");
}

try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 500);
  await fetch("https://example.com/", { mode: "no-cors", signal: controller.signal });
  clearTimeout(timer);
  probes.push("fetch-leaked");
} catch {
  probes.push("fetch-blocked");
}

try {
  localStorage.setItem("sandbox-probe", "sandbox-only");
  probes.push("sandbox-localStorage-leaked");
} catch {
  probes.push("sandbox-localStorage-blocked");
}

self.postMessage({
  type: "broker-request",
  id: "probe-report",
  namespace: "__probe__",
  method: "report",
  payload: { probes },
  sentAt: Date.now()
});
`);

const wasmProbeBundle = new TextEncoder().encode(`
const wasm = Uint8Array.from([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0,
  7, 7, 1, 3, 114, 117, 110, 0, 0, 10, 4, 1, 2, 0, 11
]);
const { instance } = await WebAssembly.instantiate(wasm);
instance.exports.run();
self.postMessage({
  type: "broker-request",
  id: "probe-wasm",
  namespace: "__probe__",
  method: "report",
  payload: { probes: ["wasm-ok"] },
  sentAt: Date.now()
});
`);

const busyLoopBundle = new TextEncoder().encode("while (true) {}");

const escapeBundle = new TextEncoder().encode(`
try { void require; } catch { /* blocked */ }
try { void process; } catch { /* blocked */ }
const chain = (() => { try { return {}.constructor.constructor("return this")(); } catch { return null; } })();
if (chain !== null && typeof chain.document === "object") {
  throw new Error("constructor-chain escape");
}
`);

async function waitForProbes(getProbes, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probes = getProbes();
    if (probes !== null) {
      return probes;
    }

    await sleep(50);
  }

  return null;
}

async function runSmokeProbe() {
  const { lifecycle, getProbes } = createProbeLifecycle(smokeBundle, "smoke");
  await lifecycle.launch();
  const probes = await waitForProbes(getProbes);
  await lifecycle.stop("cleanup");

  if (probes === null || !probes.includes("smoke-ok")) {
    throw new Error(`sandbox smoke probe failed: ${JSON.stringify(probes)}`);
  }
}

async function runIsolationProbe() {
  localStorage.setItem("twistedpear-host-marker", "host-secret");

  const { lifecycle, getProbes } = createProbeLifecycle(isolationBundle, "isolation");
  await lifecycle.launch();
  const capturedProbes = await waitForProbes(getProbes);
  await lifecycle.stop("cleanup");

  if (capturedProbes === null) {
    throw new Error("isolation probe did not report");
  }

  const required = [
    "parent-localStorage-blocked",
    "parent-idb-blocked",
    "host-marker-blocked",
    "fetch-blocked",
    "sandbox-localStorage-blocked"
  ];

  for (const probe of required) {
    if (!capturedProbes.includes(probe)) {
      throw new Error(`isolation probe missing ${probe}: ${JSON.stringify(capturedProbes)}`);
    }
  }
}

async function runEscapeProbe() {
  const { lifecycle } = createProbeLifecycle(escapeBundle, "escape");
  await lifecycle.launch();
  await sleep(150);
  await lifecycle.stop("cleanup");
}

async function runWasmProbe() {
  const { backend, lifecycle, getProbes } = createProbeLifecycle(
    wasmProbeBundle,
    "wasm"
  );
  await lifecycle.launch();
  const probes = await waitForProbes(getProbes);
  const diagnostics = backend.lastSpawnDiagnostics;
  await lifecycle.stop("cleanup");
  return {
    supported: probes?.includes("wasm-ok") === true,
    error:
      probes?.includes("wasm-ok") === true
        ? null
        : diagnostics?.detail ?? diagnostics?.reason ?? "probe did not complete"
  };
}

async function runBusyLoopKill() {
  const backend = new WebSandboxBackend();
  const lifecycle = new MiniappLifecycle(backend,
    {
      appId: "busy-loop",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: busyLoopBundle,
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true, result: "ok" })
      }
    },
    { now: () => Date.now(), delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),  watchdogMs: 250 });

  const started = performance.now();
  await lifecycle.launch();

  let killed = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(50);
    const snapshot = await lifecycle.watchdogPing();
    if (snapshot.state === "crashed") {
      killed = true;
      break;
    }
  }

  const killMs = Math.round(performance.now() - started);
  await lifecycle.stop("cleanup");

  if (!killed) {
    throw new Error("busy-loop app was not killed by watchdog");
  }

  if (killMs >= 1_000) {
    throw new Error(`busy-loop kill exceeded 1s (${killMs}ms)`);
  }

  return killMs;
}

async function main() {
  globalThis.__WEB_SANDBOX__ = {
    status: "running",
    smoke: null,
    isolation: null,
    escape: null,
    wasm: null,
    busyLoopKillMs: null
  };

  await runSmokeProbe();
  globalThis.__WEB_SANDBOX__.smoke = "ok";

  await runIsolationProbe();
  globalThis.__WEB_SANDBOX__.isolation = "ok";

  await runEscapeProbe();
  globalThis.__WEB_SANDBOX__.escape = "ok";

  globalThis.__WEB_SANDBOX__.wasm = await runWasmProbe();

  const killMs = await runBusyLoopKill();
  globalThis.__WEB_SANDBOX__.busyLoopKillMs = killMs;
  globalThis.__WEB_SANDBOX__.status = "done";
}

main().catch((error) => {
  globalThis.__WEB_SANDBOX__ = {
    status: "error",
    smoke: globalThis.__WEB_SANDBOX__?.smoke ?? null,
    isolation: globalThis.__WEB_SANDBOX__?.isolation ?? null,
    escape: globalThis.__WEB_SANDBOX__?.escape ?? null,
    wasm: globalThis.__WEB_SANDBOX__?.wasm ?? null,
    busyLoopKillMs: globalThis.__WEB_SANDBOX__?.busyLoopKillMs ?? null,
    message: error instanceof Error ? error.message : String(error)
  };
});
