import { describe, expect, it } from "vitest";
import {
  LOCAL_REBROADCASTS_MAX,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_PROOF,
  PacketContextCode,
  REVERSE_TIMEOUT_SECONDS,
  TRANSPORT_TRANSPORT,
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
});
