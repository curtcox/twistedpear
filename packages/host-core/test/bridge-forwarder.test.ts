import { describe, expect, it } from "vitest";
import {
  DestinationType,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  PipeInterface,
  TransportType,
  hexToBytes
} from "@twistedpear/reticulum-ts";
import { BridgeForwarder } from "../src/bridge-forwarder.js";

const provider = new NodeCryptoProvider();

function packet(hops = 3, data = new Uint8Array([1, 2, 3])): Packet {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_1,
    transportType: TransportType.BROADCAST,
    destinationType: DestinationType.SINGLE,
    packetType: PacketType.DATA,
    destinationHash: hexToBytes("00112233445566778899aabbccddeeff"),
    context: PacketContext.NONE,
    data,
    hops
  });
}

async function nextPacket(iterable: AsyncIterable<Packet>, timeoutMs = 200): Promise<Packet> {
  const result = await Promise.race([
    iterable[Symbol.asyncIterator]().next(),
    new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    )
  ]);
  expect(result.done).toBe(false);
  return result.value;
}

function makeBridgePair(name: string): [PipeInterface, PipeInterface] {
  const [networkSide, bridgeSide] = PipeInterface.pair(provider, { name: `${name}-network` }, { name });
  return [networkSide, bridgeSide];
}

describe("BridgeForwarder", () => {
  it("forwards a packet from one interface to another", async () => {
    const [netA, bridgeA] = makeBridgePair("a");
    const [netB, bridgeB] = makeBridgePair("b");

    const forwarder = new BridgeForwarder({
      provider,
      getInterfaces: () => [bridgeA, bridgeB],
      getPolicy: () => ({})
    });
    forwarder.start();

    await netA.send(packet());
    const received = await nextPacket(netB.packets);
    expect(received.hops).toBe(2);
    expect(Array.from(received.data)).toEqual([1, 2, 3]);

    forwarder.stop();
    await Promise.all([bridgeA.close(), bridgeB.close(), netA.close(), netB.close()]);
  });

  it("drops packets that have expired hops", async () => {
    const [netA, bridgeA] = makeBridgePair("a");
    const [netB, bridgeB] = makeBridgePair("b");

    const forwarder = new BridgeForwarder({
      provider,
      getInterfaces: () => [bridgeA, bridgeB],
      getPolicy: () => ({})
    });
    forwarder.start();

    await netA.send(packet(1));

    const iterator = netB.packets[Symbol.asyncIterator]();
    await expect(
      Promise.race([
        iterator.next(),
        new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 100)
        )
      ])
    ).rejects.toThrow("timeout");

    forwarder.stop();
    await Promise.all([bridgeA.close(), bridgeB.close(), netA.close(), netB.close()]);
  });

  it("suppresses loops by dropping already-seen packets", async () => {
    const [netA, bridgeA] = makeBridgePair("a");
    const [netB, bridgeB] = makeBridgePair("b");

    const forwarder = new BridgeForwarder({
      provider,
      getInterfaces: () => [bridgeA, bridgeB],
      getPolicy: () => ({})
    });
    forwarder.start();

    const original = packet();
    await netA.send(original);
    const first = await nextPacket(netB.packets);
    expect(first.hops).toBe(2);

    // Re-inject the forwarded packet from the B side; it should not come back to A.
    await netB.send(first);
    const iterator = netA.packets[Symbol.asyncIterator]();
    await expect(
      Promise.race([
        iterator.next(),
        new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 100)
        )
      ])
    ).rejects.toThrow("timeout");

    forwarder.stop();
    await Promise.all([bridgeA.close(), bridgeB.close(), netA.close(), netB.close()]);
  });

  it("respects the relay policy matrix", async () => {
    const [netA, bridgeA] = makeBridgePair("a-bluetooth");
    const [netB, bridgeB] = makeBridgePair("b-auto");

    const forwarder = new BridgeForwarder({
      provider,
      getInterfaces: () => [bridgeA, bridgeB],
      getPolicy: () => ({
        allow: {
          bluetooth: { auto: false }
        }
      })
    });
    forwarder.start();

    await netA.send(packet());
    const iterator = netB.packets[Symbol.asyncIterator]();
    await expect(
      Promise.race([
        iterator.next(),
        new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 100)
        )
      ])
    ).rejects.toThrow("timeout");

    forwarder.stop();
    await Promise.all([bridgeA.close(), bridgeB.close(), netA.close(), netB.close()]);
  });
});
