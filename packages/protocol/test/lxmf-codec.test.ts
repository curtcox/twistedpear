import { describe, expect, it } from "vitest";
import {
  binListFieldsFromActions,
  initialPackLxmPayloadState,
  initialPackPropagationEnvelopeState,
  initialPackPropagationRequestState,
  initialUnpackBinListState,
  initialUnpackLxmPayloadState,
  initialUnpackPropagationEnvelopeState,
  initialUnpackPropagationRequestState,
  lxmPayloadFieldsFromActions,
  packLxmPayload,
  packLxmPayloadRawFromActions,
  packPropagationEnvelope,
  packPropagationEnvelopeRawFromActions,
  packPropagationRequest,
  packPropagationRequestRawFromActions,
  propagationEnvelopeFieldsFromActions,
  propagationRequestFieldsFromActions,
  shouldRejectUnpackBinList,
  shouldRejectUnpackLxmPayload,
  shouldRejectUnpackPropagationEnvelope,
  shouldRejectUnpackPropagationRequest,
  shouldUsePackLxmPayload,
  shouldUsePackPropagationEnvelope,
  shouldUsePackPropagationRequest,
  shouldUseUnpackBinList,
  shouldUseUnpackLxmPayload,
  shouldUseUnpackPropagationEnvelope,
  shouldUseUnpackPropagationRequest,
  stepPackLxmPayloadWithActions,
  stepPackPropagationEnvelopeWithActions,
  stepPackPropagationRequestWithActions,
  stepUnpackBinListWithActions,
  stepUnpackLxmPayloadWithActions,
  stepUnpackPropagationEnvelopeWithActions,
  stepUnpackPropagationRequestWithActions,
  unpackBinList,
  unpackLxmPayload,
  unpackPropagationEnvelope,
  unpackPropagationRequest,
} from "../src/lxmf-codec.js";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackUInt,
} from "../src/msgpack-core.js";

