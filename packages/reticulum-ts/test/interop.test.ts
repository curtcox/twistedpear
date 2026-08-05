import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  NodeCryptoProvider,
  PacketReceiptStatus,
  Resource,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "../src/index.js";
import {
  LEAF_ECHO_PORT,
  LINK_ECHO_PORT,
  RESOURCE_ECHO_PORT,
  UDP_ECHO_PORT,
  UDP_TS_PORT,
  composeDown,
  composePause,
  composeUnpause,
  composeUp,
  interopReady,
  sleep,
  waitForTcp,
  withComposeService
} from "../../../conformance/scenarios/ts/harness.mjs";

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

      const iface = await reticulum.addTcpClientInterface({
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
      await iface.close();
      reticulum.stop();
    });
  }, 120_000);
});

describe.runIf(interopReady())("docker interop — link over TCP", () => {
  it("establishes a link with Python and echoes encrypted payloads", async () => {
    await withComposeService("link-echo", LINK_ECHO_PORT, async () => {
      const bob = loadIdentity("bob");

      const reticulum = Reticulum.create({ provider, runtime });
      reticulum.start();

      const iface = await reticulum.addTcpClientInterface({
        name: "python-link-echo",
        targetHost: "127.0.0.1",
        targetPort: LINK_ECHO_PORT
      });

      const bobOut = reticulum.registerDestination({
        provider,
        identity: bob,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["link"]
      });

      await waitForPath(reticulum, bobOut.hash);

      const link = bobOut.requestLink();
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline && link.status !== LinkStatus.ACTIVE) {
        await sleep(100);
      }

      expect(link.status).toBe(LinkStatus.ACTIVE);

      const received = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("link echo timeout")), 10_000);
        link.callbacks.packet = (data) => {
          clearTimeout(timer);
          resolve(new TextDecoder().decode(data));
        };
      });

      await link.send(new TextEncoder().encode("link ping"));
      await expect(received).resolves.toBe("link ping");
      await link.teardown();
      await iface.close();
      reticulum.stop();
    });
  }, 120_000);
});

