import type { CasLocator } from "@twistedpear/cas-256t";
import { FreenetClient } from "../core/client.js";
import {
  encodeFreenetLocatorState,
  locatorContractParameters
} from "../core/locator-contract.js";

export interface FreenetPublishOptions {
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
