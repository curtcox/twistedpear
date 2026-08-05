import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  ANNOUNCE_NAME_HASH_SIZE,
  ANNOUNCE_PUBLIC_KEY_SIZE,
  ANNOUNCE_RANDOM_HASH_SIZE,
  ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE,
  ANNOUNCE_SIGNATURE_SIZE,
  LXMF_DESTINATION_LENGTH,
  LXMF_SIGNATURE_LENGTH,
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  RESOURCE_HASH_SIZE,
  TOKEN_HMAC_SIZE,
  TOKEN_IV_SIZE,
  TRANSPORT_ID_BYTES,
  assembleByteArrays,
  decodePacketRaw,
  decodeResourceAdvertisementFlags,
  decodeWsClientFrame,
  encodePacketRaw,
  encodeResourceAdvertisementFlags,
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackIntMap,
  msgpackPackUInt,
  msgpackUnpack,
  packAnnouncePayload,
  packChannelEnvelope,
  packLxmPayload,
  packLxmfDestinationPrefixed,
  packLxmfWire,
  packResourceAdvertisement,
  packResourceHashmapUpdate,
  packResourceHashmapUpdatePacket,
  packTokenFrame,
  parseAnnouncePayload,
  splitLxmfDestinationPrefixed,
  splitLxmfWire,
  splitResourceHashmapUpdatePacket,
  splitTokenFrame,
  stripTransportHeadersBytes,
  truncateHashBytes,
  unpackChannelEnvelope,
  unpackLxmPayload,
  unpackResourceAdvertisement,
  unpackResourceHashmapUpdate,
  wrapTransportPacketBytes,
} from "../src/index.js";

const numRuns = Number.parseInt(process.env.PROPERTY_RUNS ?? "100", 10);
const parameters = {
  numRuns,
  seed: process.env.PROPERTY_SEED
    ? Number(process.env.PROPERTY_SEED)
    : undefined,
};
const bytes = (maxLength = 2048) => fc.uint8Array({ maxLength });
const fixedBytes = (length: number) =>
  fc.uint8Array({ minLength: length, maxLength: length });

