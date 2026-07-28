import { blake3 } from "@noble/hashes/blake3";
import {
  ContractContainer,
  ContractKey,
  ContractType,
  DisconnectRequest,
  FreenetWsApi,
  GetRequest,
  PutRequest,
  StateUpdate,
  UpdateData,
  UpdateDataType,
  UpdateRequest,
  WasmContractV1,
  type GetResponse,
  type ResponseHandler,
  type UpdateNotification
} from "@freenetorg/freenet-stdlib";
import {
  ContractCodeT,
  ContractInstanceIdT,
  ContractKeyT
} from "@freenetorg/freenet-stdlib/common";
import { RelatedContractsT } from "@freenetorg/freenet-stdlib/client-request";

export const DEFAULT_FREENET_URL =
  "ws://127.0.0.1:50509/v1/contract/command";
export const DEFAULT_FREENET_REQUEST_TIMEOUT_MS = 30_000;

export interface FreenetClientOptions {
  readonly url?: string | URL;
  readonly authToken?: string;
  readonly requestTimeoutMs?: number;
}

export interface FreenetContractSource {
  readonly wasm: Uint8Array;
  readonly parameters: Uint8Array;
}

export interface FreenetContractRecord {
  readonly key: Uint8Array;
  readonly codeHash: Uint8Array;
  readonly state: Uint8Array;
}

export interface FreenetPutOptions {
  readonly subscribe?: boolean;
  readonly blockingSubscribe?: boolean;
}

export interface FreenetUpdateOptions {
  /**
   * Wire bytes for `ContractKey.code` on UPDATE.
   *
   * Freenet 0.2.112 (stdlib before the pass-through fix) runs
   * `CodeHash::from_code` on this field, which double-hashes a 32-byte
   * hash and then fails with "Contract not in store". Passing the WASM
   * module makes `from_code(wasm)` equal the stored hash. Fixed nodes
   * expect the 32-byte hash and reject longer values — omit this option
   * there.
   */
  readonly codeField?: Uint8Array;
}

export type FreenetSubscription = () => void;

function contractParts(source: FreenetContractSource): {
  key: Uint8Array;
  codeHash: Uint8Array;
} {
  const codeHash = blake3(source.wasm);
  const keyInput = new Uint8Array(codeHash.length + source.parameters.length);
  keyInput.set(codeHash);
  keyInput.set(source.parameters, codeHash.length);
  return { key: blake3(keyInput), codeHash };
}

