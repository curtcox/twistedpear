import { describe, expect, it } from "vitest";
import {
  LOCAL_REBROADCASTS_MAX,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PACKET_TYPE_PROOF,
  PacketContextCode,
  REVERSE_TIMEOUT_SECONDS,
  TRANSPORT_TRANSPORT,
  isReverseEntryExpired,
  planLinkRelayTarget,
  planPacketFilter,
  shouldAcceptTransportPacket,
  shouldDeferPacketHash
} from "../src/index.js";

describe("transport ingress", () => {
  it("exposes rebroadcast and reverse-timeout constants", () => {
    expect(LOCAL_REBROADCASTS_MAX).toBe(2);
    expect(REVERSE_TIMEOUT_SECONDS).toBe(8 * 60);
  });

  it("accepts filter-passed packets and unseen foreign announces", () => {
    expect(
      shouldAcceptTransportPacket({
        filterPassed: true,
        packetType: PACKET_TYPE_ANNOUNCE,
        transportType: TRANSPORT_TRANSPORT,
        hasForeignTransportId: false,
        alreadySeenHash: true
      })
    ).toBe(true);
    expect(
      shouldAcceptTransportPacket({
        filterPassed: false,
        packetType: PACKET_TYPE_ANNOUNCE,
        transportType: TRANSPORT_TRANSPORT,
        hasForeignTransportId: true,
        alreadySeenHash: false
      })
    ).toBe(true);
    expect(
      shouldAcceptTransportPacket({
        filterPassed: false,
        packetType: PACKET_TYPE_ANNOUNCE,
        transportType: TRANSPORT_TRANSPORT,
        hasForeignTransportId: true,
        alreadySeenHash: true
      })
    ).toBe(false);
  });

  it("plans packet filter for transport-id and seen-hash rules", () => {
    const local = new Uint8Array([1, 2, 3]);
    const foreign = new Uint8Array([9, 9, 9]);
    expect(
      planPacketFilter({
        transportId: foreign,
        localTransportHash: local,
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: false
      })
    ).toBe(false);
    expect(
      planPacketFilter({
        transportId: local,
        localTransportHash: local,
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: false
      })
    ).toBe(true);
    expect(
      planPacketFilter({
        transportId: foreign,
        localTransportHash: local,
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: false
      })
    ).toBe(true);
    expect(
      planPacketFilter({
        transportId: null,
        localTransportHash: local,
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_PLAIN,
        alreadySeenHash: true
      })
    ).toBe(false);
    expect(
      planPacketFilter({
        transportId: null,
        localTransportHash: local,
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: true
      })
    ).toBe(true);
  });

  it("defers hash for LRPROOF and link-table destinations", () => {
    expect(
      shouldDeferPacketHash({
        packetType: PACKET_TYPE_PROOF,
        context: PacketContextCode.LRPROOF,
        destinationInLinkTable: false
      })
    ).toBe(true);
    expect(
      shouldDeferPacketHash({
        packetType: PACKET_TYPE_ANNOUNCE,
        context: PacketContextCode.NONE,
        destinationInLinkTable: true
      })
    ).toBe(true);
    expect(
      shouldDeferPacketHash({
        packetType: PACKET_TYPE_ANNOUNCE,
        context: PacketContextCode.NONE,
        destinationInLinkTable: false
      })
    ).toBe(false);
  });

  it("plans link relay target from hops and interface identity", () => {
    expect(
      planLinkRelayTarget({
        sameInterface: true,
        ifaceIsOutbound: true,
        ifaceIsReceived: true,
        packetHops: 2,
        remainingHops: 2,
        takenHops: 1
      })
    ).toBe("outbound");
    expect(
      planLinkRelayTarget({
        sameInterface: false,
        ifaceIsOutbound: true,
        ifaceIsReceived: false,
        packetHops: 3,
        remainingHops: 3,
        takenHops: 1
      })
    ).toBe("received");
    expect(
      planLinkRelayTarget({
        sameInterface: false,
        ifaceIsOutbound: false,
        ifaceIsReceived: true,
        packetHops: 1,
        remainingHops: 3,
        takenHops: 1
      })
    ).toBe("outbound");
    expect(
      planLinkRelayTarget({
        sameInterface: false,
        ifaceIsOutbound: false,
        ifaceIsReceived: false,
        packetHops: 1,
        remainingHops: 3,
        takenHops: 1
      })
    ).toBeNull();
  });

  it("expires reverse-table entries past timeout", () => {
    expect(
      isReverseEntryExpired({
        timestamp: 100,
        nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS,
        timeoutSeconds: REVERSE_TIMEOUT_SECONDS
      })
    ).toBe(false);
    expect(
      isReverseEntryExpired({
        timestamp: 100,
        nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS + 1
      })
    ).toBe(true);
  });
});
