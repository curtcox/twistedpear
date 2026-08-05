import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  DestinationType,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "@twistedpear/reticulum-ts";
import { FreenetInterface } from "@twistedpear/reticulum-interfaces";
import { FreenetContractPacketLogBackend } from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");
const sharedUrl = process.env.FREENET_NODE_URL;
const leftUrl =
  process.env.FREENET_LEFT_NODE_URL ??
  process.env.FREENET_PUBLISHER_NODE_URL ??
  sharedUrl;
const rightUrl =
  process.env.FREENET_RIGHT_NODE_URL ??
  process.env.FREENET_SUBSCRIBER_NODE_URL ??
  sharedUrl;
const label = process.env.FREENET_F2_LABEL ?? "local-isolated";
const leftToken =
  process.env.FREENET_LEFT_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN;
const rightToken =
  process.env.FREENET_RIGHT_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN;

if (leftUrl === undefined || rightUrl === undefined) {
  throw new Error(
    "FREENET_NODE_URL (or FREENET_LEFT_NODE_URL / FREENET_RIGHT_NODE_URL) is required for the F2 interface proof",
  );
}

const wasm = Uint8Array.from(
  readFileSync(
    join(
      repoRoot,
      "packages/bridge-freenet/contract/packet-log/packet-log-contract.wasm",
    ),
  ),
);
const rendezvous = randomBytes(32);
const provider = new NodeCryptoProvider();

const leftBackend = new FreenetContractPacketLogBackend({
  clientOptions: { url: leftUrl, authToken: leftToken },
  wasm,
  rendezvous,
  localDirection: 0,
  retentionPerDirection: 32,
  updateOptions: { fallbackCodeField: wasm },
});
const rightBackend = new FreenetContractPacketLogBackend({
  clientOptions: { url: rightUrl, authToken: rightToken },
  wasm,
  rendezvous,
  localDirection: 1,
  retentionPerDirection: 32,
  updateOptions: { fallbackCodeField: wasm },
});

const left = await FreenetInterface.open(provider, {
  name: "f2-left",
  provider,
  backend: leftBackend,
});
const right = await FreenetInterface.open(provider, {
  name: "f2-right",
  provider,
  backend: rightBackend,
});

const payload = new TextEncoder().encode(`tp-f2:${label}:${Date.now()}`);
const packet = Packet.fromFields(provider, {
  headerType: PacketHeaderType.HEADER_1,
  transportType: TransportType.BROADCAST,
  destinationType: DestinationType.SINGLE,
  packetType: PacketType.DATA,
  destinationHash: provider.randomBytes(16),
  context: PacketContext.NONE,
  data: payload,
});

const distinct = leftUrl !== rightUrl;
console.log(
  `F2 proof: sending HDLC packet left → right over Freenet packet-log` +
    (distinct ? ` (distinct nodes)` : ""),
);
const received = Promise.race([
  (async () => {
    for await (const next of right.packets) {
      return next;
    }
    throw new Error("no packet");
  })(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("F2 packet receive timeout")), 30_000),
  ),
]);

await left.send(packet);
const got = await received;
await left.close();
await right.close();

if (
  !(got instanceof Packet) ||
  Buffer.from(got.data).toString() !== Buffer.from(payload).toString()
) {
  throw new Error("F2 proof failed: payload mismatch");
}

const artifact = {
  schemaVersion: 1,
  audited: new Date().toISOString().slice(0, 10),
  label,
  nodeUrl: leftUrl,
  rightNodeUrl: rightUrl,
  distinctNodes: distinct,
  rendezvousHex: rendezvous.toString("hex"),
  bitrate: left.bitrate,
  result: "pass",
  notes: distinct
    ? "Distinct Freenet WebSocket endpoints, opposite localDirection; state-reconciling notify path."
    : "Same Freenet node, two FreenetInterface peers with opposite localDirection. Announce+LXMF host exit remains separate.",
};

const outDir = join(repoRoot, ".tmp");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `f2-interface-proof-${label}.json`);
writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`F2 proof passed; wrote ${outPath}`);
