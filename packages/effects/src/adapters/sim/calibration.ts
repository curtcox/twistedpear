import {
  transportClass,
  type BurstLossModel,
  type TransportClass,
} from "./transport-classes.js";

export type CalibratedTransportName = "ble" | "lora";
export type TraceEvidenceKind = "guarded-hardware" | "independent-deployment";

export interface CalibrationTraceProvenance {
  readonly kind: TraceEvidenceKind;
  readonly recordedAt: string;
  readonly source: string;
  readonly hardware: readonly string[];
  readonly software: readonly string[];
  readonly environment: string;
}

export interface CalibrationObservation {
  readonly sequence: number;
  readonly payloadBytes: number;
  readonly sentAtMs: number;
  readonly receivedAtMs: number | null;
}

export interface CalibrationTrace {
  readonly schemaVersion: 1;
  readonly transport: CalibratedTransportName;
  readonly provenance: CalibrationTraceProvenance;
  readonly radio: Readonly<Record<string, string | number | boolean>>;
  readonly observations: readonly CalibrationObservation[];
}

export interface CalibrationTolerance {
  readonly minimumObservations: number;
  readonly minimumDistinctPayloadSizes: number;
  readonly bandwidthRelative: number;
  readonly latencyMinRelative: number;
  readonly latencyMaxRelative: number;
  readonly lossRateAbsolute: number;
}

export interface CalibrationPolicy {
  readonly schemaVersion: 1;
  readonly transports: Readonly<
    Record<CalibratedTransportName, CalibrationTolerance>
  >;
}

export interface CalibratedParameters {
  readonly bandwidthBps: number;
  readonly latency: {
    readonly kind: "uniform";
    readonly minMs: number;
    readonly maxMs: number;
  };
  readonly lossRate: number;
  readonly burstLoss: BurstLossModel;
}

export interface CalibrationComparison {
  readonly withinTolerance: boolean;
  readonly errors: {
    readonly bandwidthRelative: number;
    readonly latencyMinRelative: number;
    readonly latencyMaxRelative: number;
    readonly lossRateAbsolute: number;
  };
}

export interface CalibrationResult {
  readonly transport: CalibratedTransportName;
  readonly observationCount: number;
  readonly deliveredCount: number;
  readonly distinctPayloadSizes: number;
  readonly parameters: CalibratedParameters;
  readonly preset: TransportClass;
  readonly comparison: CalibrationComparison;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function finite(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${label} must be a finite number >= ${minimum}`);
  }
  return value;
}

function strings(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty string array`);
  }
  return value.map((entry, index) => string(entry, `${label}[${index}]`));
}

function parseRadio(
  value: unknown,
): Readonly<Record<string, string | number | boolean>> {
  const input = record(value, "radio");
  const result: Record<string, string | number | boolean> = {};
  for (const [key, entry] of Object.entries(input)) {
    if (
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean"
    ) {
      throw new Error(`radio.${key} must be a string, number, or boolean`);
    }
    if (typeof entry === "number" && !Number.isFinite(entry)) {
      throw new Error(`radio.${key} must be finite`);
    }
    result[key] = entry;
  }
  if (Object.keys(result).length === 0)
    throw new Error("radio must identify the measured configuration");
  return result;
}

