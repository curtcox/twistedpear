import { interpret, type EventClass, type Machine } from "@twistedpear/effects";

export type ReplicaPhase = "idle" | "open" | "capped" | "closed";
export interface ReplicaState {
  readonly phase: ReplicaPhase;
}
export type ReplicaEvent =
  | { readonly kind: "replica/open" }
  | { readonly kind: "replica/append" }
  | { readonly kind: "replica/ingest" }
  | { readonly kind: "replica/tombstone" }
  | { readonly kind: "replica/evict" }
  | { readonly kind: "replica/cap" }
  | { readonly kind: "replica/close" };

const event = (
  name: string,
  kind: ReplicaEvent["kind"],
): EventClass<ReplicaEvent> => ({
  name,
  matches: (candidate) => candidate.kind === kind,
});

const open = event("open", "replica/open");
const append = event("append", "replica/append");
const ingest = event("ingest", "replica/ingest");
const tombstone = event("tombstone", "replica/tombstone");
const evict = event("evict", "replica/evict");
const cap = event("cap", "replica/cap");
const close = event("close", "replica/close");

export const replicaMachine: Machine<ReplicaState, ReplicaEvent> = {
  states: ["idle", "open", "capped", "closed"],
  events: [open, append, ingest, tombstone, evict, cap, close],
  initial: "idle",
  stateOf: (state) => state.phase,
  withState: (state, phase) => ({ ...state, phase: phase as ReplicaPhase }),
  table: [
    { from: "idle", on: open, to: "open" },
    { from: "open", on: append, to: "open" },
    { from: "open", on: ingest, to: "open" },
    { from: "open", on: tombstone, to: "open" },
    { from: "open", on: evict, to: "open" },
    { from: "open", on: cap, to: "capped" },
    { from: "open", on: close, to: "closed" },
    { from: "capped", on: ingest, to: "capped" },
    { from: "capped", on: tombstone, to: "capped" },
    { from: "capped", on: evict, to: "open" },
    { from: "capped", on: close, to: "closed" },
  ],
};

export function initialReplicaState(): ReplicaState {
  return { phase: "idle" };
}
export const stepReplica = interpret(replicaMachine);
