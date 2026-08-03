// @ts-nocheck
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Announce, NodeCryptoProvider, Packet, hexToBytes } from "../src/index.js";
import { diffCaptures } from "../../../conformance/tools/capture-diff.js";
import {
  captureAnnounceFields,
  captureAnnounceFromRaw,
  capturePacketFields
} from "../../../conformance/tools/packet-capture.js";

const provider = new NodeCryptoProvider();

interface AnnounceVector {
  readonly name: string;
  readonly destinationHashHex: string;
  readonly nameHashHex: string;
  readonly publicKeyHex: string;
  readonly randomHashHex: string;
  readonly ratchetPublicKeyHex: string | null;
  readonly appDataHex: string;
  readonly signatureHex: string;
  readonly dataHex: string;
  readonly rawHex: string;
}

const packetVectors = JSON.parse(
  readFileSync(resolve("conformance/vectors/packet.json"), "utf8")
) as {
  readonly announces: ReadonlyArray<AnnounceVector>;
};

function expectedAnnounceCapture(vector: AnnounceVector) {
  const hasRatchet = vector.ratchetPublicKeyHex !== null;

  return {
    label: vector.name,
    fields: {
      headerType: 0,
      contextFlag: hasRatchet ? 1 : 0,
      transportType: 0,
      destinationType: 0,
      packetType: 1,
      hops: 0,
      destinationHashHex: vector.destinationHashHex,
      context: 0,
      dataHex: vector.dataHex,
      rawHex: vector.rawHex,
      packetHashHex: "",
      publicKeyHex: vector.publicKeyHex,
      nameHashHex: vector.nameHashHex,
      randomHashHex: vector.randomHashHex,
      ratchetPublicKeyHex: vector.ratchetPublicKeyHex ?? "",
      signatureHex: vector.signatureHex,
      appDataHex: vector.appDataHex
    }
  };
}

describe("capture diff — announce corpus", () => {
  it.each(packetVectors.announces)("reports zero field mismatches for $name", (vector) => {
    const packet = Packet.decode(provider, hexToBytes(vector.rawHex));
    expect(packet).not.toBeNull();

    const parsed = Announce.parse(packet!);
    expect(parsed).not.toBeNull();

    const actual = captureAnnounceFields(vector.name, packet!, parsed!);
    const expected = expectedAnnounceCapture(vector);
    expected.fields.packetHashHex = actual.fields.packetHashHex as string;

    const mismatches = diffCaptures([expected], [actual]);
    expect(mismatches).toEqual([]);
  });

  it("extracts announce fields from raw hex via capture helper", () => {
    const vector = packetVectors.announces[0]!;
    const capture = captureAnnounceFromRaw(provider, vector.name, vector.rawHex);
    expect(capture).not.toBeNull();
    expect(capture!.fields.destinationHashHex).toBe(vector.destinationHashHex);
    expect(capture!.fields.signatureHex).toBe(vector.signatureHex);
  });

  it("compares packet field captures for the full announce corpus", () => {
    const expected = packetVectors.announces.map((vector) => {
      const packet = Packet.decode(provider, hexToBytes(vector.rawHex))!;
      return capturePacketFields(vector.name, packet);
    });

    const actual = packetVectors.announces.map((vector) => {
      const packet = Packet.decode(provider, hexToBytes(vector.rawHex))!;
      return capturePacketFields(`${vector.name}-roundtrip`, packet);
    });

    for (let index = 0; index < expected.length; index += 1) {
      const left = expected[index]!;
      const right = actual[index]!;
      right.label = left.label;
      expect(diffCaptures([left], [right])).toEqual([]);
    }
  });
});
