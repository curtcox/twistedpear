// @ts-nocheck
// The event/intent alphabet is generated from the normative SPEC-EVENTS schema
// (specs/spec-events/schema/events.schema.json) — see types.gen.ts. Only the
// host-facing interfaces that are not part of the wire alphabet live here.
export type { DolevYaoPower, Event, InstantMs, Intent, NodeId, StoreDelete, StoreRead, StoreWrite, TimerCancel, TimerId, TimerRequest, TransportAdversaryAction, TransportSend } from "./types.gen.js";
import type { Event, InstantMs, Intent } from "./types.gen.js";

/**
 * Clock handed to protocol code. Returns only the virtual instant the adapter
 * last advanced to — protocol modules never query the OS.
 */
export interface Clock {
  now(): InstantMs;
}

/**
 * Deterministic entropy stream. Key generation and nonces must consume this;
 * crypto algorithms (hash/sign/verify) remain pure and do not need it.
 */
export interface Entropy {
  randomBytes(length: number): Uint8Array;
}
export interface StepResult<S> {
  readonly state: S;
  readonly intents: readonly Intent[];
}
export type StepFn<S, E = Event> = (state: S, event: E) => StepResult<S>;