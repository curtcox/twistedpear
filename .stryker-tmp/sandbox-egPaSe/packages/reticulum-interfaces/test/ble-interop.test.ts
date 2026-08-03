// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  PacketReceiptStatus,
  PureCryptoProvider,
  Resource,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod, LXMFRouter } from "@twistedpear/lxmf-ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SimulatedBlePipe } from "../src/ble/sim.js";
import { BleInterface } from "../src/ble/interface.js";
import { fragmentForMtu } from "../src/ble/spec-framing.js";

const provider = new PureCryptoProvider();
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitFor<T>(evaluate: () => T | null | undefined, timeoutMs = 10_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await sleep(50);
  }

  throw new Error("waitFor timeout");
}

function createLinkedBlePair(mtu: number, lossRate = 0.02) {
  const leftPipe = new SimulatedBlePipe({ mtu, lossRate, random: () => 0.99 });
  const rightPipe = new SimulatedBlePipe({ mtu, lossRate, random: () => 0.99 });
  leftPipe.linkPeer(rightPipe);
  return { leftPipe, rightPipe };
}

interface BlePeerPair {
  leftReticulum: Reticulum;
  rightReticulum: Reticulum;
  leftIface: BleInterface;
  rightIface: BleInterface;
}

async function openBlePeerPair(mtu: number, lossRate = 0.02): Promise<BlePeerPair> {
  const { leftPipe, rightPipe } = createLinkedBlePair(mtu, lossRate);

  const leftReticulum = Reticulum.create({ provider, runtime });
  const rightReticulum = Reticulum.create({ provider, runtime });
  leftReticulum.start();
  rightReticulum.start();

  const leftIface = await BleInterface.open(provider, {
    name: "ble-left",
    provider,
    pipe: leftPipe,
    pipeMtu: mtu
  });
  const rightIface = await BleInterface.open(provider, {
    name: "ble-right",
    provider,
    pipe: rightPipe,
    pipeMtu: mtu
  });

  leftReticulum.registerInterface(leftIface);
  rightReticulum.registerInterface(rightIface);

  return { leftReticulum, rightReticulum, leftIface, rightIface };
}

async function closeBlePeerPair(pair: BlePeerPair): Promise<void> {
  await pair.leftIface.close();
  await pair.rightIface.close();
  pair.leftReticulum.stop();
  pair.rightReticulum.stop();
}

