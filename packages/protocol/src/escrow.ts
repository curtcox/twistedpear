import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type EscrowPhase = "pending" | "funded" | "release-requested" | "released" | "refunded" | "expired";
export interface EscrowState {
  readonly phase: EscrowPhase;
  readonly amount: number;
  readonly quorum: number;
  readonly releasedAmount: number;
  readonly authorizers: readonly string[];
}
export type EscrowEvent =
  | { readonly kind: "escrow/deposit"; readonly amount: number }
  | { readonly kind: "escrow/request-release" }
  | { readonly kind: "escrow/authorize"; readonly authorizers: readonly string[] }
  | { readonly kind: "escrow/refund" }
  | { readonly kind: "escrow/ttl" };

export function initialEscrowState(quorum: number): EscrowState {
  if (!Number.isSafeInteger(quorum) || quorum < 1) throw new Error("escrow quorum must be positive");
  return { phase: "pending", amount: 0, quorum, releasedAmount: 0, authorizers: [] };
}

const deposit: EventClass<EscrowEvent> = { name: "deposit", matches: (event) => event.kind === "escrow/deposit" };
const requestRelease: EventClass<EscrowEvent> = { name: "request-release", matches: (event) => event.kind === "escrow/request-release" };
const authorize: EventClass<EscrowEvent> = { name: "quorum-authorize", matches: (event) => event.kind === "escrow/authorize" };
const refund: EventClass<EscrowEvent> = { name: "refund", matches: (event) => event.kind === "escrow/refund" };
const ttl: EventClass<EscrowEvent> = { name: "ttl", matches: (event) => event.kind === "escrow/ttl" };

export const escrowMachine: Machine<EscrowState, EscrowEvent> = {
  states: ["pending", "funded", "release-requested", "released", "refunded", "expired"],
  events: [deposit, requestRelease, authorize, refund, ttl],
  initial: "pending",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({ ...state, phase: phase as EscrowPhase }),
  table: [
    { from: "pending", on: deposit, to: "funded", guard: (_state, event) => event.kind === "escrow/deposit" && event.amount > 0, reduce: (state, event) => event.kind === "escrow/deposit" ? { ...state, amount: event.amount } : state },
    { from: "funded", on: requestRelease, to: "release-requested" },
    {
      from: "release-requested",
      on: authorize,
      to: "released",
      guard: (state, event) => event.kind === "escrow/authorize" && new Set(event.authorizers).size >= state.quorum,
      reduce: (state, event) => event.kind === "escrow/authorize"
        ? { ...state, authorizers: [...new Set(event.authorizers)].sort(), releasedAmount: state.amount }
        : state
    },
    { from: "funded", on: refund, to: "refunded" },
    { from: "funded", on: ttl, to: "expired" },
    { from: "release-requested", on: ttl, to: "expired" }
  ]
};

export const stepEscrow = interpret(escrowMachine);

export function escrowSafetyViolation(state: EscrowState): string | null {
  if (state.phase === "released" && state.authorizers.length < state.quorum) return "escrow released without quorum";
  if (state.releasedAmount > state.amount) return "escrow released more than funded";
  return null;
}
