import { describe, expect, it } from "vitest";
import {
  Identity,
  PureCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime,
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod, LXMFRouter } from "@twistedpear/lxmf-ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FreenetInterface,
  type FreenetPacketLogBackend,
} from "../src/freenet.js";

const provider = new PureCryptoProvider();
const runtime = nodeRuntime();

const identityVectors = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../conformance/vectors/identity.json",
    ),
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

class LinkedMemoryPacketLogBackend implements FreenetPacketLogBackend {
  #receiver: ((frame: Uint8Array) => void) | null = null;
  #active = false;
  peer: LinkedMemoryPacketLogBackend | null = null;

  get active(): boolean {
    return this.#active;
  }

  setReceiver(onFrame: (hdlcFrame: Uint8Array) => void): void {
    this.#receiver = onFrame;
  }

  async start(): Promise<void> {
    this.#active = true;
  }

  async stop(): Promise<void> {
    this.#active = false;
  }

  async publishFrame(hdlcFrame: Uint8Array): Promise<void> {
    const peer = this.peer;
    if (peer) {
      peer.#receiver?.(Uint8Array.from(hdlcFrame));
    }
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(
  reticulum: Reticulum,
  destinationHash: Uint8Array,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }
    await sleep(50);
  }
  throw new Error("Timed out waiting for path to peer");
}

describe("FreenetInterface announce and LXMF", () => {
  it("exchanges announce and LXMF over FreenetInterface-only peers", async () => {
    const leftBackend = new LinkedMemoryPacketLogBackend();
    const rightBackend = new LinkedMemoryPacketLogBackend();
    leftBackend.peer = rightBackend;
    rightBackend.peer = leftBackend;

    const leftReticulum = Reticulum.create({ provider, runtime });
    const rightReticulum = Reticulum.create({ provider, runtime });
    leftReticulum.start();
    rightReticulum.start();

    const leftIface = await FreenetInterface.open(provider, {
      name: "freenet-left",
      provider,
      backend: leftBackend,
    });
    const rightIface = await FreenetInterface.open(provider, {
      name: "freenet-right",
      provider,
      backend: rightBackend,
    });
    leftReticulum.registerInterface(leftIface);
    rightReticulum.registerInterface(rightIface);

    const alice = loadIdentity("alice");
    const bob = loadIdentity("bob");
    const leftRouter = new LXMFRouter({ reticulum: leftReticulum, provider });
    const rightRouter = new LXMFRouter({ reticulum: rightReticulum, provider });
    const aliceDelivery = leftRouter.registerDeliveryIdentity(alice);
    const bobDelivery = rightRouter.registerDeliveryIdentity(bob);
    const bobOut = leftRouter.createOutboundDestination(bob);

    await aliceDelivery.announce();
    await bobDelivery.announce();
    await waitForPath(leftReticulum, bobOut.hash, 15_000);

    const received = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("LXMF timeout")), 15_000);
      rightRouter.onDelivery((message) => {
        clearTimeout(timer);
        resolve(message.contentAsString());
      });
    });

    await leftRouter.packAndSend({
      destination: bobOut,
      source: aliceDelivery,
      title: "Freenet sim",
      content: "Hello over FreenetInterface",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: 1_700_000_300,
    });

    await expect(received).resolves.toBe("Hello over FreenetInterface");

    await leftIface.close();
    await rightIface.close();
    leftReticulum.stop();
    rightReticulum.stop();
  }, 30_000);
});
