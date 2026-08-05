import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type DeviceSessionPhase =
  "requested" | "active" | "degraded" | "closed" | "expired" | "revoked";

export interface DeviceSessionState {
  readonly phase: DeviceSessionPhase;
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
  readonly openedAt: number;
  readonly expiresAt: number | null;
  readonly closedAt: number | null;
  readonly revokedAt: number | null;
  readonly degradationRung: number;
  readonly holder: string;
}

export type DeviceSessionEvent =
  | {
      readonly kind: "device/open";
      readonly at: number;
      readonly ttlMs: number;
    }
  | {
      readonly kind: "device/degrade";
      readonly at: number;
      readonly rung: number;
    }
  | {
      readonly kind: "device/restore";
      readonly at: number;
      readonly rung: number;
    }
  | { readonly kind: "device/close"; readonly at: number }
  | { readonly kind: "device/ttl"; readonly at: number }
  | { readonly kind: "device/revoke"; readonly at: number };

export function initialDeviceSessionState(options: {
  readonly classId: string;
  readonly tierId: string;
  readonly appId: string;
  readonly holder: string;
  readonly openedAt?: number;
}): DeviceSessionState {
  return {
    phase: "requested",
    classId: options.classId,
    tierId: options.tierId,
    appId: options.appId,
    openedAt: options.openedAt ?? 0,
    expiresAt: null,
    closedAt: null,
    revokedAt: null,
    degradationRung: 0,
    holder: options.holder,
  };
}

const open: EventClass<DeviceSessionEvent> = {
  name: "open",
  matches: (event) => event.kind === "device/open",
};
const degrade: EventClass<DeviceSessionEvent> = {
  name: "degrade",
  matches: (event) => event.kind === "device/degrade",
};
const restore: EventClass<DeviceSessionEvent> = {
  name: "restore",
  matches: (event) => event.kind === "device/restore",
};
const close: EventClass<DeviceSessionEvent> = {
  name: "close",
  matches: (event) => event.kind === "device/close",
};
const ttlExpired: EventClass<DeviceSessionEvent> = {
  name: "ttl/expired",
  matches: (event) => event.kind === "device/ttl",
};
const revoke: EventClass<DeviceSessionEvent> = {
  name: "revoke",
  matches: (event) => event.kind === "device/revoke",
};

export const deviceSessionMachine: Machine<
  DeviceSessionState,
  DeviceSessionEvent
> = {
  states: ["requested", "active", "degraded", "closed", "expired", "revoked"],
  events: [open, degrade, restore, close, ttlExpired, revoke],
  initial: "requested",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({
    ...state,
    phase: phase as DeviceSessionPhase,
  }),
  table: [
    {
      from: "requested",
      on: open,
      to: "active",
      reduce: (state, event) =>
        event.kind === "device/open"
          ? {
              ...state,
              openedAt: event.at,
              expiresAt: event.at + Math.max(0, event.ttlMs),
            }
          : state,
    },
    {
      from: "active",
      on: degrade,
      to: "degraded",
      reduce: (state, event) =>
        event.kind === "device/degrade"
          ? { ...state, degradationRung: event.rung }
          : state,
    },
    {
      from: "degraded",
      on: restore,
      to: "active",
      reduce: (state, event) =>
        event.kind === "device/restore"
          ? { ...state, degradationRung: event.rung }
          : state,
    },
    {
      from: "degraded",
      on: degrade,
      to: "degraded",
      reduce: (state, event) =>
        event.kind === "device/degrade"
          ? { ...state, degradationRung: event.rung }
          : state,
    },
    {
      from: "active",
      on: close,
      to: "closed",
      reduce: (state, event) =>
        event.kind === "device/close"
          ? { ...state, closedAt: event.at }
          : state,
    },
    {
      from: "degraded",
      on: close,
      to: "closed",
      reduce: (state, event) =>
        event.kind === "device/close"
          ? { ...state, closedAt: event.at }
          : state,
    },
    {
      from: "active",
      on: ttlExpired,
      to: "expired",
      guard: (state, event) =>
        event.kind === "device/ttl" &&
        state.expiresAt !== null &&
        event.at >= state.expiresAt,
    },
    {
      from: "degraded",
      on: ttlExpired,
      to: "expired",
      guard: (state, event) =>
        event.kind === "device/ttl" &&
        state.expiresAt !== null &&
        event.at >= state.expiresAt,
    },
    {
      from: "active",
      on: revoke,
      to: "revoked",
      reduce: (state, event) =>
        event.kind === "device/revoke"
          ? { ...state, revokedAt: event.at }
          : state,
    },
    {
      from: "degraded",
      on: revoke,
      to: "revoked",
      reduce: (state, event) =>
        event.kind === "device/revoke"
          ? { ...state, revokedAt: event.at }
          : state,
    },
  ],
};

export const stepDeviceSession = interpret(deviceSessionMachine);

export function isDeviceSessionLive(phase: DeviceSessionPhase): boolean {
  return phase === "active" || phase === "degraded";
}