describe("protocol lxmf codec", () => {
  it("round-trips LXM payloads", () => {
    const packed = packLxmPayload(
      1.5,
      new Uint8Array([1]),
      new Uint8Array([2, 3]),
      { 1: new Uint8Array([9]) },
      new Uint8Array([7]),
    );
    const unpacked = unpackLxmPayload(packed);
    expect(unpacked.timestamp).toBe(1.5);
    expect([...unpacked.title]).toEqual([1]);
    expect([...unpacked.content]).toEqual([2, 3]);
    expect([...unpacked.fields[1]!]).toEqual([9]);
    expect([...unpacked.stamp!]).toEqual([7]);
  });

  it("round-trips propagation requests", () => {
    const wants = [new Uint8Array([1, 2])];
    const packed = packPropagationRequest(wants, null, 100);
    const [w, h, limit] = unpackPropagationRequest(packed);
    expect(w).toHaveLength(1);
    expect([...w![0]!]).toEqual([1, 2]);
    expect(h).toBeNull();
    expect(limit).toBe(100);
  });

  it("round-trips propagation envelopes", () => {
    const packed = packPropagationEnvelope(10, [new Uint8Array([4, 5])]);
    const messages = unpackPropagationEnvelope(packed);
    expect(messages).toHaveLength(1);
    expect([...messages[0]!]).toEqual([4, 5]);
  });

  it("emits pack framing bytes from WithActions steps", () => {
    const payloadStepped = stepPackLxmPayloadWithActions(
      initialPackLxmPayloadState(),
      {
        kind: "lxmf-codec/pack-payload-gate",
        timestamp: 1.5,
        title: new Uint8Array([1]),
        content: new Uint8Array([2, 3]),
        fields: { 1: new Uint8Array([9]) },
        stamp: new Uint8Array([7]),
      },
    );
    expect(shouldUsePackLxmPayload(payloadStepped.actions)).toBe(true);
    const packedPayload = packLxmPayloadRawFromActions(payloadStepped.actions);
    expect(packedPayload).not.toBeNull();
    expect([...packedPayload!]).toEqual([
      ...packLxmPayload(
        1.5,
        new Uint8Array([1]),
        new Uint8Array([2, 3]),
        { 1: new Uint8Array([9]) },
        new Uint8Array([7]),
      ),
    ]);

    const wants = [new Uint8Array([1, 2])];
    const requestStepped = stepPackPropagationRequestWithActions(
      initialPackPropagationRequestState(),
      {
        kind: "lxmf-codec/pack-propagation-request-gate",
        wants,
        haves: null,
        transferLimitKb: 100,
      },
    );
    expect(shouldUsePackPropagationRequest(requestStepped.actions)).toBe(true);
    const packedRequest = packPropagationRequestRawFromActions(
      requestStepped.actions,
    );
    expect(packedRequest).not.toBeNull();
    expect([...packedRequest!]).toEqual([
      ...packPropagationRequest(wants, null, 100),
    ]);

    const envelopeStepped = stepPackPropagationEnvelopeWithActions(
      initialPackPropagationEnvelopeState(),
      {
        kind: "lxmf-codec/pack-propagation-envelope-gate",
        timestamp: 10,
        messages: [new Uint8Array([4, 5])],
      },
    );
    expect(shouldUsePackPropagationEnvelope(envelopeStepped.actions)).toBe(
      true,
    );
    const packedEnvelope = packPropagationEnvelopeRawFromActions(
      envelopeStepped.actions,
    );
    expect(packedEnvelope).not.toBeNull();
    expect([...packedEnvelope!]).toEqual([
      ...packPropagationEnvelope(10, [new Uint8Array([4, 5])]),
    ]);
  });

  it("emits unpack fields or reject from WithActions steps", () => {
    const packedPayload = packLxmPayload(
      1.5,
      new Uint8Array([1]),
      new Uint8Array([2, 3]),
      { 1: new Uint8Array([9]) },
      new Uint8Array([7]),
    );
    const okPayload = stepUnpackLxmPayloadWithActions(
      initialUnpackLxmPayloadState(),
      {
        kind: "lxmf-codec/unpack-payload-gate",
        data: packedPayload,
      },
    );
    expect(shouldUseUnpackLxmPayload(okPayload.actions)).toBe(true);
    expect(shouldRejectUnpackLxmPayload(okPayload.actions)).toBe(false);
    const payloadFields = lxmPayloadFieldsFromActions(okPayload.actions);
    expect(payloadFields).not.toBeNull();
    expect(payloadFields!.timestamp).toBe(1.5);
    expect([...payloadFields!.title]).toEqual([1]);

    const rejectedPayload = stepUnpackLxmPayloadWithActions(
      initialUnpackLxmPayloadState(),
      {
        kind: "lxmf-codec/unpack-payload-gate",
        data: new Uint8Array([0xc0]),
      },
    );
    expect(shouldRejectUnpackLxmPayload(rejectedPayload.actions)).toBe(true);
    expect(shouldUseUnpackLxmPayload(rejectedPayload.actions)).toBe(false);
    expect(lxmPayloadFieldsFromActions(rejectedPayload.actions)).toBeNull();

    const wants = [new Uint8Array([1, 2])];
    const packedRequest = packPropagationRequest(wants, null, 100);
    const okRequest = stepUnpackPropagationRequestWithActions(
      initialUnpackPropagationRequestState(),
      {
        kind: "lxmf-codec/unpack-propagation-request-gate",
        data: packedRequest,
      },
    );
    expect(shouldUseUnpackPropagationRequest(okRequest.actions)).toBe(true);
    const requestFields = propagationRequestFieldsFromActions(
      okRequest.actions,
    );
    expect(requestFields).not.toBeNull();
    expect(requestFields!.wants).toHaveLength(1);
    expect(requestFields!.haves).toBeNull();
    expect(requestFields!.transferLimitKb).toBe(100);

    const rejectedRequest = stepUnpackPropagationRequestWithActions(
      initialUnpackPropagationRequestState(),
      {
        kind: "lxmf-codec/unpack-propagation-request-gate",
        data: new Uint8Array([0xc0]),
      },
    );
    expect(shouldRejectUnpackPropagationRequest(rejectedRequest.actions)).toBe(
      true,
    );
    expect(
      propagationRequestFieldsFromActions(rejectedRequest.actions),
    ).toBeNull();

    const packedEnvelope = packPropagationEnvelope(10, [
      new Uint8Array([4, 5]),
    ]);
    const okEnvelope = stepUnpackPropagationEnvelopeWithActions(
      initialUnpackPropagationEnvelopeState(),
      {
        kind: "lxmf-codec/unpack-propagation-envelope-gate",
        data: packedEnvelope,
      },
    );
    expect(shouldUseUnpackPropagationEnvelope(okEnvelope.actions)).toBe(true);
    const envelopeFields = propagationEnvelopeFieldsFromActions(
      okEnvelope.actions,
    );
    expect(envelopeFields).not.toBeNull();
    expect(envelopeFields!.messages).toHaveLength(1);
    expect([...envelopeFields!.messages[0]!]).toEqual([4, 5]);

    const rejectedEnvelope = stepUnpackPropagationEnvelopeWithActions(
      initialUnpackPropagationEnvelopeState(),
      {
        kind: "lxmf-codec/unpack-propagation-envelope-gate",
        data: new Uint8Array([0xc0]),
      },
    );
    expect(
      shouldRejectUnpackPropagationEnvelope(rejectedEnvelope.actions),
    ).toBe(true);
    expect(
      propagationEnvelopeFieldsFromActions(rejectedEnvelope.actions),
    ).toBeNull();

    const packedList = msgpackPackArray([
      msgpackPackBin(new Uint8Array([9, 8])),
    ]);
    const okList = stepUnpackBinListWithActions(initialUnpackBinListState(), {
      kind: "lxmf-codec/unpack-bin-list-gate",
      data: packedList,
      label: "transient id list",
    });
    expect(shouldUseUnpackBinList(okList.actions)).toBe(true);
    const listFields = binListFieldsFromActions(okList.actions);
    expect(listFields).not.toBeNull();
    expect([...listFields!.entries[0]!]).toEqual([9, 8]);
    expect([...unpackBinList(packedList, "transient id list")[0]!]).toEqual([
      9, 8,
    ]);

    const rejectedList = stepUnpackBinListWithActions(
      initialUnpackBinListState(),
      {
        kind: "lxmf-codec/unpack-bin-list-gate",
        data: msgpackPackUInt(1),
        label: "transient id list",
      },
    );
    expect(shouldRejectUnpackBinList(rejectedList.actions)).toBe(true);
    expect(binListFieldsFromActions(rejectedList.actions)).toBeNull();
  });
});
