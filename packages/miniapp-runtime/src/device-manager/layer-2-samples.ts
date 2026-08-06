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
    const classId = sessionMeta.state.classId;
    const tierId = sessionMeta.state.tierId;
    if (classId === "location") {
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

    if (classId === "ambient-light") {
      const lux =
        typeof raw === "number" ? raw : (raw as { lux?: number })?.lux;
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

    if (classId === "camera") {
      if (tierId === "derived") {
        const derived = deriveCameraSample((raw ?? {}) as CameraDerivedInput);
        const sample = {
          kind: "camera" as const,
          tier: "derived" as const,
          at,
          ...derived,
        };
        this.pushSidecar(
          sessionMeta,
          DEVICE_STREAM_KIND.derivedEvent,
          encodeDerivedEvent(sample),
        );
        return sample;
      }
      if (tierId === "frames") {
        const frame = sanitizeCameraFrame(raw as RawCameraFrameInput);
        const sidecar = this.pushSidecar(
          sessionMeta,
          DEVICE_STREAM_KIND.cameraFrame,
          frame.bytes,
        );
        return {
          kind: "camera",
          tier: "frames",
          at,
          width: frame.width,
          height: frame.height,
          format: frame.format,
          byteLength: frame.bytes.length,
          ...(sidecar !== undefined ? { sidecar } : {}),
        };
      }
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        `Unsupported camera tier "${tierId}".`,
      );
    }

    if (classId === "microphone") {
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
        this.pushSidecar(
          sessionMeta,
          DEVICE_STREAM_KIND.derivedEvent,
          encodeDerivedEvent(sample),
        );
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
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        `Unsupported microphone tier "${tierId}".`,
      );
    }

    if (classId === "motion") {
      if (tierId === "derived") {
        const sample = raw as RawMotionSample;
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
        const derived = deriveMotionSample(sample);
        const derivedSample = {
          kind: "motion" as const,
          tier: "derived" as const,
          at,
          ...derived,
        };
        this.pushSidecar(
          sessionMeta,
          DEVICE_STREAM_KIND.derivedEvent,
          encodeDerivedEvent(derivedSample),
        );
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
      throw new DeviceError(
        "DEVICE_TIER_REQUIRED",
        `Unsupported motion tier "${tierId}".`,
      );
    }

    if (classId === "screen-capture") {
      if (tierId !== "frames") {
        throw new DeviceError(
          "DEVICE_TIER_REQUIRED",
          "screen-capture derived tier is not implemented yet.",
        );
      }
      const frame = sanitizeCameraFrame(raw as RawCameraFrameInput);
      const sidecar = this.pushSidecar(
        sessionMeta,
        DEVICE_STREAM_KIND.screenFrame,
        frame.bytes,
      );
      return {
        kind: "screen-capture",
        tier: "frames",
        at,
        width: frame.width,
        height: frame.height,
        format: frame.format,
        byteLength: frame.bytes.length,
        ...(sidecar !== undefined ? { sidecar } : {}),
      };
    }

    if (classId === "biometric") {
      const passed = Boolean((raw as { passed?: boolean })?.passed);
      return {
        kind: "biometric",
        tier: "assertion",
        at,
        passed,
      };
    }

    if (classId === "proximity") {
      const near = Boolean((raw as { near?: boolean })?.near);
      return { kind: "proximity", tier: "near-far", at, near };
    }
    if (classId === "barometer") {
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
    if (classId === "thermometer") {
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
    if (classId === "hygrometer") {
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
    if (classId === "thermal" || classId === "battery") {
      const bucket = String((raw as { bucket?: string })?.bucket ?? "nominal");
      return {
        kind: classId,
        tier: "coarse",
        at,
        bucket: bucket as
          "cold" | "nominal" | "warm" | "hot" | "critical" | "unknown",
      };
    }

    if (classId === "stt") {
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

    throw new DeviceError(
      "DEVICE_UNSUPPORTED",
      `Reading samples for "${classId}" is not implemented in this host API phase.`,
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
