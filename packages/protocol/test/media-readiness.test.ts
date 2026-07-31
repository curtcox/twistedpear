import { describe, expect, it } from "vitest";
import {
  decideMediaCapability,
  initialMediaReadinessState,
  stepMediaReadiness,
  negotiateMediaEncoding,
  type PeerMediaReadiness
} from "../src/index.js";

const readiness: PeerMediaReadiness = {
  hostApi: "0.12.0",
  accepts: [
    { classId: "camera", maxRung: "480p15", encodings: ["vp9", "vp8", "vp9"] },
    { classId: "microphone", maxRung: "16k-opus", encodings: ["opus"] }
  ],
  offers: [],
  downlinkBucket: "sd-video",
  constrained: ["metered"],
  consentPosture: "ask",
  expiresAt: 10_000
};

describe("media readiness", () => {
  it("makes refusal indistinguishable from unreachable", () => {
    const requested = stepMediaReadiness(initialMediaReadinessState(), { kind: "readiness/request" });
    const refused = stepMediaReadiness(requested, { kind: "readiness/refuse" });
    const unreachable = stepMediaReadiness(requested, { kind: "readiness/unreachable" });
    expect(refused).toEqual(unreachable);
  });

  it("normalizes a live exchange and expires it", () => {
    const ready = stepMediaReadiness(initialMediaReadinessState(), {
      kind: "readiness/receive",
      at: 1,
      readiness
    });
    expect(ready.phase).toBe("ready");
    expect(ready.readiness?.accepts[0]?.encodings).toEqual(["vp8", "vp9"]);
    const expired = stepMediaReadiness(ready, { kind: "readiness/ttl", at: 10_000 });
    const unreachable = stepMediaReadiness(ready, { kind: "readiness/unreachable" });
    expect(expired).toEqual(unreachable);
  });

  it("requires both peer acceptance and local share authority", () => {
    expect(decideMediaCapability({
      classId: "camera",
      localSupply: "hd-video",
      peer: readiness,
      at: 1,
      sharePermitted: true
    })).toBe("sd-video");
    expect(decideMediaCapability({
      classId: "camera",
      localSupply: "hd-video",
      peer: readiness,
      at: 1,
      sharePermitted: false
    })).toBe("unreachable");
  });

  it("negotiates the first mutually supported codec", () => {
    expect(negotiateMediaEncoding(["h264", "vp9", "vp8"], readiness.accepts[0]!)).toBe("vp9");
    expect(negotiateMediaEncoding(["av1"], readiness.accepts[0]!)).toBeNull();
  });
});
