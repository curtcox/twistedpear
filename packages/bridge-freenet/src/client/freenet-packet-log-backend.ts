import {
  FreenetClient,
  type FreenetClientOptions,
  type FreenetUpdateOptions,
} from "../core/client.js";
import {
  decodePacketLogState,
  encodePacketLogParameters,
  encodePacketLogState,
  mergePacketLogStates,
  type PacketLogEntry,
} from "../core/packet-log.js";

/** Structural match for `FreenetPacketLogBackend` in reticulum-interfaces. */
export interface FreenetPacketLogBackendPort {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly active: boolean;
  publishFrame(hdlcFrame: Uint8Array): Promise<void>;
  setReceiver(onFrame: (hdlcFrame: Uint8Array) => void): void;
}

export interface FreenetPacketLogBackendOptions {
  readonly client?: FreenetClient;
  readonly clientOptions?: FreenetClientOptions;
  readonly wasm: Uint8Array;
  readonly retentionPerDirection?: number;
  /** 32-byte shared rendezvous for this peer pair. */
  readonly rendezvous: Uint8Array;
  /** Local write direction; peer writes the other. */
  readonly localDirection: 0 | 1;
  readonly updateOptions?: FreenetUpdateOptions;
  /**
   * Upper bound on how stale the local view of the log may get while the
   * backend is active. Subscription notifications are the fast path; this is
   * the floor that keeps a dropped notification from stalling the stream
   * forever. Set to 0 to rely on notifications alone.
   */
  readonly reconcileIntervalMs?: number;
}

/** Freshness floor when the caller does not pick one. */
const DEFAULT_RECONCILE_INTERVAL_MS = 1_000;

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Freenet-backed packet log: each HDLC frame is an indexed append; peer
 * notifications are treated as hints to fetch authoritative state, then
 * contiguous peer indices are delivered upward (gaps recovered via refetch,
 * duplicates ignored).
 *
 * Cross-node Freenet notify is a hint that can be dropped outright — the S2
 * measurement harness already carries a GET-reconcile fallback for exactly
 * that. Refetching only when a notification arrives therefore made a dropped
 * notification permanent: the frame sat in authoritative state that nothing
 * ever went back for, and the interface went quiet rather than slow. A
 * periodic reconcile is what makes the "recovered via refetch" above true.
 */
export class FreenetContractPacketLogBackend implements FreenetPacketLogBackendPort {
  readonly #client: FreenetClient;
  readonly #ownsClient: boolean;
  readonly #wasm: Uint8Array;
  readonly #retention: number;
  readonly #parameters: Uint8Array;
  readonly #localDirection: 0 | 1;
  readonly #peerDirection: 0 | 1;
  readonly #updateOptions: FreenetUpdateOptions | undefined;
  #receiver: ((frame: Uint8Array) => void) | null = null;
  #unsubscribe: (() => void) | null = null;
  #active = false;
  #state = encodePacketLogState([]);
  #nextLocalIndex = 0n;
  #lastPeerIndex = -1n;
  #pendingPeer = new Map<bigint, Uint8Array>();
  #publishQueue: Promise<void> = Promise.resolve();
  #contractKey: Uint8Array | null = null;
  #reconcileQueue: Promise<void> = Promise.resolve();
  readonly #reconcileIntervalMs: number;
  #reconcileTimer: ReturnType<typeof setInterval> | null = null;
  #lastReconcileAt = 0;
  #reconcilesInFlight = 0;

