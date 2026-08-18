import type { HostPlatformId } from "./services/host-info.js";

export const RUNTIME_BACKGROUND_CAPABILITY = "runtime:background" as const;
export const BACKGROUND_SLOT_LIMIT = 2;

export const BACKGROUND_GRANT_COST =
  "This app may run while you are using other apps. At most two apps share this with the mesh service; it costs battery.";

export const BACKGROUND_IOS_LIMITATION =
  "This host cannot run mini-apps while you are elsewhere. The grant is recorded so the app is ready if that changes; it does not run in the background on iOS.";

export class BackgroundBudgetError extends Error {
  constructor(
    readonly code: "BACKGROUND_SLOTS_EXHAUSTED" | "BACKGROUND_UNSUPPORTED",
    message: string,
    readonly holders: ReadonlyArray<string>,
  ) {
    super(message);
    this.name = "BackgroundBudgetError";
  }
}

export function presentBackgroundGrant(platform: HostPlatformId): {
  readonly cost: string;
  readonly effective: boolean;
  readonly slotLimit: number;
} {
  if (platform === "android") {
    return {
      cost: BACKGROUND_GRANT_COST,
      effective: true,
      slotLimit: BACKGROUND_SLOT_LIMIT,
    };
  }
  return {
    cost: BACKGROUND_IOS_LIMITATION,
    effective: false,
    slotLimit: 0,
  };
}

export function shouldKeepRunningOnHostSuspend(input: {
  readonly platform: HostPlatformId;
  readonly granted: ReadonlyArray<string>;
}): boolean {
  return (
    input.platform === "android" &&
    input.granted.includes(RUNTIME_BACKGROUND_CAPABILITY)
  );
}

export function assertBackgroundSlotAvailable(
  holders: ReadonlyArray<string>,
  applicantId: string,
): void {
  if (holders.includes(applicantId)) return;
  if (holders.length < BACKGROUND_SLOT_LIMIT) return;
  throw new BackgroundBudgetError(
    "BACKGROUND_SLOTS_EXHAUSTED",
    `Background execution is rationed to ${BACKGROUND_SLOT_LIMIT} apps. Revoke one of: ${holders.join(", ")}.`,
    holders,
  );
}
