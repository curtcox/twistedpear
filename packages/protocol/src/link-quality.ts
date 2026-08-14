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

export type LinkMeasurement =
  DeclaredLinkMeasurement | DeliveredLinkMeasurement;

export function initialLinkQuality(
  measurement: DeclaredLinkMeasurement,
): LinkQuality {
  return {
    goodputBps: finiteNonNegative(measurement.effectiveBps),
    rttMs: 0,
    jitterMs: 0,
    lossRatio: 0,
    mtu: positiveInteger(measurement.mtu),
    source: "declared",
    samples: 0,
    confidence: "low",
  };
}

function sampleLossRatio(measurement: DeliveredLinkMeasurement): number {
  const deliveredPackets = finiteNonNegative(measurement.deliveredPackets ?? 0);
  const lostPackets = finiteNonNegative(measurement.lostPackets ?? 0);
  const packetTotal = deliveredPackets + lostPackets;
  return packetTotal === 0 ? 0 : lostPackets / packetTotal;
}

function priorMeasured(previous: LinkQuality | null): LinkQuality | undefined {
  if (previous === null || previous.source === "declared") return undefined;
  return previous;
}

function blendDeliveredQuality(
  previous: LinkQuality | null,
  measurement: DeliveredLinkMeasurement,
): LinkQuality {
  const durationMs = Math.max(1, finiteNonNegative(measurement.durationMs));
  const sampleGoodput =
    (finiteNonNegative(measurement.deliveredBytes) * 8_000) / durationMs;
  const samples = (previous?.samples ?? 0) + 1;
  const alpha = measurement.kind === "probed" ? 0.5 : 0.25;
  const prior = priorMeasured(previous);
  return {
    goodputBps: ewma(prior?.goodputBps, sampleGoodput, alpha),
    rttMs: ewma(prior?.rttMs, finiteNonNegative(measurement.rttMs), alpha),
    jitterMs: ewma(
      prior?.jitterMs,
      finiteNonNegative(measurement.jitterMs ?? 0),
      alpha,
    ),
    lossRatio: clamp(
      ewma(prior?.lossRatio, sampleLossRatio(measurement), alpha),
      0,
      1,
    ),
    mtu: positiveInteger(measurement.mtu),
    source: measurement.kind,
    samples,
    confidence: confidenceFor(measurement.kind, samples),
  };
}

export function updateLinkQuality(
  previous: LinkQuality | null,
  measurement: LinkMeasurement,
): LinkQuality {
  if (measurement.kind === "declared") {
    return previous ?? initialLinkQuality(measurement);
  }
  return blendDeliveredQuality(previous, measurement);
}

/**
 * Live telemetry a host transport reports about one route. A transport that
 * does not say how it knows a number is treated as `declared`: an interface's
 * nameplate bitrate is not a measurement and must not be presented as one.
 */
export interface RouteQualityReport {
  readonly goodputBps: number;
  readonly rttMs: number;
  readonly mtu: number;
  readonly queueDepthBytes?: number;
  readonly jitterMs?: number;
  readonly lossRatio?: number;
  readonly source?: LinkQualitySource;
  readonly samples?: number;
  readonly confidence?: LinkQualityConfidence;
}

/** Folds host route telemetry into a `LinkQuality` without inflating its source. */
export function linkQualityFromRoute(
  declared: DeclaredLinkMeasurement,
  reported?: RouteQualityReport,
): LinkQuality {
  const base = initialLinkQuality(declared);
  if (reported === undefined) return base;
  const source = reported.source ?? "declared";
  const samples = Math.max(
    0,
    Math.floor(finiteNonNegative(reported.samples ?? 0)),
  );
  return {
    goodputBps: finiteNonNegative(reported.goodputBps),
    rttMs: finiteNonNegative(reported.rttMs),
    jitterMs: finiteNonNegative(reported.jitterMs ?? 0),
    lossRatio: clamp(finiteNonNegative(reported.lossRatio ?? 0), 0, 1),
    mtu: positiveInteger(reported.mtu),
    source,
    samples,
    confidence:
      reported.confidence ??
      (source === "declared" ? "low" : confidenceFor(source, samples)),
  };
}

/** Default bytes a window must carry before it is a credible goodput sample. */
export const LINK_OBSERVATION_MIN_SAMPLE_BYTES = 2_048;
/** Default age after which an under-filled window is discarded, not reported. */
export const LINK_OBSERVATION_MAX_WINDOW_MS = 30_000;

