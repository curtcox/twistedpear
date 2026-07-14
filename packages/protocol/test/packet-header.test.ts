import { describe, expect, it } from "vitest";
import {
  DestinationDirectionCode,
  DestinationTypeCode,
  PACKET_CONTEXT_FLAG_SET,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PacketContextFlagCode,
  PacketHeaderTypeCode,
  PacketTypeCode,
  TRANSPORT_BROADCAST,
  TRANSPORT_ID_BYTES,
  TRANSPORT_TRANSPORT,
  TransportTypeCode,
  decodePacketRaw,
  encodePacketRaw,
  initialPacketFromFieldsState,
  packPacketFlags,
  packetHashablePart,
  planPacketFromFields,
  shouldProceedPacketFromFields,
  shouldRejectPacketFromFieldsBadDestinationHash,
  shouldRejectPacketFromFieldsBadHeaderType,
  shouldRejectPacketFromFieldsBadTransportId,
  shouldRejectPacketFromFieldsHeader2MissingTransportId,
  stepPacketFromFieldsWithActions,
  unpackPacketFlags
} from "../src/packet-header.js";

describe("protocol packet header", () => {
  const destinationHash = new Uint8Array(TRANSPORT_ID_BYTES).fill(1);
  const transportId = new Uint8Array(TRANSPORT_ID_BYTES).fill(2);
  const data = new Uint8Array([0xaa, 0xbb]);

  it("exposes named packet header enum objects", () => {
    expect(PacketTypeCode.DATA).toBe(PACKET_TYPE_DATA);
    expect(PacketHeaderTypeCode.HEADER_2).toBe(PACKET_HEADER_2);
    expect(PacketContextFlagCode.SET).toBe(PACKET_CONTEXT_FLAG_SET);
    expect(TransportTypeCode.TRANSPORT).toBe(TRANSPORT_TRANSPORT);
    expect(DestinationTypeCode.SINGLE).toBe(PACKET_DEST_TYPE_SINGLE);
    expect(DestinationDirectionCode.IN).toBe(0x11);
    expect(DestinationDirectionCode.OUT).toBe(0x12);
  });

  it("packs and unpacks flags", () => {
    const flags = packPacketFlags({
      headerType: PACKET_HEADER_2,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_TRANSPORT,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_ANNOUNCE
    });
    expect(unpackPacketFlags(flags)).toEqual({
      headerType: PACKET_HEADER_2,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_TRANSPORT,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_ANNOUNCE
    });
  });

  it("round-trips HEADER_1 packets", () => {
    const raw = encodePacketRaw({
      headerType: PACKET_HEADER_1,
      contextFlag: 0,
      transportType: TRANSPORT_BROADCAST,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      hops: 3,
      destinationHash,
      context: 0,
      data,
      transportId: null
    });
    const decoded = decodePacketRaw(raw);
    expect(decoded).not.toBeNull();
    expect(decoded!.hops).toBe(3);
    expect(decoded!.transportId).toBeNull();
    expect([...decoded!.destinationHash]).toEqual([...destinationHash]);
    expect([...decoded!.data]).toEqual([...data]);
  });

  it("round-trips HEADER_2 packets", () => {
    const raw = encodePacketRaw({
      headerType: PACKET_HEADER_2,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_TRANSPORT,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      hops: 1,
      destinationHash,
      context: 0x0b,
      data,
      transportId
    });
    const decoded = decodePacketRaw(raw);
    expect([...decoded!.transportId!]).toEqual([...transportId]);
    expect(decoded!.context).toBe(0x0b);
  });

  it("builds hashable parts with masked flags", () => {
    const raw = encodePacketRaw({
      headerType: PACKET_HEADER_1,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_BROADCAST,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      hops: 0,
      destinationHash,
      context: 0,
      data,
      transportId: null
    });
    const part = packetHashablePart(raw, PACKET_HEADER_1);
    expect(part[0]).toBe(raw[0]! & 0x0f);
    expect([...part.subarray(1)]).toEqual([...raw.subarray(2)]);
  });

  it("plans fromFields construction gates", () => {
    expect(
      planPacketFromFields({
        headerType: PACKET_HEADER_1,
        contextFlag: PACKET_CONTEXT_FLAG_SET,
        transportType: TRANSPORT_BROADCAST,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        packetType: PACKET_TYPE_DATA,
        destinationHashLength: TRANSPORT_ID_BYTES,
        transportIdPresent: false,
        transportIdLength: 0
      })
    ).toBe("ok");
    expect(
      planPacketFromFields({
        headerType: 9,
        contextFlag: PACKET_CONTEXT_FLAG_SET,
        transportType: TRANSPORT_BROADCAST,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        packetType: PACKET_TYPE_DATA,
        destinationHashLength: TRANSPORT_ID_BYTES,
        transportIdPresent: false,
        transportIdLength: 0
      })
    ).toBe("bad-header-type");
    expect(
      planPacketFromFields({
        headerType: PACKET_HEADER_1,
        contextFlag: PACKET_CONTEXT_FLAG_SET,
        transportType: TRANSPORT_BROADCAST,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        packetType: PACKET_TYPE_DATA,
        destinationHashLength: 4,
        transportIdPresent: false,
        transportIdLength: 0
      })
    ).toBe("bad-destination-hash");
    expect(
      planPacketFromFields({
        headerType: PACKET_HEADER_2,
        contextFlag: PACKET_CONTEXT_FLAG_SET,
        transportType: TRANSPORT_TRANSPORT,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        packetType: PACKET_TYPE_DATA,
        destinationHashLength: TRANSPORT_ID_BYTES,
        transportIdPresent: false,
        transportIdLength: 0
      })
    ).toBe("header2-missing-transport-id");
    expect(
      planPacketFromFields({
        headerType: PACKET_HEADER_2,
        contextFlag: PACKET_CONTEXT_FLAG_SET,
        transportType: TRANSPORT_TRANSPORT,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        packetType: PACKET_TYPE_DATA,
        destinationHashLength: TRANSPORT_ID_BYTES,
        transportIdPresent: true,
        transportIdLength: 4
      })
    ).toBe("bad-transport-id");
    expect(
      planPacketFromFields({
        headerType: PACKET_HEADER_2,
        contextFlag: PACKET_CONTEXT_FLAG_SET,
        transportType: TRANSPORT_TRANSPORT,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        packetType: PACKET_TYPE_DATA,
        destinationHashLength: TRANSPORT_ID_BYTES,
        transportIdPresent: true,
        transportIdLength: TRANSPORT_ID_BYTES
      })
    ).toBe("ok");
  });

  it("emits fromFields actions from stepPacketFromFieldsWithActions", () => {
    const ok = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), {
      kind: "packet/from-fields-gate",
      headerType: PACKET_HEADER_1,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_BROADCAST,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      destinationHashLength: TRANSPORT_ID_BYTES,
      transportIdPresent: false,
      transportIdLength: 0
    });
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedPacketFromFields(ok.actions)).toBe(true);

    const badHeader = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), {
      kind: "packet/from-fields-gate",
      headerType: 9,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_BROADCAST,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      destinationHashLength: TRANSPORT_ID_BYTES,
      transportIdPresent: false,
      transportIdLength: 0
    });
    expect(shouldRejectPacketFromFieldsBadHeaderType(badHeader.actions)).toBe(true);

    const badHash = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), {
      kind: "packet/from-fields-gate",
      headerType: PACKET_HEADER_1,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_BROADCAST,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      destinationHashLength: 4,
      transportIdPresent: false,
      transportIdLength: 0
    });
    expect(shouldRejectPacketFromFieldsBadDestinationHash(badHash.actions)).toBe(true);

    const missingTransport = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), {
      kind: "packet/from-fields-gate",
      headerType: PACKET_HEADER_2,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_TRANSPORT,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      destinationHashLength: TRANSPORT_ID_BYTES,
      transportIdPresent: false,
      transportIdLength: 0
    });
    expect(shouldRejectPacketFromFieldsHeader2MissingTransportId(missingTransport.actions)).toBe(
      true
    );

    const badTransportId = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), {
      kind: "packet/from-fields-gate",
      headerType: PACKET_HEADER_2,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_TRANSPORT,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      destinationHashLength: TRANSPORT_ID_BYTES,
      transportIdPresent: true,
      transportIdLength: 4
    });
    expect(shouldRejectPacketFromFieldsBadTransportId(badTransportId.actions)).toBe(true);
  });

  it("is deterministic for identical fromFields gate events", () => {
    const event = {
      kind: "packet/from-fields-gate" as const,
      headerType: PACKET_HEADER_1,
      contextFlag: PACKET_CONTEXT_FLAG_SET,
      transportType: TRANSPORT_BROADCAST,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      packetType: PACKET_TYPE_DATA,
      destinationHashLength: TRANSPORT_ID_BYTES,
      transportIdPresent: false,
      transportIdLength: 0
    };
    const a = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), event);
    const b = stepPacketFromFieldsWithActions(initialPacketFromFieldsState(), event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
