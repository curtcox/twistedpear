// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  adaptStreamAdmission,
  admittedWithinHeadroom,
  decideStreamAdmission,
  degradationLadderFor,
  demandBps,
  selectPlane,
  type AdmissionDecision,
  type LinkSupply
} from "../src/index.js";

describe("device stream admission", () => {
  it("accepts camera derived on a fat webrtc path", () => {
    const decision = decideStreamAdmission(
      { classId: "camera", tierId: "derived", rateHz: 1 },
      [{ plane: "webrtc", effectiveBps: 2_000_000, headroomBps: 524_288 }]
    );
    expect(decision.kind).toBe("accept");
    expect(decision.plane).toBe("webrtc");
    expect(admittedWithinHeadroom(decision, 524_288)).toBe(true);
  });

  it("degrades camera on a LoRa-like reticulum path", () => {
    const decision = decideStreamAdmission(
      { classId: "camera", tierId: "frames", rateHz: 30 },
      [{ plane: "reticulum", effectiveBps: 50_000, headroomBps: 524_288 }]
    );
    expect(decision.kind).toBe("degrade");
    expect(decision.rungIndex).toBeGreaterThan(0);
    expect(decision.rung).toBe(degradationLadderFor("camera")[decision.rungIndex]);
  });

  it("treats raw media targetBps as a bitrate rather than multiplying by frame rate", () => {
    expect(demandBps({ classId: "camera", tierId: "frames", rateHz: 30 })).toBe(2_000_000);
    expect(demandBps({ classId: "microphone", tierId: "pcm", rateHz: 50 })).toBe(524_288);
  });

  it("uses encoding-specific bandwidth profiles", () => {
    expect(demandBps({ classId: "microphone", tierId: "pcm", encoding: "16k-opus", rateHz: 50 })).toBe(24_000);
    expect(demandBps({ classId: "camera", tierId: "frames", encoding: "480p15", rateHz: 15 })).toBe(750_000);
    const admitted = decideStreamAdmission(
      { classId: "microphone", tierId: "pcm", encoding: "16k-opus" },
      [{ plane: "webrtc", effectiveBps: 100_000, headroomBps: 100_000 }]
    );
    expect(admitted).toMatchObject({ kind: "accept", rung: "16k-opus", admittedDemandBps: 24_000 });
  });

  it("checks admitted rung demand rather than clamped supply", () => {
    const decision = decideStreamAdmission(
      { classId: "camera", tierId: "frames", rateHz: 30 },
      [{ plane: "reticulum", effectiveBps: 50_000, headroomBps: 50_000 }]
    );
    expect(decision.kind).toBe("degrade");
    expect(decision.admittedDemandBps).toBeLessThanOrEqual(50_000);
    expect(admittedWithinHeadroom(decision, 50_000)).toBe(true);
    expect(admittedWithinHeadroom({ ...decision, admittedDemandBps: 50_001 }, 50_000)).toBe(false);
  });

  it("starts lower on metered or low-battery links", () => {
    const fat: LinkSupply = {
      plane: "webrtc",
      effectiveBps: 2_000_000,
      headroomBps: 524_288
    };
    const normal = decideStreamAdmission({ classId: "microphone", tierId: "pcm" }, [fat]);
    const metered = decideStreamAdmission({ classId: "microphone", tierId: "pcm" }, [
      { ...fat, metered: true }
    ]);
    expect(metered.rungIndex).toBeGreaterThanOrEqual(normal.rungIndex);
  });

  it("rejects when supply is zero", () => {
    const decision = decideStreamAdmission(
      { classId: "location", tierId: "coarse" },
      [{ plane: "lxmf", effectiveBps: 0, headroomBps: 0 }]
    );
    expect(decision.kind).toBe("reject");
    expect(decision.reason).toMatch(/BANDWIDTH_INSUFFICIENT/);
  });

  it("admits cas-snapshot when no live plane has supply", () => {
    const decision = decideStreamAdmission(
      { classId: "camera", tierId: "frames", rateHz: 30 },
      [{ plane: "reticulum", effectiveBps: 0, headroomBps: 0 }]
    );
    expect(decision).toMatchObject({
      kind: "degrade",
      plane: "cas",
      rung: "cas-snapshot",
      supplyBps: 0,
      reason: "no live path; admitted cas-snapshot"
    });
    expect(admittedWithinHeadroom(decision, 0)).toBe(true);
  });

  it("admits cas-snapshot when there are no candidate planes", () => {
    const decision = decideStreamAdmission({ classId: "screen-capture", tierId: "frames" }, []);
    expect(decision).toMatchObject({
      kind: "degrade",
      plane: "cas",
      rung: "cas-snapshot"
    });
  });

  it("accepts an explicit cas-snapshot request with no live path", () => {
    const decision = decideStreamAdmission(
      { classId: "camera", tierId: "frames", encoding: "cas-snapshot" },
      []
    );
    expect(decision).toMatchObject({
      kind: "accept",
      plane: "cas",
      rung: "cas-snapshot"
    });
  });

  it("prefers webrtc over reticulum when both are present", () => {
    const selected = selectPlane([
      { plane: "reticulum", effectiveBps: 10_000, headroomBps: 524_288 },
      { plane: "webrtc", effectiveBps: 100_000, headroomBps: 524_288 }
    ]);
    expect(selected?.plane).toBe("webrtc");
  });

  it("skips a higher-priority plane with no usable supply", () => {
    const selected = selectPlane([
      { plane: "webrtc", effectiveBps: 0, headroomBps: 0 },
      { plane: "reticulum", effectiveBps: 10_000, headroomBps: 10_000 }
    ]);
    expect(selected?.plane).toBe("reticulum");
  });

  it("downshifts on sustained deficit and upshifts only after hysteresis", () => {
    const ladder = degradationLadderFor("camera");
    const previous: AdmissionDecision = {
      kind: "accept",
      plane: "webrtc",
      rung: ladder[0]!,
      rungIndex: 0,
      demandBps: 100_000,
      admittedDemandBps: 100_000,
      supplyBps: 100_000,
      reason: "accepted"
    };
    const down = adaptStreamAdmission({
      previous,
      supply: { plane: "webrtc", effectiveBps: 1_000, headroomBps: 524_288 },
      ladder,
      deficitStreak: 2
    });
    expect(down.rungIndex).toBe(1);

    const up = adaptStreamAdmission({
      previous: down,
      supply: { plane: "webrtc", effectiveBps: 2_000_000, headroomBps: 524_288 },
      ladder,
      surplusStreak: 4
    });
    expect(up.rungIndex).toBe(0);
  });

  it("holds a degraded rung when supply covers its admitted demand", () => {
    const ladder = degradationLadderFor("camera");
    const previous: AdmissionDecision = {
      kind: "degrade",
      plane: "reticulum",
      rung: ladder[2]!,
      rungIndex: 2,
      demandBps: 2_000_000,
      admittedDemandBps: 500_000,
      supplyBps: 600_000,
      reason: "degraded"
    };
    const held = adaptStreamAdmission({
      previous,
      supply: { plane: "reticulum", effectiveBps: 600_000, headroomBps: 600_000 },
      ladder,
      deficitStreak: 10
    });
    expect(held.rungIndex).toBe(2);
  });

  it("keeps admitted supply within host headroom for registry classes", () => {
    const headroom = 524_288;
    for (const classId of ["camera", "microphone", "location", "motion"]) {
      const decision = decideStreamAdmission(
        { classId, tierId: classId === "location" ? "coarse" : "derived" },
        [{ plane: "reticulum", effectiveBps: 2_000, headroomBps: headroom }]
      );
      expect(admittedWithinHeadroom(decision, headroom)).toBe(true);
      expect(demandBps({ classId, tierId: classId === "location" ? "coarse" : "derived" })).toBeGreaterThan(0);
    }
  });
});
