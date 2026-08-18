import type { HostPlatformId } from "./services/host-info.js";

export const RUNTIME_WAKE_CAPABILITY = "runtime:wake" as const;
export const WAKE_MIN_INTERVAL_MS = 15 * 60_000;
export const WAKE_MAX_BUDGET_MS = 10_000;

export const WAKE_SLOT_LIMIT: Readonly<Record<HostPlatformId, number>> = {
  android: 3,
  ios: 1,
  desktop: 4,
  web: 0,
  node: 4,
};

export const WAKE_GRANT_COST =
  "This app may be woken periodically for a few seconds of work. Wake-ups are rationed per host, not per app — a phone with six installed apps cannot give each one a timer.";

export class WakeBudgetError extends Error {
  constructor(
    readonly code:
      | "WAKE_SLOTS_EXHAUSTED"
      | "WAKE_INTERVAL_TOO_SHORT"
      | "WAKE_BUDGET_TOO_LONG"
      | "WAKE_UNSUPPORTED",
    message: string,
    readonly holders: ReadonlyArray<string>,
  ) {
    super(message);
    this.name = "WakeBudgetError";
  }
}

export interface WakeRequest {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly intervalMs: number;
  readonly budgetMs: number;
}

export interface WakeGrant extends WakeRequest {
  readonly nextAt: number;
}

export function presentWakeGrant(platform: HostPlatformId): {
  readonly cost: string;
  readonly slotLimit: number;
} {
  return {
    cost: WAKE_GRANT_COST,
    slotLimit: WAKE_SLOT_LIMIT[platform],
  };
}

export function allocateWake(
  existing: ReadonlyArray<WakeGrant>,
  request: WakeRequest,
  platform: HostPlatformId,
  now: number,
): WakeGrant {
  const limit = WAKE_SLOT_LIMIT[platform];
  if (limit <= 0) {
    throw new WakeBudgetError(
      "WAKE_UNSUPPORTED",
      "This host has no periodic wake budget for mini-apps.",
      existing.map((entry) => entry.appId),
    );
  }
  if (request.intervalMs < WAKE_MIN_INTERVAL_MS) {
    throw new WakeBudgetError(
      "WAKE_INTERVAL_TOO_SHORT",
      `Wake interval must be at least ${WAKE_MIN_INTERVAL_MS} ms.`,
      existing.map((entry) => entry.appId),
    );
  }
  if (request.budgetMs > WAKE_MAX_BUDGET_MS || request.budgetMs <= 0) {
    throw new WakeBudgetError(
      "WAKE_BUDGET_TOO_LONG",
      `Each wake may use at most ${WAKE_MAX_BUDGET_MS} ms.`,
      existing.map((entry) => entry.appId),
    );
  }
  const holders = existing.map((entry) => entry.appId);
  const replacing = existing.some((entry) => entry.appId === request.appId);
  if (!replacing && holders.length >= limit) {
    throw new WakeBudgetError(
      "WAKE_SLOTS_EXHAUSTED",
      `Wake-ups are rationed to ${limit} apps on this host. Revoke one of: ${holders.join(", ")}.`,
      holders,
    );
  }
  return { ...request, nextAt: now + request.intervalMs };
}

export function dueWakes(
  grants: ReadonlyArray<WakeGrant>,
  now: number,
): ReadonlyArray<WakeGrant> {
  return grants.filter((grant) => now >= grant.nextAt);
}

export function advanceWake(grant: WakeGrant, now: number): WakeGrant {
  return { ...grant, nextAt: now + grant.intervalMs };
}