describe.runIf(interopReady())("docker interop — leaf node over UDP", () => {
  it("discovers Python announces and exchanges data packets over UDP", async () => {
    await withComposeService("udp-echo", UDP_ECHO_PORT, async () => {
      const alice = loadIdentity("alice");
      const bob = loadIdentity("bob");

      const reticulum = Reticulum.create({ provider, runtime });
      reticulum.start();

      const iface = await reticulum.addUdpInterface({
        name: "python-udp-echo",
        // On Linux the peer reaches the host through Docker's bridge gateway,
        // rather than through the host loopback interface as it does on macOS.
        listenHost: "0.0.0.0",
        listenPort: UDP_TS_PORT,
        forwardHost: "127.0.0.1",
        forwardPort: UDP_ECHO_PORT
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

      await bobOut.send(new TextEncoder().encode("udp ping"));
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (received.has("udp ping") && received.has("hello from python udp echo")) {
          break;
        }

        await sleep(100);
      }

      expect(received.get("udp ping")).toBeDefined();
      expect(received.get("hello from python udp echo")).toBeDefined();
      await iface.close();
      reticulum.stop();
    });
  }, 120_000);
});

function resourceSizes(): number[] {
  const raw = process.env.RESOURCE_INTEROP_SIZES ?? "1024,1048576";
  return raw.split(",").map((entry) => Number.parseInt(entry.trim(), 10)).filter((size) => size > 0);
}

describe.runIf(interopReady())("docker interop — Resource transfer over TCP", () => {
  it.each(resourceSizes().map((size) => [size]))(
    "transfers %i bytes to Python and receives echo",
    async (size) => {
      await withComposeService("resource-echo", RESOURCE_ECHO_PORT, async () => {
        const bob = loadIdentity("bob");

        const reticulum = Reticulum.create({ provider, runtime });
        reticulum.start();

        const iface = await reticulum.addTcpClientInterface({
          name: "python-resource-echo",
          targetHost: "127.0.0.1",
          targetPort: RESOURCE_ECHO_PORT
        });

        const bobOut = reticulum.registerDestination({
          provider,
          identity: bob,
          direction: DestinationDirection.OUT,
          type: DestinationType.SINGLE,
          appName: "example",
          aspects: ["resource"]
        });

        await waitForPath(reticulum, bobOut.hash);

        const link = bobOut.requestLink();
        const linkDeadline = Date.now() + 15_000;
        while (Date.now() < linkDeadline && link.status !== LinkStatus.ACTIVE) {
          await sleep(100);
        }

        expect(link.status).toBe(LinkStatus.ACTIVE);
        link.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

        const payload = new Uint8Array(size);
        for (let index = 0; index < size; index += 1) {
          payload[index] = index & 0xff;
        }

        const expectedDigest = createHash("sha256").update(payload).digest("hex");

        let outgoing: Resource | null = null;
        const received = new Promise<Uint8Array>((resolve, reject) => {
          const timeoutMs = Number.parseInt(process.env.RESOURCE_ECHO_TIMEOUT_MS ?? "120000", 10);
          const timer = setTimeout(
            () => reject(new Error(`resource echo timeout (status=${outgoing?.status ?? "none"}, progress=${outgoing?.progress ?? 0})`)),
            timeoutMs
          );
          link.callbacks.resourceConcluded = (resource) => {
            clearTimeout(timer);
            resolve(resource.data ?? new Uint8Array(0));
          };
        });

        outgoing = Resource.send(link, payload, { advertise: true });
        const echoed = await received;
        const actualDigest = createHash("sha256").update(echoed).digest("hex");
        expect(echoed.length).toBe(size);
        expect(actualDigest).toBe(expectedDigest);
        await link.teardown();
        await iface.close();
        reticulum.stop();
      });
    },
    180_000
  );
});

describe.runIf(interopReady())("docker interop — Resource transfer resume", () => {
  it("resumes after mid-transfer TCP flap", async () => {
    const flapSize = Number.parseInt(process.env.RESOURCE_FLAP_SIZE ?? "1048576", 10);
    composeUp("resource-echo");
    try {
      await waitForTcp("127.0.0.1", RESOURCE_ECHO_PORT);

      const bob = loadIdentity("bob");
      const reticulum = Reticulum.create({ provider, runtime });
      reticulum.start();

      const iface = await reticulum.addTcpClientInterface({
        name: "python-resource-echo",
        targetHost: "127.0.0.1",
        targetPort: RESOURCE_ECHO_PORT,
        reconnectWaitMs: 500
      });

      const bobOut = reticulum.registerDestination({
        provider,
        identity: bob,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["resource"]
      });

      await waitForPath(reticulum, bobOut.hash);

      const link = bobOut.requestLink();
      const linkDeadline = Date.now() + 15_000;
      while (Date.now() < linkDeadline && link.status !== LinkStatus.ACTIVE) {
        await sleep(100);
      }

      expect(link.status).toBe(LinkStatus.ACTIVE);
      link.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

      const payload = new Uint8Array(flapSize);
      for (let index = 0; index < flapSize; index += 1) {
        payload[index] = index & 0xff;
      }

      const expectedDigest = createHash("sha256").update(payload).digest("hex");

      const received = new Promise<Uint8Array>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("resource echo timeout after flap")), 180_000);
        link.callbacks.resourceConcluded = (resource) => {
          clearTimeout(timer);
          resolve(resource.data ?? new Uint8Array(0));
        };
      });

      const outgoing = Resource.send(link, payload, { advertise: true });

      const flapDeadline = Date.now() + 60_000;
      while (Date.now() < flapDeadline && outgoing.progress <= 0) {
        await sleep(50);
      }

      expect(outgoing.progress).toBeGreaterThan(0);

      composePause("resource-echo");
      await sleep(2_000);
      composeUnpause("resource-echo");
      await waitForTcp("127.0.0.1", RESOURCE_ECHO_PORT, 30_000);

      const echoed = await received;
      const actualDigest = createHash("sha256").update(echoed).digest("hex");
      expect(echoed.length).toBe(flapSize);
      expect(actualDigest).toBe(expectedDigest);
      await link.teardown();
      await iface.close();
      reticulum.stop();
    } finally {
      composeDown();
    }
  }, 300_000);
});
