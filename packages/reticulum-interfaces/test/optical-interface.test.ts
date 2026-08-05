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
  OpticalInterface,
  SimulatedOpticalChannel,
  sliceForDisplay,
  createOpticalReassemblyState,
  reassembleOpticalChunk,
  OPTICAL_CHUNK_PAYLOAD_BYTES
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

describe("sliceForDisplay / reassembleOpticalChunk", () => {
  it("slices and reassembles a payload", () => {
    const data = new Uint8Array(500);
    for (let i = 0; i < data.length; i++) data[i] = i & 0xff;

    const chunks = sliceForDisplay(data);
    expect(chunks.length).toBeGreaterThan(1);

    let state = createOpticalReassemblyState();
    let result: ReturnType<typeof reassembleOpticalChunk> | null = null;
    for (const chunk of chunks) {
      result = reassembleOpticalChunk(state, chunk);
      state = result.state;
      if (result.payload !== null) break;
    }
    expect(result).not.toBeNull();
    expect(result!.payload).not.toBeNull();
    expect(Array.from(result!.payload!)).toEqual(Array.from(data));
  });

  it("reassembles even when chunks arrive out of order", () => {
    const data = new Uint8Array(300);
    for (let i = 0; i < data.length; i++) data[i] = i & 0xff;

    const chunks = [...sliceForDisplay(data)];
    // Reverse chunk order
    chunks.reverse();

    let state = createOpticalReassemblyState();
    let payload: Uint8Array | null = null;
    for (const chunk of chunks) {
      const result = reassembleOpticalChunk(state, chunk);
      state = result.state;
      if (result.payload !== null) {
        payload = result.payload;
        break;
      }
    }
    expect(payload).not.toBeNull();
    expect(Array.from(payload!)).toEqual(Array.from(data));
  });

  it("single chunk for small payload", () => {
    const data = new Uint8Array(10);
    const chunks = sliceForDisplay(data);
    expect(chunks.length).toBe(2); // one source plus one repair frame
    expect(chunks[0]!.subarray(0, 2)).toEqual(new Uint8Array([0x54, 0x4f]));
    expect(chunks[0]![2]).toBe(0);
    expect(chunks[0]![3]).toBe(1);
  });

  it("recovers one dropped source frame from the repair frame", () => {
    const data = Uint8Array.from({ length: 500 }, (_, index) => index & 0xff);
    const chunks = sliceForDisplay(data);
    const withoutSecondSource = chunks.filter((chunk) => chunk[2] !== 1);
    let state = createOpticalReassemblyState();
    let payload: Uint8Array | null = null;
    for (const chunk of withoutSecondSource.reverse()) {
      const result = reassembleOpticalChunk(state, chunk);
      state = result.state;
      payload = result.payload ?? payload;
    }
    expect(payload).toEqual(data);
  });
});

describe("OpticalInterface with SimulatedOpticalChannel", () => {
  it("sends and receives a packet through linked channels", async () => {
    const channelA = new SimulatedOpticalChannel();
    const channelB = new SimulatedOpticalChannel();
    channelA.linkPeer(channelB);

    const ifaceA = await OpticalInterface.open(provider, {
      name: "optical-a",
      provider,
      channel: channelA
    });
    const ifaceB = await OpticalInterface.open(provider, {
      name: "optical-b",
      provider,
      channel: channelB
    });

    const data = Uint8Array.from({ length: 210 }, (_, index) => index & 0xff);
    const pkt = makePacket(data);
    await ifaceA.send(pkt);
    const received = await nextPacket(ifaceB.packets);
    expect(received.data).toEqual(data);

    await ifaceA.close();
    await ifaceB.close();
  });

  it("respects direction: tx-only interface rejects receive", async () => {
    const channel = new SimulatedOpticalChannel();
    const iface = await OpticalInterface.open(provider, {
      name: "optical-tx",
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
    const channel = new SimulatedOpticalChannel();
    const iface = await OpticalInterface.open(provider, {
      name: "optical-rx",
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
    const channel = new SimulatedOpticalChannel();
    const iface = await OpticalInterface.open(provider, {
      name: "optical-status",
      provider,
      channel
    });
    expect(iface.online).toBe(true);
    await iface.close();
    expect(iface.online).toBe(false);
  });
});
