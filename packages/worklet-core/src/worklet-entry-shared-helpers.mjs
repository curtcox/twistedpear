/* global setTimeout, TextEncoder */
import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";

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
  return {
    async get(key) {
      const value = await runtime.store.get(key);
      return value === undefined ? null : value;
    },
    async set(key, value) {
      runtimeStoreKeys.add(key);
      await runtime.store.set(key, value);
    },
    async delete(key) {
      runtimeStoreKeys.delete(key);
      await runtime.store.delete(key);
    },
    async list(prefix = "") {
      return [...runtimeStoreKeys].filter((key) => key.startsWith(prefix));
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
