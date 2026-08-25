/** Snapshot selection for a per-app data archive. Grants and install rows stay behind. */

export const APP_DATA_ARCHIVE_MAGIC = "TPAPDT01";
export const APP_DATA_ARCHIVE_EXTENSION = ".tpappdata";

export type AppDataArchiveCode =
  | "MAGIC"
  | "TRUNCATED"
  | "AUTH"
  | "FORBIDDEN"
  | "EMPTY"
  | "COLLISION"
  | "QUOTA";

export class AppDataArchiveError extends Error {
  readonly code: AppDataArchiveCode;

  constructor(code: AppDataArchiveCode, message: string) {
    super(message);
    this.name = "AppDataArchiveError";
    this.code = code;
  }
}

export type AppDataRecord = {
  readonly key: string;
  readonly seq: number;
  readonly value: Uint8Array;
};

export type AppDataSnapshot = {
  readonly appId: string;
  readonly hostApi: string;
  readonly includePending: boolean;
  readonly records: readonly AppDataRecord[];
};

export type AppDataKeyStore = {
  list(prefix?: string): Promise<readonly string[]>;
  get(key: string): Promise<Uint8Array | null>;
  seq?(key: string): Promise<number>;
};

const KV = "miniapp-kv:";
const BEE = "miniapp-bee:";
const BEE_SEQ = "miniapp-bee-seq:";
const WORKSPACE = "miniapp-workspace:";
const INBOX = "miniapp-lxmf-inbox:";
const OUTBOX = "miniapp-lxmf-outbox:";
const GRANTS = "miniapp-grants:";
const INSTALLED = "installed:";

function userPrefixes(appId: string): readonly string[] {
  return [
    `${KV}${appId}:`,
    `${BEE}${appId}:`,
    `${BEE_SEQ}${appId}:`,
    `${WORKSPACE}${appId}:`,
  ];
}

function pendingPrefixes(appId: string): readonly string[] {
  return [`${INBOX}${appId}`, `${OUTBOX}${appId}`];
}

export function appDataLivePrefixes(
  appId: string,
  includePending: boolean,
): readonly string[] {
  return [
    ...userPrefixes(appId),
    ...(includePending ? pendingPrefixes(appId) : []),
  ];
}

export function appDataInstalledPrefix(appId: string): string {
  return `${INSTALLED}${appId}:`;
}

export function isForbiddenAppDataKey(key: string): boolean {
  return key.startsWith(GRANTS) || key.startsWith(INSTALLED);
}

export function isExportableAppDataKey(
  appId: string,
  key: string,
  includePending: boolean,
): boolean {
  if (isForbiddenAppDataKey(key)) return false;
  if (userPrefixes(appId).some((prefix) => key.startsWith(prefix)))
    return true;
  if (!includePending) return false;
  return pendingPrefixes(appId).some(
    (prefix) => key === prefix || key.startsWith(`${prefix}:`),
  );
}

export function assertExportableSnapshot(snapshot: AppDataSnapshot): void {
  if (snapshot.appId.length === 0) {
    throw new AppDataArchiveError("EMPTY", "appId is required");
  }
  for (const record of snapshot.records) {
    if (isForbiddenAppDataKey(record.key)) {
      throw new AppDataArchiveError(
        "FORBIDDEN",
        `App data export cannot include ${record.key}`,
      );
    }
    if (
      !isExportableAppDataKey(
        snapshot.appId,
        record.key,
        snapshot.includePending,
      )
    ) {
      throw new AppDataArchiveError(
        "FORBIDDEN",
        `App data export cannot include ${record.key}`,
      );
    }
  }
}

export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function u16be(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, false);
  return bytes;
}

export function u32be(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

export function concatBytes(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const bytes = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

export function dataViewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function snapshotAppData(
  store: AppDataKeyStore,
  appId: string,
  options: { readonly hostApi: string; readonly includePending?: boolean },
): Promise<AppDataSnapshot> {
  const includePending = options.includePending === true;
  const prefixes = appDataLivePrefixes(appId, includePending);
  const keys = new Set<string>();
  for (const prefix of prefixes) {
    for (const key of await store.list(prefix)) keys.add(key);
  }
  const records: AppDataRecord[] = [];
  for (const key of [...keys].sort()) {
    if (!isExportableAppDataKey(appId, key, includePending)) {
      if (isForbiddenAppDataKey(key)) {
        throw new AppDataArchiveError(
          "FORBIDDEN",
          `App data export cannot include ${key}`,
        );
      }
      continue;
    }
    const value = await store.get(key);
    if (value === null) continue;
    records.push({
      key,
      seq: (await store.seq?.(key)) ?? 0,
      value,
    });
  }
  const snapshot = {
    appId,
    hostApi: options.hostApi,
    includePending,
    records,
  };
  assertExportableSnapshot(snapshot);
  return snapshot;
}
