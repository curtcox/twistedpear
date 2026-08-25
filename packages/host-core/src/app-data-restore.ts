/** Atomic restore of a per-app data snapshot. Grants stay behind. */

import {
  AppDataArchiveError,
  appDataInstalledPrefix,
  appDataLivePrefixes,
  assertExportableSnapshot,
  isExportableAppDataKey,
  isForbiddenAppDataKey,
  type AppDataKeyStore,
  type AppDataSnapshot,
} from "./app-data-archive.js";

const STAGING = "__tp-restore:";

export const APP_DATA_ADDRESS_WARNING =
  "Your data moves; your app's address does not.";

export type AppDataMutableStore = AppDataKeyStore & {
  put(key: string, value: Uint8Array, seq: number): Promise<void>;
  delete(key: string): Promise<void>;
};

export type RestoreAppDataOptions = {
  readonly collision?: "refuse" | "replace";
  readonly quotaBytes?: number;
};

export type RestoreAppDataResult = {
  readonly appId: string;
  readonly restored: number;
  readonly replaced: boolean;
  readonly parked: boolean;
};

function stagingKey(appId: string, key: string): string {
  return `${STAGING}${appId}:${key}`;
}

async function listMatching(
  store: AppDataKeyStore,
  prefix: string,
): Promise<readonly string[]> {
  return store.list(prefix);
}

async function listLiveKeys(
  store: AppDataKeyStore,
  snapshot: AppDataSnapshot,
): Promise<string[]> {
  const keys: string[] = [];
  for (const prefix of appDataLivePrefixes(
    snapshot.appId,
    snapshot.includePending,
  )) {
    for (const key of await listMatching(store, prefix)) {
      if (
        isExportableAppDataKey(snapshot.appId, key, snapshot.includePending)
      ) {
        keys.push(key);
      }
    }
  }
  return keys;
}

async function deleteKeys(
  store: AppDataMutableStore,
  keys: readonly string[],
): Promise<void> {
  for (const key of keys) await store.delete(key);
}

async function byteSize(
  store: AppDataKeyStore,
  keys: readonly string[],
): Promise<number> {
  let total = 0;
  for (const key of keys) {
    const value = await store.get(key);
    if (value !== null) total += key.length + value.length;
  }
  return total;
}

export async function restoreAppData(
  store: AppDataMutableStore,
  snapshot: AppDataSnapshot,
  options: RestoreAppDataOptions = {},
): Promise<RestoreAppDataResult> {
  assertExportableSnapshot(snapshot);
  const collision = options.collision ?? "refuse";
  const liveKeys = await listLiveKeys(store, snapshot);
  if (liveKeys.length > 0 && collision !== "replace") {
    throw new AppDataArchiveError(
      "COLLISION",
      `App data for ${snapshot.appId} already exists; pass --replace to overwrite`,
    );
  }

  const incoming = snapshot.records.reduce(
    (sum, record) => sum + record.key.length + record.value.length,
    0,
  );
  if (options.quotaBytes !== undefined) {
    const allKeys = [...(await store.list())].filter(
      (key) => !key.startsWith(`${STAGING}${snapshot.appId}:`),
    );
    const liveSet = new Set(liveKeys);
    const keep =
      collision === "replace"
        ? allKeys.filter((key) => !liveSet.has(key))
        : allKeys;
    const used = (await byteSize(store, keep)) + incoming;
    if (used > options.quotaBytes) {
      throw new AppDataArchiveError(
        "QUOTA",
        `Archive is ${incoming} bytes; store quota is ${options.quotaBytes} bytes (${used} bytes would be used)`,
      );
    }
  }

  const leftovers = await store.list(`${STAGING}${snapshot.appId}:`);
  await deleteKeys(store, leftovers);

  const stagedKeys: string[] = [];
  let liveCleared = false;
  try {
    for (const record of snapshot.records) {
      if (isForbiddenAppDataKey(record.key)) {
        throw new AppDataArchiveError(
          "FORBIDDEN",
          `App data restore cannot include ${record.key}`,
        );
      }
      const staged = stagingKey(snapshot.appId, record.key);
      await store.put(staged, record.value, record.seq);
      stagedKeys.push(staged);
    }
    if (collision === "replace") {
      await deleteKeys(store, liveKeys);
      liveCleared = true;
    }
    for (const record of snapshot.records) {
      await store.put(record.key, record.value, record.seq);
    }
  } catch (error) {
    if (liveCleared) {
      for (const record of snapshot.records) {
        const staged = await store.get(stagingKey(snapshot.appId, record.key));
        if (staged === null) continue;
        try {
          await store.put(record.key, staged, record.seq);
        } catch {
          break;
        }
      }
    }
    throw error;
  } finally {
    await deleteKeys(store, stagedKeys);
  }

  const installed = await store.list(appDataInstalledPrefix(snapshot.appId));
  return {
    appId: snapshot.appId,
    restored: snapshot.records.length,
    replaced: liveKeys.length > 0,
    parked: installed.length === 0,
  };
}
