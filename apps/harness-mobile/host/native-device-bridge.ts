/**
 * Native (Expo) device bridge for DeviceManager host-bridged drivers.
 * Uses navigator.geolocation + expo-camera permissions when available.
 */

import { Camera } from "expo-camera";

export type NativeDeviceAvailability =
  | "available"
  | "permission-required"
  | "unsupported"
  | "busy"
  | "policy-disabled"
  | "offline";

export async function nativeDeviceAvailability(classId: string): Promise<NativeDeviceAvailability> {
  if (classId === "location") {
    const geo = (globalThis as { navigator?: { geolocation?: { getCurrentPosition: unknown } } }).navigator
      ?.geolocation;
    return typeof geo?.getCurrentPosition === "function" ? "permission-required" : "unsupported";
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
  return "unsupported";
}

export async function nativeDeviceSense(
  classId: string,
  options: Readonly<Record<string, unknown>> = {}
): Promise<unknown> {
  if (classId === "location") {
    return senseNativeLocation(options.enableHighAccuracy === true);
  }
  if (classId === "camera") {
    return senseNativeCamera();
  }
  throw new Error(`No native sense effect for device class "${classId}".`);
}

function senseNativeLocation(enableHighAccuracy: boolean): Promise<{
  latitude: number;
  longitude: number;
  accuracyM: number;
  altitudeM?: number;
  speedMps?: number;
  headingDeg?: number;
}> {
  const geo = (globalThis as {
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
          options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
        ): void;
      };
    };
  }).navigator?.geolocation;
  if (geo === undefined) {
    return Promise.reject(new Error("Geolocation is unavailable on this host."));
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
          ...(coords.heading !== null ? { headingDeg: coords.heading } : {})
        });
      },
      (error) => reject(new Error(error.message || `Geolocation failed (${error.code})`)),
      { enableHighAccuracy, timeout: 15_000, maximumAge: 5_000 }
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
    objectCount: 0
  };
}
