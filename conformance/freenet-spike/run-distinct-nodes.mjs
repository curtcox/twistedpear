#!/usr/bin/env node
/**
 * Distinct-node local Freenet scenarios (simulator-first workstream B3).
 *
 * Starts an isolated 3-node mesh, then proves:
 * 1. Cross-node notify (publisher ≠ subscriber Freenet WebSocket)
 * 2. F2 HDLC across distinct endpoints (opposite packet-log sides)
 * 3. F2 announce + LXMF across those same distinct endpoints
 * 4. F2 recovery after the subscriber Freenet node restarts
 * 5. F3 publish on node A / retrieve on node B after stopping A's Freenet process
 *
 * Use `--smoke` for a one-sample notify diagnostic. Never copy incomplete
 * notify series over the committed S2 gate artifact (`measured-roundtrip.json`).
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createPrivateKey, createPublicKey, randomBytes } from "node:crypto";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { assert, runMain, section, step } from "../lib/index.mjs";
import { formatOutcomes, summarizeOutcomes } from "./outcomes.mjs";

const smoke = process.argv.includes("--smoke");
const keepState = process.env.FREENET_KEEP_LOCAL_STATE === "1";
const binary =
  process.env.FREENET_BINARY ??
  (existsSync("/Applications/Freenet.app/Contents/MacOS/freenet-bin")
    ? "/Applications/Freenet.app/Contents/MacOS/freenet-bin"
    : "freenet");
const wsPorts = [
  Number(process.env.FREENET_GATEWAY_WS_PORT ?? 17649),
  Number(process.env.FREENET_PUBLISHER_WS_PORT ?? 17650),
  Number(process.env.FREENET_SUBSCRIBER_WS_PORT ?? 17651),
];
const networkPorts = [
  Number(process.env.FREENET_GATEWAY_NETWORK_PORT ?? 31478),
  Number(process.env.FREENET_PUBLISHER_NETWORK_PORT ?? 31479),
  Number(process.env.FREENET_SUBSCRIBER_NETWORK_PORT ?? 31480),
];
const settleMs = Number(process.env.FREENET_TOPOLOGY_SETTLE_MS ?? 15_000);
const readyTimeoutMs = Number(
  process.env.FREENET_TOPOLOGY_READY_TIMEOUT_MS ?? 60_000,
);

for (const port of [...wsPorts, ...networkPorts]) {
  assert(
    Number.isSafeInteger(port) && port >= 1 && port <= 65535,
    `Invalid Freenet distinct-node port: ${port}`,
  );
}

const root = mkdtempSync(join(tmpdir(), "twistedpear-freenet-distinct-"));
const homeRoot = join(root, "home");
const spikeRoot = dirname(fileURLToPath(import.meta.url));
const children = [];
const tails = new Map();
let gatewayPublicKey = null;
let secretPath = null;

function isolateHome() {
  const support = join(
    homeRoot,
    "Library",
    "Application Support",
    "The-Freenet-Project-Inc.Freenet",
  );
  mkdirSync(support, { recursive: true });
  writeFileSync(join(support, "gateways.toml"), "gateways = []\n");
}

function x25519PublicKey(secret) {
  const pkcs8Prefix = Buffer.from("302e020100300506032b656e04220420", "hex");
  const privateKey = createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, secret]),
    format: "der",
    type: "pkcs8",
  });
  const publicDer = createPublicKey(privateKey).export({
    format: "der",
    type: "spki",
  });
  return Buffer.from(publicDer).subarray(-32);
}

function appendTail(name, chunk) {
  const lines = `${tails.get(name) ?? ""}${chunk}`.split("\n");
  tails.set(name, lines.slice(-80).join("\n"));
}

function nodeArgs(index) {
  const name = ["gateway", "publisher", "subscriber"][index];
  const nodeRoot = join(root, name);
  for (const directory of ["config", "data", "logs"].map((part) =>
    join(nodeRoot, part),
  )) {
    mkdirSync(directory, { recursive: true });
  }
  const args = [
    "network",
    "--ws-api-address",
    "127.0.0.1",
    "--ws-api-port",
    String(wsPorts[index]),
    "--network-address",
    "127.0.0.1",
    "--network-port",
    String(networkPorts[index]),
    "--public-network-address",
    "127.0.0.1",
    "--public-network-port",
    String(networkPorts[index]),
    "--skip-load-from-network",
    "--min-number-of-connections",
    "2",
    "--max-number-of-connections",
    "4",
    "--config-dir",
    join(nodeRoot, "config"),
    "--data-dir",
    join(nodeRoot, "data"),
    "--log-dir",
    join(nodeRoot, "logs"),
    "--log-level",
    "info",
    "--disable-auto-update",
  ];
  if (index === 0) {
    args.push("--is-gateway", "--transport-keypair", secretPath);
  } else {
    args.push(
      "--gateway",
      `127.0.0.1:${networkPorts[0]},${gatewayPublicKey.toString("hex")}`,
    );
  }
  return args;
}

function startNode(name, args) {
  const child = spawn(binary, args, {
    env: {
      ...process.env,
      HOME: homeRoot,
      FREENET_TELEMETRY_ENABLED: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => appendTail(name, chunk));
  child.stderr.on("data", (chunk) => appendTail(name, chunk));
  children.push({ name, child });
  return child;
}

function findChild(name) {
  return children.find((entry) => entry.name === name);
}

function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for 127.0.0.1:${port}`));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function stopNamed(name) {
  const entry = findChild(name);
  if (entry === undefined) return;
  if (entry.child.exitCode === null && entry.child.signalCode === null) {
    entry.child.kill("SIGINT");
  }
  await waitForExit(entry.child, 5_000);
  if (entry.child.exitCode === null && entry.child.signalCode === null) {
    entry.child.kill("SIGKILL");
    await waitForExit(entry.child, 1_000);
  }
  const index = children.indexOf(entry);
  if (index >= 0) children.splice(index, 1);
}

async function stopNodes() {
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGINT");
  }
  await Promise.all(children.map(({ child }) => waitForExit(child, 5_000)));
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  }
  await Promise.all(children.map(({ child }) => waitForExit(child, 1_000)));
  children.length = 0;
}

async function dashboardPeerCount(wsPort) {
  const response = await fetch(`http://127.0.0.1:${wsPort}/`);
  if (!response.ok) {
    throw new Error(`Dashboard HTTP ${response.status} on ${wsPort}`);
  }
  const body = await response.text();
  return body.match(/peer-row/g)?.length ?? 0;
}

async function waitForGatewayPeers(minimumPeers, timeoutMs = readyTimeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastCount = 0;
  while (Date.now() < deadline) {
    try {
      lastCount = await dashboardPeerCount(wsPorts[0]);
      if (lastCount >= minimumPeers) return lastCount;
    } catch {
      // Dashboard may briefly 503 while warming.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Gateway dashboard showed ${lastCount} peer row(s); wanted >= ${minimumPeers}`,
  );
}

function publisherUrl() {
  return `ws://127.0.0.1:${wsPorts[1]}/v1/contract/command`;
}

function subscriberUrl() {
  return `ws://127.0.0.1:${wsPorts[2]}/v1/contract/command`;
}

async function runNodeScript(script, env, label) {
  const child = spawn(process.execPath, [join(spikeRoot, script)], {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) reject(new Error(`${label} exited via ${signal}`));
      else resolve(code ?? 1);
    });
  });
  assert(exitCode === 0, `${label} failed with status ${exitCode}`);
}

/**
 * What each scenario did, written to a report at the end.
 *
 * Without this the job had exactly two outcomes, green and red, and no way to
 * say that a run was green only on the second attempt or that a diagnostic
 * degraded. That is what made this job's flakiness ambiguous: re-running until
 * it passed left no trace that anything had been re-run.
 */
