import { describe, expect, it } from "vitest";
import {
  Identity,
  PureCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime,
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod, LXMFRouter } from "@twistedpear/lxmf-ts";
import {
  BleInterface,
  SimulatedBlePipe,
} from "@twistedpear/reticulum-interfaces";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const provider = new PureCryptoProvider();
const runtime = nodeRuntime();

const identityVectors = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../vectors/identity.json"),
    "utf8",
  ),
) as {
  identities: ReadonlyArray<{ name: string; privateKeyHex: string }>;
};

function loadIdentity(name: string): Identity {
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
  if (identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }
  return identity;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(
  reticulum: Reticulum,
  destinationHash: Uint8Array,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }
    await sleep(100);
  }
  throw new Error("Timed out waiting for path to peer");
}

describe("LXMF over simulated BLE", () => {
  it("exchanges messages between two peers", async () => {
    const leftPipe = new SimulatedBlePipe({
      mtu: 247,
      lossRate: 0.02,
      random: () => 0.99,
    });
    const rightPipe = new SimulatedBlePipe({
      mtu: 247,
      lossRate: 0.02,
      random: () => 0.99,
    });
    leftPipe.linkPeer(rightPipe);

    const leftReticulum = Reticulum.create({ provider, runtime });
    const rightReticulum = Reticulum.create({ provider, runtime });
    leftReticulum.start();
    rightReticulum.start();

    const leftIface = await BleInterface.open(provider, {
      name: "ble-left",
      provider,
      pipe: leftPipe,
      pipeMtu: 247,
    });
    const rightIface = await BleInterface.open(provider, {
      name: "ble-right",
      provider,
      pipe: rightPipe,
      pipeMtu: 247,
    });
    leftReticulum.registerInterface(leftIface);
    rightReticulum.registerInterface(rightIface);

    try {
      const alice = loadIdentity("alice");
      const bob = loadIdentity("bob");
      const leftRouter = new LXMFRouter({ reticulum: leftReticulum, provider });
      const rightRouter = new LXMFRouter({
        reticulum: rightReticulum,
        provider,
      });
      const aliceDelivery = leftRouter.registerDeliveryIdentity(alice);
      const bobDelivery = rightRouter.registerDeliveryIdentity(bob);
      const bobOut = leftRouter.createOutboundDestination(bob);

      await aliceDelivery.announce();
      await bobDelivery.announce();
      await waitForPath(leftReticulum, bobOut.hash, 30_000);

      const received = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("LXMF timeout")),
          30_000,
        );
        rightRouter.onDelivery((message) => {
          clearTimeout(timer);
          resolve(message.contentAsString());
        });
      });

      await leftRouter.packAndSend({
        destination: bobOut,
        source: aliceDelivery,
        title: "BLE sim",
        content: "Hello over simulated BLE",
        desiredMethod: LXMessageMethod.OPPORTUNISTIC,
        deferStamp: true,
        timestamp: 1_700_000_200,
      });

      await expect(received).resolves.toBe("Hello over simulated BLE");
    } finally {
      await leftIface.close();
      await rightIface.close();
      leftReticulum.stop();
      rightReticulum.stop();
    }
  }, 45_000);
});
