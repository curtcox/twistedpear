import { bytesToHex, hexToBytes } from "@twistedpear/reticulum-ts";
import {
  FreenetClient,
  type FreenetClientOptions,
  type FreenetUpdateOptions,
} from "../core/client.js";

/**
 * Structural match for `FreenetContractBackend` in miniapp-runtime.
 * Lives in bridge-freenet so hosts can inject Freenet I/O without protocol roots.
 */
export interface FreenetContractBackendPort {
  get(keyHex: string): Promise<{ keyHex: string; stateHex: string } | null>;
  put(options: {
    readonly wasmHex: string;
    readonly parametersHex: string;
    readonly stateHex: string;
  }): Promise<{ keyHex: string }>;
  update(options: {
    readonly keyHex: string;
    readonly codeHashHex: string;
    readonly stateHex: string;
  }): Promise<void>;
}

export interface FreenetClientContractBackendOptions {
  readonly client?: FreenetClient;
  readonly clientOptions?: FreenetClientOptions;
  /** Extra UPDATE options for explicitly identified node compatibility modes. */
  readonly updateOptions?: FreenetUpdateOptions;
}

/**
 * Hex-facing Freenet adapter for the mini-app `freenet:contract` broker.
 */
export class FreenetClientContractBackend implements FreenetContractBackendPort {
  readonly #client: FreenetClient;
  readonly #ownsClient: boolean;
  readonly #updateOptions: FreenetUpdateOptions | undefined;
  readonly #wasmByKey = new Map<string, Uint8Array>();

  constructor(options: FreenetClientContractBackendOptions = {}) {
    this.#ownsClient = options.client === undefined;
    this.#client = options.client ?? new FreenetClient(options.clientOptions);
    this.#updateOptions = options.updateOptions;
  }

  get client(): FreenetClient {
    return this.#client;
  }

  async get(
    keyHex: string,
  ): Promise<{ keyHex: string; stateHex: string } | null> {
    const key = hexToBytes(keyHex);
    const record = await this.#client.get(key).catch(() => null);
    if (record === null) {
      return null;
    }
    return {
      keyHex: bytesToHex(record.key),
      stateHex: bytesToHex(record.state),
    };
  }

  async put(options: {
    readonly wasmHex: string;
    readonly parametersHex: string;
    readonly stateHex: string;
  }): Promise<{ keyHex: string }> {
    const wasm = hexToBytes(options.wasmHex);
    const parameters = hexToBytes(options.parametersHex);
    const state = hexToBytes(options.stateHex);
    const key = await this.#client.put({ wasm, parameters }, state);
    this.#wasmByKey.set(bytesToHex(key), wasm);
    return { keyHex: bytesToHex(key) };
  }

  async update(options: {
    readonly keyHex: string;
    readonly codeHashHex: string;
    readonly stateHex: string;
  }): Promise<void> {
    const key = hexToBytes(options.keyHex);
    const codeHash = hexToBytes(options.codeHashHex);
    const state = hexToBytes(options.stateHex);
    const cachedWasm = this.#wasmByKey.get(options.keyHex.toLowerCase());
    const updateOptions: FreenetUpdateOptions = {
      ...this.#updateOptions,
      ...(cachedWasm === undefined ||
      this.#updateOptions?.codeField !== undefined ||
      this.#updateOptions?.fallbackCodeField !== undefined
        ? {}
        : { fallbackCodeField: cachedWasm }),
    };
    await this.#client.update(key, codeHash, state, updateOptions);
  }

  async close(): Promise<void> {
    this.#wasmByKey.clear();
    if (this.#ownsClient) {
      await this.#client.close();
    }
  }
}

export function createFreenetContractBackend(
  options: FreenetClientOptions & {
    readonly updateOptions?: FreenetUpdateOptions;
  } = {},
): FreenetClientContractBackend {
  const { updateOptions, ...clientOptions } = options;
  return new FreenetClientContractBackend({
    clientOptions,
    ...(updateOptions === undefined ? {} : { updateOptions }),
  });
}
