import { describe, expect, it } from "vitest";
import {
  LXMF_WIRE_HEADER_SIZE,
  lxmfHashableMaterial,
  lxmfOpportunisticPayload,
  lxmfSignedMaterial,
  packLxmfWire,
  splitLxmfWire
} from "../src/lxmf-wire.js";
import { LXMF_DESTINATION_LENGTH, LXMF_SIGNATURE_LENGTH } from "../src/lxmf-delivery.js";

describe("protocol lxmf wire", () => {
  const destination = new Uint8Array(LXMF_DESTINATION_LENGTH).fill(1);
  const source = new Uint8Array(LXMF_DESTINATION_LENGTH).fill(2);
  const signature = new Uint8Array(LXMF_SIGNATURE_LENGTH).fill(3);
  const payload = new Uint8Array([9, 8, 7]);

  it("packs and splits outer wire bytes", () => {
    const packed = packLxmfWire({
      destinationHash: destination,
      sourceHash: source,
      signature,
      payload
    });
    expect(packed.length).toBe(LXMF_WIRE_HEADER_SIZE + payload.length);
    const split = splitLxmfWire(packed);
    expect(split).not.toBeNull();
    expect([...split!.destinationHash]).toEqual([...destination]);
    expect([...split!.payload]).toEqual([...payload]);
  });

  it("builds hashable and signed material", () => {
    const hashable = lxmfHashableMaterial(destination, source, payload);
    const messageHash = new Uint8Array(32).fill(4);
    const signed = lxmfSignedMaterial(hashable, messageHash);
    expect(signed.length).toBe(hashable.length + messageHash.length);
    expect([...lxmfOpportunisticPayload(packedFrom(destination, source, signature, payload))]).toEqual([
      ...source,
      ...signature,
      ...payload
    ]);
  });
});

function packedFrom(
  destination: Uint8Array,
  source: Uint8Array,
  signature: Uint8Array,
  payload: Uint8Array
): Uint8Array {
  return packLxmfWire({ destinationHash: destination, sourceHash: source, signature, payload });
}
