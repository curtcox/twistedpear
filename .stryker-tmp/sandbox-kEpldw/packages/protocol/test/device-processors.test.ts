// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  deriveCameraSample,
  deriveMicrophoneSample,
  deriveMotionSample,
  quantizeLocationCoarse
} from "../src/index.js";

const tapePath = join(dirname(fileURLToPath(import.meta.url)), "../../../specs/spec-device/tapes/derived-phase2.json");
const tape = JSON.parse(readFileSync(tapePath, "utf8")) as {
  readonly samples: ReadonlyArray<{
    readonly class: string;
    readonly at: number;
    readonly raw: Record<string, unknown>;
  }>;
};

describe("device derived processors (tape replay)", () => {
  it("replays the Phase 2 derived tape without hardware", () => {
    const camera = tape.samples.find((sample) => sample.class === "camera");
    const mic = tape.samples.find((sample) => sample.class === "microphone");
    const calm = tape.samples.find((sample) => sample.class === "motion" && sample.at === 1200);
    const shake = tape.samples.find((sample) => sample.class === "motion" && sample.at === 1300);
    const location = tape.samples.find((sample) => sample.class === "location");

    expect(deriveCameraSample(camera!.raw as never)).toEqual({
      barcodes: [{ format: "qr", value: "TPI1:peer-invite" }],
      motionDetected: true,
      faceCount: 0,
      objectCount: 2
    });

    const micDerived = deriveMicrophoneSample(mic!.raw as never);
    expect(micDerived.level).toBeGreaterThan(0);
    expect(micDerived.voiceActive).toBe(true);

    expect(deriveMotionSample(calm!.raw as never).events).toEqual([]);
    expect(deriveMotionSample(shake!.raw as never).events).toContain("shake");

    const coarse = quantizeLocationCoarse(location!.raw as never);
    expect(coarse.accuracyM).toBe(1000);
    expect(coarse.latitude).not.toBe(37.7749);
  });
});
