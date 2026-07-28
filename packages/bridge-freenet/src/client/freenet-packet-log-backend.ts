import {
  FreenetClient,
  type FreenetClientOptions,
  type FreenetUpdateOptions
} from "../core/client.js";
import {
  decodePacketLogState,
  encodePacketLogParameters,
  encodePacketLogState,
  mergePacketLogStates,
  type PacketLogEntry
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
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Freenet-backed packet log: each HDLC frame is an indexed append; the peer
 * direction is delivered in order via subscribe/get merge.
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
  #publishQueue: Promise<void> = Promise.resolve();

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
      rendezvous: options.rendezvous
    });
    this.#localDirection = options.localDirection;
    this.#peerDirection = options.localDirection === 0 ? 1 : 0;
    this.#updateOptions = options.updateOptions;
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
    const existing = await this.#client.get(key).catch(() => null);
    if (existing !== null) {
      this.#applyState(existing.state, false);
    } else {
      await this.#client.put(source, this.#state);
    }
    this.#unsubscribe = await this.#client.subscribe(key, (state) => {
      this.#applyState(state, true);
    });
    this.#active = true;
  }

  async stop(): Promise<void> {
    this.#active = false;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
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
      payload: Uint8Array.from(hdlcFrame)
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

  #applyState(state: Uint8Array, deliver: boolean): void {
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
      this.#lastPeerIndex = entry.index;
      if (deliver) {
        this.#receiver?.(Uint8Array.from(entry.payload));
      }
    }
  }
}
