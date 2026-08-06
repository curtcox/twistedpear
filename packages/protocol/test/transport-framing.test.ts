import { describe, expect, it } from "vitest";
import {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT,
  initialRelayTransportPacketState,
  initialRewritePacketHopsState,
  initialStripTransportHeadersState,
  initialWrapTransportPacketState,
  relayTransportPacketBytes,
  relayTransportPacketRawFromActions,
  rewritePacketHopsBytes,
  rewritePacketHopsRawFromActions,
  shouldUseRelayTransportPacket,
  shouldUseRewritePacketHops,
  shouldUseStripTransportHeaders,
  shouldUseWrapTransportPacket,
  stepRelayTransportPacketWithActions,
  stepRewritePacketHopsWithActions,
  stepStripTransportHeadersWithActions,
  stepWrapTransportPacketWithActions,
  stripTransportHeadersBytes,
  stripTransportHeadersRawFromActions,
  wrapTransportPacketBytes,
  wrapTransportPacketRawFromActions,
} from "../src/transport-framing.js";

describe("protocol transport framing", () => {
  const nextHop = new Uint8Array(TRANSPORT_ID_BYTES).fill(7);
  const rest = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);

  it("wraps a packet with HEADER_2 + transport id", () => {
    const raw = new Uint8Array(2 + rest.length);
    raw[0] = (PACKET_HEADER_1 << 6) | (TRANSPORT_BROADCAST << 4) | 0x05;
    raw[1] = 3;
    raw.set(rest, 2);

    const wrapped = wrapTransportPacketBytes({
      packedFlags: raw[0]!,
      hops: 4,
      raw,
      nextHop,
    });
    expect(wrapped[0]! & 0xc0).toBe(PACKET_HEADER_2 << 6);
    expect(wrapped[0]! & 0x30).toBe(TRANSPORT_TRANSPORT << 4);
    expect(wrapped[0]! & 0x0f).toBe(0x05);
    expect(wrapped[1]).toBe(4);
    expect([...wrapped.subarray(2, 2 + TRANSPORT_ID_BYTES)]).toEqual([
      ...nextHop,
    ]);
    expect([...wrapped.subarray(2 + TRANSPORT_ID_BYTES)]).toEqual([...rest]);
  });

  it("strips transport headers back to HEADER_1 broadcast", () => {
    const wrapped = wrapTransportPacketBytes({
      packedFlags: 0x05,
      hops: 2,
      raw: new Uint8Array([0x05, 2, ...rest]),
      nextHop,
    });
    const stripped = stripTransportHeadersBytes(wrapped);
    expect(stripped[0]! & 0xc0).toBe(PACKET_HEADER_1 << 6);
    expect(stripped[0]! & 0x30).toBe(TRANSPORT_BROADCAST << 4);
    expect([...stripped.subarray(2)]).toEqual([...rest]);
  });

  it("relays by rewriting next hop or stripping on last hop", () => {
    const wrapped = wrapTransportPacketBytes({
      packedFlags: 0x05,
      hops: 5,
      raw: new Uint8Array([0x05, 5, ...rest]),
      nextHop,
    });
    const next = new Uint8Array(TRANSPORT_ID_BYTES).fill(8);
    const relayed = relayTransportPacketBytes({
      raw: wrapped,
      hops: 6,
      remainingHops: 2,
      nextHop: next,
    });
    expect([...relayed.subarray(2, 2 + TRANSPORT_ID_BYTES)]).toEqual([...next]);
    expect(relayed[1]).toBe(6);

    const delivered = relayTransportPacketBytes({
      raw: wrapped,
      hops: 6,
      remainingHops: 1,
      nextHop: next,
    });
    expect(delivered.length).toBe(wrapped.length - TRANSPORT_ID_BYTES);
  });

  it("rewrites hops without changing the rest of the frame", () => {
    const raw = new Uint8Array([0x11, 3, 0xaa, 0xbb]);
    const rewritten = rewritePacketHopsBytes(raw, 9);
    expect(rewritten[0]).toBe(0x11);
    expect(rewritten[1]).toBe(9);
    expect([...rewritten.subarray(2)]).toEqual([0xaa, 0xbb]);
  });

  it("emits wrap framing bytes from WithActions step", () => {
    const raw = new Uint8Array(2 + rest.length);
    raw[0] = (PACKET_HEADER_1 << 6) | (TRANSPORT_BROADCAST << 4) | 0x05;
    raw[1] = 3;
    raw.set(rest, 2);
    const stepped = stepWrapTransportPacketWithActions(
      initialWrapTransportPacketState(),
      {
        kind: "transport/wrap-packet-gate",
        packedFlags: raw[0]!,
        hops: 4,
        raw,
        nextHop,
      },
    );
    expect(shouldUseWrapTransportPacket(stepped.actions)).toBe(true);
    const wrapped = wrapTransportPacketRawFromActions(stepped.actions);
    expect(wrapped).not.toBeNull();
    expect(wrapped![0]! & 0xc0).toBe(PACKET_HEADER_2 << 6);
    expect(wrapped![1]).toBe(4);
  });

  it("emits strip framing bytes from WithActions step", () => {
    const wrapped = wrapTransportPacketBytes({
      packedFlags: 0x05,
      hops: 2,
      raw: new Uint8Array([0x05, 2, ...rest]),
      nextHop,
    });
    const stepped = stepStripTransportHeadersWithActions(
      initialStripTransportHeadersState(),
      {
        kind: "transport/strip-headers-gate",
        raw: wrapped,
      },
    );
    expect(shouldUseStripTransportHeaders(stepped.actions)).toBe(true);
    const stripped = stripTransportHeadersRawFromActions(stepped.actions);
    expect(stripped).not.toBeNull();
    expect(stripped![0]! & 0xc0).toBe(PACKET_HEADER_1 << 6);
    expect([...stripped!.subarray(2)]).toEqual([...rest]);
  });

  it("emits relay framing bytes from WithActions step", () => {
    const wrapped = wrapTransportPacketBytes({
      packedFlags: 0x05,
      hops: 5,
      raw: new Uint8Array([0x05, 5, ...rest]),
      nextHop,
    });
    const next = new Uint8Array(TRANSPORT_ID_BYTES).fill(8);
    const stepped = stepRelayTransportPacketWithActions(
      initialRelayTransportPacketState(),
      {
        kind: "transport/relay-packet-bytes-gate",
        raw: wrapped,
        hops: 6,
        remainingHops: 2,
        nextHop: next,
      },
    );
    expect(shouldUseRelayTransportPacket(stepped.actions)).toBe(true);
    const relayed = relayTransportPacketRawFromActions(stepped.actions);
    expect(relayed).not.toBeNull();
    expect([...relayed!.subarray(2, 2 + TRANSPORT_ID_BYTES)]).toEqual([
      ...next,
    ]);
    expect(relayed![1]).toBe(6);
  });

  it("emits hop-rewrite framing bytes from WithActions step", () => {
    const raw = new Uint8Array([0x11, 3, 0xaa, 0xbb]);
    const stepped = stepRewritePacketHopsWithActions(
      initialRewritePacketHopsState(),
      {
        kind: "transport/rewrite-packet-hops-gate",
        raw,
        hops: 9,
      },
    );
    expect(shouldUseRewritePacketHops(stepped.actions)).toBe(true);
    const rewritten = rewritePacketHopsRawFromActions(stepped.actions);
    expect(rewritten).not.toBeNull();
    expect(rewritten![0]).toBe(0x11);
    expect(rewritten![1]).toBe(9);
    expect([...rewritten!.subarray(2)]).toEqual([0xaa, 0xbb]);
  });
});
