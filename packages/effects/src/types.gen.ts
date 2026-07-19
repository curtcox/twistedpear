// GENERATED FILE — DO NOT EDIT.
// Source of truth: specs/spec-events/schema/events.schema.json (SPEC-EVENTS).
// Regenerate with: npm run generate:event-types

/**
 * Virtual time instant in milliseconds since an arbitrary epoch.
 */
export type InstantMs = number;

/**
 * Opaque timer identity used by protocol code when requesting/cancelling
 * timers.
 */
export type TimerId = string;

/**
 * Opaque node identity inside a multi-node simulation.
 */
export type NodeId = string;

/**
 * Timer request emitted as an intent; expiry arrives later as an event.
 */
export interface TimerRequest {
  readonly id: TimerId;
  readonly delayMs: number;
}

export interface TimerCancel {
  readonly id: TimerId;
}

/**
 * Narrow send surface. Adapters perform the IO; protocol only declares intent.
 * Receive paths arrive as events, never as callbacks into protocol modules.
 */
export interface TransportSend {
  readonly channel: string;
  readonly destination: string;
  readonly payload: Uint8Array;
}

export interface StoreRead {
  readonly key: string;
}

export interface StoreWrite {
  readonly key: string;
  readonly value: Uint8Array;
}

export interface StoreDelete {
  readonly key: string;
}

export type DolevYaoPower = "drop" | "delay" | "reorder" | "duplicate" | "inject";

export type TransportAdversaryAction =
  | { readonly power: "drop"; readonly source: NodeId; readonly destination: NodeId }
  | { readonly power: "delay"; readonly source: NodeId; readonly destination: NodeId; readonly delayMs: number }
  | { readonly power: "reorder"; readonly source: NodeId; readonly destination: NodeId }
  | { readonly power: "duplicate"; readonly source: NodeId; readonly destination: NodeId }
  | { readonly power: "inject"; readonly source: NodeId; readonly destination: NodeId; readonly channel: string; readonly payload: Uint8Array; readonly delayMs?: number };

/**
 * Machine intents (machine → host) plus the transport/adversary harness
 * extension. Production bindings may restrict to the machineIntent group of
 * the schema.
 */
export type Intent =
  | { readonly kind: "need_entropy"; readonly nbytes: number }
  | { readonly kind: "timer/set"; readonly timer: TimerRequest }
  | { readonly kind: "timer/cancel"; readonly timer: TimerCancel }
  | { readonly kind: "transport/send"; readonly send: TransportSend }
  | { readonly kind: "store/read"; readonly read: StoreRead }
  | { readonly kind: "store/write"; readonly write: StoreWrite }
  | { readonly kind: "store/delete"; readonly del: StoreDelete }
  | { readonly kind: "log"; readonly level: "debug" | "info" | "warn" | "error"; readonly message: string }
  | { readonly kind: "transport/adversary"; readonly action: TransportAdversaryAction };

/**
 * Events a host dispatches to machines (host → machine).
 */
export type Event =
  | { readonly kind: "entropy"; readonly bytes: Uint8Array }
  | { readonly kind: "timer/fired"; readonly id: TimerId; readonly at: InstantMs }
  | { readonly kind: "transport/recv"; readonly channel: string; readonly source: string; readonly payload: Uint8Array; readonly at: InstantMs }
  | { readonly kind: "store/value"; readonly key: string; readonly value: Uint8Array | undefined }
  | { readonly kind: "store/done"; readonly key: string; readonly op: "write" | "delete" }
  | { readonly kind: "tick"; readonly at: InstantMs }
  | { readonly kind: "start"; readonly at: InstantMs };
