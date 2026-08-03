// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  LXMF_WIRE_HEADER_SIZE,
  initialLxmfHashableMaterialState,
  initialLxmfInboundDeliveryState,
  initialLxmfOpportunisticPayloadState,
  initialLxmfSignedMaterialState,
  initialPackLxmfDestinationPrefixedState,
  initialPackLxmfWireState,
  initialSplitLxmfDestinationPrefixedState,
  initialSplitLxmfWireState,
  lxmfDestinationPrefixedFieldsFromActions,
  lxmfHashableMaterial,
  lxmfHashableMaterialRawFromActions,
  lxmfInboundDeliveryBytes,
  lxmfInboundDeliveryRawFromActions,
  lxmfOpportunisticPayload,
  lxmfOpportunisticPayloadRawFromActions,
  lxmfSignedMaterial,
  lxmfSignedMaterialRawFromActions,
  lxmfWireFieldsFromActions,
  packLxmfDestinationPrefixed,
  packLxmfDestinationPrefixedRawFromActions,
  packLxmfWire,
  packLxmfWireRawFromActions,
  shouldRejectLxmfOpportunisticPayload,
  shouldRejectPackLxmfDestinationPrefixed,
  shouldRejectPackLxmfWire,
  shouldRejectSplitLxmfDestinationPrefixed,
  shouldRejectSplitLxmfWire,
  shouldUseLxmfHashableMaterial,
  shouldUseLxmfInboundDelivery,
  shouldUseLxmfOpportunisticPayload,
  shouldUseLxmfSignedMaterial,
  shouldUsePackLxmfDestinationPrefixed,
  shouldUsePackLxmfWire,
  shouldUseSplitLxmfDestinationPrefixed,
  shouldUseSplitLxmfWire,
  splitLxmfDestinationPrefixed,
  splitLxmfWire,
  stepLxmfHashableMaterialWithActions,
  stepLxmfInboundDeliveryWithActions,
  stepLxmfOpportunisticPayloadWithActions,
  stepLxmfSignedMaterialWithActions,
  stepPackLxmfDestinationPrefixedWithActions,
  stepPackLxmfWireWithActions,
  stepSplitLxmfDestinationPrefixedWithActions,
  stepSplitLxmfWireWithActions
} from "../src/lxmf-wire.js";
import {
  LXMF_DESTINATION_LENGTH,
  LXMF_SIGNATURE_LENGTH,
  LxmfDeliveryMethod
} from "../src/lxmf-delivery.js";

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

  it("emits hashable / signed / opportunistic material from WithActions steps", () => {
    const messageHash = new Uint8Array(32).fill(4);
    const hashableStepped = stepLxmfHashableMaterialWithActions(initialLxmfHashableMaterialState(), {
      kind: "lxmf-wire/hashable-material-gate",
      destinationHash: destination,
      sourceHash: source,
      payloadWithoutStamp: payload
    });
    expect(shouldUseLxmfHashableMaterial(hashableStepped.actions)).toBe(true);
    const hashable = lxmfHashableMaterialRawFromActions(hashableStepped.actions);
    expect(hashable).not.toBeNull();
    expect([...hashable!]).toEqual([...lxmfHashableMaterial(destination, source, payload)]);

    const signedStepped = stepLxmfSignedMaterialWithActions(initialLxmfSignedMaterialState(), {
      kind: "lxmf-wire/signed-material-gate",
      hashableMaterial: hashable!,
      messageHash
    });
    expect(shouldUseLxmfSignedMaterial(signedStepped.actions)).toBe(true);
    const signed = lxmfSignedMaterialRawFromActions(signedStepped.actions);
    expect(signed).not.toBeNull();
    expect([...signed!]).toEqual([...lxmfSignedMaterial(hashable!, messageHash)]);

    const packed = packedFrom(destination, source, signature, payload);
    const opportunisticStepped = stepLxmfOpportunisticPayloadWithActions(
      initialLxmfOpportunisticPayloadState(),
      {
        kind: "lxmf-wire/opportunistic-payload-gate",
        packed
      }
    );
    expect(shouldUseLxmfOpportunisticPayload(opportunisticStepped.actions)).toBe(true);
    expect(shouldRejectLxmfOpportunisticPayload(opportunisticStepped.actions)).toBe(false);
    const opportunistic = lxmfOpportunisticPayloadRawFromActions(opportunisticStepped.actions);
    expect(opportunistic).not.toBeNull();
    expect([...opportunistic!]).toEqual([...lxmfOpportunisticPayload(packed)]);

    const rejected = stepLxmfOpportunisticPayloadWithActions(initialLxmfOpportunisticPayloadState(), {
      kind: "lxmf-wire/opportunistic-payload-gate",
      packed: new Uint8Array(4)
    });
    expect(shouldRejectLxmfOpportunisticPayload(rejected.actions)).toBe(true);
    expect(shouldUseLxmfOpportunisticPayload(rejected.actions)).toBe(false);
    expect(lxmfOpportunisticPayloadRawFromActions(rejected.actions)).toBeNull();
  });

  it("rebuilds opportunistic inbound delivery and destination-prefixed envelopes", () => {
    const trailing = new Uint8Array([4, 5, 6]);
    const opportunistic = lxmfInboundDeliveryBytes(
      LxmfDeliveryMethod.OPPORTUNISTIC,
      destination,
      trailing
    );
    expect([...opportunistic]).toEqual([...destination, ...trailing]);
    expect([
      ...lxmfInboundDeliveryBytes(LxmfDeliveryMethod.DIRECT, destination, trailing)
    ]).toEqual([...trailing]);

    const packed = packLxmfDestinationPrefixed(destination, trailing);
    const split = splitLxmfDestinationPrefixed(packed);
    expect(split).not.toBeNull();
    expect([...split!.destinationHash]).toEqual([...destination]);
    expect([...split!.remainder]).toEqual([...trailing]);
    expect(splitLxmfDestinationPrefixed(new Uint8Array(8))).toBeNull();
  });

  it("emits pack raw or reject from WithActions steps", () => {
    const ok = stepPackLxmfWireWithActions(initialPackLxmfWireState(), {
      kind: "lxmf-wire/pack-gate",
      destinationHash: destination,
      sourceHash: source,
      signature,
      payload
    });
    expect(shouldUsePackLxmfWire(ok.actions)).toBe(true);
    expect(shouldRejectPackLxmfWire(ok.actions)).toBe(false);
    const packed = packLxmfWireRawFromActions(ok.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([
      ...packLxmfWire({
        destinationHash: destination,
        sourceHash: source,
        signature,
        payload
      })
    ]);

    const rejected = stepPackLxmfWireWithActions(initialPackLxmfWireState(), {
      kind: "lxmf-wire/pack-gate",
      destinationHash: new Uint8Array(8),
      sourceHash: source,
      signature,
      payload
    });
    expect(shouldRejectPackLxmfWire(rejected.actions)).toBe(true);
    expect(shouldUsePackLxmfWire(rejected.actions)).toBe(false);
    expect(packLxmfWireRawFromActions(rejected.actions)).toBeNull();
  });

  it("emits split fields or reject from WithActions steps", () => {
    const packed = packLxmfWire({
      destinationHash: destination,
      sourceHash: source,
      signature,
      payload
    });
    const ok = stepSplitLxmfWireWithActions(initialSplitLxmfWireState(), {
      kind: "lxmf-wire/split-gate",
      bytes: packed
    });
    expect(shouldUseSplitLxmfWire(ok.actions)).toBe(true);
    expect(shouldRejectSplitLxmfWire(ok.actions)).toBe(false);
    const fields = lxmfWireFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.destinationHash]).toEqual([...destination]);
    expect([...fields!.payload]).toEqual([...payload]);

    const rejected = stepSplitLxmfWireWithActions(initialSplitLxmfWireState(), {
      kind: "lxmf-wire/split-gate",
      bytes: new Uint8Array(LXMF_WIRE_HEADER_SIZE)
    });
    expect(shouldRejectSplitLxmfWire(rejected.actions)).toBe(true);
    expect(shouldUseSplitLxmfWire(rejected.actions)).toBe(false);
    expect(lxmfWireFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("emits destination-prefixed pack/split and inbound rebuild from WithActions steps", () => {
    const trailing = new Uint8Array([4, 5, 6]);
    const packOk = stepPackLxmfDestinationPrefixedWithActions(
      initialPackLxmfDestinationPrefixedState(),
      {
        kind: "lxmf-destination-prefixed/pack-gate",
        destinationHash: destination,
        remainder: trailing
      }
    );
    expect(shouldUsePackLxmfDestinationPrefixed(packOk.actions)).toBe(true);
    expect(shouldRejectPackLxmfDestinationPrefixed(packOk.actions)).toBe(false);
    const packed = packLxmfDestinationPrefixedRawFromActions(packOk.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packLxmfDestinationPrefixed(destination, trailing)]);

    const packRejected = stepPackLxmfDestinationPrefixedWithActions(
      initialPackLxmfDestinationPrefixedState(),
      {
        kind: "lxmf-destination-prefixed/pack-gate",
        destinationHash: new Uint8Array(4),
        remainder: trailing
      }
    );
    expect(shouldRejectPackLxmfDestinationPrefixed(packRejected.actions)).toBe(true);
    expect(packLxmfDestinationPrefixedRawFromActions(packRejected.actions)).toBeNull();

    const splitOk = stepSplitLxmfDestinationPrefixedWithActions(
      initialSplitLxmfDestinationPrefixedState(),
      {
        kind: "lxmf-destination-prefixed/split-gate",
        bytes: packed!
      }
    );
    expect(shouldUseSplitLxmfDestinationPrefixed(splitOk.actions)).toBe(true);
    const fields = lxmfDestinationPrefixedFieldsFromActions(splitOk.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.remainder]).toEqual([...trailing]);

    const splitRejected = stepSplitLxmfDestinationPrefixedWithActions(
      initialSplitLxmfDestinationPrefixedState(),
      {
        kind: "lxmf-destination-prefixed/split-gate",
        bytes: new Uint8Array(8)
      }
    );
    expect(shouldRejectSplitLxmfDestinationPrefixed(splitRejected.actions)).toBe(true);
    expect(lxmfDestinationPrefixedFieldsFromActions(splitRejected.actions)).toBeNull();

    const rebuild = stepLxmfInboundDeliveryWithActions(initialLxmfInboundDeliveryState(), {
      kind: "lxmf-inbound-delivery/rebuild-gate",
      method: LxmfDeliveryMethod.OPPORTUNISTIC,
      destinationHash: destination,
      packetData: trailing
    });
    expect(shouldUseLxmfInboundDelivery(rebuild.actions)).toBe(true);
    const rebuilt = lxmfInboundDeliveryRawFromActions(rebuild.actions);
    expect(rebuilt).not.toBeNull();
    expect([...rebuilt!]).toEqual([...destination, ...trailing]);
  });
});

function packedFrom(
  destinationHash: Uint8Array,
  sourceHash: Uint8Array,
  signature: Uint8Array,
  payload: Uint8Array
): Uint8Array {
  return packLxmfWire({ destinationHash, sourceHash, signature, payload });
}
