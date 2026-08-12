import {
  DEVICE_STREAM_KIND,
  deriveCameraSample,
  deriveMicrophoneSample,
  deriveMotionSample,
  quantizeAmbientLux,
  quantizeLocationCoarse,
  sanitizeCameraFrame,
  sanitizeMotionSamples,
  sanitizePcmSample,
  type CameraDerivedInput,
  type DeviceCommand,
  type MicrophoneDerivedInput,
  type PreciseLocationFix,
  type RawCameraFrameInput,
  type RawMotionInput,
  type RawMotionSample,
  type RawPcmInput,
} from "@twistedpear/protocol";
import { requestHostConfirmation } from "../confirm.js";
import {
  DeviceError,
  encodeDerivedEvent,
  floatSamplesToBytes,
} from "./shared.js";
import type { DeviceSample, LiveSession } from "./shared.js";
import { DeviceManagerLayer2Base } from "./layer-2-base.js";

export class DeviceManagerLayer2 extends DeviceManagerLayer2Base {
  protected materializeSample(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    return this.materializePrimarySample(sessionMeta, at, raw);
  }

  private materializePrimarySample(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    switch (sessionMeta.state.classId) {
      case "location":
        return this.materializeLocation(sessionMeta, at, raw);
      case "ambient-light":
        return this.materializeAmbientLight(at, raw);
      case "camera":
        return this.materializeCamera(sessionMeta, at, raw);
      case "microphone":
        return this.materializeMicrophone(sessionMeta, at, raw);
      case "motion":
        return this.materializeMotion(sessionMeta, at, raw);
      default:
        return this.materializeSecondarySample(sessionMeta, at, raw);
    }
  }

  private materializeSecondarySample(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    switch (sessionMeta.state.classId) {
      case "screen-capture":
        return this.materializeScreenCapture(sessionMeta, at, raw);
      case "biometric":
        return this.materializeBiometric(at, raw);
      case "proximity":
        return this.materializeProximity(at, raw);
      case "barometer":
        return this.materializeBarometer(at, raw);
      default:
        return this.materializeTertiarySample(sessionMeta, at, raw);
    }
  }

  private materializeTertiarySample(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    const classId = sessionMeta.state.classId;
    switch (classId) {
      case "thermometer":
        return this.materializeThermometer(at, raw);
      case "hygrometer":
        return this.materializeHygrometer(at, raw);
      case "thermal":
      case "battery":
        return this.materializeCoarseBucket(classId, at, raw);
      case "stt":
        return this.materializeTranscript(at, raw);
      default:
        throw new DeviceError(
          "DEVICE_UNSUPPORTED",
          `Reading samples for "${classId}" is not implemented in this host API phase.`,
        );
    }
  }

