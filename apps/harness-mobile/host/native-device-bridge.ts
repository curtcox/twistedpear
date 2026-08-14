/**
 * Native (Expo) device bridge for DeviceManager host-bridged drivers.
 * Uses navigator.geolocation, expo-camera permissions, and RN Vibration.
 */

import { Camera } from "expo-camera";
import { Vibration } from "react-native";
import {
  nativePeerAudioSupported,
  recordNativePeerPcm,
  requestNativePeerAudioPermission,
} from "@twistedpear/peer-audio";

export type NativeDeviceAvailability =
  | "available"
  | "permission-required"
  | "unsupported"
  | "busy"
  | "policy-disabled"
  | "offline";

export async function nativeDeviceAvailability(
  classId: string,
): Promise<NativeDeviceAvailability> {
  if (classId === "location") {
    const geo = (
      globalThis as {
        navigator?: { geolocation?: { getCurrentPosition: unknown } };
      }
    ).navigator?.geolocation;
    return typeof geo?.getCurrentPosition === "function"
      ? "permission-required"
      : "unsupported";
  }
  if (classId === "camera") {
    try {
      const current = await Camera.getCameraPermissionsAsync();
      if (current.granted) return "available";
      if (current.canAskAgain === false) return "offline";
      return "permission-required";
    } catch {
      return "unsupported";
    }
  }
  if (classId === "microphone") {
    return nativePeerAudioSupported() ? "permission-required" : "unsupported";
  }
  if (classId === "haptics") {
    return typeof Vibration?.vibrate === "function"
      ? "available"
      : "unsupported";
  }
  return "unsupported";
}

export async function nativeDeviceSense(
  classId: string,
  options: Readonly<Record<string, unknown>> = {},
): Promise<unknown> {
  if (classId === "location") {
    return senseNativeLocation(options.enableHighAccuracy === true);
  }
  if (classId === "camera") {
    return senseNativeCamera();
  }
  if (classId === "microphone") {
    if (!(await requestNativePeerAudioPermission()))
      throw new Error("Microphone permission was denied.");
    const sampleRate = options.tier === "pcm" ? 48_000 : 8_000;
    const pcm = await recordNativePeerPcm(
      120,
      sampleRate,
      options.voiceDuplex === true,
    );
    const samples = pcm16ToFloat(pcm);
    return options.tier === "pcm"
      ? { sampleRate, channels: 1, samples }
      : { pcm: samples, tones: [] };
  }
  throw new Error(`No native sense effect for device class "${classId}".`);
}

function pcm16ToFloat(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Array<number>(Math.floor(bytes.byteLength / 2));
  for (let index = 0; index < samples.length; index += 1)
    samples[index] = view.getInt16(index * 2, true) / 32_768;
  return samples;
}

export function nativeDeviceActuate(
  classId: string,
  command: Readonly<Record<string, unknown>>,
): Promise<void> {
  if (classId === "haptics" && command.kind === "haptics") {
    actuateNativeHaptics(
      Array.isArray(command.patternMs) ? (command.patternMs as number[]) : [40],
    );
    return Promise.resolve();
  }
  return Promise.reject(
    new Error(`No native actuate effect for device class "${classId}".`),
  );
}

function actuateNativeHaptics(patternMs: ReadonlyArray<number>): void {
  if (typeof Vibration?.vibrate !== "function") {
    throw new Error("Vibration is unavailable on this host.");
  }
  const pattern = patternMs.length > 0 ? [...patternMs] : [40];
  // iOS ignores multi-element patterns; Android accepts the full duty pattern.
  if (pattern.length === 1) {
    Vibration.vibrate(pattern[0]!);
  } else {
    Vibration.vibrate(pattern);
  }
}

function senseNativeLocation(enableHighAccuracy: boolean): Promise<{
  latitude: number;
  longitude: number;
  accuracyM: number;
  altitudeM?: number;
  speedMps?: number;
  headingDeg?: number;
}> {
  const geo = (
    globalThis as {
      navigator?: {
        geolocation?: {
          getCurrentPosition(
            success: (position: {
              coords: {
                latitude: number;
                longitude: number;
                accuracy: number;
                altitude: number | null;
                speed: number | null;
                heading: number | null;
              };
            }) => void,
            error?: (error: { code: number; message: string }) => void,
            options?: {
              enableHighAccuracy?: boolean;
              timeout?: number;
              maximumAge?: number;
            },
          ): void;
        };
      };
    }
  ).navigator?.geolocation;
  if (geo === undefined) {
    return Promise.reject(
      new Error("Geolocation is unavailable on this host."),
    );
  }
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyM: coords.accuracy,
          ...(coords.altitude !== null ? { altitudeM: coords.altitude } : {}),
          ...(coords.speed !== null ? { speedMps: coords.speed } : {}),
          ...(coords.heading !== null ? { headingDeg: coords.heading } : {}),
        });
      },
      (error) =>
        reject(
          new Error(error.message || `Geolocation failed (${error.code})`),
        ),
      { enableHighAccuracy, timeout: 15_000, maximumAge: 5_000 },
    );
  });
}

async function senseNativeCamera(): Promise<{
  barcodes: ReadonlyArray<{ format: string; value: string }>;
  motionDetected: boolean;
  faceCount: number;
  objectCount: number;
}> {
  const permission = await Camera.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission was denied.");
  }
  // Derived-tier path without retaining frames: empty barcodes when no continuous
  // scanner is mounted. Host chrome QR still covers install/peer flows separately.
  return {
    barcodes: [],
    motionDetected: false,
    faceCount: 0,
    objectCount: 0,
  };
}
