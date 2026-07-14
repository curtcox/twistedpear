import { describe, expect, it } from "vitest";
import {
  PACKET_CONTEXT_NONE,
  PACKET_CONTEXT_PATH_RESPONSE,
  planAnnounceIngressGates,
  planClonePacketWithHops,
  planPathResponseAnnounceFields,
  planTransportAnnounceFields,
  canDispatchAnnounceHandlers,
  shouldIgnoreLocalAnnounce,
  shouldMatchAnnounceAspect,
  shouldReceiveAnnouncePathResponse
} from "../src/transport-announce.js";
import {
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  type PacketHeaderFields
} from "../src/packet-header.js";
import { TRANSPORT_BROADCAST, TRANSPORT_TRANSPORT } from "../src/transport-framing.js";

describe("protocol transport announce planning", () => {
  const destinationHash = new Uint8Array(16).fill(1);
  const data = new Uint8Array([9, 8]);
  const transportId = new Uint8Array(16).fill(2);

  it("clones packet fields with new hops", () => {
    const source: PacketHeaderFields = {
      headerType: PACKET_HEADER_1,
      contextFlag: 0,
      transportType: TRANSPORT_BROADCAST,
      destinationType: 0,
      packetType: PACKET_TYPE_DATA,
      hops: 3,
      transportId: null,
      destinationHash,
      context: 0,
      data
    };
    const cloned = planClonePacketWithHops(source, 4);
    expect(cloned.hops).toBe(4);
    expect(cloned.packetType).toBe(PACKET_TYPE_DATA);
    expect(cloned.destinationHash).toBe(destinationHash);
  });

  it("plans transport and path-response announce fields", () => {
    const source = {
      contextFlag: 0,
      destinationType: 0,
      destinationHash,
      context: 0,
      data
    };
    const transport = planTransportAnnounceFields({ source, transportId, hops: 5 });
    expect(transport.headerType).toBe(PACKET_HEADER_2);
    expect(transport.transportType).toBe(TRANSPORT_TRANSPORT);
    expect(transport.packetType).toBe(PACKET_TYPE_ANNOUNCE);
    expect(transport.hops).toBe(5);
    expect(transport.context).toBe(0);
    expect([...transport.transportId!]).toEqual([...transportId]);

    const pathResponse = planPathResponseAnnounceFields({ source, transportId, hops: 2 });
    expect(pathResponse.context).toBe(PACKET_CONTEXT_PATH_RESPONSE);
    expect(pathResponse.headerType).toBe(PACKET_HEADER_2);
  });

  it("gates PATH_RESPONSE delivery on handler opt-in", () => {
    expect(
      shouldReceiveAnnouncePathResponse({
        context: PACKET_CONTEXT_NONE,
        receivePathResponses: false
      })
    ).toBe(true);
    expect(
      shouldReceiveAnnouncePathResponse({
        context: PACKET_CONTEXT_PATH_RESPONSE
      })
    ).toBe(false);
    expect(
      shouldReceiveAnnouncePathResponse({
        context: PACKET_CONTEXT_PATH_RESPONSE,
        receivePathResponses: true
      })
    ).toBe(true);
  });

  it("disables rate-limit / record / rebroadcast for PATH_RESPONSE", () => {
    expect(planAnnounceIngressGates(PACKET_CONTEXT_NONE)).toEqual({
      applyRateLimit: true,
      recordRate: true,
      rebroadcast: true
    });
    expect(planAnnounceIngressGates(PACKET_CONTEXT_PATH_RESPONSE)).toEqual({
      applyRateLimit: false,
      recordRate: false,
      rebroadcast: false
    });
  });

  it("ignores announces for local inbound destinations", () => {
    expect(shouldIgnoreLocalAnnounce(true)).toBe(true);
    expect(shouldIgnoreLocalAnnounce(false)).toBe(false);
  });

  it("dispatches announce handlers when identity recall succeeds", () => {
    expect(canDispatchAnnounceHandlers(true)).toBe(true);
    expect(canDispatchAnnounceHandlers(false)).toBe(false);
  });

  it("matches optional announce aspect filters", () => {
    expect(
      shouldMatchAnnounceAspect({
        hasFilter: false,
        filterParsed: false,
        hashMatches: false
      })
    ).toBe(true);
    expect(
      shouldMatchAnnounceAspect({
        hasFilter: true,
        filterParsed: false,
        hashMatches: true
      })
    ).toBe(false);
    expect(
      shouldMatchAnnounceAspect({
        hasFilter: true,
        filterParsed: true,
        hashMatches: false
      })
    ).toBe(false);
    expect(
      shouldMatchAnnounceAspect({
        hasFilter: true,
        filterParsed: true,
        hashMatches: true
      })
    ).toBe(true);
  });
});
