// @ts-nocheck
import { TrustStore } from "../../app-registry/dist/index.js";

export function createTrustStoreOps(deps) {
  let trustStore = null;

  function ensureTrustStore() {
    if (trustStore === null) {
      trustStore = new TrustStore(deps.runtimeKeyValueStore());
    }
    return trustStore;
  }

  async function pushTrustList() {
    deps.send({ type: "trust", entries: await ensureTrustStore().list() });
  }

  return { ensureTrustStore, pushTrustList };
}
