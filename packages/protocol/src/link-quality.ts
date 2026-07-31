/**
 * Sans-IO link-quality estimator. Callers supply observations and timestamps;
 * this module performs no I/O and reads no clock.
 */

export type LinkQualitySource = "declared" | "observed" | "probed";
export type LinkQualityConfidence = "low" | "medium" | "high";

export interface LinkQuality {
  readonly goodputBps: number;
  readonly rttMs: number;
  readonly jitterMs: number;
  readonly lossRatio: number;
  readonly mtu: number;
  readonly source: LinkQualitySource;
  readonly samples: number;
  readonly confidence: LinkQualityConfidence;
}

export interface DeclaredLinkMeasurement {
  readonly kind: "declared";
  readonly effectiveBps: number;
  readonly mtu: number;
}

export interface DeliveredLinkMeasurement {
  readonly kind: "observed" | "probed";
  readonly deliveredBytes: number;
  readonly durationMs: number;
  readonly rttMs: number;
  readonly jitterMs?: number;
  readonly lostPackets?: number;
  readonly deliveredPackets?: number;
  readonly mtu: number;
}

export type LinkMeasurement = DeclaredLinkMeasurement | DeliveredLinkMeasurement;

export function initialLinkQuality(measurement: DeclaredLinkMeasurement): LinkQuality {
  return {
    goodputBps: finiteNonNegative(measurement.effectiveBps),
    rttMs: 0,
    jitterMs: 0,
    lossRatio: 0,
    mtu: positiveInteger(measurement.mtu),
    source: "declared",
    samples: 0,
    confidence: "low"
  };
}

export function updateLinkQuality(
  previous: LinkQuality | null,
  measurement: LinkMeasurement
): LinkQuality {
  if (measurement.kind === "declared") {
    return previous ?? initialLinkQuality(measurement);
  }

  const durationMs = Math.max(1, finiteNonNegative(measurement.durationMs));
  const sampleGoodput = (finiteNonNegative(measurement.deliveredBytes) * 8_000) / durationMs;
  const deliveredPackets = finiteNonNegative(measurement.deliveredPackets ?? 0);
  const lostPackets = finiteNonNegative(measurement.lostPackets ?? 0);
  const packetTotal = deliveredPackets + lostPackets;
  const sampleLoss = packetTotal === 0 ? 0 : lostPackets / packetTotal;
  const samples = (previous?.samples ?? 0) + 1;
  const alpha = measurement.kind === "probed" ? 0.5 : 0.25;

  return {
    goodputBps: ewma(previous?.goodputBps, sampleGoodput, alpha),
    rttMs: ewma(previous?.rttMs, finiteNonNegative(measurement.rttMs), alpha),
    jitterMs: ewma(previous?.jitterMs, finiteNonNegative(measurement.jitterMs ?? 0), alpha),
    lossRatio: clamp(ewma(previous?.lossRatio, sampleLoss, alpha), 0, 1),
    mtu: positiveInteger(measurement.mtu),
    source: measurement.kind,
    samples,
    confidence: confidenceFor(measurement.kind, samples)
  };
}

function confidenceFor(source: "observed" | "probed", samples: number): LinkQualityConfidence {
  if (source === "probed") return samples >= 3 ? "high" : "medium";
  if (samples >= 8) return "high";
  return samples >= 3 ? "medium" : "low";
}

function ewma(previous: number | undefined, sample: number, alpha: number): number {
  if (previous === undefined || previous === 0) return sample;
  return previous + alpha * (sample - previous);
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function positiveInteger(value: number): number {
  return Math.max(1, Math.floor(finiteNonNegative(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
