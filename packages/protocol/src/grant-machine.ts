import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type GrantPhase =
  | "requested"
  | "granted"
  | "active"
  | "denied"
  | "expired"
  | "revoked";

export interface GrantLifecycleState {
  readonly phase: GrantPhase;
  readonly requestedAt: number;
  readonly expiresAt: number | null;
  readonly firstUsedAt: number | null;
  readonly revokedAt: number | null;
}

export type GrantLifecycleEvent =
  | { readonly kind: "grant/approve"; readonly at: number; readonly ttlMs: number }
  | { readonly kind: "grant/deny"; readonly at: number }
  | { readonly kind: "grant/first-use"; readonly at: number }
  | { readonly kind: "grant/ttl"; readonly at: number }
  | { readonly kind: "grant/revoke"; readonly at: number };

export function initialGrantLifecycleState(requestedAt = 0): GrantLifecycleState {
  return {
    phase: "requested",
    requestedAt,
    expiresAt: null,
    firstUsedAt: null,
    revokedAt: null
  };
}

const approve: EventClass<GrantLifecycleEvent> = {
  name: "approve",
  matches: (event) => event.kind === "grant/approve"
};
const deny: EventClass<GrantLifecycleEvent> = {
  name: "deny",
  matches: (event) => event.kind === "grant/deny"
};
const firstUseLive: EventClass<GrantLifecycleEvent> = {
  name: "first-use/live",
  matches: (event) => event.kind === "grant/first-use"
};
const ttlExpired: EventClass<GrantLifecycleEvent> = {
  name: "ttl/expired",
  matches: (event) => event.kind === "grant/ttl"
};
const revoke: EventClass<GrantLifecycleEvent> = {
  name: "revoke",
  matches: (event) => event.kind === "grant/revoke"
};

export const grantMachine: Machine<GrantLifecycleState, GrantLifecycleEvent> = {
  states: ["requested", "granted", "active", "denied", "expired", "revoked"],
  events: [approve, deny, firstUseLive, ttlExpired, revoke],
  initial: "requested",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({ ...state, phase: phase as GrantPhase }),
  table: [
    {
      from: "requested",
      on: approve,
      to: "granted",
      reduce: (state, event) => event.kind === "grant/approve"
        ? { ...state, expiresAt: event.at + Math.max(0, event.ttlMs) }
        : state
    },
    { from: "requested", on: deny, to: "denied" },
    {
      from: "granted",
      on: firstUseLive,
      to: "active",
      guard: (state, event) => event.kind === "grant/first-use" &&
        (state.expiresAt === null || event.at < state.expiresAt),
      reduce: (state, event) => event.kind === "grant/first-use"
        ? { ...state, firstUsedAt: event.at }
        : state
    },
    {
      from: "granted",
      on: ttlExpired,
      to: "expired",
      guard: (state, event) => event.kind === "grant/ttl" &&
        state.expiresAt !== null && event.at >= state.expiresAt
    },
    {
      from: "active",
      on: ttlExpired,
      to: "expired",
      guard: (state, event) => event.kind === "grant/ttl" &&
        state.expiresAt !== null && event.at >= state.expiresAt
    },
    {
      from: "granted",
      on: revoke,
      to: "revoked",
      reduce: (state, event) => event.kind === "grant/revoke"
        ? { ...state, revokedAt: event.at }
        : state
    },
    {
      from: "active",
      on: revoke,
      to: "revoked",
      reduce: (state, event) => event.kind === "grant/revoke"
        ? { ...state, revokedAt: event.at }
        : state
    }
  ]
};

export const stepGrantLifecycle = interpret(grantMachine);
