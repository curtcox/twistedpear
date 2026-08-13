import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { FreenetClient } from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");
const publisherUrl = process.env.FREENET_NODE_URL;
// Default both clients onto the publisher node. Local executor notifications
// avoid the cross-node reordering hazard of the locator contract's
// lexicographic-min merge. Set FREENET_SUBSCRIBER_NODE_URL to force a
// distinct subscriber when measuring cross-node propagation deliberately.
const subscriberUrl = process.env.FREENET_SUBSCRIBER_NODE_URL ?? publisherUrl;
const label = process.env.FREENET_MEASUREMENT_LABEL;
/** Complete 100-sample series labels (still never auto-overwrite measured-roundtrip.json). */
const gateLabels = new Set(["local-3-node", "live", "local-cross-node"]);
const sampleCount = Number.parseInt(
  process.env.FREENET_SAMPLE_COUNT ?? "100",
  10,
);
const payloadSizes = [1024, 64 * 1024, 1024 * 1024];
const allowIncomplete = process.env.FREENET_ALLOW_INCOMPLETE === "1";

if (publisherUrl === undefined) {
  throw new Error("FREENET_NODE_URL is required for the S2 measurement");
}
if (label === undefined || !/^[a-z0-9-]+$/.test(label)) {
  throw new Error(
    "FREENET_MEASUREMENT_LABEL must be a lowercase kebab-case id",
  );
}
if (
  !Number.isSafeInteger(sampleCount) ||
  sampleCount < 1 ||
  sampleCount > 100
) {
  throw new Error("FREENET_SAMPLE_COUNT must be an integer from 1 through 100");
}
if (sampleCount !== 100 && !allowIncomplete) {
  throw new Error("Non-gate smoke runs require FREENET_ALLOW_INCOMPLETE=1");
}
if (sampleCount === 100 && !gateLabels.has(label)) {
  throw new Error(
    "Complete 100-sample series require label local-3-node, live, or local-cross-node",
  );
}

const wasm = Uint8Array.from(
  readFileSync(
    join(
      repoRoot,
      "packages/bridge-freenet/contract/locator/locator-contract.wasm",
    ),
  ),
);
const publisher = new FreenetClient({
  url: publisherUrl,
  authToken: process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 60_000,
});
const subscriber = new FreenetClient({
  url: subscriberUrl,
  authToken:
    process.env.FREENET_SUBSCRIBER_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 60_000,
});

function state(payloadBytes, counter) {
  const out = new Uint8Array(11 + payloadBytes);
  out.set([0x54, 0x50, 0x46, 0x4c, 0x01]);
  const view = new DataView(out.buffer);
  view.setUint16(5, 0, false);
  view.setUint32(7, payloadBytes, false);
  out.fill(0xa5, 11);
  view.setUint32(11, counter, false);
  return out;
}

function counterFromState(bytes) {
  if (bytes.length < 15) return null;
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(11, false);
}

function percentile(sorted, quantile) {
  return sorted[Math.ceil(sorted.length * quantile) - 1];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    sampleCount: sorted.length,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1),
    meanMs: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

