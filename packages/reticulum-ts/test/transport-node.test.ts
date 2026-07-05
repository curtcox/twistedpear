import { describe, expect, it } from "vitest";
import {
  AnnounceRateLimiter,
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  NodeCryptoProvider,
  PacketReceiptStatus,
  PipeInterface,
  Resource,
  Reticulum,
  nodeRuntime
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

async function waitFor<T>(evaluate: () => T | null | undefined, timeoutMs = 8000): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error("waitFor timeout");
}

function connectTransportTopology(): {
  left: Reticulum;
  transport: Reticulum;
  right: Reticulum;
} {
  const left = Reticulum.create({ provider, runtime });
  const transport = Reticulum.create({ provider, runtime, transportEnabled: true });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  transport.start();
  right.start();

  const [leftPipe, transportLeftPipe] = PipeInterface.pair(provider);
  const [transportRightPipe, rightPipe] = PipeInterface.pair(provider);

  left.registerInterface(leftPipe);
  transport.registerInterface(transportLeftPipe);
  transport.registerInterface(transportRightPipe);
  right.registerInterface(rightPipe);

  return { left, transport, right };
}

describe("TransportNode over PipeInterface", () => {
  it("rebroadcasts announces and routes data packets between two leaf peers", async () => {
    const { left, transport, right } = connectTransportTopology();

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["remote"]
    });

    await rightIn.announce();
    await waitFor(() => (left.hasPath(rightIn.hash) ? true : null));

    expect(left.hopsTo(rightIn.hash)).toBe(2);
    expect(transport.hasPath(rightIn.hash)).toBe(true);
    expect(transport.hopsTo(rightIn.hash)).toBe(1);

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["remote"]
    });

    rightIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("receive timeout")), 5000);
      rightIn.setPacketCallback((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    const receipt = await leftOut.send(new TextEncoder().encode("through transport"), { createReceipt: true });
    expect(receipt).not.toBeNull();

    const payload = await received;
    expect(new TextDecoder().decode(payload)).toBe("through transport");

    await waitFor(() => (receipt!.status === PacketReceiptStatus.DELIVERED ? true : null));
  });

  it("routes data in the opposite direction through the transport node", async () => {
    const { left, right } = connectTransportTopology();

    const leftIn = left.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["local"]
    });

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["remote"]
    });

    await leftIn.announce();
    await rightIn.announce();
    await waitFor(() => (right.hasPath(leftIn.hash) ? true : null));

    expect(right.hopsTo(leftIn.hash)).toBe(2);

    const rightOut = right.registerDestination({
      provider,
      identity: leftIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["local"]
    });

    leftIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("reply timeout")), 5000);
      leftIn.setPacketCallback((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    await rightOut.send(new TextEncoder().encode("return path"));
    const payload = await received;
    expect(new TextDecoder().decode(payload)).toBe("return path");
  });
});

describe("TransportNode link and resource relay", () => {
  it("establishes a link and transfers a resource through a transport node", async () => {
    const { left, right } = connectTransportTopology();

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["resource"]
    });

    await rightIn.announce();
    await waitFor(() => (left.hasPath(rightIn.hash) ? true : null));

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["resource"]
    });

    let leftLink: import("../src/index.js").Link | null = null;
    leftOut.requestLink({
      linkEstablished(link) {
        leftLink = link;
      }
    });

    const establishedLeftLink = await waitFor(() => leftLink);
    const rightLink = await waitFor(
      () => rightIn.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ?? null
    );
    rightLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

    const payload = new TextEncoder().encode("resource via transport " + "z".repeat(1024));
    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("resource timeout")), 10000);
      rightLink.callbacks.resourceConcluded = (resource) => {
        clearTimeout(timer);
        resolve(resource.data ?? new Uint8Array(0));
      };
    });

    Resource.send(establishedLeftLink, payload, { advertise: true });
    const data = await received;
    expect(new TextDecoder().decode(data)).toBe(new TextDecoder().decode(payload));
  }, 15000);
});

