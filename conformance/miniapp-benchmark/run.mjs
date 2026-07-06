#!/usr/bin/env node
/**
 * Phase 4 M0 desktop measurements for the Node worker sandbox backend.
 * Records spawn latency, kill latency, broker round-trip throughput, and busy-loop killability.
 */

import {
  MiniappLifecycle,
  NodeWorkerSandboxBackend
} from "../../packages/miniapp-runtime/dist/index.js";

const ITERATIONS = Number.parseInt(process.env.BENCHMARK_ITERATIONS ?? "20", 10);

function nowMs() {
  return performance.now();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

const helloBundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "title", type: "text", props: { value: "Bench" } }]
  }
});
`);

const busyLoopBundle = new TextEncoder().encode("while (true) {}");

async function measureSpawnKill(backend, bundle) {
  const spawnLatencies = [];
  const killLatencies = [];

  for (let index = 0; index < ITERATIONS; index += 1) {
    const lifecycle = new MiniappLifecycle(backend, {
      appId: "bench",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle,
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true, result: "ok" })
      }
    });

    const spawnStarted = nowMs();
    await lifecycle.launch();
    spawnLatencies.push(nowMs() - spawnStarted);

    const killStarted = nowMs();
    await lifecycle.stop("bench");
    killLatencies.push(nowMs() - killStarted);
  }

  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    spawnMs: Number(average(spawnLatencies).toFixed(1)),
    killMs: Number(average(killLatencies).toFixed(1))
  };
}

async function measureWatchdogPingRate(backend) {
  const lifecycle = new MiniappLifecycle(backend, {
    appId: "throughput",
    version: "1.0.0",
    entryPath: "bundle.js",
    bundle: helloBundle,
    brokerEndpoint: {
      request: async (request) => ({ id: request.id, ok: true, result: "ok" })
    }
  });

  await lifecycle.launch();
  const started = nowMs();
  let count = 0;

  while (nowMs() - started < 1_000) {
    await lifecycle.watchdogPing();
    count += 1;
  }

  await lifecycle.stop("bench");
  return { watchdogPingsPerSecond: count };
}

async function measureBusyLoopKill(backend) {
  const lifecycle = new MiniappLifecycle(
    backend,
    {
      appId: "busy-loop",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: busyLoopBundle,
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true })
      }
    },
    { watchdogMs: 250 }
  );

  const started = nowMs();
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

  await lifecycle.stop("cleanup");
  return {
    killed,
    killMs: killed ? Math.round(nowMs() - started) : null
  };
}

async function main() {
  const backend = new NodeWorkerSandboxBackend();
  const spawnKill = await measureSpawnKill(backend, helloBundle);
  const throughput = await measureWatchdogPingRate(backend);
  const busyLoop = await measureBusyLoopKill(backend);

  if (!busyLoop.killed) {
    throw new Error("busy-loop app was not killed by watchdog");
  }

  const summary = {
    backend: backend.name,
    runtime: "node",
    iterations: ITERATIONS,
    spawnMs: spawnKill.spawnMs,
    killMs: spawnKill.killMs,
    watchdogPingsPerSecond: throughput.watchdogPingsPerSecond,
    busyLoopKillMs: busyLoop.killMs
  };

  console.log(`miniapp-benchmark: ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
