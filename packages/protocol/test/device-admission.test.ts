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
      [{ plane: "reticulum", effectiveBps: 500, headroomBps: 524_288 }]
    );
    expect(decision.kind).toBe("degrade");
    expect(decision.rungIndex).toBeGreaterThan(0);
    expect(decision.rung).toBe(degradationLadderFor("camera")[decision.rungIndex]);
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

  it("prefers webrtc over reticulum when both are present", () => {
    const selected = selectPlane([
      { plane: "reticulum", effectiveBps: 10_000, headroomBps: 524_288 },
      { plane: "webrtc", effectiveBps: 100_000, headroomBps: 524_288 }
    ]);
    expect(selected?.plane).toBe("webrtc");
  });

  it("downshifts on sustained deficit and upshifts only after hysteresis", () => {
    const ladder = degradationLadderFor("camera");
    const previous: AdmissionDecision = {
      kind: "accept",
      plane: "webrtc",
      rung: ladder[0]!,
      rungIndex: 0,
      demandBps: 100_000,
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
