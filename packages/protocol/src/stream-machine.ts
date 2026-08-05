import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type StreamPhase = "requested" | "active" | "degraded" | "deferred" | "rejected" | "closed";
export interface StreamState { readonly phase: StreamPhase; readonly rung: number; }
export type StreamEvent =
  | { readonly kind: "stream/admit" }
  | { readonly kind: "stream/degrade"; readonly rung: number }
  | { readonly kind: "stream/restore"; readonly rung: number }
  | { readonly kind: "stream/defer" }
  | { readonly kind: "stream/reject" }
  | { readonly kind: "stream/close" };

const event = (name: string, kind: StreamEvent["kind"]): EventClass<StreamEvent> => ({
  name,
  matches: (candidate) => candidate.kind === kind
});
const admit = event("admit", "stream/admit");
const degrade = event("degrade", "stream/degrade");
const restore = event("restore", "stream/restore");
const defer = event("defer", "stream/defer");
const reject = event("reject", "stream/reject");
const close = event("close", "stream/close");

const withRung = (state: StreamState, input: StreamEvent): StreamState =>
  input.kind === "stream/degrade" || input.kind === "stream/restore"
    ? { ...state, rung: Math.max(0, input.rung) }
    : state;

export const streamMachine: Machine<StreamState, StreamEvent> = {
  states: ["requested", "active", "degraded", "deferred", "rejected", "closed"],
  events: [admit, degrade, restore, defer, reject, close],
  initial: "requested",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({ ...state, phase: phase as StreamPhase }),
  table: [
    { from: "requested", on: admit, to: "active" },
    { from: "requested", on: degrade, to: "degraded", reduce: withRung },
    { from: "requested", on: defer, to: "deferred" },
    { from: "requested", on: reject, to: "rejected" },
    { from: "deferred", on: admit, to: "active" },
    { from: "deferred", on: degrade, to: "degraded", reduce: withRung },
    { from: "deferred", on: reject, to: "rejected" },
    { from: "active", on: degrade, to: "degraded", reduce: withRung },
    { from: "active", on: close, to: "closed" },
    { from: "degraded", on: degrade, to: "degraded", reduce: withRung },
    { from: "degraded", on: restore, to: "active", reduce: withRung },
    { from: "degraded", on: close, to: "closed" }
  ]
};

export function initialStreamState(): StreamState { return { phase: "requested", rung: 0 }; }
export const stepStream = interpret(streamMachine);