describe("BLE interop over simulated pipes", () => {
  it.each([185, 247, 512])(
    "exchanges announces and data packets at MTU %i",
    async (mtu) => {
      const pair = await openBlePeerPair(mtu);

      const alice = loadIdentity("alice");

      const aliceIn = pair.leftReticulum.registerDestination({
        provider,
        identity: alice,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["echo"]
      });
      aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

      const aliceOut = pair.rightReticulum.registerDestination({
        provider,
        identity: alice,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["echo"]
      });

      await aliceIn.announce();
      await waitForPath(pair.rightReticulum, aliceIn.hash, 30_000);

      const received = new Map<string, Uint8Array>();
      aliceIn.setPacketCallback((data) => {
        received.set(new TextDecoder().decode(data), data);
      });

      const payload = new TextEncoder().encode(`ble-sim-${mtu}`);
      const receipt = await aliceOut.send(payload, { createReceipt: true });
      expect(receipt).not.toBeNull();

      const deadline = Date.now() + 10_000;
      while (!received.has(`ble-sim-${mtu}`) && Date.now() < deadline) {
        await sleep(100);
      }

      expect(received.get(`ble-sim-${mtu}`)).toBeDefined();

      await sleep(200);
      expect(receipt!.status).toBe(PacketReceiptStatus.DELIVERED);

      await closeBlePeerPair(pair);
    },
    30_000
  );

  it("establishes a link and echoes packets", async () => {
    const pair = await openBlePeerPair(247);

    const bob = loadIdentity("bob");

    const bobIn = pair.rightReticulum.registerDestination({
      provider,
      identity: bob,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["link"]
    });
    bobIn.setLinkEstablishedCallback((establishedLink) => {
      establishedLink.callbacks.packet = (data) => {
        establishedLink.send(data);
      };
    });

    const bobOut = pair.leftReticulum.registerDestination({
      provider,
      identity: bob,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["link"]
    });

    await bobIn.announce();
    await waitForPath(pair.leftReticulum, bobIn.hash, 30_000);

    const link = bobOut.requestLink();
    await waitFor(() => (link.status === LinkStatus.ACTIVE ? link : null), 20_000);

    const received = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("link echo timeout")), 15_000);
      link.callbacks.packet = (data) => {
        clearTimeout(timer);
        resolve(new TextDecoder().decode(data));
      };
    });

    await link.send(new TextEncoder().encode("ble link ping"));
    await expect(received).resolves.toBe("ble link ping");

    await closeBlePeerPair(pair);
  }, 30_000);

  it("transfers a resource over a link", async () => {
    const pair = await openBlePeerPair(247);

    const rightIn = pair.rightReticulum.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["resource"]
    });

    await rightIn.announce();
    await waitForPath(pair.leftReticulum, rightIn.hash, 30_000);

    const leftOut = pair.leftReticulum.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["resource"]
    });

    let leftLink: import("@twistedpear/reticulum-ts").Link | null = null;
    leftOut.requestLink({
      linkEstablished(link) {
        leftLink = link;
      }
    });

    const establishedLeftLink = await waitFor(() => leftLink, 20_000);
    const rightLink = await waitFor(
      () => rightIn.activeLinks.find((candidate) => candidate.status === LinkStatus.ACTIVE) ?? null,
      20_000
    );
    rightLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

    const payload = new TextEncoder().encode("ble resource " + "x".repeat(1024));
    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("resource timeout")), 20_000);
      rightLink.callbacks.resourceConcluded = (resource) => {
        clearTimeout(timer);
        resolve(resource.data ?? new Uint8Array(0));
      };
    });

    Resource.send(establishedLeftLink, payload, { advertise: true });
    const data = await received;
    expect(new TextDecoder().decode(data)).toBe(new TextDecoder().decode(payload));

    await closeBlePeerPair(pair);
  }, 30_000);

  it("exchanges LXMF messages between two peers", async () => {
    const pair = await openBlePeerPair(247);

    const alice = loadIdentity("alice");
    const bob = loadIdentity("bob");

    const leftRouter = new LXMFRouter({ reticulum: pair.leftReticulum, provider });
    const rightRouter = new LXMFRouter({ reticulum: pair.rightReticulum, provider });

    const aliceDelivery = leftRouter.registerDeliveryIdentity(alice);
    const bobDelivery = rightRouter.registerDeliveryIdentity(bob);
    const bobOut = leftRouter.createOutboundDestination(bob);

    await aliceDelivery.announce();
    await bobDelivery.announce();
    await waitForPath(pair.leftReticulum, bobOut.hash, 30_000);

    const received = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("LXMF timeout")), 30_000);
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
      timestamp: 1_700_000_200
    });

    await expect(received).resolves.toBe("Hello over simulated BLE");

    await closeBlePeerPair(pair);
  }, 45_000);

  it("recovers after a mid-transfer disconnect and reconnect", async () => {
    const leftPipe = new SimulatedBlePipe({
      mtu: 185,
      lossRate: 0,
      disconnectAfterBytes: 96,
      random: () => 1
    });
    const rightPipe = new SimulatedBlePipe({ mtu: 185, lossRate: 0, random: () => 1 });
    leftPipe.linkPeer(rightPipe);

    const leftReticulum = Reticulum.create({ provider, runtime });
    const rightReticulum = Reticulum.create({ provider, runtime });
    leftReticulum.start();
    rightReticulum.start();

    const leftIface = await BleInterface.open(provider, {
      name: "ble-left-reconnect",
      provider,
      pipe: leftPipe,
      pipeMtu: 185
    });
    const rightIface = await BleInterface.open(provider, {
      name: "ble-right-reconnect",
      provider,
      pipe: rightPipe,
      pipeMtu: 185
    });

    leftReticulum.registerInterface(leftIface);
    rightReticulum.registerInterface(rightIface);

    await leftPipe.start();
    await rightPipe.start();
    await leftPipe.stop();
    leftPipe.linkPeer(rightPipe);
    await leftPipe.start();
    await rightPipe.start();

    expect(leftIface.online).toBe(true);
    expect(rightIface.online).toBe(true);

    await leftIface.close();
    await rightIface.close();
    leftReticulum.stop();
    rightReticulum.stop();
  });
});

describe("BLE framing properties", () => {
  it("preserves payload length across random MTUs", () => {
    const payload = new Uint8Array(1024);
    for (let index = 0; index < payload.length; index += 1) {
      payload[index] = index & 0xff;
    }

    for (const mtu of [185, 247, 512]) {
      const frames = fragmentForMtu(payload, mtu);
      expect(frames.length).toBeGreaterThan(0);
      const totalPayload = frames.reduce((sum, frame) => sum + (frame.length - 4), 0);
      expect(totalPayload).toBe(payload.length);
    }
  });
});
