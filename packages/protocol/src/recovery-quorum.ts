import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type RecoveryPhase = "idle" | "collecting" | "recovered" | "rejected" | "expired";
export interface RecoveryQuorumState {
  readonly phase: RecoveryPhase;
  readonly threshold: number;
  readonly shares: readonly string[];
  readonly recoveredWith: readonly string[];
}
export type RecoveryQuorumEvent =
  | { readonly kind: "recovery/start" }
  | { readonly kind: "recovery/share"; readonly guardian: string }
  | { readonly kind: "recovery/authorize" }
  | { readonly kind: "recovery/reject" }
  | { readonly kind: "recovery/ttl" };

export function initialRecoveryQuorumState(threshold: number): RecoveryQuorumState {
  if (!Number.isSafeInteger(threshold) || threshold < 1) throw new Error("recovery threshold must be positive");
  return { phase: "idle", threshold, shares: [], recoveredWith: [] };
}

const start: EventClass<RecoveryQuorumEvent> = { name: "start", matches: (event) => event.kind === "recovery/start" };
const share: EventClass<RecoveryQuorumEvent> = { name: "share", matches: (event) => event.kind === "recovery/share" };
const authorize: EventClass<RecoveryQuorumEvent> = { name: "threshold-authorize", matches: (event) => event.kind === "recovery/authorize" };
const reject: EventClass<RecoveryQuorumEvent> = { name: "reject", matches: (event) => event.kind === "recovery/reject" };
const ttl: EventClass<RecoveryQuorumEvent> = { name: "ttl", matches: (event) => event.kind === "recovery/ttl" };

export const recoveryQuorumMachine: Machine<RecoveryQuorumState, RecoveryQuorumEvent> = {
  states: ["idle", "collecting", "recovered", "rejected", "expired"],
  events: [start, share, authorize, reject, ttl],
  initial: "idle",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({ ...state, phase: phase as RecoveryPhase }),
  table: [
    { from: "idle", on: start, to: "collecting" },
    {
      from: "collecting",
      on: share,
      to: "collecting",
      guard: (_state, event) => event.kind === "recovery/share" && event.guardian.length > 0,
      reduce: (state, event) => event.kind === "recovery/share"
        ? { ...state, shares: [...new Set([...state.shares, event.guardian])].sort() }
        : state
    },
    {
      from: "collecting",
      on: authorize,
      to: "recovered",
      guard: (state) => state.shares.length >= state.threshold,
      reduce: (state) => ({ ...state, recoveredWith: state.shares })
    },
    { from: "collecting", on: reject, to: "rejected" },
    { from: "collecting", on: ttl, to: "expired" }
  ]
};

export const stepRecoveryQuorum = interpret(recoveryQuorumMachine);

export function recoveryQuorumSafetyViolation(state: RecoveryQuorumState): string | null {
  return state.phase === "recovered" && state.recoveredWith.length < state.threshold
    ? "recovery completed below threshold"
    : null;
}
