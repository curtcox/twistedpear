import { describe, expect, it } from "vitest";
import {
  DestinationType,
  HDLC_ESCAPE,
  HDLC_ESCAPE_MASK,
  HDLC_FLAG,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  PipeInterface,
  TransportType,
  decodeHdlcFrames,
  encodeHdlcFrame,
  hexToBytes
} from "../src/index.js";

const provider = new NodeCryptoProvider();

function packet(data = new Uint8Array([1, 2, 3])): Packet {
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

async function nextPacket(iterable: AsyncIterable<Packet>): Promise<Packet> {
  const result = await iterable[Symbol.asyncIterator]().next();
  expect(result.done).toBe(false);
  return result.value;
}

describe("HDLC framing", () => {
  it("escapes flag and escape bytes", () => {
    const payload = new Uint8Array([0x01, HDLC_FLAG, 0x02, HDLC_ESCAPE, 0x03]);
    const encoded = encodeHdlcFrame(payload);

    expect(Array.from(encoded)).toEqual([
      HDLC_FLAG,
      0x01,
      HDLC_ESCAPE,
      HDLC_FLAG ^ HDLC_ESCAPE_MASK,
      0x02,
      HDLC_ESCAPE,
      HDLC_ESCAPE ^ HDLC_ESCAPE_MASK,
      0x03,
      HDLC_FLAG
    ]);

    const decoded = decodeHdlcFrames(encoded);
    expect(decoded.frames).toHaveLength(1);
    expect(Array.from(decoded.frames[0]!)).toEqual(Array.from(payload));
    expect(decoded.buffer).toHaveLength(0);
    expect(decoded.inEscape).toBe(false);
  });

  it("decodes frames split across chunks", () => {
    const payload = new Uint8Array([0x10, HDLC_FLAG, HDLC_ESCAPE, 0x20]);
    const encoded = encodeHdlcFrame(payload);

    const first = decodeHdlcFrames(encoded.subarray(0, 3));
    expect(first.frames).toHaveLength(0);
    expect(first.inEscape).toBe(true);

    const second = decodeHdlcFrames(encoded.subarray(3), first);
    expect(second.frames).toHaveLength(1);
    expect(Array.from(second.frames[0]!)).toEqual(Array.from(payload));
    expect(second.buffer).toHaveLength(0);
  });

  it("ignores empty delimiter runs", () => {
    const decoded = decodeHdlcFrames(new Uint8Array([HDLC_FLAG, HDLC_FLAG, HDLC_FLAG]));
    expect(decoded.frames).toHaveLength(0);
  });
});

describe("PipeInterface", () => {
  it("delivers framed packets to the connected peer", async () => {
    const [left, right] = PipeInterface.pair(provider);
    const outgoing = packet(new Uint8Array([HDLC_FLAG, 0x42, HDLC_ESCAPE]));

    await left.send(outgoing);

    const incoming = await nextPacket(right.packets);
    expect(Buffer.from(incoming.raw).toString("hex")).toBe(Buffer.from(outgoing.raw).toString("hex"));
  });

  it("rejects packets larger than its MTU", async () => {
    const [left] = PipeInterface.pair(provider, { name: "small", mtu: 8 });
    await expect(left.send(packet(new Uint8Array([1, 2, 3])))).rejects.toThrow("Packet exceeds interface MTU");
  });

  it("ends the packet stream when closed", async () => {
    const [left] = PipeInterface.pair(provider);
    const iterator = left.packets[Symbol.asyncIterator]();

    await left.close();

    const result = await iterator.next();
    expect(result.done).toBe(true);
  });
});
