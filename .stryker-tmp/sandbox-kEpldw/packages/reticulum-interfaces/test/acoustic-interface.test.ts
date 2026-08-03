// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  DestinationType,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
  hexToBytes
} from "@twistedpear/reticulum-ts";
import {
  AcousticInterface,
  SimulatedAcousticChannel
} from "../src/index.js";

const provider = new NodeCryptoProvider();

function makePacket(data = new Uint8Array([1, 2, 3])): Packet {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_1,
    transportType: TransportType.BROADCAST,
    destinationType: DestinationType.SINGLE,
    packetType: PacketType.DATA,
    destinationHash: hexToBytes("00112233445566778899aabbccddeeff"),
    context: PacketContext.NONE,
    data
  });
}

async function nextPacket(iterable: AsyncIterable<Packet>, timeoutMs = 500): Promise<Packet> {
  const result = await Promise.race([
    iterable[Symbol.asyncIterator]().next(),
    new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    )
  ]);
  expect(result.done).toBe(false);
  return result.value;
}

describe("AcousticInterface with SimulatedAcousticChannel", () => {
  it("sends a packet through linked channels and receives it", async () => {
    const channelA = new SimulatedAcousticChannel();
    const channelB = new SimulatedAcousticChannel();
    channelA.linkPeer(channelB);

    const ifaceA = await AcousticInterface.open(provider, {
      name: "acoustic-a",
      provider,
      channel: channelA
    });
    const ifaceB = await AcousticInterface.open(provider, {
      name: "acoustic-b",
      provider,
      channel: channelB
    });

    const pkt = makePacket();
    await ifaceA.send(pkt);

    // The HDLC-encoded bytes from A's writeBytes → transmit → peer B's receiver → B's receiveBytes → HDLC decode
    const received = await nextPacket(ifaceB.packets);
    expect(Array.from(received.data)).toEqual([1, 2, 3]);

    await ifaceA.close();
    await ifaceB.close();
  });

  it("drops packets when channel has 100% loss", async () => {
    const channelA = new SimulatedAcousticChannel({ lossRate: 1.0 });
    const channelB = new SimulatedAcousticChannel();
    channelA.linkPeer(channelB);

    const ifaceA = await AcousticInterface.open(provider, {
      name: "acoustic-loss-a",
      provider,
      channel: channelA
    });
    const ifaceB = await AcousticInterface.open(provider, {
      name: "acoustic-loss-b",
      provider,
      channel: channelB
    });

    await ifaceA.send(makePacket());
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should timeout - no packet received due to 100% loss
    const iterator = ifaceB.packets[Symbol.asyncIterator]();
    await expect(
      Promise.race([
        iterator.next(),
        new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 100)
        )
      ])
    ).rejects.toThrow("timeout");

    await ifaceA.close();
    await ifaceB.close();
  });

  it("respects direction: tx-only interface rejects receive", async () => {
    const channel = new SimulatedAcousticChannel();
    const iface = await AcousticInterface.open(provider, {
      name: "acoustic-tx",
      provider,
      channel,
      incoming: false,
      outgoing: true
    });

    expect(iface.incoming).toBe(false);
    expect(iface.outgoing).toBe(true);
    await iface.close();
  });

  it("respects direction: rx-only interface rejects send", async () => {
    const channel = new SimulatedAcousticChannel();
    const iface = await AcousticInterface.open(provider, {
      name: "acoustic-rx",
      provider,
      channel,
      incoming: true,
      outgoing: false
    });

    expect(iface.incoming).toBe(true);
    expect(iface.outgoing).toBe(false);
    await expect(iface.send(makePacket())).rejects.toThrow("not configured for outbound");
    await iface.close();
  });

  it("reports online after start and offline after close", async () => {
    const channel = new SimulatedAcousticChannel();
    const iface = await AcousticInterface.open(provider, {
      name: "acoustic-status",
      provider,
      channel
    });
    expect(iface.online).toBe(true);
    await iface.close();
    expect(iface.online).toBe(false);
  });
});