  constructor(options: FreenetPacketLogBackendOptions) {
    if (options.rendezvous.length !== 32) {
      throw new Error("Freenet packet-log rendezvous must be 32 bytes");
    }
    this.#ownsClient = options.client === undefined;
    this.#client = options.client ?? new FreenetClient(options.clientOptions);
    this.#wasm = options.wasm;
    this.#retention = options.retentionPerDirection ?? 64;
    this.#parameters = encodePacketLogParameters({
      retentionPerDirection: this.#retention,
      rendezvous: options.rendezvous,
    });
    this.#localDirection = options.localDirection;
    this.#peerDirection = options.localDirection === 0 ? 1 : 0;
    this.#updateOptions = options.updateOptions;
    this.#reconcileIntervalMs =
      options.reconcileIntervalMs ?? DEFAULT_RECONCILE_INTERVAL_MS;
  }

  get active(): boolean {
    return this.#active;
  }

  setReceiver(onFrame: (hdlcFrame: Uint8Array) => void): void {
    this.#receiver = onFrame;
  }

  async start(): Promise<void> {
    const source = { wasm: this.#wasm, parameters: this.#parameters };
    const { key } = FreenetClient.deriveKey(source);
    this.#contractKey = key;
    const existing = await this.#client.get(key).catch(() => null);
    if (existing !== null) {
      this.#ingestState(existing.state, false);
    } else {
      await this.#client.put(source, this.#state);
    }
    this.#unsubscribe = await this.#client.subscribe(key, () => {
      // Notifications are hints only; authoritative state comes from get().
      this.#enqueueReconcile();
    });
    this.#active = true;
    this.#startReconcileTimer();
  }

  async stop(): Promise<void> {
    this.#active = false;
    if (this.#reconcileTimer !== null) {
      clearInterval(this.#reconcileTimer);
      this.#reconcileTimer = null;
    }
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#pendingPeer.clear();
    if (this.#ownsClient) {
      await this.#client.close();
    }
  }

  async publishFrame(hdlcFrame: Uint8Array): Promise<void> {
    if (!this.#active) {
      throw new Error("Freenet packet-log backend is not active");
    }
    const entry: PacketLogEntry = {
      direction: this.#localDirection,
      index: this.#nextLocalIndex,
      payload: Uint8Array.from(hdlcFrame),
    };
    this.#nextLocalIndex += 1n;
    const encoded = encodePacketLogState([entry]);
    const merged = mergePacketLogStates(this.#retention, this.#state, encoded);
    this.#state = merged;
    this.#publishQueue = this.#publishQueue.then(() => this.#push(merged));
    await this.#publishQueue;
  }

  async #push(state: Uint8Array): Promise<void> {
    const source = { wasm: this.#wasm, parameters: this.#parameters };
    const { key, codeHash } = FreenetClient.deriveKey(source);
    const existing = await this.#client.get(key).catch(() => null);
    if (existing === null) {
      await this.#client.put(source, state);
      return;
    }
    const merged = mergePacketLogStates(this.#retention, existing.state, state);
    if (equalBytes(merged, existing.state)) {
      this.#state = merged;
      return;
    }
    await this.#client.update(key, codeHash, merged, this.#updateOptions);
    this.#state = merged;
  }

  #startReconcileTimer(): void {
    if (this.#reconcileIntervalMs <= 0 || this.#reconcileTimer !== null) {
      return;
    }
    const timer = setInterval(() => {
      // A get() already running is the freshest view obtainable, and a node
      // answering more slowly than the interval would otherwise accrue a queue
      // of gets it can never work off.
      if (this.#reconcilesInFlight > 0) {
        return;
      }
      // A notification within the window already refreshed the view, so the
      // timer costs a get() only when the notify path has gone quiet.
      if (Date.now() - this.#lastReconcileAt < this.#reconcileIntervalMs) {
        return;
      }
      this.#enqueueReconcile();
    }, this.#reconcileIntervalMs);
    timer.unref?.();
    this.#reconcileTimer = timer;
  }

  #enqueueReconcile(): void {
    this.#lastReconcileAt = Date.now();
    this.#reconcilesInFlight += 1;
    this.#reconcileQueue = this.#reconcileQueue
      .then(() => this.#reconcileFromAuthoritative())
      .catch(() => {
        // Transient get failures leave pending indices buffered for the next hint.
      })
      .finally(() => {
        this.#reconcilesInFlight -= 1;
      });
  }

  async #reconcileFromAuthoritative(): Promise<void> {
    if (!this.#active || this.#contractKey === null) {
      return;
    }
    const record = await this.#client.get(this.#contractKey);
    this.#ingestState(record.state, true);
  }

  #ingestState(state: Uint8Array, deliver: boolean): void {
    const merged = mergePacketLogStates(this.#retention, this.#state, state);
    this.#state = merged;
    const entries = decodePacketLogState(merged, this.#retention);

    for (const entry of entries) {
      if (entry.direction === this.#localDirection) {
        if (entry.index >= this.#nextLocalIndex) {
          this.#nextLocalIndex = entry.index + 1n;
        }
        continue;
      }
      if (entry.direction !== this.#peerDirection) continue;
      if (entry.index <= this.#lastPeerIndex) continue;
      if (!this.#pendingPeer.has(entry.index)) {
        this.#pendingPeer.set(entry.index, Uint8Array.from(entry.payload));
      }
    }

    if (!deliver) {
      // Catch-up on start: advance the watermark without replaying history.
      let maxPeer = this.#lastPeerIndex;
      for (const index of this.#pendingPeer.keys()) {
        if (index > maxPeer) maxPeer = index;
      }
      this.#lastPeerIndex = maxPeer;
      this.#pendingPeer.clear();
      return;
    }

    this.#deliverContiguous();
  }

  #deliverContiguous(): void {
    let next = this.#lastPeerIndex + 1n;
    while (this.#pendingPeer.has(next)) {
      const payload = this.#pendingPeer.get(next)!;
      this.#pendingPeer.delete(next);
      this.#lastPeerIndex = next;
      this.#receiver?.(payload);
      next += 1n;
    }
  }
}
