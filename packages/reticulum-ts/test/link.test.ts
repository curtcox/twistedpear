import { describe, expect, it } from "vitest";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  Link,
  LinkStatus,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  nodeRuntime
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

async function waitFor<T>(evaluate: () => T | null | undefined, timeoutMs = 1000): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("waitFor timeout");
}

describe("Link establishment over PipeInterface", () => {
  it("completes handshake and exchanges encrypted data", async () => {
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
      aspects: ["peer"]
    });

    await rightIn.announce();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(left.hasPath(rightIn.hash)).toBe(true);

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["peer"]
    });

    let initiatorLink: Link | null = null;
    leftOut.requestLink({
      linkEstablished(link) {
        initiatorLink = link;
      }
    });

    const leftLink = await waitFor(() => initiatorLink);
    expect(leftLink.status).toBe(LinkStatus.ACTIVE);
    expect(leftLink.rtt).not.toBeNull();

    const rightLink = await waitFor(
      () => rightIn.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ?? null
    );

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("payload timeout")), 1000);
      rightLink.callbacks.packet = (data) => {
        clearTimeout(timer);
        resolve(data);
      };
    });

    await leftLink.send(new TextEncoder().encode("over the link"));
    const payload = await received;
    expect(new TextDecoder().decode(payload)).toBe("over the link");
  });
});