function errorFromUnknown(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Sole Freenet WebSocket adapter for TwistedPear.
 *
 * The SDK owns FlatBuffers framing and chunking. This wrapper owns connection
 * readiness, timeouts, reconnect-on-next-operation, and a transport-neutral
 * byte API for the rest of the repository.
 */
export class FreenetClient {
  readonly #url: URL;
  readonly #authToken: string | undefined;
  readonly #requestTimeoutMs: number;
  #api: FreenetWsApi | null = null;
  #connecting: Promise<FreenetWsApi> | null = null;
  #closed = false;
  readonly #subscriptions = new Map<string, Set<(state: Uint8Array) => void>>();
  readonly #subscriptionStarts = new Map<string, Promise<void>>();

  constructor(options: FreenetClientOptions = {}) {
    this.#url = new URL(options.url ?? DEFAULT_FREENET_URL);
    this.#authToken = options.authToken;
    this.#requestTimeoutMs =
      options.requestTimeoutMs ?? DEFAULT_FREENET_REQUEST_TIMEOUT_MS;
  }

  async put(
    source: FreenetContractSource,
    state: Uint8Array,
    options: FreenetPutOptions = {}
  ): Promise<Uint8Array> {
    const api = await this.#connection();
    const { key, codeHash } = contractParts(source);
    const contractKey = new ContractKey(key, codeHash);
    const contract = new WasmContractV1(
      new ContractCodeT(Array.from(source.wasm), Array.from(codeHash)),
      Array.from(source.parameters),
      contractKey
    );
    const request = new PutRequest(
      new ContractContainer(ContractType.WasmContractV1, contract),
      Array.from(state),
      new RelatedContractsT([]),
      options.subscribe ?? false,
      options.blockingSubscribe ?? false
    );
    const response = await this.#withinTimeout(api.put(request), "put");
    return response.key.bytes();
  }

  async get(key: Uint8Array, subscribe = false): Promise<FreenetContractRecord> {
    const api = await this.#connection();
    const response = await this.#withinTimeout(
      // A fetch path may contact a node that has state routed to it but has
      // never executed this contract. Request the contract code as well as
      // state so that first retrieval and first subscription work there.
      api.get(new GetRequest(new ContractKey(key), true, subscribe)),
      "get"
    );
    return this.#recordFromGet(response);
  }

  async update(
    key: Uint8Array,
    codeHash: Uint8Array,
    state: Uint8Array,
    options: FreenetUpdateOptions = {}
  ): Promise<void> {
    const api = await this.#connection();
    const data = new UpdateData(
      UpdateDataType.StateUpdate,
      new StateUpdate(Array.from(state))
    );
    const codeField = options.codeField ?? codeHash;
    // ContractKey's constructor rejects non-32-byte code fields. The
    // 0.2.112 workaround needs the full WASM in `code`, so build the
    // FlatBuffers object directly when the override is longer.
    const contractKey =
      codeField.length === 32
        ? new ContractKey(key, codeField)
        : ({
            get_contract_key: () =>
              new ContractKeyT(
                new ContractInstanceIdT(Array.from(key)),
                Array.from(codeField)
              )
          } as ContractKey);
    await this.#withinTimeout(
      api.update(new UpdateRequest(contractKey, data)),
      "update"
    );
  }

  async subscribe(
    key: Uint8Array,
    listener: (state: Uint8Array) => void
  ): Promise<FreenetSubscription> {
    const encoded = new ContractKey(key).encode();
    let listeners = this.#subscriptions.get(encoded);
    if (listeners === undefined) {
      listeners = new Set();
      this.#subscriptions.set(encoded, listeners);
    }
    listeners.add(listener);
    let start = this.#subscriptionStarts.get(encoded);
    if (start === undefined) {
      start = this.#blockingSubscribe(key);
      this.#subscriptionStarts.set(encoded, start);
      const clearStart = () => {
        if (this.#subscriptionStarts.get(encoded) === start) {
          this.#subscriptionStarts.delete(encoded);
        }
      };
      void start.then(clearStart, clearStart);
    }
    try {
      await start;
    } catch (error) {
      listeners.delete(listener);
      if (listeners.size === 0) this.#subscriptions.delete(encoded);
      throw error;
    }
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) this.#subscriptions.delete(encoded);
    };
  }

  async close(): Promise<void> {
    this.#closed = true;
    this.#subscriptions.clear();
    this.#subscriptionStarts.clear();
    if (this.#api !== null) {
      await this.#api
        .disconnect(new DisconnectRequest("TwistedPear client closed"))
        .catch(() => {});
    }
    this.#api = null;
    this.#connecting = null;
  }

  static deriveKey(source: FreenetContractSource): {
    key: Uint8Array;
    codeHash: Uint8Array;
  } {
    return contractParts(source);
  }

  async #connection(): Promise<FreenetWsApi> {
    if (this.#closed) throw new Error("Freenet client is closed");
    if (this.#api !== null) return this.#api;
    if (this.#connecting !== null) return this.#connecting;

    this.#connecting = new Promise<FreenetWsApi>((resolve, reject) => {
      let settled = false;
      let api: FreenetWsApi;
      const handler: ResponseHandler = {
        onContractPut() {},
        onContractGet() {},
        onContractUpdate() {},
        onContractUpdateNotification: (notification) =>
          this.#notify(notification),
        onContractNotFound() {},
        onDelegateResponse() {},
        onErr: (error) => {
          if (!settled) {
            settled = true;
            reject(new Error(error.cause));
          }
        },
        onOpen: () => {
          settled = true;
          this.#api = api;
          resolve(api);
        },
        onClose: (_code, reason) => {
          this.#api = null;
          this.#connecting = null;
          if (!settled) {
            settled = true;
            reject(new Error(`Freenet connection closed: ${reason}`));
          }
        }
      };

      api = new FreenetWsApi(
        new URL(this.#url),
        handler,
        this.#authToken
      );
    }).finally(() => {
      this.#connecting = null;
    });

    return this.#withinTimeout(this.#connecting, "connect");
  }

  async #blockingSubscribe(key: Uint8Array): Promise<void> {
    const api = await this.#connection();
    await this.#withinTimeout(
      api.get(new GetRequest(new ContractKey(key), true, true, true)),
      "subscribe"
    );
  }

  #recordFromGet(response: GetResponse): FreenetContractRecord {
    return {
      key: response.key.bytes(),
      codeHash: response.key.codePart() ?? new Uint8Array(),
      state: Uint8Array.from(response.state)
    };
  }

  #notify(notification: UpdateNotification): void {
    const listeners = this.#subscriptions.get(notification.key.encode());
    if (listeners === undefined) return;
    const update = notification.update.updateData as {
      readonly state?: number[];
      readonly delta?: number[];
    } | null;
    if (update === null) return;

    // TwistedPear's Freenet contracts emit replacement-state deltas from
    // get_state_delta. Prefer an explicit state when the SDK provides one,
    // otherwise surface that replacement delta. Supporting every SDK union
    // variant is required because the node may choose StateUpdate,
    // DeltaUpdate, or StateAndDeltaUpdate independently of the client request.
    const bytes =
      update.state !== undefined && update.state.length > 0
        ? update.state
        : update.delta;
    if (bytes === undefined) return;
    if (
      notification.update.updateDataType === UpdateDataType.NONE
    ) {
      return;
    }
    const state = Uint8Array.from(bytes);
    for (const listener of listeners) listener(state);
  }

  async #withinTimeout<T>(operation: Promise<T>, name: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Freenet ${name} timed out`)),
            this.#requestTimeoutMs
          );
        })
      ]);
    } catch (error) {
      throw errorFromUnknown(error);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
