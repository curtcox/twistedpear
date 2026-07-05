import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import {
  LXMessageMethod,
  LXMFRouter
} from "../src/index.js";
import {
  LXMF_ECHO_PORT,
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

describe.runIf(interopReady())("docker interop — LXMF over TCP", () => {
  it("exchanges opportunistic LXMF messages with Python LXMF echo peer", async () => {
    await withComposeService("lxmf-echo", LXMF_ECHO_PORT, async () => {
      const alice = loadIdentity("alice");
      const bob = loadIdentity("bob");

      const reticulum = Reticulum.create({ provider, runtime });
      reticulum.start();

      await reticulum.addTcpClientInterface({
        name: "python-lxmf-echo",
        targetHost: "127.0.0.1",
        targetPort: LXMF_ECHO_PORT
      });

      const router = new LXMFRouter({ reticulum, provider });
      const aliceDelivery = router.registerDeliveryIdentity(alice);
      const bobOut = router.createOutboundDestination(bob);

      await aliceDelivery.announce();
      await waitForPath(reticulum, bobOut.hash);

      const received = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("LXMF echo timeout")), 15_000);
        router.onDelivery((message) => {
          clearTimeout(timer);
          resolve(message.contentAsString());
        });
      });

      await router.packAndSend({
        destination: bobOut,
        source: aliceDelivery,
        title: "Interop",
        content: "Hello Python LXMF",
        desiredMethod: LXMessageMethod.OPPORTUNISTIC,
        deferStamp: true,
        timestamp: 1700000100
      });

      await expect(received).resolves.toBe("Hello Python LXMF");
    });
  }, 120_000);
});
