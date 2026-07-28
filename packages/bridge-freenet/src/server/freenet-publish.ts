import {
  verify256t,
  verifyCasLocator,
  type CasLocator
} from "@twistedpear/cas-256t";
import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import { FreenetClient } from "../core/client.js";
import {
  encodeFreenetLocatorState,
  locatorContractParameters
} from "../core/locator-contract.js";

export interface FreenetPublishOptions {
  readonly provider: CryptoProvider;
  readonly client: FreenetClient;
  readonly locatorContractWasm: Uint8Array;
  readonly locator: CasLocator;
  readonly archiveBytes: Uint8Array;
}

export interface FreenetPublishResult {
  readonly contractKey: Uint8Array;
  readonly stateBytes: number;
}

export async function publishPackageToFreenet(
  options: FreenetPublishOptions
): Promise<FreenetPublishResult> {
  if (!verifyCasLocator(options.provider, options.locator)) {
    throw new Error("Refusing to publish an invalid Freenet locator signature");
  }
  if (options.locator.packageSize !== options.archiveBytes.length) {
    throw new Error("Refusing to publish a Freenet package with a mismatched size");
  }
  if (
    !verify256t(
      options.locator.t256,
      options.archiveBytes,
      (bytes) => options.provider.sha512(bytes)
    )
  ) {
    throw new Error("Refusing to publish a Freenet package with a mismatched 256t id");
  }

  const state = encodeFreenetLocatorState({
    locator: options.locator,
    archiveBytes: options.archiveBytes
  });
  const contractKey = await options.client.put(
    {
      wasm: options.locatorContractWasm,
      parameters: locatorContractParameters(options.locator.t256)
    },
    state
  );
  return { contractKey, stateBytes: state.length };
}
