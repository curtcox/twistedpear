import type { InstantMs } from "../../types.js";
import { SimClock } from "./clock.js";
import {
  sampleLatency,
  transportClass,
  type LatencyDistribution,
} from "./transport-classes.js";

/** S2 local 1 KiB p95 update→notify on the local-executor path (~89 ms). */
export const SIM_FREENET_DEFAULT_NOTIFY_LATENCY_MS = 89;

/** Policy-aligned continuous bitrate for Freenet-sized contract updates. */
export const SIM_FREENET_DEFAULT_BANDWIDTH_BPS = 90_000;

export interface SimFreenetContractSource {
  readonly wasm: Uint8Array;
  readonly parameters: Uint8Array;
}

export interface SimFreenetContractRecord {
  readonly key: Uint8Array;
  readonly codeHash: Uint8Array;
  readonly state: Uint8Array;
}

export interface SimFreenetNotifyModel {
  /** Fixed notify delay; defaults to instant delivery. */
  readonly latencyMs?: number;
  /** Sampled notify delay; ignored when `latencyMs` is set. */
  readonly latency?: LatencyDistribution;
}

export interface SimFreenetContractHubOptions {
  readonly clock?: SimClock;
  readonly notify?: SimFreenetNotifyModel;
  readonly rng?: () => number;
}

interface PendingNotify {
  readonly deliverAt: InstantMs;
  readonly keyHex: string;
  readonly state: Uint8Array;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Deterministic 32-byte digest for simulated contract keys.
 * Sim-only — not wire-compatible with Freenet BLAKE3 derivation.
 */
function simDigest(input: Uint8Array, length = 32): Uint8Array {
  let hash = 0xcbf29ce484222325n;
  for (const byte of input) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  const out = new Uint8Array(length);
  let value = hash;
  for (let index = 0; index < length; index += 1) {
    value = (value * 0x100000001b3n + BigInt(index)) & 0xffffffffffffffffn;
    out[index] = Number(value & 0xffn);
  }
  return out;
}

export function simFreenetDeriveKey(source: SimFreenetContractSource): {
  readonly key: Uint8Array;
  readonly codeHash: Uint8Array;
} {
  const codeHash = simDigest(source.wasm);
  const keyInput = new Uint8Array(codeHash.length + source.parameters.length);
  keyInput.set(codeHash);
  keyInput.set(source.parameters, codeHash.length);
  return { key: simDigest(keyInput), codeHash };
}

/**
 * Shared convergent contract store for deterministic Freenet-path simulation.
 * Multiple clients on one hub model replicated contract state without a live node.
 */
export class SimFreenetContractHub {
  readonly #clock: SimClock | undefined;
  readonly #notify: SimFreenetNotifyModel | undefined;
  readonly #rng: () => number;
  readonly #states = new Map<string, SimFreenetContractRecord>();
  readonly #listeners = new Map<string, Set<(state: Uint8Array) => void>>();
  readonly #pending: PendingNotify[] = [];
  #closed = false;

  constructor(options: SimFreenetContractHubOptions = {}) {
    this.#clock = options.clock;
    this.#notify = options.notify;
    this.#rng = options.rng ?? (() => 0);
  }

  put(source: SimFreenetContractSource, state: Uint8Array): Uint8Array {
    this.#assertOpen();
    const { key, codeHash } = simFreenetDeriveKey(source);
    const record: SimFreenetContractRecord = {
      key: Uint8Array.from(key),
      codeHash: Uint8Array.from(codeHash),
      state: Uint8Array.from(state),
    };
    this.#states.set(bytesToHex(key), record);
    this.#emit(bytesToHex(key), record.state);
    return key;
  }

  get(key: Uint8Array): SimFreenetContractRecord {
    this.#assertOpen();
    const record = this.#states.get(bytesToHex(key));
    if (record === undefined) {
      throw new Error("SimFreenet contract not found");
    }
    return {
      key: Uint8Array.from(record.key),
      codeHash: Uint8Array.from(record.codeHash),
      state: Uint8Array.from(record.state),
    };
  }

  tryGet(key: Uint8Array): SimFreenetContractRecord | null {
    try {
      return this.get(key);
    } catch {
      return null;
    }
  }

