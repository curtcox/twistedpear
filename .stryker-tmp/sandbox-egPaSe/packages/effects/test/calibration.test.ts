// @ts-nocheck
import {
  calibrateTransportTrace,
  parseCalibrationPolicy,
  parseCalibrationTrace,
  type CalibrationObservation
} from "../src/adapters/sim/index.js";
import { describe, expect, it } from "vitest";

const policy = parseCalibrationPolicy({
  schemaVersion: 1,
  transports: {
    ble: {
      minimumObservations: 100,
      minimumDistinctPayloadSizes: 4,
      bandwidthRelative: 0.1,
      latencyMinRelative: 0.1,
      latencyMaxRelative: 0.1,
      lossRateAbsolute: 0.01
    },
    lora: {
      minimumObservations: 100,
      minimumDistinctPayloadSizes: 4,
      bandwidthRelative: 0.1,
      latencyMinRelative: 0.1,
      latencyMaxRelative: 0.1,
      lossRateAbsolute: 0.01
    }
  }
});

function traceInput(overrides: Record<string, unknown> = {}) {
  const observations: CalibrationObservation[] = [];
  const sizes = [20, 100, 250, 500];
  const latencies = [7.5, 15, 25, 40];
  let sequence = 0;
  for (let repetition = 0; repetition < 25; repetition += 1) {
    for (const payloadBytes of sizes) {
      for (const latency of latencies) {
        const sentAtMs = sequence * 100;
        observations.push({
          sequence,
          payloadBytes,
          sentAtMs,
          receivedAtMs: sentAtMs + latency + payloadBytes * 8 * 1_000 / 125_000
        });
        sequence += 1;
      }
    }
  }
  return {
    schemaVersion: 1,
    transport: "ble",
    provenance: {
      kind: "guarded-hardware",
      recordedAt: "2026-07-16T12:00:00.000Z",
      source: "unit-test fixture; never calibration evidence",
      hardware: ["test central", "test peripheral"],
      software: ["test recorder"],
      environment: "deterministic unit test"
    },
    radio: { mtu: 247, phy: "1M" },
    observations,
    ...overrides
  };
}

describe("physical transport calibration", () => {
  it("fits a deterministic packet trace and compares it to the reviewed preset", () => {
    const trace = parseCalibrationTrace(traceInput());
    const result = calibrateTransportTrace(trace, policy);

    expect(result.observationCount).toBe(400);
    expect(result.distinctPayloadSizes).toBe(4);
    expect(result.parameters.bandwidthBps).toBeCloseTo(125_000, 6);
    expect(result.parameters.latency.minMs).toBeCloseTo(7.5, 6);
    expect(result.parameters.latency.maxMs).toBeCloseTo(40, 6);
    expect(result.parameters.lossRate).toBe(0);
    expect(result.comparison.withinTolerance).toBe(true);
  });

  it("rejects traces without an admissible external evidence provenance", () => {
    const input = traceInput();
    expect(() => parseCalibrationTrace({
      ...input,
      provenance: { ...input.provenance, kind: "simulation" }
    })).toThrow(/guarded-hardware or independent-deployment/);
  });

  it("rejects evidence below the pre-registered sample floor", () => {
    const input = traceInput();
    const trace = parseCalibrationTrace({ ...input, observations: input.observations.slice(0, 20) });
    expect(() => calibrateTransportTrace(trace, policy)).toThrow(/at least 100 observations/);
  });
});