const outcomes = [];

async function runNodeScriptWithRetry(
  script,
  env,
  label,
  { attempts = 2, diagnostic = false } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runNodeScript(script, env, label);
      outcomes.push({ label, status: "passed", attempts: attempt, diagnostic });
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      console.error(
        `[freenet-distinct-nodes] ${label} attempt ${attempt} failed; retrying after settle`,
      );
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      await waitForGatewayPeers(2, 30_000).catch(() => {});
    }
  }

  outcomes.push({
    label,
    status: diagnostic ? "degraded" : "failed",
    attempts,
    diagnostic,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });

  if (diagnostic) {
    // A step this file already describes as "not gate evidence" must not decide
    // whether the job is red. It was doing exactly that: two of the three
    // recent freenet-real-node failures were this measurement timing out, and a
    // measurement whose own label disclaims it cannot also be the gate.
    // Degrading loudly and recording it keeps the signal without the coin flip.
    console.error(
      `[freenet-distinct-nodes] ${label} degraded after ${attempts} attempts (diagnostic, not gate evidence): ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
    return;
  }

  throw lastError;
}

/**
 * Write and print what each scenario did.
 *
 * The point is the retry and degrade columns. A run that passed on attempt 3
 * and a run that passed first time were previously the same green, so the only
 * way anyone learned this job was flaky was by watching it over days.
 */
function reportOutcomes() {
  const label = smoke ? "smoke" : "diagnostic";
  console.log(`\n--- distinct-node scenario outcomes (${label}) ---`);
  console.log(formatOutcomes(outcomes));

  const outputPath = join(
    process.cwd(),
    ".tmp",
    `freenet-distinct-nodes-${label}.json`,
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        ...summarizeOutcomes(outcomes, label),
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[freenet-distinct-nodes] outcomes written to ${outputPath}`);
}

