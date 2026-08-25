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

function refuseIfOccupied(
  liveKeys: readonly string[],
  collision: string,
  appId: string,
): void {
  if (liveKeys.length > 0 && collision !== "replace") {
    throw new AppDataArchiveError(
      "COLLISION",
      `App data for ${appId} already exists; pass --replace to overwrite`,
    );
  }
}

async function assertQuotaFits(
  store: AppDataMutableStore,
  snapshot: AppDataSnapshot,
  liveKeys: readonly string[],
  collision: string,
  quotaBytes: number | undefined,
): Promise<void> {
  if (quotaBytes === undefined) return;
  const incoming = snapshot.records.reduce(
    (sum, record) => sum + record.key.length + record.value.length,
    0,
  );
  const allKeys = [...(await store.list())].filter(
    (key) => !key.startsWith(`${STAGING}${snapshot.appId}:`),
  );
  const liveSet = new Set(liveKeys);
  const keep =
    collision === "replace"
      ? allKeys.filter((key) => !liveSet.has(key))
      : allKeys;
  const used = (await byteSize(store, keep)) + incoming;
  if (used > quotaBytes) {
    throw new AppDataArchiveError(
      "QUOTA",
      `Archive is ${incoming} bytes; store quota is ${quotaBytes} bytes (${used} bytes would be used)`,
    );
  }
}

async function stageIncoming(
  store: AppDataMutableStore,
  snapshot: AppDataSnapshot,
): Promise<string[]> {
  const stagedKeys: string[] = [];
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
  return stagedKeys;
}

async function commitIncoming(
  store: AppDataMutableStore,
  snapshot: AppDataSnapshot,
): Promise<void> {
  for (const record of snapshot.records) {
    await store.put(record.key, record.value, record.seq);
  }
}

async function rollbackLive(
  store: AppDataMutableStore,
  snapshot: AppDataSnapshot,
): Promise<void> {
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

export async function restoreAppData(
  store: AppDataMutableStore,
  snapshot: AppDataSnapshot,
  options: RestoreAppDataOptions = {},
): Promise<RestoreAppDataResult> {
  assertExportableSnapshot(snapshot);
  const collision = options.collision ?? "refuse";
  const liveKeys = await listLiveKeys(store, snapshot);
  refuseIfOccupied(liveKeys, collision, snapshot.appId);
  await assertQuotaFits(
    store,
    snapshot,
    liveKeys,
    collision,
    options.quotaBytes,
  );
  await deleteKeys(store, await store.list(`${STAGING}${snapshot.appId}:`));
  const stagedKeys: string[] = [];
  let liveCleared = false;
  try {
    stagedKeys.push(...(await stageIncoming(store, snapshot)));
    if (collision === "replace") {
      await deleteKeys(store, liveKeys);
      liveCleared = true;
    }
    await commitIncoming(store, snapshot);
  } catch (error) {
    if (liveCleared) await rollbackLive(store, snapshot);
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
