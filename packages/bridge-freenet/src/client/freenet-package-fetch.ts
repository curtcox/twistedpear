import {
  encodeCasLocator,
  verify256t,
  verifyCasLocator,
  type CasLocator,
} from "@twistedpear/cas-256t";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { FreenetClient } from "../core/client.js";
import {
  decodeFreenetLocatorState,
  locatorContractParameters,
} from "../core/locator-contract.js";

export interface FreenetPackageFetcherOptions {
  readonly provider: CryptoProvider;
  readonly client: FreenetClient;
  readonly locatorContractWasm: Uint8Array;
}

export class FreenetPackageFetcher {
  readonly #provider: CryptoProvider;
  readonly #client: FreenetClient;
  readonly #locatorContractWasm: Uint8Array;

  constructor(options: FreenetPackageFetcherOptions) {
    this.#provider = options.provider;
    this.#client = options.client;
    this.#locatorContractWasm = options.locatorContractWasm;
  }

  async fetchLocator(locator: CasLocator): Promise<Uint8Array> {
    if (!verifyCasLocator(this.#provider, locator)) {
      throw new Error("Freenet locator signature is invalid");
    }
    const source = {
      wasm: this.#locatorContractWasm,
      parameters: locatorContractParameters(locator.t256),
    };
    const { key } = FreenetClient.deriveKey(source);
    const record = await this.#client.get(key);
    const state = decodeFreenetLocatorState(record.state);
    const expectedLocator = encodeCasLocator(locator);
    const returnedLocator = encodeCasLocator(state.locator);
    if (
      expectedLocator.length !== returnedLocator.length ||
      expectedLocator.some((value, index) => returnedLocator[index] !== value)
    ) {
      throw new Error("Freenet contract returned a different signed locator");
    }
    if (!verifyCasLocator(this.#provider, state.locator)) {
      throw new Error("Freenet contract locator signature is invalid");
    }
    if (
      !verify256t(locator.t256, state.archiveBytes, (bytes) =>
        this.#provider.sha512(bytes),
      )
    ) {
      throw new Error("Freenet package does not match its 256t id");
    }
    return state.archiveBytes;
  }
}
