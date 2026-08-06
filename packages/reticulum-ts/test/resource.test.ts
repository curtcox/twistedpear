import { describe, expect, it } from "vitest";
import {
  Buffer,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  NodeCryptoProvider,
  PipeInterface,
  Resource,
  Reticulum,
  nodeRuntime,
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

async function waitFor<T>(
  evaluate: () => T | null | undefined,
  timeoutMs = 5000,
): Promise<T> {
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

async function connectPeers(): Promise<{
  leftLink: import("../src/index.js").Link;
  rightLink: import("../src/index.js").Link;
}> {
  const left = Reticulum.create({ provider, runtime });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  right.start();

  const [leftPipe, rightPipe] = PipeInterface.pair(provider);
  left.registerInterface(leftPipe);
  right.registerInterface(rightPipe);

  const rightIn = right.registerDestination({
    provider,
    identity: new Identity(provider),
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["resource"],
  });

  await rightIn.announce();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const leftOut = left.registerDestination({
    provider,
    identity: rightIn.identity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["resource"],
  });

  let leftLink: import("../src/index.js").Link | null = null;
  leftOut.requestLink({
    linkEstablished(link) {
      leftLink = link;
    },
  });

  const establishedLeftLink = await waitFor(() => leftLink);
  const rightLink = await waitFor(
    () =>
      rightIn.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ??
      null,
  );

  rightLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

  return {
    leftLink: establishedLeftLink,
    rightLink,
  };
}

describe("Resource transfer over PipeInterface", () => {
  it("transfers bytes from initiator to responder", async () => {
    const { leftLink, rightLink } = await connectPeers();
    const payload = new TextEncoder().encode(
      "resource payload " + "x".repeat(512),
    );

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("resource timeout")),
        8000,
      );
      rightLink.callbacks.resourceConcluded = (resource) => {
        clearTimeout(timer);
        resolve(resource.data ?? new Uint8Array(0));
      };
    });

    Resource.send(leftLink, payload, { advertise: true });
    const data = await received;
    expect(new TextDecoder().decode(data)).toBe(
      new TextDecoder().decode(payload),
    );
  });

  it("transfers bytes from responder to initiator", async () => {
    const { leftLink, rightLink } = await connectPeers();
    const payload = new TextEncoder().encode("reverse resource payload");

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("resource timeout")),
        8000,
      );
      leftLink.callbacks.resourceConcluded = (resource) => {
        clearTimeout(timer);
        resolve(resource.data ?? new Uint8Array(0));
      };
    });

    Resource.send(rightLink, payload, { advertise: true });
    const data = await received;
    expect(new TextDecoder().decode(data)).toBe(
      new TextDecoder().decode(payload),
    );
  });

  it("transfers a multi-window payload", async () => {
    const { leftLink, rightLink } = await connectPeers();
    const payload = new TextEncoder().encode(
      "large resource " + "y".repeat(100_000),
    );

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("resource timeout")),
        10000,
      );
      rightLink.callbacks.resourceConcluded = (resource) => {
        clearTimeout(timer);
        resolve(resource.data ?? new Uint8Array(0));
      };
    });

    Resource.send(leftLink, payload, { advertise: true });
    const data = await received;
    expect(data.length).toBe(payload.length);
    expect(new TextDecoder().decode(data)).toBe(
      new TextDecoder().decode(payload),
    );
  });
});

describe("Buffer streaming over PipeInterface", () => {
  it("streams bytes through a link channel buffer", async () => {
    const { leftLink, rightLink } = await connectPeers();
    const payload = new TextEncoder().encode("buffered stream payload");

    const leftChannel = leftLink.getChannel();
    const rightChannel = rightLink.getChannel();
    const reader = Buffer.createReader(1, rightChannel);
    const writer = Buffer.createWriter(1, leftChannel);

    const received = waitFor(() => {
      const chunk = reader.read(payload.length);
      return chunk !== null && chunk.length > 0 ? chunk : null;
    });

    await writer.write(payload);
    await writer.close();

    const data = await received;
    expect(new TextDecoder().decode(data)).toBe(
      new TextDecoder().decode(payload),
    );
    reader.close();
  });
});
