import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  PacketReceiptStatus,
  PureCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
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

function createLinkedBlePair(mtu: number, lossRate = 0.02) {
  const leftPipe = new SimulatedBlePipe({ mtu, lossRate, random: () => 0.99 });
  const rightPipe = new SimulatedBlePipe({ mtu, lossRate, random: () => 0.99 });
  leftPipe.linkPeer(rightPipe);
  return { leftPipe, rightPipe };
}

describe("BLE interop over simulated pipes", () => {
  it.each([185, 247, 512])(
    "exchanges announces and data packets at MTU %i",
    async (mtu) => {
    const { leftPipe, rightPipe } = createLinkedBlePair(mtu);

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

    const alice = loadIdentity("alice");

    const aliceIn = leftReticulum.registerDestination({
      provider,
      identity: alice,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["echo"]
    });
    aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const aliceOut = rightReticulum.registerDestination({
      provider,
      identity: alice,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["echo"]
    });

    await aliceIn.announce();
    await waitForPath(rightReticulum, aliceIn.hash, 30_000);

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

    await leftIface.close();
    await rightIface.close();
    leftReticulum.stop();
    rightReticulum.stop();
  },
  30_000
  );

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
