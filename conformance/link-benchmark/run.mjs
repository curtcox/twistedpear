#!/usr/bin/env node
/**
 * Link handshake latency benchmark (Phase 1 M8 / LIMITATIONS §1).
 * Measures requestLink → ACTIVE time against the docker link-echo peer.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  LinkStatus,
  NodeCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";
import {
  interopReady,
  sleep,
  withComposeService,
  LINK_ECHO_PORT,
  waitForReadyLine,
} from "../scenarios/ts/harness.mjs";
import { gateAgainstBaseline } from "../../scripts/analysis/latency-benchmark.mjs";

/**
 * Every metric this benchmark records.
 *
 * All three are checked. Until 2026-08-15 only `setupP95Ms` was — and even that
 * was guarded by `if (baseline.setupP95Ms > 0)` against a baseline file of all
 * zeros, so nothing was ever compared.
 */
const METRICS = [
  { metric: "setupP50Ms", kind: "latency" },
  { metric: "setupP95Ms", kind: "latency" },
  { metric: "setupMaxMs", kind: "latency" },
];

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const measuredPath = join(repoRoot, "conformance/link-benchmark/measured.json");
const ITERATIONS = Number.parseInt(
  process.env.LINK_BENCHMARK_ITERATIONS ?? "20",
  10,
);
const record =
  process.env.LINK_BENCHMARK_RECORD === "1" ||
  process.argv.includes("--record");

if (!interopReady()) {
  console.log("link-benchmark: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const identityVectors = JSON.parse(
  readFileSync(new URL("../vectors/identity.json", import.meta.url), "utf8"),
);

function loadIdentity(provider, name) {
  const entry = identityVectors.identities.find(
    (candidate) => candidate.name === name,
  );
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(
    provider,
    hexToBytes(entry.privateKeyHex),
  );
  if (identity === undefined || identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }

  return identity;
}

async function waitForPath(reticulum, destinationHash, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
}

async function measureLinkSetup(reticulum, bobOut) {
  const started = Date.now();
  const link = bobOut.requestLink();
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline && link.status !== LinkStatus.ACTIVE) {
    if (link.status === LinkStatus.CLOSED) {
      throw new Error("link closed during setup");
    }

    await sleep(10);
  }

  if (link.status !== LinkStatus.ACTIVE) {
    throw new Error(`link did not become active: ${link.status}`);
  }

  const setupMs = Date.now() - started;
  await link.teardown();
  return setupMs;
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[index];
}

async function main() {
  await withComposeService("link-echo", LINK_ECHO_PORT, async () => {
    await waitForReadyLine("link-echo", 45_000);

    const provider = new NodeCryptoProvider();
    const runtime = nodeRuntime();
    const bob = loadIdentity(provider, "bob");

    const reticulum = Reticulum.create({ provider, runtime });
    reticulum.start();

    await reticulum.addTcpClientInterface({
      name: "python-link-benchmark",
      targetHost: "127.0.0.1",
      targetPort: LINK_ECHO_PORT,
      reconnectWaitMs: 500,
    });

    const bobOut = reticulum.registerDestination({
      provider,
      identity: bob,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["link"],
    });

    await waitForPath(reticulum, bobOut.hash);

    const setupMs = [];
    for (let index = 0; index < ITERATIONS; index += 1) {
      setupMs.push(await measureLinkSetup(reticulum, bobOut));
      await sleep(100);
    }

    reticulum.stop();

    const summary = {
      measuredAt: new Date().toISOString().slice(0, 10),
      runtime: "node",
      provider: "pure",
      peer: `127.0.0.1:${LINK_ECHO_PORT}`,
      iterations: ITERATIONS,
      setupMs,
      setupP50Ms: percentile(setupMs, 50),
      setupP95Ms: percentile(setupMs, 95),
      setupMaxMs: Math.max(...setupMs),
      note: "Regenerate: INTEROP=1 LINK_BENCHMARK_RECORD=1 npm run test:link-benchmark. Loopback handshake against the docker link-echo peer, so the numbers are host-dependent; the gate's 2x failure band in benchmark-rules.json is sized for that.",
    };

    console.log(
      `link-benchmark: ${ITERATIONS} handshakes — p50 ${summary.setupP50Ms}ms, ` +
        `p95 ${summary.setupP95Ms}ms, max ${summary.setupMaxMs}ms`,
    );

    if (record) {
      writeFileSync(measuredPath, `${JSON.stringify(summary, null, 2)}\n`);
      console.log(`link-benchmark: recorded ${measuredPath}`);
      return;
    }

    const failed = gateAgainstBaseline({
      name: "link-benchmark",
      root: repoRoot,
      measuredPath,
      summary,
      specs: METRICS,
      identity: { peer: summary.peer },
      unit: "ms",
    });
    if (failed) process.exitCode = 1;
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
