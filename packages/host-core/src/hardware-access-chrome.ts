/**
 * Hardware access chrome — the peripheral panel, never "Your devices".
 * Availability is the per-host matrix in device-io-plan.md; native vs simulated
 * is reported, never asserted in prose.
 */

export const HARDWARE_ACCESS_PANEL_LABEL = "Hardware access";

export type HardwareAccessHost =
  "desktop" | "android" | "ios" | "web" | "headless";

export type HostDeviceSupport =
  | "full"
  | "coarse"
  | "platform"
  | "partial"
  | "restricted"
  | "rare"
  | "common"
  | "none"
  | "reader-dependent"
  | "browser";

export type NativeDriverKind = "os" | "simulated" | "unsupported";

export interface HardwareSessionRow {
  readonly handle: string;
  readonly appId: string;
  readonly classId: string;
  readonly tierId: string;
  readonly destination: string;
}

export interface HardwareInventoryRow {
  readonly classId: string;
  readonly availability: string;
  readonly support: HostDeviceSupport;
  readonly driver: NativeDriverKind;
  readonly disabled: boolean;
}

export interface HardwareAccessPresentation {
  readonly panelLabel: typeof HARDWARE_ACCESS_PANEL_LABEL;
  readonly host: HardwareAccessHost;
  readonly remoteAcquisitionEnabled: boolean;
  readonly inventory: ReadonlyArray<HardwareInventoryRow>;
  readonly sessions: ReadonlyArray<HardwareSessionRow>;
  readonly globalKill: "sensor-kill";
}

/** Contract from device-io-plan.md § Per-host availability. */
export const HOST_DEVICE_SUPPORT: Readonly<
  Record<string, Readonly<Record<HardwareAccessHost, HostDeviceSupport>>>
> = {
  location: {
    desktop: "coarse",
    android: "full",
    ios: "full",
    web: "browser",
    headless: "none",
  },
  camera: {
    desktop: "full",
    android: "full",
    ios: "full",
    web: "browser",
    headless: "none",
  },
  microphone: {
    desktop: "full",
    android: "full",
    ios: "full",
    web: "browser",
    headless: "none",
  },
  speaker: {
    desktop: "full",
    android: "full",
    ios: "full",
    web: "browser",
    headless: "none",
  },
  tts: {
    desktop: "platform",
    android: "platform",
    ios: "platform",
    web: "partial",
    headless: "platform",
  },
  stt: {
    desktop: "platform",
    android: "platform",
    ios: "platform",
    web: "partial",
    headless: "platform",
  },
  motion: {
    desktop: "none",
    android: "full",
    ios: "full",
    web: "partial",
    headless: "none",
  },
  "ambient-light": {
    desktop: "rare",
    android: "common",
    ios: "partial",
    web: "none",
    headless: "none",
  },
  nfc: {
    desktop: "reader-dependent",
    android: "full",
    ios: "restricted",
    web: "partial",
    headless: "reader-dependent",
  },
  biometric: {
    desktop: "platform",
    android: "full",
    ios: "full",
    web: "browser",
    headless: "none",
  },
};

const NATIVE_CLASSES: Readonly<
  Record<HardwareAccessHost, ReadonlyArray<string>>
> = {
  desktop: ["location", "camera", "microphone", "battery", "tts", "haptics"],
  android: ["location", "camera", "haptics"],
  ios: ["location", "camera", "haptics"],
  web: ["location", "camera", "microphone", "battery", "tts", "haptics"],
  headless: [],
};

export function nativeDriverKind(
  host: HardwareAccessHost,
  classId: string,
): NativeDriverKind {
  const support = HOST_DEVICE_SUPPORT[classId]?.[host];
  if (support === "none") return "unsupported";
  return NATIVE_CLASSES[host].includes(classId) ? "os" : "simulated";
}

export function presentHardwareAccess(input: {
  readonly host: HardwareAccessHost;
  readonly inventory: ReadonlyArray<{
    readonly classId: string;
    readonly availability: string;
  }>;
  readonly sessions: ReadonlyArray<HardwareSessionRow>;
  readonly disabledClasses: ReadonlyArray<string>;
  readonly remoteAcquisitionEnabled: boolean;
}): HardwareAccessPresentation {
  const disabled = new Set(input.disabledClasses);
  return {
    panelLabel: HARDWARE_ACCESS_PANEL_LABEL,
    host: input.host,
    remoteAcquisitionEnabled: input.remoteAcquisitionEnabled,
    globalKill: "sensor-kill",
    sessions: input.sessions,
    inventory: input.inventory.map((row) => ({
      classId: row.classId,
      availability: disabled.has(row.classId)
        ? "policy-disabled"
        : row.availability,
      support: HOST_DEVICE_SUPPORT[row.classId]?.[input.host] ?? "none",
      driver: nativeDriverKind(input.host, row.classId),
      disabled: disabled.has(row.classId),
    })),
  };
}
