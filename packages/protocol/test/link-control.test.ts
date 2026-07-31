import { describe, expect, it } from "vitest";
import {
  decodeLinkControl,
  encodeLinkControl,
  encodeReadinessEnvelope,
  parseMediaReadiness,
  LINK_CONTROL_MAX_PAYLOAD_BYTES,
  READINESS_REQUEST_ID,
  READINESS_RESPONSE_ID,
  type PeerMediaReadiness
} from "../src/index.js";

const readiness: PeerMediaReadiness = {
  hostApi: "0.12.0",
  accepts: [{ classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus", "opus", "opus"] }],
  offers: [],
  downlinkBucket: "audio",
  constrained: ["foreground-only"],
  consentPosture: "ask",
  expiresAt: 60_000
};

function utf8(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

describe("link control envelope", () => {
  it("round-trips a readiness exchange", () => {
    const request = decodeLinkControl(encodeReadinessEnvelope(READINESS_REQUEST_ID, readiness));
    expect(request?.type).toBe(1);
    expect(request?.id).toBe(READINESS_REQUEST_ID);
    expect(parseMediaReadiness(request!.payload)).toEqual({
      ...readiness,
      accepts: [{ classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus", "opus"] }]
    });

    const response = decodeLinkControl(encodeReadinessEnvelope(READINESS_RESPONSE_ID, readiness));
    expect(response?.id).toBe(READINESS_RESPONSE_ID);
  });

  it("round-trips a probe request and its reply", () => {
    const body = new Uint8Array(1024).fill(7);
    const request = decodeLinkControl(encodeLinkControl({ type: 2, id: "probe-0", payload: body }));
    expect(request).toEqual({ type: 2, id: "probe-0", payload: body });
    const reply = decodeLinkControl(encodeLinkControl({ type: 3, id: request!.id, payload: request!.payload }));
    expect(reply?.type).toBe(3);
    expect(reply?.payload).toEqual(body);
  });

  it("refuses envelopes outside the declared bounds", () => {
    expect(() => encodeLinkControl({ type: 1, id: "", payload: new Uint8Array() })).toThrow(/bounds/);
    expect(() => encodeLinkControl({ type: 1, id: "x".repeat(65), payload: new Uint8Array() })).toThrow(/bounds/);
    expect(() =>
      encodeLinkControl({ type: 1, id: "x", payload: new Uint8Array(LINK_CONTROL_MAX_PAYLOAD_BYTES + 1) })
    ).toThrow(/bounds/);
  });

  it("rejects malformed, truncated, and foreign frames without throwing", () => {
    const encoded = encodeLinkControl({ type: 2, id: "probe-1", payload: new Uint8Array([1, 2, 3]) });
    expect(decodeLinkControl(encoded.subarray(0, 4))).toBeNull();
    expect(decodeLinkControl(encoded.subarray(0, encoded.length - 1))).toBeNull();
    const foreign = encoded.slice();
    foreign[0] = 0x55;
    expect(decodeLinkControl(foreign)).toBeNull();
    const unknownType = encoded.slice();
    unknownType[4] = 9;
    expect(decodeLinkControl(unknownType)).toBeNull();
  });

  it("treats an unparseable or out-of-taxonomy readiness body as no answer", () => {
    expect(parseMediaReadiness(utf8("not json"))).toBeNull();
    expect(parseMediaReadiness(utf8(JSON.stringify({ ...readiness, downlinkBucket: "gigabit" })))).toBeNull();
    expect(parseMediaReadiness(utf8(JSON.stringify({ ...readiness, consentPosture: "always" })))).toBeNull();
    expect(
      parseMediaReadiness(utf8(JSON.stringify({ ...readiness, accepts: [{ classId: "keyboard", maxRung: "x", encodings: ["x"] }] })))
    ).toBeNull();
    expect(parseMediaReadiness(new Uint8Array(LINK_CONTROL_MAX_PAYLOAD_BYTES + 1))).toBeNull();
  });
});