async function startTopology() {
  isolateHome();
  const secret = randomBytes(32);
  secretPath = join(root, "gateway-x25519-secret");
  writeFileSync(secretPath, `${secret.toString("hex")}\n`);
  chmodSync(secretPath, 0o600);
  gatewayPublicKey = x25519PublicKey(secret);

  step(`starting gateway on ws://127.0.0.1:${wsPorts[0]}`);
  startNode("gateway", nodeArgs(0));
  await waitForPort(wsPorts[0]);
  step(`starting publisher on ws://127.0.0.1:${wsPorts[1]}`);
  startNode("publisher", nodeArgs(1));
  step(`starting subscriber on ws://127.0.0.1:${wsPorts[2]}`);
  startNode("subscriber", nodeArgs(2));
  await Promise.all([waitForPort(wsPorts[1]), waitForPort(wsPorts[2])]);
  step(`waiting for gateway ring peers (settle ${settleMs}ms floor)`);
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  const peerCount = await waitForGatewayPeers(2);
  step(`gateway dashboard reports ${peerCount} peer row(s)`);
}

await runMain(async () => {
  section("distinct-node Freenet (B3)");
  try {
    await startTopology();

    step(
      smoke
        ? "cross-node notify smoke (1 sample; not gate evidence)"
        : "cross-node notify diagnostic series (incomplete label; not gate evidence)",
    );
    await runNodeScriptWithRetry(
      "measure-roundtrip.mjs",
      {
        FREENET_NODE_URL: publisherUrl(),
        FREENET_SUBSCRIBER_NODE_URL: subscriberUrl(),
        FREENET_MEASUREMENT_LABEL: smoke
          ? "local-distinct-smoke"
          : "local-distinct-cross-node",
        FREENET_SAMPLE_COUNT: smoke ? "1" : "10",
        FREENET_ALLOW_INCOMPLETE: "1",
        // Cross-node reconciliation is the fallback when a notify is lost, and
        // three freshly-started nodes on a shared CI runner regularly need more
        // than the 15s default to converge. This is a convergence deadline, not
        // a performance budget: the step still fails if reconcile never lands.
        FREENET_NOTIFY_TIMEOUT_MS:
          process.env.FREENET_NOTIFY_TIMEOUT_MS ?? "60000",
      },
      "cross-node notify",
      // The step text, the completion message and this file's own header all
      // call this a diagnostic, not gate evidence. Declaring that here is what
      // stops it failing the job.
      { diagnostic: true },
    );

    step("F2 HDLC across distinct Freenet WebSocket endpoints");
    await runNodeScript(
      "prove-f2-interface.mjs",
      {
        FREENET_LEFT_NODE_URL: publisherUrl(),
        FREENET_RIGHT_NODE_URL: subscriberUrl(),
        FREENET_F2_LABEL: "local-distinct-nodes",
      },
      "distinct-node F2 HDLC",
    );

    step("F2 announce + LXMF across distinct Freenet WebSocket endpoints");
    await runNodeScriptWithRetry(
      "prove-f2-announce-lxmf.mjs",
      {
        FREENET_LEFT_NODE_URL: publisherUrl(),
        FREENET_RIGHT_NODE_URL: subscriberUrl(),
        FREENET_F2_LABEL: "local-distinct-nodes",
      },
      "distinct-node F2 announce+LXMF",
    );

    step("restart subscriber Freenet node and re-prove F2");
    await stopNamed("subscriber");
    startNode("subscriber", nodeArgs(2));
    await waitForPort(wsPorts[2]);
    await new Promise((resolve) => setTimeout(resolve, 8_000));
    await waitForGatewayPeers(2, 30_000);
    await runNodeScriptWithRetry(
      "prove-f2-interface.mjs",
      {
        FREENET_LEFT_NODE_URL: publisherUrl(),
        FREENET_RIGHT_NODE_URL: subscriberUrl(),
        FREENET_F2_LABEL: "local-distinct-nodes-after-restart",
      },
      "F2 after subscriber restart",
      // A third attempt, because this is the one step whose precondition is a
      // Freenet node that was killed seconds earlier: it has to rejoin the ring
      // before it can serve, and on a shared runner it twice failed to do so
      // inside two attempts. Each retry already settles and re-waits for the
      // gateway to report both peers.
      { attempts: 3 },
    );

    step(
      "F3 publish on publisher / retrieve on subscriber after stopping publisher Freenet node",
    );
    // Let the ring settle after the F2 restart path before a fresh PUT.
    await new Promise((resolve) => setTimeout(resolve, 8_000));
    await waitForGatewayPeers(2, 30_000);
    const publisher = findChild("publisher");
    assert(publisher !== undefined, "publisher Freenet node missing before F3");
    const stopPublisherHook = join(root, "stop-publisher.sh");
    writeFileSync(
      stopPublisherHook,
      `#!/bin/sh\nkill -INT ${publisher.child.pid} 2>/dev/null || true\nsleep 2\n`,
      { mode: 0o755 },
    );
    await runNodeScriptWithRetry(
      "prove-f3-propagation.mjs",
      {
        FREENET_PUBLISHER_NODE_URL: publisherUrl(),
        FREENET_SUBSCRIBER_NODE_URL: subscriberUrl(),
        FREENET_F3_LABEL: "local-distinct-nodes",
        FREENET_F3_AFTER_PUBLISH_HOOK: stopPublisherHook,
      },
      "distinct-node F3",
      // Same reasoning: this step deliberately stops the publisher mid-scenario.
      { attempts: 3 },
    );
    await stopNamed("publisher");

    console.log(
      "[freenet-distinct-nodes] B3 scenarios completed" +
        (smoke
          ? " (smoke; not gate evidence)"
          : " (diagnostic notify; review before promoting)"),
    );
    reportOutcomes();
  } catch (error) {
    for (const { name } of children) {
      console.error(
        `\n--- ${name} tail ---\n${tails.get(name) ?? "(no output)"}`,
      );
    }
    // Report on the failure path too: which scenarios got through before the
    // red one is the first thing anybody asks, and re-reading a 2000-line log
    // to find out is what makes a flaky job expensive.
    reportOutcomes();
    throw error;
  } finally {
    await stopNodes();
    if (keepState) {
      console.error(`Preserved Freenet distinct-node state at ${root}`);
    } else {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
