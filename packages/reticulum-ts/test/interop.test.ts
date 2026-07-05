import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  PacketReceiptStatus,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "../src/index.js";
import {
  LEAF_ECHO_PORT,
  interopReady,
  sleep,
  withComposeService
} from "../../../conformance/scenarios/ts/harness.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

const identityVectors = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../conformance/vectors/identity.json"), "utf8")
) as {
  identities: ReadonlyArray<{ name: string; privateKeyHex: string }>;
};

function loadIdentity(name: string): Identity {
  const entry = identityVectors.identities.find((candidate) => candidate.name === name);
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(provider, hexToBytes(entry.privateKeyHex));
  if (identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }

  return identity;
}

async function waitForPath(reticulum: Reticulum, destinationHash: Uint8Array, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
}

describe.runIf(interopReady())("docker interop — leaf node over TCP", () => {
  it("discovers Python announces and exchanges data packets with proofs", async () => {
    await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
      const alice = loadIdentity("alice");
      const bob = loadIdentity("bob");

      const reticulum = Reticulum.create({ provider, runtime });
      reticulum.start();

      await reticulum.addTcpClientInterface({
        name: "python-leaf-echo",
        targetHost: "127.0.0.1",
        targetPort: LEAF_ECHO_PORT
      });

      const aliceIn = reticulum.registerDestination({
        provider,
        identity: alice,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["echo"]
      });
      aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

      const bobOut = reticulum.registerDestination({
        provider,
        identity: bob,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["echo"]
      });

      await aliceIn.announce();
      await waitForPath(reticulum, bobOut.hash);

      const received = new Map<string, Uint8Array>();
      aliceIn.setPacketCallback((data) => {
        received.set(new TextDecoder().decode(data), data);
      });

      const receipt = await bobOut.send(new TextEncoder().encode("ping"), { createReceipt: true });
      expect(receipt).not.toBeNull();

      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if (received.has("ping") && received.has("hello from python leaf echo")) {
          break;
        }

        await sleep(100);
      }

      expect(received.get("ping")).toBeDefined();
      expect(received.get("hello from python leaf echo")).toBeDefined();

      await sleep(200);
      expect(receipt!.status).toBe(PacketReceiptStatus.DELIVERED);
    });
  }, 120_000);
});