describe("protocol codec properties", () => {
  it("round-trips msgpack scalars, arrays, and integer-keyed fields", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffff_ffff }),
        bytes(),
        fc.array(fc.integer({ min: 0, max: 0xffff_ffff }), { maxLength: 15 }),
        fc.array(fc.tuple(fc.integer({ min: 0, max: 0x7f }), bytes(128)), {
          maxLength: 15,
        }),
        (integer, binary, integers, entries) => {
          expect(msgpackUnpack(msgpackPackUInt(integer))).toEqual({
            type: "int",
            int: integer,
          });
          expect(msgpackUnpack(msgpackPackBin(binary))).toEqual({
            type: "bin",
            bin: binary,
          });

          const array = msgpackUnpack(
            msgpackPackArray(integers.map(msgpackPackUInt)),
          );
          expect(array.type).toBe("array");
          if (array.type === "array") {
            expect(array.array).toEqual(
              integers.map((int) => ({ type: "int", int })),
            );
          }

          const unique = [...new Map(entries).entries()];
          const map = msgpackUnpack(msgpackPackIntMap(unique));
          expect(map.type).toBe("map");
          if (map.type === "map") {
            expect([...map.map.entries()]).toEqual(
              unique.map(([key, bin]) => [key, { type: "bin", bin }]),
            );
          }
        },
      ),
      parameters,
    );
  });

  it("round-trips packet headers", () => {
    const header = fc.constantFrom(PACKET_HEADER_1, PACKET_HEADER_2);
    fc.assert(
      fc.property(
        header,
        fc.integer({ min: 0, max: 1 }),
        fc.integer({ min: 0, max: 1 }),
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fixedBytes(TRANSPORT_ID_BYTES),
        fixedBytes(TRANSPORT_ID_BYTES),
        bytes(),
        (
          headerType,
          contextFlag,
          transportType,
          destinationType,
          packetType,
          hops,
          context,
          destinationHash,
          transportId,
          data,
        ) => {
          const fields = {
            headerType,
            contextFlag,
            transportType,
            destinationType,
            packetType,
            hops,
            destinationHash,
            context,
            data,
            transportId: headerType === PACKET_HEADER_2 ? transportId : null,
          };
          expect(decodePacketRaw(encodePacketRaw(fields))).toEqual(fields);
        },
      ),
      parameters,
    );
  });

  it("round-trips LXMF outer wire, destination prefix, and fields", () => {
    fc.assert(
      fc.property(
        fixedBytes(LXMF_DESTINATION_LENGTH),
        fixedBytes(LXMF_DESTINATION_LENGTH),
        fixedBytes(LXMF_SIGNATURE_LENGTH),
        fc.uint8Array({ minLength: 1, maxLength: 2048 }),
        fc.double(),
        bytes(512),
        bytes(1024),
        fc.option(bytes(128), { nil: null }),
        (
          destinationHash,
          sourceHash,
          signature,
          payload,
          timestamp,
          title,
          content,
          stamp,
        ) => {
          expect(
            splitLxmfWire(
              packLxmfWire({ destinationHash, sourceHash, signature, payload }),
            ),
          ).toEqual({
            destinationHash,
            sourceHash,
            signature,
            payload,
          });
          expect(
            splitLxmfDestinationPrefixed(
              packLxmfDestinationPrefixed(destinationHash, payload),
            ),
          ).toEqual({
            destinationHash,
            remainder: payload,
          });

          const fields = {
            1: payload.subarray(0, 32),
            7: title.subarray(0, 32),
          };
          const unpacked = unpackLxmPayload(
            packLxmPayload(timestamp, title, content, fields, stamp),
          );
          expect(Object.is(unpacked.timestamp, timestamp)).toBe(true);
          expect(unpacked.title).toEqual(title);
          expect(unpacked.content).toEqual(content);
          expect(unpacked.fields).toEqual(fields);
          expect(unpacked.stamp).toEqual(stamp);
        },
      ),
      parameters,
    );
  });

  it("round-trips token and channel framing", () => {
    fc.assert(
      fc.property(
        fixedBytes(TOKEN_IV_SIZE),
        fc.uint8Array({ minLength: 1, maxLength: 2048 }),
        fixedBytes(TOKEN_HMAC_SIZE),
        fc.integer({ min: 0, max: 0xffff }),
        fc.integer({ min: 0, max: 0xffff }),
        bytes(4096),
        (iv, ciphertext, hmac, msgType, sequence, payload) => {
          const token = splitTokenFrame(
            packTokenFrame({ iv, ciphertext, hmac }),
          );
          expect(token).not.toBeNull();
          expect(token?.iv).toEqual(iv);
          expect(token?.ciphertext).toEqual(ciphertext);
          expect(token?.hmac).toEqual(hmac);
          expect(token?.signedMaterial).toEqual(
            assembleByteArrays([iv, ciphertext]),
          );

          expect(
            unpackChannelEnvelope(
              packChannelEnvelope({ msgType, sequence, payload }),
            ),
          ).toEqual({
            msgType,
            sequence,
            length: payload.length,
            payload,
          });
        },
      ),
      parameters,
    );
  });

  it("round-trips resource advertisements, flags, and hashmap frames", () => {
    const flags = fc.record({
      e: fc.boolean(),
      c: fc.boolean(),
      s: fc.boolean(),
      u: fc.boolean(),
      p: fc.boolean(),
      x: fc.boolean(),
    });
    fc.assert(
      fc.property(
        flags,
        fc.integer({ min: 0, max: 0xffff_ffff }),
        fixedBytes(32),
        bytes(512),
        fc.option(bytes(64), { nil: null }),
        fixedBytes(RESOURCE_HASH_SIZE),
        (flagFields, integer, hash, map, request, resourceHash) => {
          const encodedFlags = encodeResourceAdvertisementFlags(flagFields);
          expect(decodeResourceAdvertisementFlags(encodedFlags)).toEqual(
            flagFields,
          );
          const fields = {
            t: integer,
            d: integer,
            n: integer,
            h: hash,
            r: hash,
            o: hash,
            m: map,
            f: encodedFlags,
            i: integer,
            l: integer,
            q: request,
          };
          expect(
            unpackResourceAdvertisement(packResourceAdvertisement(fields)),
          ).toEqual(fields);

          const updateBytes = packResourceHashmapUpdate(integer, map);
          expect(unpackResourceHashmapUpdate(updateBytes)).toEqual({
            segment: integer,
            hashmap: map,
          });
          expect(
            splitResourceHashmapUpdatePacket(
              packResourceHashmapUpdatePacket(resourceHash, updateBytes),
            ),
          ).toEqual({
            resourceHash,
            updateBytes,
          });
        },
      ),
      parameters,
    );
  });

  it("round-trips announce payloads with and without ratchets", () => {
    fc.assert(
      fc.property(
        fixedBytes(ANNOUNCE_PUBLIC_KEY_SIZE),
        fixedBytes(ANNOUNCE_NAME_HASH_SIZE),
        fixedBytes(ANNOUNCE_RANDOM_HASH_SIZE),
        fixedBytes(ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE),
        fixedBytes(ANNOUNCE_SIGNATURE_SIZE),
        fc.option(fc.uint8Array({ minLength: 1, maxLength: 256 }), {
          nil: null,
        }),
        fc.boolean(),
        (
          publicKey,
          nameHash,
          randomHash,
          ratchet,
          signature,
          appData,
          hasRatchet,
        ) => {
          const ratchetPublicKey = hasRatchet ? ratchet : null;
          expect(
            parseAnnouncePayload(
              packAnnouncePayload({
                publicKey,
                nameHash,
                randomHash,
                ratchetPublicKey,
                signature,
                appData,
              }),
              hasRatchet,
            ),
          ).toEqual({
            publicKey,
            nameHash,
            randomHash,
            ratchetPublicKey,
            signature,
            appData,
          });
        },
      ),
      parameters,
    );
  });

  it("preserves transport bodies across wrap and strip", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fixedBytes(TRANSPORT_ID_BYTES),
        bytes(),
        (flags, hops, nextHop, body) => {
          const raw = assembleByteArrays([new Uint8Array([flags, hops]), body]);
          const stripped = stripTransportHeadersBytes(
            wrapTransportPacketBytes({
              packedFlags: flags,
              hops,
              raw,
              nextHop,
            }),
          );
          expect(stripped[0]).toBe(flags & 0x0f);
          expect(stripped[1]).toBe(hops);
          expect(stripped.subarray(2)).toEqual(body);
        },
      ),
      parameters,
    );
  });

  it("decodes masked WebSocket client frames and never throws on arbitrary bytes", () => {
    fc.assert(
      fc.property(
        bytes(65535),
        fixedBytes(4),
        bytes(),
        (payload, mask, arbitrary) => {
          const frame = maskedClientFrame(payload, mask);
          expect(decodeWsClientFrame(frame)).toEqual({
            opcode: 2,
            payload,
            consumed: frame.length,
          });
          expect(() => decodeWsClientFrame(arbitrary)).not.toThrow();
          expect(() => decodePacketRaw(arbitrary)).not.toThrow();
          expect(() => unpackChannelEnvelope(arbitrary)).not.toThrow();
          expect(() => splitLxmfWire(arbitrary)).not.toThrow();
          expect(() =>
            splitResourceHashmapUpdatePacket(arbitrary),
          ).not.toThrow();
          expect(() => splitTokenFrame(arbitrary)).not.toThrow();
        },
      ),
      parameters,
    );
  });

  it("assembles byte parts and truncates only to the requested prefix", () => {
    fc.assert(
      fc.property(
        fc.array(bytes(256), { maxLength: 32 }),
        fc.integer({ min: 0, max: 512 }),
        (parts, requested) => {
          const assembled = assembleByteArrays(parts);
          expect(assembled).toEqual(
            Uint8Array.from(parts.flatMap((part) => [...part])),
          );
          const length = Math.min(requested, assembled.length);
          expect(truncateHashBytes(assembled, length)).toEqual(
            assembled.subarray(0, length),
          );
        },
      ),
      parameters,
    );
  });
});

function maskedClientFrame(payload: Uint8Array, mask: Uint8Array): Uint8Array {
  const extended = payload.length < 126 ? 0 : payload.length <= 0xffff ? 2 : 8;
  const header = new Uint8Array(2 + extended + mask.length);
  header[0] = 0x82;
  header[1] =
    0x80 | (extended === 0 ? payload.length : extended === 2 ? 126 : 127);
  const view = new DataView(header.buffer);
  if (extended === 2) view.setUint16(2, payload.length, false);
  if (extended === 8) view.setBigUint64(2, BigInt(payload.length), false);
  header.set(mask, 2 + extended);
  const masked = Uint8Array.from(
    payload,
    (byte, index) => byte ^ mask[index % mask.length]!,
  );
  return assembleByteArrays([header, masked]);
}
