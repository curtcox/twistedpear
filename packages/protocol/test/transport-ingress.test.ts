import { describe, expect, it } from "vitest";
import {
  LOCAL_REBROADCASTS_MAX,
  PACKET_DEST_TYPE_LINK,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF,
  PacketContextCode,
  REVERSE_TIMEOUT_SECONDS,
  TRANSPORT_TRANSPORT,
  canLookupLinkRelayEntry,
  canRelayLinkPacket,
  canRelayReversePacket,
  canRelayTransportPacket,
  isLocalPathRequestPacket,
  isReverseEntryExpired,
  planLinkRelayTarget,
  planLocalPlainDataDelivery,
  planLinkDataIngressTarget,
  planPacketFilter,
  planPacketHashRemember,
  planProofIngressKind,
  planReverseRelayOutcome,
  planTransportIngressDispatch,
  indexOfMatchingLinkId,
  shouldAcceptLinkLrProofCandidate,
  shouldAcceptTransportPacket,
  shouldDeferPacketHash,
  shouldDeleteExpiredReverseEntry,
  shouldDispatchLocalLinkRequest,
  shouldMatchLocalInboundDestination,
  shouldMatchLocalTypedDestination,
  shouldRecordLinkRelayTableEntry,
  shouldRecordReverseTableEntry,
  shouldRegisterTransportMember,
  shouldRelayReverseOnInterface,
  shouldRememberPacketHashAfterRelay,
  shouldRememberPacketHashNow,
  shouldTransmitLinkRelay,
  shouldTransmitOnInterface,
  shouldTransmitReverseRelay,
  planUnregisterTransportMember
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
    expect(canLookupLinkRelayEntry(true)).toBe(true);
    expect(canLookupLinkRelayEntry(false)).toBe(false);
    expect(shouldTransmitLinkRelay(true)).toBe(true);
    expect(shouldTransmitLinkRelay(false)).toBe(false);
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

  it("gates transport relay and reverse/link table records", () => {
    expect(
      canRelayTransportPacket({
        transportIdPresent: true,
        isAnnounce: false,
        transportIdMatchesLocal: true,
        hasPath: true
      })
    ).toBe(true);
    expect(
      canRelayTransportPacket({
        transportIdPresent: true,
        isAnnounce: true,
        transportIdMatchesLocal: true,
        hasPath: true
      })
    ).toBe(false);
    expect(
      canRelayTransportPacket({
        transportIdPresent: true,
        isAnnounce: false,
        transportIdMatchesLocal: true,
        hasPath: false
      })
    ).toBe(false);
    expect(shouldRecordLinkRelayTableEntry(PACKET_TYPE_LINKREQUEST)).toBe(true);
    expect(shouldRecordLinkRelayTableEntry(PACKET_TYPE_DATA)).toBe(false);
    expect(
      shouldRecordReverseTableEntry({
        packetType: PACKET_TYPE_PROOF,
        context: PacketContextCode.LRPROOF
      })
    ).toBe(false);
    expect(
      shouldRecordReverseTableEntry({
        packetType: PACKET_TYPE_DATA,
        context: PacketContextCode.NONE
      })
    ).toBe(true);
  });

  it("matches local path-request packets", () => {
    expect(
      isLocalPathRequestPacket({
        destinationTypePlain: true,
        destinationHashMatches: true
      })
    ).toBe(true);
    expect(
      isLocalPathRequestPacket({
        destinationTypePlain: false,
        destinationHashMatches: true
      })
    ).toBe(false);
  });

  it("gates link and reverse relay eligibility", () => {
    expect(canRelayLinkPacket(PACKET_TYPE_DATA)).toBe(true);
    expect(canRelayLinkPacket(PACKET_TYPE_PROOF)).toBe(true);
    expect(canRelayLinkPacket(PACKET_TYPE_ANNOUNCE)).toBe(false);
    expect(canRelayLinkPacket(PACKET_TYPE_LINKREQUEST)).toBe(false);
    expect(
      canRelayReversePacket({
        isProof: true,
        hasEntry: true,
        entryExpired: false
      })
    ).toBe(true);
    expect(
      canRelayReversePacket({
        isProof: true,
        hasEntry: true,
        entryExpired: true
      })
    ).toBe(false);
    expect(
      canRelayReversePacket({
        isProof: false,
        hasEntry: true,
        entryExpired: false
      })
    ).toBe(false);
    expect(shouldRelayReverseOnInterface(true)).toBe(true);
    expect(shouldRelayReverseOnInterface(false)).toBe(false);
  });

  it("dispatches transport ingress and proof kinds", () => {
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("announce");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_LINKREQUEST,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("link-request");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_LINK
      })
    ).toBe("link-data");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_PLAIN
      })
    ).toBe("plain-data");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_PROOF,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("proof");
    expect(
      planTransportIngressDispatch({
        packetType: 99,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("ignore");
    expect(planProofIngressKind(PacketContextCode.LRPROOF)).toBe("lrproof");
    expect(planProofIngressKind(PacketContextCode.RESOURCE_PRF)).toBe("resource-prf");
    expect(planProofIngressKind(PacketContextCode.NONE)).toBe("receipt");
  });

  it("gates interface transmit by outgoing / exclude / attached", () => {
    expect(shouldTransmitOnInterface({ outgoing: true })).toBe(true);
    expect(shouldTransmitOnInterface({ outgoing: false })).toBe(false);
    expect(
      shouldTransmitOnInterface({
        outgoing: true,
        isExcludedInterface: true
      })
    ).toBe(false);
    expect(
      shouldTransmitOnInterface({
        outgoing: true,
        requireAttached: true,
        isAttached: false
      })
    ).toBe(false);
    expect(
      shouldTransmitOnInterface({
        outgoing: true,
        requireAttached: true,
        isAttached: true
      })
    ).toBe(true);
  });

  it("matches local destinations and LR-proof / plain-data / hash-remember plans", () => {
    expect(
      shouldMatchLocalInboundDestination({ hashMatches: true, directionIn: true })
    ).toBe(true);
    expect(
      shouldMatchLocalInboundDestination({ hashMatches: true, directionIn: false })
    ).toBe(false);
    expect(
      shouldMatchLocalTypedDestination({ hashMatches: true, typeMatches: true })
    ).toBe(true);
    expect(
      shouldMatchLocalTypedDestination({ hashMatches: true, typeMatches: false })
    ).toBe(false);
    expect(
      shouldDispatchLocalLinkRequest({
        hashMatches: true,
        typeMatches: true,
        handlerPresent: true
      })
    ).toBe(true);
    expect(
      shouldDispatchLocalLinkRequest({
        hashMatches: true,
        typeMatches: true,
        handlerPresent: false
      })
    ).toBe(false);
    expect(
      shouldAcceptLinkLrProofCandidate({ linkIdMatches: true, hopsMatch: true })
    ).toBe(true);
    expect(
      shouldAcceptLinkLrProofCandidate({ linkIdMatches: true, hopsMatch: false })
    ).toBe(false);
    expect(
      planLocalPlainDataDelivery({ destinationPresent: true, plaintextPresent: true })
    ).toBe("dispatch");
    expect(
      planLocalPlainDataDelivery({ destinationPresent: true, plaintextPresent: false })
    ).toBe("ignore");
    expect(planPacketHashRemember(false)).toBe("now");
    expect(planPacketHashRemember(true)).toBe("after-relay");
    expect(shouldRememberPacketHashNow(true)).toBe(true);
    expect(shouldRememberPacketHashNow(false)).toBe(false);
    expect(shouldRememberPacketHashAfterRelay(true)).toBe(true);
    expect(shouldRememberPacketHashAfterRelay(false)).toBe(false);
  });

  it("indexes link-ids and plans reverse-relay / link-data ingress", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    expect(indexOfMatchingLinkId({ linkIds: [a, b], target: new Uint8Array([4, 5, 6]) })).toBe(1);
    expect(indexOfMatchingLinkId({ linkIds: [a, b], target: new Uint8Array([9]) })).toBeNull();
    expect(planLinkDataIngressTarget({ activeIndex: 0, pendingIndex: 1 })).toBe("active");
    expect(planLinkDataIngressTarget({ activeIndex: null, pendingIndex: 2 })).toBe("pending");
    expect(planLinkDataIngressTarget({ activeIndex: null, pendingIndex: null })).toBe("none");
    expect(
      planReverseRelayOutcome({ canRelay: false, entryExpired: true, ifaceIsOutbound: true })
    ).toBe("delete-expired");
    expect(
      planReverseRelayOutcome({ canRelay: false, entryExpired: false, ifaceIsOutbound: true })
    ).toBe("ignore");
    expect(
      planReverseRelayOutcome({ canRelay: true, entryExpired: false, ifaceIsOutbound: false })
    ).toBe("ignore");
    expect(
      planReverseRelayOutcome({ canRelay: true, entryExpired: false, ifaceIsOutbound: true })
    ).toBe("relay");
    expect(shouldDeleteExpiredReverseEntry(true)).toBe(true);
    expect(shouldDeleteExpiredReverseEntry(false)).toBe(false);
    expect(shouldTransmitReverseRelay({ relayOk: true, entryPresent: true })).toBe(true);
    expect(shouldTransmitReverseRelay({ relayOk: true, entryPresent: false })).toBe(false);
    expect(shouldTransmitReverseRelay({ relayOk: false, entryPresent: true })).toBe(false);
  });

  it("plans transport list membership register/unregister", () => {
    expect(shouldRegisterTransportMember(false)).toBe(true);
    expect(shouldRegisterTransportMember(true)).toBe(false);
    expect(planUnregisterTransportMember(0)).toBe(0);
    expect(planUnregisterTransportMember(3)).toBe(3);
    expect(planUnregisterTransportMember(-1)).toBeNull();
  });
});