export function parseCalibrationTrace(value: unknown): CalibrationTrace {
  const input = record(value, "trace");
  if (input.schemaVersion !== 1)
    throw new Error("trace.schemaVersion must be 1");
  if (input.transport !== "ble" && input.transport !== "lora") {
    throw new Error("trace.transport must be ble or lora");
  }
  const provenance = record(input.provenance, "provenance");
  if (
    provenance.kind !== "guarded-hardware" &&
    provenance.kind !== "independent-deployment"
  ) {
    throw new Error(
      "provenance.kind must be guarded-hardware or independent-deployment",
    );
  }
  const recordedAt = string(provenance.recordedAt, "provenance.recordedAt");
  if (!Number.isFinite(Date.parse(recordedAt))) {
    throw new Error("provenance.recordedAt must be an ISO-8601 timestamp");
  }
  if (!Array.isArray(input.observations) || input.observations.length === 0) {
    throw new Error("trace.observations must be a non-empty array");
  }
  const observations = input.observations.map(
    (value, index): CalibrationObservation => {
      const observation = record(value, `observations[${index}]`);
      const sequence = finite(
        observation.sequence,
        `observations[${index}].sequence`,
      );
      if (!Number.isInteger(sequence))
        throw new Error(`observations[${index}].sequence must be an integer`);
      const payloadBytes = finite(
        observation.payloadBytes,
        `observations[${index}].payloadBytes`,
        1,
      );
      if (!Number.isInteger(payloadBytes))
        throw new Error(
          `observations[${index}].payloadBytes must be an integer`,
        );
      const sentAtMs = finite(
        observation.sentAtMs,
        `observations[${index}].sentAtMs`,
      );
      const receivedAtMs =
        observation.receivedAtMs === null
          ? null
          : finite(
              observation.receivedAtMs,
              `observations[${index}].receivedAtMs`,
              sentAtMs,
            );
      return { sequence, payloadBytes, sentAtMs, receivedAtMs };
    },
  );
  const sequences = new Set(
    observations.map((observation) => observation.sequence),
  );
  if (sequences.size !== observations.length)
    throw new Error("observation sequence numbers must be unique");
  return {
    schemaVersion: 1,
    transport: input.transport,
    provenance: {
      kind: provenance.kind,
      recordedAt,
      source: string(provenance.source, "provenance.source"),
      hardware: strings(provenance.hardware, "provenance.hardware"),
      software: strings(provenance.software, "provenance.software"),
      environment: string(provenance.environment, "provenance.environment"),
    },
    radio: parseRadio(input.radio),
    observations: [...observations].sort((a, b) => a.sequence - b.sequence),
  };
}

export function parseCalibrationPolicy(value: unknown): CalibrationPolicy {
  const input = record(value, "policy");
  if (input.schemaVersion !== 1)
    throw new Error("policy.schemaVersion must be 1");
  const transports = record(input.transports, "policy.transports");
  const parseTolerance = (
    name: CalibratedTransportName,
  ): CalibrationTolerance => {
    const tolerance = record(transports[name], `policy.transports.${name}`);
    const minimumObservations = finite(
      tolerance.minimumObservations,
      `${name}.minimumObservations`,
      2,
    );
    const minimumDistinctPayloadSizes = finite(
      tolerance.minimumDistinctPayloadSizes,
      `${name}.minimumDistinctPayloadSizes`,
      2,
    );
    if (
      !Number.isInteger(minimumObservations) ||
      !Number.isInteger(minimumDistinctPayloadSizes)
    ) {
      throw new Error(`${name} minimum counts must be integers`);
    }
    return {
      minimumObservations,
      minimumDistinctPayloadSizes,
      bandwidthRelative: finite(
        tolerance.bandwidthRelative,
        `${name}.bandwidthRelative`,
      ),
      latencyMinRelative: finite(
        tolerance.latencyMinRelative,
        `${name}.latencyMinRelative`,
      ),
      latencyMaxRelative: finite(
        tolerance.latencyMaxRelative,
        `${name}.latencyMaxRelative`,
      ),
      lossRateAbsolute: finite(
        tolerance.lossRateAbsolute,
        `${name}.lossRateAbsolute`,
      ),
    };
  };
  return {
    schemaVersion: 1,
    transports: { ble: parseTolerance("ble"), lora: parseTolerance("lora") },
  };
}

function quantile(sorted: readonly number[], probability: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(probability * sorted.length) - 1),
  );
  return sorted[index]!;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function ratioError(actual: number, expected: number): number {
  return (
    Math.abs(actual - expected) / Math.max(Math.abs(expected), Number.EPSILON)
  );
}

