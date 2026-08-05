/**
 * Host-side derived-tier processors. Pure over recorded sample tapes —
 * adapters supply raw readings; these never touch hardware.
 */

export interface RawMotionSample {
  readonly accel: readonly [number, number, number];
  readonly gyro: readonly [number, number, number];
  readonly mag?: readonly [number, number, number];
}

export interface MotionDerivedSample {
  readonly orientation: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
  };
  readonly events: ReadonlyArray<"step" | "shake" | "tilt">;
}

export interface CameraDerivedInput {
  readonly barcodes?: ReadonlyArray<{
    readonly format: string;
    readonly value: string;
  }>;
  readonly motionDetected?: boolean;
  readonly faceCount?: number;
  readonly objectCount?: number;
}

export interface CameraDerivedSample {
  readonly barcodes: ReadonlyArray<{
    readonly format: string;
    readonly value: string;
  }>;
  readonly motionDetected: boolean;
  readonly faceCount: number;
  readonly objectCount: number;
}

export interface MicrophoneDerivedInput {
  /** Interleaved PCM samples in [-1, 1], or a precomputed RMS level in [0, 1]. */
  readonly pcm?: ReadonlyArray<number>;
  readonly level?: number;
  readonly tones?: ReadonlyArray<string>;
}

export interface MicrophoneDerivedSample {
  readonly level: number;
  readonly voiceActive: boolean;
  readonly tones: ReadonlyArray<string>;
}

const SHAKE_ACCEL_THRESHOLD = 2.5;
const TILT_ACCEL_THRESHOLD = 0.7;
const STEP_ACCEL_THRESHOLD = 1.4;
const VAD_LEVEL_THRESHOLD = 0.08;

/** Fuse a raw IMU reading into orientation + discrete events (≤ derived rate). */
export function deriveMotionSample(raw: RawMotionSample): MotionDerivedSample {
  const [ax, ay, az] = raw.accel;
  const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
  const events: Array<"step" | "shake" | "tilt"> = [];
  if (magnitude >= SHAKE_ACCEL_THRESHOLD) events.push("shake");
  else if (magnitude >= STEP_ACCEL_THRESHOLD) events.push("step");
  if (
    Math.abs(ax) >= TILT_ACCEL_THRESHOLD ||
    Math.abs(ay) >= TILT_ACCEL_THRESHOLD
  ) {
    events.push("tilt");
  }

  // Gravity-aligned tilt quaternion (no gyro integration — derived tier only).
  const norm = magnitude === 0 ? 1 : magnitude;
  const x = ax / norm;
  const y = ay / norm;
  const z = az / norm;
  const w = Math.sqrt(Math.max(0, 1 - Math.min(1, x * x + y * y + z * z)));

  return {
    orientation: { x, y, z, w },
    events,
  };
}

/** Strip camera raw input down to derived-tier fields (never frames). */
export function deriveCameraSample(
  input: CameraDerivedInput,
): CameraDerivedSample {
  const barcodes = (input.barcodes ?? [])
    .filter(
      (entry) =>
        typeof entry.format === "string" && typeof entry.value === "string",
    )
    .map((entry) => ({
      format: entry.format,
      value: entry.value.slice(0, 512),
    }));
  return {
    barcodes,
    motionDetected: Boolean(input.motionDetected),
    faceCount: clampCount(input.faceCount),
    objectCount: clampCount(input.objectCount),
  };
}

/** Compute level / VAD / tones from PCM or a precomputed level. */
export function deriveMicrophoneSample(
  input: MicrophoneDerivedInput,
): MicrophoneDerivedSample {
  const level =
    typeof input.level === "number" && Number.isFinite(input.level)
      ? clamp01(input.level)
      : rmsLevel(input.pcm ?? []);
  const tones = (input.tones ?? [])
    .filter((tone) => typeof tone === "string")
    .slice(0, 16);
  return {
    level,
    voiceActive: level >= VAD_LEVEL_THRESHOLD,
    tones,
  };
}

function rmsLevel(pcm: ReadonlyArray<number>): number {
  if (pcm.length === 0) return 0;
  let sum = 0;
  for (const sample of pcm) {
    const value = Number.isFinite(sample) ? sample : 0;
    sum += value * value;
  }
  return clamp01(Math.sqrt(sum / pcm.length));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return 0;
  return Math.min(100, Math.floor(value));
}
