import { describe, expect, it } from "vitest";
import {
  DestinationAllowPolicy,
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
import { msgpackPackBin } from "../src/msgpack.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

async function waitFor<T>(evaluate: () => T | null | undefined, timeoutMs = 2000): Promise<T> {
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

async function connectPeers(): Promise<{
  left: Reticulum;
  right: Reticulum;
  leftOut: ReturnType<Reticulum["registerDestination"]>;
  rightIn: ReturnType<Reticulum["registerDestination"]>;
  leftLink: Link;
  rightLink: Link;
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
    aspects: ["peer"]
  });

  await rightIn.announce();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const leftOut = left.registerDestination({
    provider,
    identity: rightIn.identity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["peer"]
  });

  let leftLink: Link | null = null;
  leftOut.requestLink({
    linkEstablished(link) {
      leftLink = link;
    }
  });

  const establishedLeftLink = await waitFor(() => leftLink);
  const rightLink = await waitFor(
    () => rightIn.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ?? null
  );

  return {
    left,
    right,
    leftOut,
    rightIn,
    leftLink: establishedLeftLink,
    rightLink
  };
}

describe("Link establishment over PipeInterface", () => {
  it("completes handshake and exchanges encrypted data", async () => {
    const { leftLink, rightLink } = await connectPeers();

    const received = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("payload timeout")), 2000);
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

describe("Link request/response", () => {
  it("handles remote requests on an established link", async () => {
    const { leftLink, rightIn } = await connectPeers();

    rightIn.registerRequestHandler(
      "/echo",
      (_path, data) => (data === null ? null : msgpackPackBin(data)),
      DestinationAllowPolicy.ALLOW_ALL
    );

    const responsePromise = new Promise<Uint8Array | null>((resolve) => {
      void leftLink
        .request("/echo", msgpackPackBin(new TextEncoder().encode("ping")), {
          timeout: 2,
          response: (receipt) => resolve(receipt.response),
          failed: () => resolve(null)
        })
        .then((receipt) => {
          if (receipt === false) {
            resolve(null);
          }
        });
    });

    const response = await responsePromise;
    expect(response).not.toBeNull();
    expect(new TextDecoder().decode(response!)).toBe("ping");
  });
});

describe("Link identification", () => {
  it("reveals initiator identity to the responder", async () => {
    const { leftLink, rightLink, leftOut } = await connectPeers();
    const initiatorIdentity = leftOut.identity!;

    const identified = waitFor(() => rightLink.getRemoteIdentity());
    leftLink.identify(initiatorIdentity);
    const remote = await identified;
    expect(remote?.hash).toEqual(initiatorIdentity.hash);
  });
});

describe("Channel messaging", () => {
  it("delivers ordered messages over a link channel", async () => {
    const { leftLink, rightLink } = await connectPeers();

    class EchoMessage {
      static readonly MSGTYPE = 0x1001;
      readonly MSGTYPE = EchoMessage.MSGTYPE;
      text = "";

      constructor(text = "") {
        this.text = text;
      }

      pack(): Uint8Array {
        return new TextEncoder().encode(this.text);
      }

      unpack(raw: Uint8Array): void {
        this.text = new TextDecoder().decode(raw);
      }
    }

    const rightChannel = rightLink.getChannel();
    rightChannel.registerMessageType(EchoMessage);

    const received = new Promise<string>((resolve) => {
      rightChannel.addMessageHandler((message) => {
        if (message instanceof EchoMessage) {
          resolve(message.text);
          return true;
        }

        return false;
      });
    });

    const leftChannel = leftLink.getChannel();
    await leftChannel.send(new EchoMessage("channel hello"));
    expect(await received).toBe("channel hello");
  });
});
