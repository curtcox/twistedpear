#!/usr/bin/env node
/**
 * Pack the Guida hello template beside its JavaScript twin and measure
 * spawn / first-render / steady-state latency on NodeWorkerSandboxBackend.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  MiniappLifecycle,
  NodeWorkerSandboxBackend,
} from "../../packages/miniapp-runtime/dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const guidaHello = join(repoRoot, "packages/guida-twistedpear/templates/hello");
const jsHello = join(repoRoot, "packages/guida-twistedpear/fixtures/hello-js");
const ITERATIONS = Number.parseInt(
  process.env.GUIDA_BUDGET_ITERATIONS ?? "8",
  10,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function packApp(sourceDir, name) {
  const cwd = mkdtempSync(join(tmpdir(), `tp-budgets-${name}-`));
  const appDir = join(cwd, name);
  cpSync(sourceDir, appDir, { recursive: true });
  try {
    const initCode = await runInit({
      cwd,
      identityPassphrase: "conformance identity passphrase",
      args: [],
    });
    if (initCode !== 0) throw new Error(`tp init failed for ${name}`);
    const packed = await runPack({
      cwd,
      args: [name, "--out", `${name}.tpkg`],
    });
    if (packed !== 0) throw new Error(`tp pack failed for ${name}`);
    const archive = readFileSync(join(cwd, `${name}.tpkg`));
    const bundle = readFileSync(join(appDir, "bundle.js"));
    return { bytes: archive.length, bundle };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function nowMs() {
  return performance.now();
}

async function measureBundle(bundle) {
  const inner = new NodeWorkerSandboxBackend();
  const spawnMs = [];
  const firstRenderMs = [];
  const steadyRenderMs = [];

  for (let index = 0; index < ITERATIONS; index += 1) {
    let firstRenderAt;
    const renderTimes = [];
    /** @type {{ postMessage: (message: unknown) => Promise<void> } | null} */
    let instance = null;
    const backend = {
      name: inner.name,
      spawn: async (options) => {
        instance = await inner.spawn(options);
        return instance;
      },
    };
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "hello",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle,
        brokerEndpoint: {
          request: async (request) => {
            if (request.namespace === "ui" && request.method === "render") {
              const at = nowMs();
              if (firstRenderAt === undefined) firstRenderAt = at;
              renderTimes.push(at);
              return { id: request.id, ok: true, result: { accepted: true } };
            }
            return { id: request.id, ok: true, result: null };
          },
        },
      },
      {
        now: () => Date.now(),
        delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      },
    );

    const spawnStarted = nowMs();
    await lifecycle.launch();
    spawnMs.push(nowMs() - spawnStarted);
    const deadline = nowMs() + 5_000;
    while (firstRenderAt === undefined && nowMs() < deadline) {
      await sleep(5);
    }
    if (firstRenderAt === undefined) {
      await lifecycle.stop("hello");
      throw new Error("Guida/JS hello did not render within 5s");
    }
    firstRenderMs.push(firstRenderAt - spawnStarted);

    const before = renderTimes.length;
    const tapStarted = nowMs();
    await instance?.postMessage({
      type: "ui-event",
      nodeId: "tap",
      event: "tap",
    });
    const tapDeadline = nowMs() + 2_000;
    while (renderTimes.length === before && nowMs() < tapDeadline) {
      await sleep(5);
    }
    steadyRenderMs.push(nowMs() - tapStarted);
    await lifecycle.stop("hello");
  }

  const average = (values) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    spawnMs: Number(average(spawnMs).toFixed(1)),
    firstRenderMs: Number(average(firstRenderMs).toFixed(1)),
    steadyRenderMs: Number(average(steadyRenderMs).toFixed(1)),
  };
}

export async function measureGuidaHello() {
  const jsPacked = await packApp(jsHello, "hello-js");
  const guidaPacked = await packApp(guidaHello, "hello-guida");
  const jsLatency = await measureBundle(jsPacked.bundle);
  const guidaLatency = await measureBundle(guidaPacked.bundle);
  return {
    js: { bytes: jsPacked.bytes, ...jsLatency },
    guida: { bytes: guidaPacked.bytes, ...guidaLatency },
  };
}
