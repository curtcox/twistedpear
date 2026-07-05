import { describe, expect, it } from "vitest";
import {
  Announce,
  DestinationDirection,
  DestinationType,
  DestinationProofStrategy,
  Identity,
  NodeCryptoProvider,
  PacketContext,
  PacketReceiptStatus,
  PacketType,
  PipeInterface,
  Reticulum,
  bytesToHex,
  hexToBytes,
  nodeRuntime
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

describe("LeafTransport over PipeInterface", () => {
  it("discovers announces and exchanges data packets with proofs", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();

    const [leftPipe, rightPipe] = PipeInterface.pair(provider, { name: "left" }, { name: "right" });
    left.registerInterface(leftPipe);
    right.registerInterface(rightPipe);

    const leftIn = left.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["node"]
    });

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["peer"]
    });

    await leftIn.announce();
    await rightIn.announce();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(left.hasPath(rightIn.hash)).toBe(true);
    expect(right.hasPath(leftIn.hash)).toBe(true);

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["peer"]
    });

    const rightOut = right.registerDestination({
      provider,
      identity: leftIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["node"]
    });

    rightIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    leftIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const receivedOnRight = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("receive timeout")), 1000);
      rightIn.setPacketCallback((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    const receipt = await leftOut.send(new TextEncoder().encode("hello peer"), { createReceipt: true });
    expect(receipt).not.toBeNull();

    const payload = await receivedOnRight;
    expect(new TextDecoder().decode(payload)).toBe("hello peer");

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(receipt!.status).toBe(PacketReceiptStatus.DELIVERED);

    const receivedOnLeft = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("reply timeout")), 1000);
      leftIn.setPacketCallback((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    await rightOut.send(new TextEncoder().encode("hello node"));
    const reply = await receivedOnLeft;
    expect(new TextDecoder().decode(reply)).toBe("hello node");
  });

  it("validates announces heard from a peer", async () => {
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
      aspects: ["alpha"]
    });

    const announces: string[] = [];
    left.registerAnnounceHandler({
      aspectFilter: "example.alpha",
      receivedAnnounce(info) {
        announces.push(bytesToHex(info.destinationHash));
      }
    });

    await rightIn.announce();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(left.hasPath(rightIn.hash)).toBe(true);
    expect(announces).toContain(rightIn.hexhash);

    const parsed = Announce.buildPacket(provider, rightIn);
    expect(Announce.validate(provider, parsed)).toBe(true);
    expect(parsed.packetType).toBe(PacketType.ANNOUNCE);
    expect(parsed.context).toBe(PacketContext.NONE);
  });
});

describe("TCP loopback interface", () => {
  it("connects client and server over localhost", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();

    const server = await right.addTcpServerInterface({
      name: "server",
      listenHost: "127.0.0.1",
      listenPort: 0
    });

    const port = server.address?.port;
    expect(port).toBeGreaterThan(0);

    await left.addTcpClientInterface({
      name: "client",
      targetHost: "127.0.0.1",
      targetPort: port!
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.clients.length).toBe(1);
    expect(server.clients[0]!.online).toBe(true);

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tcp",
      aspects: ["server"]
    });

    await rightIn.announce();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(left.hasPath(rightIn.hash)).toBe(true);

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "tcp",
      aspects: ["server"]
    });

    const received = new Promise<Uint8Array>((resolve) => {
      rightIn.setPacketCallback((data) => resolve(data));
    });

    await leftOut.send(hexToBytes("010203"));
    const payload = await Promise.race([
      received,
      new Promise<Uint8Array>((_, reject) => setTimeout(() => reject(new Error("timeout")), 500))
    ]);
    expect(bytesToHex(payload)).toBe("010203");

    await server.close();
  });
});