function probability(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function fitSerialization(
  transport: CalibratedTransportName,
  delivered: ReadonlyArray<
    CalibrationObservation & { readonly receivedAtMs: number }
  >,
): { readonly bandwidthBps: number; readonly residuals: readonly number[] } {
  const points = delivered.map((item) => ({
    x: item.payloadBytes * 8,
    y: item.receivedAtMs - item.sentAtMs,
  }));
  const durationBySize = new Map<number, number[]>();
  for (const point of points) {
    const durations = durationBySize.get(point.x) ?? [];
    durations.push(point.y);
    durationBySize.set(point.x, durations);
  }
  const medians = [...durationBySize.entries()]
    .map(([x, durations]) => ({ x, y: median(durations) }))
    .sort((a, b) => a.x - b.x);
  const slopes: number[] = [];
  for (let left = 0; left < medians.length; left += 1) {
    for (let right = left + 1; right < medians.length; right += 1) {
      const a = medians[left]!;
      const b = medians[right]!;
      slopes.push((b.y - a.y) / (b.x - a.x));
    }
  }
  const slopeMsPerBit = median(slopes);
  if (slopeMsPerBit <= 0)
    throw new Error(
      `${transport} trace cannot identify a positive serialization rate`,
    );
  return {
    bandwidthBps: 1_000 / slopeMsPerBit,
    residuals: points
      .map((point) => Math.max(0, point.y - point.x * slopeMsPerBit))
      .sort((a, b) => a - b),
  };
}

function burstTransitions(observations: readonly CalibrationObservation[]): {
  readonly deliveredPrevious: number;
  readonly lostPrevious: number;
  readonly deliveredToLost: number;
  readonly lostToDelivered: number;
} {
  let deliveredPrevious = 0;
  let lostPrevious = 0;
  let deliveredToLost = 0;
  let lostToDelivered = 0;
  for (let index = 1; index < observations.length; index += 1) {
    const previousDelivered = observations[index - 1]!.receivedAtMs !== null;
    const currentDelivered = observations[index]!.receivedAtMs !== null;
    if (previousDelivered) {
      deliveredPrevious += 1;
      if (!currentDelivered) deliveredToLost += 1;
    } else {
      lostPrevious += 1;
      if (currentDelivered) lostToDelivered += 1;
    }
  }
  return {
    deliveredPrevious,
    lostPrevious,
    deliveredToLost,
    lostToDelivered,
  };
}

export function calibrateTransportTrace(
  trace: CalibrationTrace,
  policy: CalibrationPolicy,
): CalibrationResult {
  const tolerance = policy.transports[trace.transport];
  if (trace.observations.length < tolerance.minimumObservations) {
    throw new Error(
      `${trace.transport} trace requires at least ${tolerance.minimumObservations} observations`,
    );
  }
  const distinctPayloadSizes = new Set(
    trace.observations.map((item) => item.payloadBytes),
  ).size;
  if (distinctPayloadSizes < tolerance.minimumDistinctPayloadSizes) {
    throw new Error(
      `${trace.transport} trace requires at least ${tolerance.minimumDistinctPayloadSizes} payload sizes`,
    );
  }
  const delivered = trace.observations.filter(
    (
      item,
    ): item is CalibrationObservation & { readonly receivedAtMs: number } =>
      item.receivedAtMs !== null,
  );
  if (delivered.length < 2)
    throw new Error(
      `${trace.transport} trace requires at least two delivered observations`,
    );

  const fit = fitSerialization(trace.transport, delivered);
  const burst = burstTransitions(trace.observations);
  const lossRate =
    (trace.observations.length - delivered.length) / trace.observations.length;
  const parameters: CalibratedParameters = {
    bandwidthBps: fit.bandwidthBps,
    latency: {
      kind: "uniform",
      minMs: quantile(fit.residuals, 0.05),
      maxMs: quantile(fit.residuals, 0.95),
    },
    lossRate,
    burstLoss: {
      goodToBad: probability(burst.deliveredToLost, burst.deliveredPrevious),
      badToGood: probability(burst.lostToDelivered, burst.lostPrevious),
      goodLossRate: 0,
      badLossRate: 1,
    },
  };
  const preset = transportClass(trace.transport);
  if (preset.latency.kind !== "uniform")
    throw new Error(`${trace.transport} preset latency must be uniform`);
  const errors = {
    bandwidthRelative: ratioError(parameters.bandwidthBps, preset.bandwidthBps),
    latencyMinRelative: ratioError(
      parameters.latency.minMs,
      preset.latency.minMs,
    ),
    latencyMaxRelative: ratioError(
      parameters.latency.maxMs,
      preset.latency.maxMs,
    ),
    lossRateAbsolute: Math.abs(parameters.lossRate - preset.lossRate),
  };
  return {
    transport: trace.transport,
    observationCount: trace.observations.length,
    deliveredCount: delivered.length,
    distinctPayloadSizes,
    parameters,
    preset,
    comparison: {
      withinTolerance:
        errors.bandwidthRelative <= tolerance.bandwidthRelative &&
        errors.latencyMinRelative <= tolerance.latencyMinRelative &&
        errors.latencyMaxRelative <= tolerance.latencyMaxRelative &&
        errors.lossRateAbsolute <= tolerance.lossRateAbsolute,
      errors,
    },
  };
}
