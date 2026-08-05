import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  FreenetClient,
  FreenetPropagationStore,
} from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");
const sharedUrl = process.env.FREENET_NODE_URL;
const publisherUrl = process.env.FREENET_PUBLISHER_NODE_URL ?? sharedUrl;
const subscriberUrl = process.env.FREENET_SUBSCRIBER_NODE_URL ?? sharedUrl;
const label = process.env.FREENET_F3_LABEL ?? "local-isolated";
const publisherToken =
  process.env.FREENET_PUBLISHER_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN;
const subscriberToken =
  process.env.FREENET_SUBSCRIBER_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN;
const afterPublishHook = process.env.FREENET_F3_AFTER_PUBLISH_HOOK;

if (publisherUrl === undefined || subscriberUrl === undefined) {
  throw new Error(
    "FREENET_NODE_URL (or FREENET_PUBLISHER_NODE_URL / FREENET_SUBSCRIBER_NODE_URL) is required for the F3 propagation proof",
  );
}

const wasm = Uint8Array.from(
  readFileSync(
    join(
      repoRoot,
      "packages/bridge-freenet/contract/propagation-set/propagation-set-contract.wasm",
    ),
  ),
);

const destinationHash = randomBytes(16);
const transientId = randomBytes(32);
const payload = new TextEncoder().encode(
  `tp-f3-propagation:${label}:${Date.now()}`,
);
const lxmfData = new Uint8Array(destinationHash.length + payload.length);
lxmfData.set(destinationHash);
lxmfData.set(payload, destinationHash.length);
const storedAt = Date.now();
const distinct = publisherUrl !== subscriberUrl;

const publisher = new FreenetClient({
  url: publisherUrl,
  authToken: publisherToken,
  requestTimeoutMs: 60_000,
});

const storeA = new FreenetPropagationStore({
  client: publisher,
  wasm,
  updateOptions: { fallbackCodeField: wasm },
});

console.log(
  "F3 proof: publishing ciphertext set from node A" +
    (distinct ? ` via ${publisherUrl}` : ""),
);
await storeA.publish([
  {
    transientId,
    storedAt,
    lxmfData,
  },
]);
await publisher.close();
console.log("F3 proof: node A client closed (publisher offline)");

if (afterPublishHook !== undefined && afterPublishHook.length > 0) {
  console.log(`F3 proof: running after-publish hook: ${afterPublishHook}`);
  const hook = spawnSync(afterPublishHook, {
    shell: true,
    encoding: "utf8",
    env: process.env,
  });
  if (hook.stdout) process.stdout.write(hook.stdout);
  if (hook.stderr) process.stderr.write(hook.stderr);
  if (hook.status !== 0) {
    throw new Error(
      `F3 after-publish hook failed with status ${hook.status ?? "null"}`,
    );
  }
}

const retriever = new FreenetClient({
  url: subscriberUrl,
  authToken: subscriberToken,
  requestTimeoutMs: 60_000,
});
const storeB = new FreenetPropagationStore({
  client: retriever,
  wasm,
  watchDestinationHashes: [destinationHash],
  updateOptions: { fallbackCodeField: wasm },
});

console.log(
  "F3 proof: pulling from node B while A is offline" +
    (distinct ? ` via ${subscriberUrl}` : ""),
);
const pulled = await storeB.pull();
await retriever.close();

const match = pulled.find(
  (entry) =>
    Buffer.from(entry.transientId).equals(transientId) &&
    Buffer.from(entry.lxmfData).equals(lxmfData),
);
if (match === undefined) {
  throw new Error(
    `F3 proof failed: pulled ${pulled.length} entr(y/ies); expected transient ${Buffer.from(transientId).toString("hex")}`,
  );
}

const artifact = {
  schemaVersion: 1,
  audited: new Date().toISOString().slice(0, 10),
  label,
  nodeUrl: publisherUrl,
  subscriberNodeUrl: subscriberUrl,
  distinctNodes: distinct,
  stoppedPublisherNode: Boolean(afterPublishHook),
  destinationHashHex: destinationHash.toString("hex"),
  transientIdHex: transientId.toString("hex"),
  storedAt,
  pulledCount: pulled.length,
  result: "pass",
};

const outDir = join(repoRoot, ".tmp");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `f3-propagation-proof-${label}.json`);
writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`F3 proof passed; wrote ${outPath}`);