/**
 * Accumulated passive traffic on one route.
 *
 * Idleness is not evidence of a slow link, so a window that never reaches
 * `minSampleBytes` is discarded rather than reported: the estimate stays at
 * whatever was last known instead of decaying towards zero while nobody is
 * talking. A closed window measures its span from the first to the last
 * observed byte, which makes the reported goodput a floor on the link's
 * capacity rather than a claim about its ceiling.
 */
export interface LinkObservationWindow {
  readonly quality: LinkQuality;
  readonly windowStartMs: number;
  readonly windowBytes: number;
  readonly windowPackets: number;
  readonly lostPackets: number;
  readonly rttMs: number;
  readonly mtu: number;
}

export interface LinkDeliveryObservation {
  readonly bytes: number;
  readonly atMs: number;
  readonly rttMs?: number;
  readonly mtu?: number;
  readonly lostPackets?: number;
  readonly minSampleBytes?: number;
  readonly maxWindowMs?: number;
}

export function openLinkObservation(
  declared: DeclaredLinkMeasurement,
  atMs: number,
): LinkObservationWindow {
  return {
    quality: initialLinkQuality(declared),
    windowStartMs: finiteNonNegative(atMs),
    windowBytes: 0,
    windowPackets: 0,
    lostPackets: 0,
    rttMs: 0,
    mtu: positiveInteger(declared.mtu),
  };
}

function observationWindowFields(
  window: LinkObservationWindow,
  observation: LinkDeliveryObservation,
): {
  readonly atMs: number;
  readonly started: number;
  readonly windowBytes: number;
  readonly windowPackets: number;
  readonly lostPackets: number;
  readonly rttMs: number;
  readonly mtu: number;
} {
  const atMs = finiteNonNegative(observation.atMs);
  const rttMs =
    observation.rttMs === undefined
      ? window.rttMs
      : finiteNonNegative(observation.rttMs);
  const mtu =
    observation.mtu === undefined
      ? window.mtu
      : positiveInteger(observation.mtu);
  return {
    atMs,
    // A clock that jumped backwards restarts the window rather than producing a
    // negative span and an absurd goodput.
    started: atMs < window.windowStartMs ? atMs : window.windowStartMs,
    windowBytes: window.windowBytes + finiteNonNegative(observation.bytes),
    windowPackets: window.windowPackets + 1,
    lostPackets:
      window.lostPackets + finiteNonNegative(observation.lostPackets ?? 0),
    rttMs,
    mtu,
  };
}

export function observeLinkDelivery(
  window: LinkObservationWindow,
  observation: LinkDeliveryObservation,
): LinkObservationWindow {
  const minSampleBytes = positiveInteger(
    observation.minSampleBytes ?? LINK_OBSERVATION_MIN_SAMPLE_BYTES,
  );
  const maxWindowMs = positiveInteger(
    observation.maxWindowMs ?? LINK_OBSERVATION_MAX_WINDOW_MS,
  );
  const fields = observationWindowFields(window, observation);

  if (fields.windowBytes < minSampleBytes) {
    const stale = fields.atMs - fields.started >= maxWindowMs;
    return {
      quality: window.quality,
      windowStartMs: stale ? fields.atMs : fields.started,
      windowBytes: stale ? 0 : fields.windowBytes,
      windowPackets: stale ? 0 : fields.windowPackets,
      lostPackets: stale ? 0 : fields.lostPackets,
      rttMs: fields.rttMs,
      mtu: fields.mtu,
    };
  }

  return {
    quality: updateLinkQuality(window.quality, {
      kind: "observed",
      deliveredBytes: fields.windowBytes,
      durationMs: Math.max(1, fields.atMs - fields.started),
      rttMs: fields.rttMs,
      deliveredPackets: fields.windowPackets,
      lostPackets: fields.lostPackets,
      mtu: fields.mtu,
    }),
    windowStartMs: fields.atMs,
    windowBytes: 0,
    windowPackets: 0,
    lostPackets: 0,
    rttMs: fields.rttMs,
    mtu: fields.mtu,
  };
}

function confidenceFor(
  source: "observed" | "probed",
  samples: number,
): LinkQualityConfidence {
  if (source === "probed") return samples >= 3 ? "high" : "medium";
  if (samples >= 8) return "high";
  return samples >= 3 ? "medium" : "low";
}

function ewma(
  previous: number | undefined,
  sample: number,
  alpha: number,
): number {
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
