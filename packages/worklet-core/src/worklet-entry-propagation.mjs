/* global TextDecoder, TextEncoder */
import {
  bytesToHex,
  hexToBytes,
} from "../../reticulum-ts/dist/crypto/bytes.js";

export function createWorkletPropagationPersistenceOps(deps) {
  async function loadPropagationCache() {
    const raw = await deps.runtime.store.get(deps.propagationStoreKey);
    if (raw === undefined) {
      deps.setPropagationStoreCache({ entries: [] });
      return;
    }
    try {
      deps.setPropagationStoreCache(JSON.parse(new TextDecoder().decode(raw)));
    } catch {
      deps.setPropagationStoreCache({ entries: [] });
    }
  }

  function createPersistence() {
    return {
      load() {
        return (deps.getPropagationStoreCache()?.entries ?? []).map(
          (entry) => ({
            transientId: hexToBytes(entry.transientIdHex),
            lxmfData: hexToBytes(entry.lxmfDataHex),
            storedAt: entry.storedAt,
          }),
        );
      },
      save(entries) {
        const cache = {
          entries: entries.map((entry) => ({
            transientIdHex: bytesToHex(entry.transientId),
            lxmfDataHex: bytesToHex(entry.lxmfData),
            storedAt: entry.storedAt,
          })),
        };
        deps.setPropagationStoreCache(cache);
        void deps.runtime.store.set(
          deps.propagationStoreKey,
          new TextEncoder().encode(JSON.stringify(cache)),
        );
      },
    };
  }

  return { loadPropagationCache, createPersistence };
}