  update(key: Uint8Array, codeHash: Uint8Array, state: Uint8Array): void {
    this.#assertOpen();
    const keyHex = bytesToHex(key);
    const previous = this.#states.get(keyHex);
    if (previous === undefined) {
      throw new Error("SimFreenet contract not found");
    }
    const record: SimFreenetContractRecord = {
      key: Uint8Array.from(key),
      codeHash: Uint8Array.from(codeHash),
      state: Uint8Array.from(state),
    };
    this.#states.set(keyHex, record);
    this.#emit(keyHex, record.state);
  }

  subscribe(
    key: Uint8Array,
    listener: (state: Uint8Array) => void,
  ): () => void {
    this.#assertOpen();
    const keyHex = bytesToHex(key);
    let listeners = this.#listeners.get(keyHex);
    if (listeners === undefined) {
      listeners = new Set();
      this.#listeners.set(keyHex, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.#listeners.delete(keyHex);
      }
    };
  }

  close(): void {
    this.#closed = true;
    this.#listeners.clear();
    this.#pending.length = 0;
  }

  nextNotifyAt(): InstantMs | undefined {
    if (this.#pending.length === 0) {
      return undefined;
    }
    return this.#pending.reduce(
      (earliest, entry) => Math.min(earliest, entry.deliverAt),
      Number.POSITIVE_INFINITY,
    );
  }

  deliverDue(untilMs: InstantMs): number {
    let delivered = 0;
    this.#pending.sort((left, right) => left.deliverAt - right.deliverAt);
    while (this.#pending.length > 0 && this.#pending[0]!.deliverAt <= untilMs) {
      const entry = this.#pending.shift()!;
      const listeners = this.#listeners.get(entry.keyHex);
      if (listeners === undefined) {
        continue;
      }
      for (const listener of listeners) {
        listener(entry.state);
      }
      delivered += 1;
    }
    return delivered;
  }

  snapshot(): ReadonlyMap<string, SimFreenetContractRecord> {
    return new Map(this.#states);
  }

  #emit(keyHex: string, state: Uint8Array): void {
    const listeners = this.#listeners.get(keyHex);
    if (listeners === undefined || listeners.size === 0) {
      return;
    }
    const delayMs = this.#notifyDelayMs();
    if (delayMs <= 0 || this.#clock === undefined) {
      for (const listener of listeners) {
        listener(Uint8Array.from(state));
      }
      return;
    }
    this.#pending.push({
      deliverAt: this.#clock.now() + delayMs,
      keyHex,
      state: Uint8Array.from(state),
    });
  }

  #notifyDelayMs(): number {
    if (this.#notify?.latencyMs !== undefined) {
      return Math.max(0, this.#notify.latencyMs);
    }
    if (this.#notify?.latency !== undefined) {
      return sampleLatency(this.#notify.latency, this.#rng);
    }
    return 0;
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new Error("SimFreenet contract hub is closed");
    }
  }
}

export interface SimFreenetClientOptions {
  readonly hub?: SimFreenetContractHub;
}

/**
 * Drop-in simulated Freenet client for campaign and bridge tests.
 * Shares contract state through an optional hub (default: private in-memory node).
 */
export class SimFreenetClient {
  readonly #hub: SimFreenetContractHub;
  readonly #ownsHub: boolean;

  constructor(options: SimFreenetClientOptions = {}) {
    this.#ownsHub = options.hub === undefined;
    this.#hub = options.hub ?? new SimFreenetContractHub();
  }

  get hub(): SimFreenetContractHub {
    return this.#hub;
  }

  put(
    source: SimFreenetContractSource,
    state: Uint8Array,
  ): Promise<Uint8Array> {
    return Promise.resolve(this.#hub.put(source, state));
  }

  get(key: Uint8Array): Promise<SimFreenetContractRecord> {
    return Promise.resolve(this.#hub.get(key));
  }

  update(
    key: Uint8Array,
    codeHash: Uint8Array,
    state: Uint8Array,
  ): Promise<void> {
    this.#hub.update(key, codeHash, state);
    return Promise.resolve();
  }

  subscribe(
    key: Uint8Array,
    listener: (state: Uint8Array) => void,
  ): Promise<() => void> {
    return Promise.resolve(this.#hub.subscribe(key, listener));
  }

  close(): Promise<void> {
    if (this.#ownsHub) {
      this.#hub.close();
    }
    return Promise.resolve();
  }

  static deriveKey(source: SimFreenetContractSource): {
    readonly key: Uint8Array;
    readonly codeHash: Uint8Array;
  } {
    return simFreenetDeriveKey(source);
  }
}

/** Transport preset derived from local S2 measurements and F2/F3 policy bitrate. */
export function simFreenetTransportClass() {
  return transportClass("freenet");
}
