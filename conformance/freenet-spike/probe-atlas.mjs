import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractKey } from "@freenetorg/freenet-stdlib";
import { FreenetClient } from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const nodeUrl =
  process.env.FREENET_NODE_URL ??
  "ws://127.0.0.1:7509/v1/contract/command";
const indexId =
  process.env.ATLAS_INDEX_ID ??
  "CJUR37WSMxV7C1yhrr3xSgjnrJT5yuvQGFNcgvSnsvg";
const atlasSourceCommit = "488870810f610edacf12ac0cf281537c9fd91832";
const client = new FreenetClient({
  url: nodeUrl,
  authToken: process.env.FREENET_NODE_TOKEN,
  requestTimeoutMs: 30_000
});

try {
  const key = ContractKey.fromInstanceId(indexId).bytes();
  const record = await client.get(key);
  if (record.state.length === 0) {
    throw new Error("Atlas returned empty index state");
  }
  const prefixText = new TextDecoder().decode(record.state.subarray(0, 32));
  if (!prefixText.includes("key_auth")) {
    throw new Error("Atlas state does not match the pinned IndexState CBOR shape");
  }
  const evidence = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    app: "Atlas",
    nodeUrl,
    contractInstanceId: indexId,
    upstreamSourceCommit: atlasSourceCommit,
    stateEncoding: "CBOR IndexState",
    stateBytes: record.state.length,
    stateSha256Hex: createHash("sha256")
      .update(record.state)
      .digest("hex"),
    keyRoundTripMatches:
      Buffer.from(record.key).equals(Buffer.from(key)),
    updateAttempted: false,
    updateReason:
      "live writes require explicit approval; Atlas also requires an authorized signing key for a material record"
  };
  const output = join(root, "s7-atlas-read.json");
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`S7 Atlas read evidence written to ${output}`);
} finally {
  await client.close();
}
