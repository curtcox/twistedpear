import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  FreenetClient,
  FreenetPropagationStore
} from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");
const nodeUrl = process.env.FREENET_NODE_URL;
const label = process.env.FREENET_F3_LABEL ?? "local-isolated";

if (nodeUrl === undefined) {
  throw new Error("FREENET_NODE_URL is required for the F3 propagation proof");
}

const wasm = Uint8Array.from(
  readFileSync(
    join(
      repoRoot,
      "packages/bridge-freenet/contract/propagation-set/propagation-set-contract.wasm"
    )
  )
);

const destinationHash = randomBytes(16);
const transientId = randomBytes(32);
const payload = new TextEncoder().encode(
  `tp-f3-propagation:${label}:${Date.now()}`
);
const lxmfData = new Uint8Array(destinationHash.length + payload.length);
lxmfData.set(destinationHash);
lxmfData.set(payload, destinationHash.length);
const storedAt = Date.now();

const publisher = new FreenetClient({
  url: nodeUrl,
  authToken: process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 60_000
});

const storeA = new FreenetPropagationStore({
  client: publisher,
  wasm,
  updateOptions: { fallbackCodeField: wasm }
});

console.log("F3 proof: publishing ciphertext set from node A");
await storeA.publish([
  {
    transientId,
    storedAt,
    lxmfData
  }
]);
await publisher.close();
console.log("F3 proof: node A client closed (publisher offline)");

const retriever = new FreenetClient({
  url: nodeUrl,
  authToken: process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 60_000
});
const storeB = new FreenetPropagationStore({
  client: retriever,
  wasm,
  watchDestinationHashes: [destinationHash],
  updateOptions: { fallbackCodeField: wasm }
});

console.log("F3 proof: pulling from node B while A is offline");
const pulled = await storeB.pull();
await retriever.close();

const match = pulled.find(
  (entry) =>
    Buffer.from(entry.transientId).equals(transientId) &&
    Buffer.from(entry.lxmfData).equals(lxmfData)
);
if (match === undefined) {
  throw new Error(
    `F3 proof failed: pulled ${pulled.length} entr(y/ies); expected transient ${Buffer.from(transientId).toString("hex")}`
  );
}

const artifact = {
  schemaVersion: 1,
  audited: new Date().toISOString().slice(0, 10),
  label,
  nodeUrl,
  destinationHashHex: destinationHash.toString("hex"),
  transientIdHex: transientId.toString("hex"),
  storedAt,
  pulledCount: pulled.length,
  result: "pass"
};

const outDir = join(repoRoot, ".tmp");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `f3-propagation-proof-${label}.json`);
writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`F3 proof passed; wrote ${outPath}`);
