/** Virtual time instant in milliseconds since an arbitrary epoch. */
export type InstantMs = number;

/** Opaque timer identity used by protocol code when requesting/cancelling timers. */
export type TimerId = string;

/** Opaque node identity inside a multi-node simulation. */
export type NodeId = string;

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

/** Timer request emitted as an intent; expiry arrives later as an event. */
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

export type Intent =
  | { readonly kind: "timer/set"; readonly timer: TimerRequest }
  | { readonly kind: "timer/cancel"; readonly timer: TimerCancel }
  | { readonly kind: "transport/send"; readonly send: TransportSend }
  | { readonly kind: "store/read"; readonly read: StoreRead }
  | { readonly kind: "store/write"; readonly write: StoreWrite }
  | { readonly kind: "store/delete"; readonly del: StoreDelete }
  | { readonly kind: "log"; readonly level: "debug" | "info" | "warn" | "error"; readonly message: string };

export type Event =
  | { readonly kind: "timer/fired"; readonly id: TimerId; readonly at: InstantMs }
  | { readonly kind: "transport/recv"; readonly channel: string; readonly source: string; readonly payload: Uint8Array; readonly at: InstantMs }
  | { readonly kind: "store/value"; readonly key: string; readonly value: Uint8Array | undefined }
  | { readonly kind: "store/done"; readonly key: string; readonly op: "write" | "delete" }
  | { readonly kind: "tick"; readonly at: InstantMs }
  | { readonly kind: "start"; readonly at: InstantMs };

export interface StepResult<S> {
  readonly state: S;
  readonly intents: readonly Intent[];
}

export type StepFn<S, E extends Event = Event> = (state: S, event: E) => StepResult<S>;