describe("TransportNode path requests", () => {
  it("answers path requests from cached announces after a peer joins late", async () => {
    const transport = Reticulum.create({ provider, runtime, transportEnabled: true });
    const right = Reticulum.create({ provider, runtime });
    transport.start();
    right.start();

    const [transportRightPipe, rightPipe] = PipeInterface.pair(provider);
    transport.registerInterface(transportRightPipe);
    right.registerInterface(rightPipe);

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["late"]
    });

    await rightIn.announce();
    await waitFor(() => (transport.hasPath(rightIn.hash) ? true : null));

    const left = Reticulum.create({ provider, runtime });
    left.start();
    const [leftPipe, transportLeftPipe] = PipeInterface.pair(provider);
    left.registerInterface(leftPipe);
    transport.registerInterface(transportLeftPipe);

    expect(left.hasPath(rightIn.hash)).toBe(false);
    const discovered = await left.awaitPath(rightIn.hash, 8);
    expect(discovered).toBe(true);
    expect(left.hopsTo(rightIn.hash)).toBe(2);
  });

  it("forwards path requests for unknown destinations and fulfills them on announce", async () => {
    const left = Reticulum.create({ provider, runtime });
    const transport = Reticulum.create({ provider, runtime, transportEnabled: true });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    transport.start();
    right.start();

    const [leftPipe, transportLeftPipe] = PipeInterface.pair(provider);
    const [transportRightPipe, rightPipe] = PipeInterface.pair(provider);
    left.registerInterface(leftPipe);
    transport.registerInterface(transportLeftPipe);
    transport.registerInterface(transportRightPipe);
    right.registerInterface(rightPipe);

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["discover"]
    });

    expect(left.hasPath(rightIn.hash)).toBe(false);
    expect(transport.hasPath(rightIn.hash)).toBe(false);

    const discovery = left.awaitPath(rightIn.hash, 8);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await rightIn.announce();

    expect(await discovery).toBe(true);
    expect(left.hopsTo(rightIn.hash)).toBe(2);
    expect(transport.hasPath(rightIn.hash)).toBe(true);
  });
});

describe("TransportNode three-hop topology", () => {
  it("routes packets across two transport nodes", async () => {
    const left = Reticulum.create({ provider, runtime });
    const transportA = Reticulum.create({ provider, runtime, transportEnabled: true });
    const transportB = Reticulum.create({ provider, runtime, transportEnabled: true });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    transportA.start();
    transportB.start();
    right.start();

    const [leftPipe, transportALeftPipe] = PipeInterface.pair(provider);
    const [transportAMidPipe, transportBMidPipe] = PipeInterface.pair(provider);
    const [transportBRightPipe, rightPipe] = PipeInterface.pair(provider);

    left.registerInterface(leftPipe);
    transportA.registerInterface(transportALeftPipe);
    transportA.registerInterface(transportAMidPipe);
    transportB.registerInterface(transportBMidPipe);
    transportB.registerInterface(transportBRightPipe);
    right.registerInterface(rightPipe);

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["far"]
    });

    await rightIn.announce();
    await waitFor(() => (left.hasPath(rightIn.hash) ? true : null));

    expect(left.hopsTo(rightIn.hash)).toBe(3);
    expect(transportA.hopsTo(rightIn.hash)).toBe(2);
    expect(transportB.hopsTo(rightIn.hash)).toBe(1);

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["far"]
    });

    rightIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("three-hop timeout")), 5000);
      rightIn.setPacketCallback((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    await leftOut.send(new TextEncoder().encode("three hops"));
    const payload = await received;
    expect(new TextDecoder().decode(payload)).toBe("three hops");
  });
});

describe("TransportNode announce rate limiting", () => {
  it("uses the same limiter contract that transport-node announce ingress relies on", () => {
    const limiter = new AnnounceRateLimiter({ rateTarget: 0.2, rateGrace: 0, ratePenalty: 10 });
    const noisyKey = "deadbeef";
    const quietKey = "cafebabe";

    expect(limiter.record(noisyKey, 100)).toBe(false);
    expect(limiter.record(noisyKey, 100.1)).toBe(true);
    expect(limiter.isBlocked(noisyKey, 100.1)).toBe(true);
    expect(limiter.record(quietKey, 200)).toBe(false);
    expect(limiter.isBlocked(quietKey, 200)).toBe(false);
  });
});
