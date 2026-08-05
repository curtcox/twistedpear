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
  nodeRuntime,
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

describe("LeafTransport over PipeInterface", () => {
  it("invalidates paths learned through an unregistered interface", async () => {
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
      aspects: ["interface-removal"],
    });

    await rightIn.announce();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(left.hasPath(rightIn.hash)).toBe(true);

    left.unregisterInterface(leftPipe);

    expect(left.hasPath(rightIn.hash)).toBe(false);
    expect(left.pathTableCount).toBe(0);
  });

  it("discovers announces and exchanges data packets with proofs", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();

    const [leftPipe, rightPipe] = PipeInterface.pair(
      provider,
      { name: "left" },
      { name: "right" },
    );
    left.registerInterface(leftPipe);
    right.registerInterface(rightPipe);

    const leftIn = left.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["node"],
    });

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["peer"],
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
      aspects: ["peer"],
    });

    const rightOut = right.registerDestination({
      provider,
      identity: leftIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["node"],
    });

    rightIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    leftIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const receivedOnRight = new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("receive timeout")),
        1000,
      );
      rightIn.setPacketCallback((data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    const receipt = await leftOut.send(new TextEncoder().encode("hello peer"), {
      createReceipt: true,
    });
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
      aspects: ["alpha"],
    });

    const announces: string[] = [];
    left.registerAnnounceHandler({
      aspectFilter: "example.alpha",
      receivedAnnounce(info) {
        announces.push(bytesToHex(info.destinationHash));
      },
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
      listenPort: 0,
    });

    const port = server.address?.port;
    expect(port).toBeGreaterThan(0);

    await left.addTcpClientInterface({
      name: "client",
      targetHost: "127.0.0.1",
      targetPort: port!,
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
      aspects: ["server"],
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
      aspects: ["server"],
    });

    const received = new Promise<Uint8Array>((resolve) => {
      rightIn.setPacketCallback((data) => resolve(data));
    });

    await leftOut.send(hexToBytes("010203"));
    const payload = await Promise.race([
      received,
      new Promise<Uint8Array>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 500),
      ),
    ]);
    expect(bytesToHex(payload)).toBe("010203");

    await server.close();
    expect(right.listInterfaces()).toHaveLength(0);
  });

  it("threads server receive direction to spawned clients", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    const server = await right.addTcpServerInterface({
      name: "server-tx-only",
      listenHost: "127.0.0.1",
      listenPort: 0,
      incoming: false,
      outgoing: true,
    });
    await left.addTcpClientInterface({
      name: "client",
      targetHost: "127.0.0.1",
      targetPort: server.address!.port,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.clients[0]?.incoming).toBe(false);
    await server.close();
  });

  it("reconnects after the server restarts", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();

    const server = await right.addTcpServerInterface({
      name: "server",
      listenHost: "127.0.0.1",
      listenPort: 0,
    });

    const port = server.address?.port;
    expect(port).toBeGreaterThan(0);

    const client = await left.addTcpClientInterface({
      name: "client",
      targetHost: "127.0.0.1",
      targetPort: port!,
      reconnectWaitMs: 50,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(client.online).toBe(true);
    expect(server.clients.length).toBe(1);

    await server.close();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(client.online).toBe(false);

    const server2 = await right.addTcpServerInterface({
      name: "server-2",
      listenHost: "127.0.0.1",
      listenPort: port!,
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(client.online).toBe(true);
    expect(server2.clients.length).toBe(1);

    await server2.close();
  });
});

describe("UDP loopback interface", () => {
  it("permits protocol-defined shared UDP listeners", async () => {
    const first = await runtime.udp.bind("::1", 0, { reuseAddress: true });
    let second;

    try {
      second = await runtime.udp.bind("::1", first.address.port, {
        reuseAddress: true,
      });
      expect(second.address).toEqual(first.address);
    } finally {
      await second?.close();
      await first.close();
    }
  });

  it("binds and exchanges IPv6 datagrams", async () => {
    const receiver = await runtime.udp.bind("::1", 0);
    const sender = await runtime.udp.bind("::1", 0);

    try {
      const received = receiver.packets[Symbol.asyncIterator]().next();
      await sender.send(
        new TextEncoder().encode("udp6 hello"),
        "::1",
        receiver.address.port,
      );
      const packet = await Promise.race([
        received,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("udp6 timeout")), 500),
        ),
      ]);

      expect(packet.done).toBe(false);
      expect(new TextDecoder().decode(packet.value?.data)).toBe("udp6 hello");
    } finally {
      await sender.close();
      await receiver.close();
    }
  });

  it("discovers announces and exchanges data packets", async () => {
    const left = Reticulum.create({ provider, runtime });
    const right = Reticulum.create({ provider, runtime });
    left.start();
    right.start();

    const rightBind = await runtime.udp.bind("127.0.0.1", 0);
    const leftBind = await runtime.udp.bind("127.0.0.1", 0);
    const rightPort = rightBind.address.port;
    const leftPort = leftBind.address.port;
    await rightBind.close();
    await leftBind.close();

    const rightUdp = await right.addUdpInterface({
      name: "right-udp",
      listenHost: "127.0.0.1",
      listenPort: rightPort,
      forwardHost: "127.0.0.1",
      forwardPort: leftPort,
    });

    const leftUdp = await left.addUdpInterface({
      name: "left-udp",
      listenHost: "127.0.0.1",
      listenPort: leftPort,
      forwardHost: "127.0.0.1",
      forwardPort: rightPort,
    });

    const rightIn = right.registerDestination({
      provider,
      identity: new Identity(provider),
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "udp",
      aspects: ["server"],
    });

    await rightIn.announce();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(left.hasPath(rightIn.hash)).toBe(true);

    const leftOut = left.registerDestination({
      provider,
      identity: rightIn.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "udp",
      aspects: ["server"],
    });

    const received = new Promise<Uint8Array>((resolve) => {
      rightIn.setPacketCallback((data) => resolve(data));
    });

    await leftOut.send(new TextEncoder().encode("udp hello"));
    const payload = await Promise.race([
      received,
      new Promise<Uint8Array>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 500),
      ),
    ]);
    expect(new TextDecoder().decode(payload)).toBe("udp hello");

    await leftUdp.close();
    await rightUdp.close();
  });
});
