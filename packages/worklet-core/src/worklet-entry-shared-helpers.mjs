/* global setTimeout, TextDecoder, TextEncoder */
import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";

const RUNTIME_STORE_INDEX_KEY = "twistedpear:runtime-store-index:v1";
const runtimeStoreStates = new WeakMap();

function runtimeStoreState(keys) {
  let state = runtimeStoreStates.get(keys);
  if (state === undefined) {
    state = { hydrated: null, mutations: Promise.resolve() };
    runtimeStoreStates.set(keys, state);
  }
  return state;
}

function decodeRuntimeStoreIndex(value) {
  if (value === undefined || value === null) return [];
  try {
    const parsed = JSON.parse(new TextDecoder().decode(value));
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.keys) ||
      parsed.keys.some(
        (key) => typeof key !== "string" || key === RUNTIME_STORE_INDEX_KEY,
      )
    ) {
      throw new Error("unexpected index shape");
    }
    return parsed.keys;
  } catch (error) {
    throw new Error("Invalid durable runtime store key index", {
      cause: error,
    });
  }
}

function encodeRuntimeStoreIndex(keys) {
  return new TextEncoder().encode(
    JSON.stringify({
      version: 1,
      keys: [...keys].sort(),
    }),
  );
}

async function hydrateRuntimeStoreIndex(runtime, keys, state) {
  state.hydrated ??= runtime.store
    .get(RUNTIME_STORE_INDEX_KEY)
    .then((value) => {
      for (const key of decodeRuntimeStoreIndex(value)) keys.add(key);
    });
  await state.hydrated;
}

async function persistRuntimeStoreIndex(runtime, keys) {
  await runtime.store.set(
    RUNTIME_STORE_INDEX_KEY,
    encodeRuntimeStoreIndex(keys),
  );
}

function enqueueRuntimeStoreMutation(state, operation) {
  const result = state.mutations.then(operation, operation);
  state.mutations = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function catalogEntryView(entry) {
  return {
    appId: entry.appId,
    name: entry.name,
    version: entry.version,
    publisherPublicKey: entry.publisherPublicKey,
    packageSize: entry.packageSize,
    packageHash: entry.packageHash,
    driveKey: entry.driveKey,
    resourceAvailable: entry.resourceAvailable,
    receivedAt: entry.receivedAt,
  };
}

export function peerServiceAspect(provider, service) {
  return bytesToHex(
    provider.sha256(new TextEncoder().encode(service)).subarray(0, 16),
  );
}

export function createRuntimeKeyValueStore(runtime, runtimeStoreKeys) {
  const state = runtimeStoreState(runtimeStoreKeys);
  return {
    async get(key) {
      if (key === RUNTIME_STORE_INDEX_KEY) return null;
      const value = await runtime.store.get(key);
      return value === undefined ? null : value;
    },
    async set(key, value) {
      if (key === RUNTIME_STORE_INDEX_KEY) {
        throw new Error("Reserved runtime store key");
      }
      await enqueueRuntimeStoreMutation(state, async () => {
        await hydrateRuntimeStoreIndex(runtime, runtimeStoreKeys, state);
        const known = runtimeStoreKeys.has(key);
        if (!known) {
          runtimeStoreKeys.add(key);
          try {
            await persistRuntimeStoreIndex(runtime, runtimeStoreKeys);
          } catch (error) {
            runtimeStoreKeys.delete(key);
            throw error;
          }
        }
        try {
          await runtime.store.set(key, value);
        } catch (error) {
          if (!known) {
            runtimeStoreKeys.delete(key);
            try {
              await persistRuntimeStoreIndex(runtime, runtimeStoreKeys);
            } catch (rollbackError) {
              throw new AggregateError(
                [error, rollbackError],
                "Runtime store write and index rollback failed",
              );
            }
          }
          throw error;
        }
      });
    },
    async delete(key) {
      if (key === RUNTIME_STORE_INDEX_KEY) {
        throw new Error("Reserved runtime store key");
      }
      await enqueueRuntimeStoreMutation(state, async () => {
        await hydrateRuntimeStoreIndex(runtime, runtimeStoreKeys, state);
        await runtime.store.delete(key);
        if (runtimeStoreKeys.delete(key)) {
          try {
            await persistRuntimeStoreIndex(runtime, runtimeStoreKeys);
          } catch (error) {
            runtimeStoreKeys.add(key);
            throw error;
          }
        }
      });
    },
    async list(prefix = "") {
      await state.mutations;
      await hydrateRuntimeStoreIndex(runtime, runtimeStoreKeys, state);
      return [...runtimeStoreKeys]
        .filter((key) => key.startsWith(prefix))
        .sort();
    },
  };
}

/** @param {(manager: import("../../peer-discovery/dist/index.js").PeerSessionManager) => Promise<any>} ensurePeerSessionManager */
export function createPeerSessionManagerProxy(ensurePeerSessionManager) {
  return {
    async request(appId, runtimeId, request) {
      return (await ensurePeerSessionManager()).request(
        appId,
        runtimeId,
        request,
      );
    },
    async listen(appId, runtimeId, request) {
      return (await ensurePeerSessionManager()).listen(
        appId,
        runtimeId,
        request,
      );
    },
    async diagnostics() {
      return (await ensurePeerSessionManager()).diagnostics();
    },
    list() {
      return ensurePeerSessionManager.peek?.() ?? [];
    },
    route(appId, handle) {
      const manager = ensurePeerSessionManager.peek?.();
      return manager?.route(appId, handle);
    },
    info(appId, runtimeId, handle) {
      const manager = ensurePeerSessionManager.peek?.();
      if (manager === null || manager === undefined)
        throw new Error("Unknown peer handle");
      return manager.info(appId, runtimeId, handle);
    },
    async close(appId, runtimeId, handle) {
      const manager = ensurePeerSessionManager.peek?.();
      if (manager !== null && manager !== undefined)
        await manager.close(appId, runtimeId, handle);
    },
    async closeRuntime(appId, runtimeId) {
      const manager = ensurePeerSessionManager.peek?.();
      if (manager !== null && manager !== undefined)
        await manager.closeRuntime(appId, runtimeId);
    },
  };
}

/** @param {{ getManager: () => import("../../peer-discovery/dist/index.js").PeerSessionManager | null, ensurePeerSessionManager: () => Promise<import("../../peer-discovery/dist/index.js").PeerSessionManager> }} deps */
export function createPeerSessionManagerProxyFromState(deps) {
  return {
    async request(appId, runtimeId, request) {
      return (await deps.ensurePeerSessionManager()).request(
        appId,
        runtimeId,
        request,
      );
    },
    async listen(appId, runtimeId, request) {
      return (await deps.ensurePeerSessionManager()).listen(
        appId,
        runtimeId,
        request,
      );
    },
    async diagnostics() {
      return (await deps.ensurePeerSessionManager()).diagnostics();
    },
    list(appId) {
      return deps.getManager()?.list(appId) ?? [];
    },
    route(appId, handle) {
      return deps.getManager()?.route(appId, handle);
    },
    info(appId, runtimeId, handle) {
      const manager = deps.getManager();
      if (manager === null) throw new Error("Unknown peer handle");
      return manager.info(appId, runtimeId, handle);
    },
    async close(appId, runtimeId, handle) {
      const manager = deps.getManager();
      if (manager !== null) await manager.close(appId, runtimeId, handle);
    },
    async closeRuntime(appId, runtimeId) {
      const manager = deps.getManager();
      if (manager !== null) await manager.closeRuntime(appId, runtimeId);
    },
  };
}
