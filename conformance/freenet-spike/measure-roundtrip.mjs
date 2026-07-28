import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { FreenetClient } from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");
const publisherUrl = process.env.FREENET_NODE_URL;
const subscriberUrl = process.env.FREENET_SUBSCRIBER_NODE_URL ?? publisherUrl;
const label = process.env.FREENET_MEASUREMENT_LABEL;
const allowedLabels = new Set(["local-3-node", "live"]);
const sampleCount = Number.parseInt(
  process.env.FREENET_SAMPLE_COUNT ?? "100",
  10
);
const payloadSizes = [1024, 64 * 1024, 1024 * 1024];

if (publisherUrl === undefined) {
  throw new Error("FREENET_NODE_URL is required for the S2 measurement");
}
if (label === undefined || !allowedLabels.has(label)) {
  throw new Error(
    "FREENET_MEASUREMENT_LABEL must be local-3-node or live"
  );
}
if (!Number.isSafeInteger(sampleCount) || sampleCount < 1 || sampleCount > 100) {
  throw new Error("FREENET_SAMPLE_COUNT must be an integer from 1 through 100");
}
if (
  sampleCount !== 100 &&
  process.env.FREENET_ALLOW_INCOMPLETE !== "1"
) {
  throw new Error(
    "Non-gate smoke runs require FREENET_ALLOW_INCOMPLETE=1"
  );
}

const wasm = Uint8Array.from(
  readFileSync(
    join(
      repoRoot,
      "packages/bridge-freenet/contract/locator/locator-contract.wasm"
    )
  )
);
const publisher = new FreenetClient({
  url: publisherUrl,
  authToken: process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 60_000
});
const subscriber = new FreenetClient({
  url: subscriberUrl,
  authToken:
    process.env.FREENET_SUBSCRIBER_NODE_TOKEN ??
    process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 60_000
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
    bytes.byteLength
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
    meanMs: sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  };
}

async function stage(name, promise) {
  try {
    return await promise;
  } catch (error) {
    throw new Error(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

const measurements = [];
try {
  for (const payloadBytes of payloadSizes) {
    const parameterText = [
      "tp-s2",
      label,
      String(payloadBytes),
      String(Date.now())
    ].join(":");
    const parameters = new TextEncoder().encode(
      parameterText.padEnd(94, "x").slice(0, 94)
    );
    const source = { wasm, parameters };
    const initialState = state(payloadBytes, 0xffff_ffff);
    // Retain the new contract at the publisher so it can execute the measured
    // updates. A network PUT without subscribe is allowed to route the value
    // onward without keeping a local executor snapshot.
    const key = await stage(
      `put ${payloadBytes} bytes`,
      publisher.put(source, initialState, {
        subscribe: true,
        blockingSubscribe: true
      })
    );
    const { codeHash } = FreenetClient.deriveKey(source);
    const pending = new Map();
    const unsubscribe = await stage(
      `subscribe ${payloadBytes} bytes`,
      subscriber.subscribe(key, (nextState) => {
        const counter = counterFromState(nextState);
        pending.get(counter)?.();
      })
    );
    const samples = [];
    try {
      for (let index = 0; index < sampleCount; index += 1) {
        const counter = sampleCount - index;
        let timer;
        const notified = new Promise((resolve, reject) => {
          pending.set(counter, resolve);
          timer = setTimeout(
            () => reject(new Error(`notify timed out for ${payloadBytes} bytes`)),
            60_000
          );
        });
        const startedAt = performance.now();
        try {
          await stage(
            `update/notify ${payloadBytes} bytes sample ${index + 1}`,
            Promise.all([
              publisher.update(key, codeHash, state(payloadBytes, counter)),
              notified
            ])
          );
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
      ...summarize(samples)
    });
  }
} finally {
  await Promise.allSettled([publisher.close(), subscriber.close()]);
}

const result = {
  schemaVersion: 1,
  label,
  recordedAt: new Date().toISOString(),
  publisherUrl,
  subscriberUrl,
  sampleCount,
  complete: sampleCount === 100,
  measurements
};
const output = join(
  repoRoot,
  ".tmp",
  `freenet-roundtrip-${label}${
    sampleCount === 100 ? "" : `-smoke-${sampleCount}`
  }.json`
);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Freenet S2 measurements written to ${output}`);