  private materializeLocation(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    const tierId = sessionMeta.state.tierId;
    const fix = raw as PreciseLocationFix;
    if (
      typeof fix?.latitude !== "number" ||
      typeof fix?.longitude !== "number"
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Location driver returned an invalid fix.",
      );
    }
    if (tierId === "coarse") {
      const coarse = quantizeLocationCoarse(fix);
      return {
        kind: "location",
        tier: "coarse",
        at,
        latitude: coarse.latitude,
        longitude: coarse.longitude,
        accuracyM: coarse.accuracyM,
      };
    }
    return {
      kind: "location",
      tier: "precise",
      at,
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyM: fix.accuracyM ?? 10,
      ...(fix.altitudeM !== undefined ? { altitudeM: fix.altitudeM } : {}),
      ...(fix.speedMps !== undefined ? { speedMps: fix.speedMps } : {}),
      ...(fix.headingDeg !== undefined ? { headingDeg: fix.headingDeg } : {}),
    };
  }

  private materializeAmbientLight(at: number, raw: unknown): DeviceSample {
    const lux = typeof raw === "number" ? raw : (raw as { lux?: number })?.lux;
    if (typeof lux !== "number") {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Ambient-light driver returned an invalid reading.",
      );
    }
    return {
      kind: "ambient-light",
      tier: "quantized",
      at,
      luxBucket: quantizeAmbientLux(lux),
    };
  }

  private materializeCamera(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    const tierId = sessionMeta.state.tierId;
    if (tierId === "derived") {
      const derived = deriveCameraSample((raw ?? {}) as CameraDerivedInput);
      const sample = {
        kind: "camera" as const,
        tier: "derived" as const,
        at,
        ...derived,
      };
      this.pushDerivedSidecar(sessionMeta, sample);
      return sample;
    }
    if (tierId === "frames") {
      return this.materializeFrame(
        sessionMeta,
        at,
        raw,
        "camera",
        DEVICE_STREAM_KIND.cameraFrame,
      );
    }
    throw this.unsupportedTier("camera", tierId);
  }

  private materializeMicrophone(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    const tierId = sessionMeta.state.tierId;
    if (tierId === "derived") {
      const derived = deriveMicrophoneSample(
        (raw ?? {}) as MicrophoneDerivedInput,
      );
      const sample = {
        kind: "microphone" as const,
        tier: "derived" as const,
        at,
        ...derived,
      };
      this.pushDerivedSidecar(sessionMeta, sample);
      return sample;
    }
    if (tierId === "pcm") {
      const pcm = sanitizePcmSample(raw as RawPcmInput);
      const payload = floatSamplesToBytes(pcm.samples);
      const sidecar = this.pushSidecar(
        sessionMeta,
        DEVICE_STREAM_KIND.pcm,
        payload,
      );
      return {
        kind: "microphone",
        tier: "pcm",
        at,
        sampleRate: pcm.sampleRate,
        channels: pcm.channels,
        sampleCount: pcm.samples.length,
        ...(sidecar !== undefined ? { sidecar } : {}),
      };
    }
    throw this.unsupportedTier("microphone", tierId);
  }

  private materializeMotion(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    const tierId = sessionMeta.state.tierId;
    if (tierId === "derived") {
      const sample = raw as RawMotionSample;
      this.assertValidMotionSample(sample);
      const derivedSample = {
        kind: "motion" as const,
        tier: "derived" as const,
        at,
        ...deriveMotionSample(sample),
      };
      this.pushDerivedSidecar(sessionMeta, derivedSample);
      return derivedSample;
    }
    if (tierId === "samples") {
      const sanitized = sanitizeMotionSamples(raw as RawMotionInput);
      const payload = new TextEncoder().encode(JSON.stringify(sanitized));
      const sidecar = this.pushSidecar(
        sessionMeta,
        DEVICE_STREAM_KIND.motionSamples,
        payload,
      );
      return {
        kind: "motion",
        tier: "samples",
        at,
        ...sanitized,
        ...(sidecar !== undefined ? { sidecar } : {}),
      };
    }
    throw this.unsupportedTier("motion", tierId);
  }

  private assertValidMotionSample(sample: RawMotionSample): void {
    if (
      !Array.isArray(sample?.accel) ||
      sample.accel.length !== 3 ||
      !Array.isArray(sample?.gyro) ||
      sample.gyro.length !== 3
    ) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Motion driver returned an invalid IMU sample.",
      );
    }
  }

  private pushDerivedSidecar(
    sessionMeta: LiveSession,
    sample: DeviceSample,
  ): void {
    this.pushSidecar(
      sessionMeta,
      DEVICE_STREAM_KIND.derivedEvent,
      encodeDerivedEvent(sample),
    );
  }

  private materializeScreenCapture(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
  ): DeviceSample {
    if (sessionMeta.state.tierId !== "frames") {
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        "screen-capture derived tier is not implemented yet.",
      );
    }
    return this.materializeFrame(
      sessionMeta,
      at,
      raw,
      "screen-capture",
      DEVICE_STREAM_KIND.screenFrame,
    );
  }

  private materializeFrame(
    sessionMeta: LiveSession,
    at: number,
    raw: unknown,
    kind: "camera" | "screen-capture",
    streamKind: (typeof DEVICE_STREAM_KIND)[keyof typeof DEVICE_STREAM_KIND],
  ): DeviceSample {
    const frame = sanitizeCameraFrame(raw as RawCameraFrameInput);
    const sidecar = this.pushSidecar(sessionMeta, streamKind, frame.bytes);
    return {
      kind,
      tier: "frames",
      at,
      width: frame.width,
      height: frame.height,
      format: frame.format,
      byteLength: frame.bytes.length,
      ...(sidecar !== undefined ? { sidecar } : {}),
    };
  }

  private materializeBiometric(at: number, raw: unknown): DeviceSample {
    const passed = Boolean((raw as { passed?: boolean })?.passed);
    return { kind: "biometric", tier: "assertion", at, passed };
  }

  private materializeProximity(at: number, raw: unknown): DeviceSample {
    const near = Boolean((raw as { near?: boolean })?.near);
    return { kind: "proximity", tier: "near-far", at, near };
  }

  private materializeBarometer(at: number, raw: unknown): DeviceSample {
    const hPa = Number((raw as { hPa?: number })?.hPa);
    if (!Number.isFinite(hPa)) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Barometer driver returned an invalid reading.",
      );
    }
    return {
      kind: "barometer",
      tier: "pressure",
      at,
      hPa: Math.round(hPa * 10) / 10,
    };
  }

  private materializeThermometer(at: number, raw: unknown): DeviceSample {
    const celsius = Number((raw as { celsius?: number })?.celsius);
    if (!Number.isFinite(celsius)) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Thermometer driver returned an invalid reading.",
      );
    }
    return {
      kind: "thermometer",
      tier: "celsius",
      at,
      celsius: Math.round(celsius * 10) / 10,
    };
  }

  private materializeHygrometer(at: number, raw: unknown): DeviceSample {
    const relativeHumidity = Number(
      (raw as { relativeHumidity?: number })?.relativeHumidity,
    );
    if (!Number.isFinite(relativeHumidity)) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        "Hygrometer driver returned an invalid reading.",
      );
    }
    return {
      kind: "hygrometer",
      tier: "humidity",
      at,
      relativeHumidity: Math.max(
        0,
        Math.min(100, Math.round(relativeHumidity)),
      ),
    };
  }

  private materializeCoarseBucket(
    kind: "thermal" | "battery",
    at: number,
    raw: unknown,
  ): DeviceSample {
    const bucket = String((raw as { bucket?: string })?.bucket ?? "nominal");
    return {
      kind,
      tier: "coarse",
      at,
      bucket: bucket as
        "cold" | "nominal" | "warm" | "hot" | "critical" | "unknown",
    };
  }

  private materializeTranscript(at: number, raw: unknown): DeviceSample {
    const text = String((raw as { text?: string })?.text ?? "");
    const isFinal = (raw as { isFinal?: boolean })?.isFinal !== false;
    const confidence = (raw as { confidence?: number })?.confidence;
    return {
      kind: "stt",
      tier: "transcript",
      at,
      text,
      isFinal,
      ...(typeof confidence === "number" && Number.isFinite(confidence)
        ? { confidence }
        : {}),
    };
  }

  private unsupportedTier(kind: string, tierId: string): DeviceError {
    return new DeviceError(
      "DEVICE_TIER_REQUIRED",
      `Unsupported ${kind} tier "${tierId}".`,
    );
  }

  protected assertCommandMatchesSession(
    classId: string,
    command: DeviceCommand,
  ): void {
    if (command.kind !== classId) {
      throw new DeviceError(
        "DEVICE_BAD_REQUEST",
        `Command kind "${command.kind}" does not match session class "${classId}".`,
      );
    }
  }

  protected async confirmNfcWrite(options: {
    readonly appId: string;
    readonly publisherPublicKey: string;
    readonly purpose: string;
    readonly ndef: string;
  }): Promise<void> {
    const effects = this.options.confirmationEffects;
    if (effects === undefined) {
      if (this.options.confirmationChannel === undefined) return;
      throw new DeviceError(
        "DEVICE_DENIED",
        "Confirmation effects are required for NFC writes.",
      );
    }
    await requestHostConfirmation(
      this.options.confirmationChannel,
      {
        kind: "device-session",
        appId: options.appId,
        publisherPublicKey: options.publisherPublicKey,
        summary: {
          device: "nfc",
          tier: "ndef",
          purpose: options.purpose,
          destination: "local",
          payload: options.ndef.slice(0, 256),
        },
      },
      effects,
    );
  }
}
