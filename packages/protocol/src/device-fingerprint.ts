/**
 * Fingerprinting mitigations for raw device tiers.
 * Strip calibration / device-identity metadata before samples leave the host.
 */

export interface RawCameraFrameInput {
  readonly width: number;
  readonly height: number;
  readonly format: "rgba8" | "yuv420" | "jpeg";
  readonly bytes: Uint8Array | ReadonlyArray<number>;
  /** Stripped — never forwarded to apps. */
  readonly deviceModel?: string;
  readonly sensorCalibration?: unknown;
  readonly lensIntrinsics?: unknown;
}

export interface RawCameraFrame {
  readonly width: number;
  readonly height: number;
  readonly format: "rgba8" | "yuv420" | "jpeg";
  readonly bytes: Uint8Array;
}

export interface RawPcmInput {
  readonly sampleRate: number;
  readonly channels: 1 | 2;
  readonly samples: Float32Array | ReadonlyArray<number>;
  readonly deviceId?: string;
  readonly hardwareLatencyMs?: number;
}

export interface RawPcmSample {
  readonly sampleRate: number;
  readonly channels: 1 | 2;
  readonly samples: ReadonlyArray<number>;
}

export interface RawMotionInput {
  readonly accel: readonly [number, number, number];
  readonly gyro: readonly [number, number, number];
  readonly mag?: readonly [number, number, number];
  readonly calibrationBias?: unknown;
  readonly deviceSerial?: string;
}

export interface RawMotionSampleOut {
  readonly accel: readonly [number, number, number];
  readonly gyro: readonly [number, number, number];
  readonly mag?: readonly [number, number, number];
}

export function sanitizeCameraFrame(
  input: RawCameraFrameInput,
): RawCameraFrame {
  if (!Number.isFinite(input.width) || input.width < 1 || input.width > 4096) {
    throw new Error("invalid camera frame width");
  }
  if (
    !Number.isFinite(input.height) ||
    input.height < 1 ||
    input.height > 4096
  ) {
    throw new Error("invalid camera frame height");
  }
  if (!["rgba8", "yuv420", "jpeg"].includes(input.format)) {
    throw new Error("invalid camera frame format");
  }
  return {
    width: Math.floor(input.width),
    height: Math.floor(input.height),
    format: input.format,
    bytes: Uint8Array.from(input.bytes, (value) =>
      Number.isFinite(value)
        ? Math.max(0, Math.min(255, Math.floor(value)))
        : 0,
    ),
  };
}

export function sanitizePcmSample(input: RawPcmInput): RawPcmSample {
  const allowedRates = new Set([8_000, 16_000, 22_050, 24_000, 44_100, 48_000]);
  if (!allowedRates.has(input.sampleRate)) {
    throw new Error("unsupported pcm sample rate");
  }
  if (input.channels !== 1 && input.channels !== 2) {
    throw new Error("pcm channels must be 1 or 2");
  }
  const samples = Array.from(input.samples, (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-1, Math.min(1, value));
  });
  return {
    sampleRate: input.sampleRate,
    channels: input.channels,
    samples,
  };
}

export function sanitizeMotionSamples(
  input: RawMotionInput,
): RawMotionSampleOut {
  const quantize = (value: number) => Math.round(value * 1_000) / 1_000;
  return {
    accel: [
      quantize(input.accel[0]),
      quantize(input.accel[1]),
      quantize(input.accel[2]),
    ],
    gyro: [
      quantize(input.gyro[0]),
      quantize(input.gyro[1]),
      quantize(input.gyro[2]),
    ],
    ...(input.mag !== undefined
      ? {
          mag: [
            quantize(input.mag[0]),
            quantize(input.mag[1]),
            quantize(input.mag[2]),
          ] as const,
        }
      : {}),
  };
}