async function stage(name, promise) {
  try {
    return await promise;
  } catch (error) {
    throw new Error(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

const sampleGapMs = Number.parseInt(
  process.env.FREENET_SAMPLE_GAP_MS ?? "0",
  10,
);
const notifyTimeoutMs = Number.parseInt(
  process.env.FREENET_NOTIFY_TIMEOUT_MS ?? "15000",
  10,
);
const reconcilePollMs = Number.parseInt(
  process.env.FREENET_RECONCILE_POLL_MS ?? "250",
  10,
);

if (
  !Number.isSafeInteger(sampleGapMs) ||
  sampleGapMs < 0 ||
  sampleGapMs > 60_000
) {
  throw new Error("FREENET_SAMPLE_GAP_MS must be from 0 through 60000");
}
if (
  !Number.isSafeInteger(notifyTimeoutMs) ||
  notifyTimeoutMs < 1_000 ||
  notifyTimeoutMs > 120_000
) {
  throw new Error("FREENET_NOTIFY_TIMEOUT_MS must be from 1000 through 120000");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCounter(key, counter, deadlineMs) {
  while (Date.now() < deadlineMs) {
    const record = await subscriber.get(key).catch(() => null);
    if (record !== null && counterFromState(record.state) === counter) {
      return;
    }
    await sleep(reconcilePollMs);
  }
  throw new Error(`reconcile timed out waiting for counter ${counter}`);
}

const measurements = [];
const sameNode = publisherUrl === subscriberUrl;
// Cross-node Freenet notify is a hint under locator min-merge / subscription
// snapshot loss. Allow GET reconciliation there so a complete series can still
// measure update→visible-state; local-executor stays notify-strict.
const allowReconcile =
  process.env.FREENET_ALLOW_RECONCILE === "1" ||
  (!sameNode && process.env.FREENET_ALLOW_RECONCILE !== "0");
let notifyDeliveries = 0;
let reconciledDeliveries = 0;
try {
  for (const payloadBytes of payloadSizes) {
    const parameterText = [
      "tp-s2",
      label,
      String(payloadBytes),
      String(Date.now()),
    ].join(":");
    const parameters = new TextEncoder().encode(
      parameterText.padEnd(94, "x").slice(0, 94),
    );
    const source = { wasm, parameters };
    // Count down from a high initial counter so each applied update is
    // lexicographically smaller under the locator contract's min-merge.
    const initialState = state(payloadBytes, 0xffff_ffff);
    const key = await stage(
      `put ${payloadBytes} bytes`,
      publisher.put(source, initialState, {
        subscribe: true,
        blockingSubscribe: false,
      }),
    );
    const { codeHash } = FreenetClient.deriveKey(source);
    const pending = new Map();
    const unsubscribe = await stage(
      `subscribe ${payloadBytes} bytes`,
      subscriber.subscribe(key, (nextState) => {
        const counter = counterFromState(nextState);
        pending.get(counter)?.("notify");
      }),
    );
    const samples = [];
    try {
      for (let index = 0; index < sampleCount; index += 1) {
        if (sampleGapMs > 0 && index > 0) await sleep(sampleGapMs);
        const counter = sampleCount - index;
        let timer;
        const notified = new Promise((resolve, reject) => {
          pending.set(counter, resolve);
          timer = setTimeout(
            () =>
              reject(new Error(`notify timed out for ${payloadBytes} bytes`)),
            notifyTimeoutMs,
          );
        });
        const startedAt = performance.now();
        try {
          const updatePromise = publisher.update(
            key,
            codeHash,
            state(payloadBytes, counter),
            { fallbackCodeField: wasm },
          );
          try {
            await stage(
              `update/notify ${payloadBytes} bytes sample ${index + 1}`,
              Promise.all([updatePromise, notified]),
            );
            notifyDeliveries += 1;
          } catch (error) {
            await updatePromise;
            const message =
              error instanceof Error ? error.message : String(error);
            if (!allowReconcile || !/notify timed out/i.test(message)) {
              throw error;
            }
            await stage(
              `update/reconcile ${payloadBytes} bytes sample ${index + 1}`,
              waitForCounter(key, counter, Date.now() + 60_000),
            );
            reconciledDeliveries += 1;
          }
          samples.push(performance.now() - startedAt);
        } finally {
          clearTimeout(timer);
          pending.delete(counter);
        }
      }
    } finally {
      unsubscribe();
    }
    measurements.push({
      payloadBytes,
      ...summarize(samples),
    });
  }
} finally {
  await Promise.allSettled([publisher.close(), subscriber.close()]);
}

const notifyPath = sameNode
  ? "local-executor"
  : reconciledDeliveries > 0
    ? "cross-node-reconciled"
    : "cross-node";
const result = {
  schemaVersion: 1,
  label,
  recordedAt: new Date().toISOString(),
  publisherUrl,
  subscriberUrl,
  sameNode,
  notifyPath,
  sampleCount,
  complete: sampleCount === 100,
  contract: "locator",
  delivery: {
    notify: notifyDeliveries,
    reconciled: reconciledDeliveries,
    allowReconcile,
  },
  measurements,
};
const output = join(
  repoRoot,
  ".tmp",
  `freenet-roundtrip-${label}${
    sampleCount === 100 ? "" : `-smoke-${sampleCount}`
  }.json`,
);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Freenet S2 measurements written to ${output}`);
if (reconciledDeliveries > 0) {
  console.log(
    `Freenet S2 delivery: ${notifyDeliveries} notify, ${reconciledDeliveries} GET-reconciled`,
  );
}
