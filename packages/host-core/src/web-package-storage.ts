import {
  InstalledPackageStore,
  verifyPackage,
  type InstalledPackageRecord,
} from "@twistedpear/app-registry";
import {
  CasStore,
  encode256t,
  type CasKeyValueStore,
} from "@twistedpear/cas-256t";
import type { CryptoProvider, KeyValueStore } from "@twistedpear/reticulum-ts";
import { PureCryptoProvider } from "@twistedpear/reticulum-ts/web";
import type { WebIndexedDB } from "@twistedpear/reticulum-ts/web";

const DEFAULT_DB_NAME = "twistedpear-web-packages";
const DEFAULT_PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;
const DEFAULT_HOST_API_VERSION = "0.1.0";
const KV_OBJECT_STORE = "kv";

export interface WebStorageManager {
  estimate(): Promise<{ usage?: number; quota?: number }>;
  persist?(): Promise<boolean>;
  persisted?(): Promise<boolean>;
  getDirectory?(): Promise<WebOpfsRootDirectory>;
}

export interface WebOpfsRootDirectory {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<WebOpfsDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<WebOpfsFileHandle>;
}

export interface WebOpfsDirectoryHandle {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<WebOpfsDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<WebOpfsFileHandle>;
}

export interface WebOpfsFileHandle {
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<{
    write(data: Uint8Array): Promise<void>;
    close(): Promise<void>;
  }>;
}

export interface WebPackageStorageOptions {
  readonly dbName?: string;
  readonly packageQuotaBytes?: number;
  readonly hostApiVersion?: string;
  readonly indexedDB?: WebIndexedDB;
  readonly storage?: WebStorageManager;
  readonly provider?: CryptoProvider;
}

export interface WebStorageQuotaInfo {
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly persisted: boolean;
  readonly packageUsedBytes: number;
  readonly packageQuotaBytes: number;
  readonly archiveBackend: "opfs" | "indexeddb";
}

export interface WebPackageInstallResult {
  readonly appId: string;
  readonly version: string;
  readonly packageHash: string;
  readonly t256: string;
  readonly archivePath: string;
  readonly archiveBytes: number;
}

export interface WebPackageStorageSession {
  readonly archiveBackend: "opfs" | "indexeddb";
  installArchive(archiveBytes: Uint8Array): Promise<WebPackageInstallResult>;
  readArchive(appId: string, version: string): Promise<Uint8Array | null>;
  listInstalled(): ReadonlyArray<InstalledPackageRecord>;
  activeVersion(appId: string): string | null;
  getPackageUsedBytes(): number;
  getQuotaInfo(): Promise<WebStorageQuotaInfo>;
  requestPersistence(): Promise<boolean>;
}

interface WebIdbObjectStore {
  get(key: string): WebIdbRequest<Uint8Array | ArrayBuffer | undefined>;
  put(value: Uint8Array, key: string): WebIdbRequest<unknown>;
  delete(key: string): WebIdbRequest<unknown>;
  getAllKeys(): WebIdbRequest<ReadonlyArray<string>>;
}

interface WebIdbRequest<T> {
  readonly result: T;
  readonly error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface WebIdbDatabase {
  createObjectStore(name: string): void;
  transaction(
    name: string,
    mode: "readonly" | "readwrite",
  ): { objectStore(name: string): WebIdbObjectStore };
}

interface WebIdbOpenRequest extends WebIdbRequest<WebIdbDatabase> {
  onupgradeneeded:
    ((event: { readonly target: WebIdbOpenRequest | null }) => void) | null;
}

class IndexedDbBlobStore implements CasKeyValueStore {
  private readonly ready: Promise<WebIdbDatabase>;

  constructor(
    indexedDB: WebIndexedDB,
    private readonly dbName: string,
  ) {
    this.ready = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1) as WebIdbOpenRequest;
      request.onupgradeneeded = (event) => {
        event.target?.result.createObjectStore(KV_OBJECT_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          request.error ?? new Error(`Failed to open IndexedDB ${dbName}`),
        );
    });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const result = await this.request((store) => store.get(key), "readonly");
    if (result === undefined) {
      return null;
    }

    return result instanceof Uint8Array
      ? Uint8Array.from(result)
      : new Uint8Array(result);
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    await this.request(
      (store) => store.put(Uint8Array.from(value), key),
      "readwrite",
    );
  }

  async delete(key: string): Promise<void> {
    await this.request((store) => store.delete(key), "readwrite");
  }

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    const keys = await this.request((store) => store.getAllKeys(), "readonly");
    return keys.filter((key) => key.startsWith(prefix));
  }

  private async request<T>(
    makeRequest: (store: WebIdbObjectStore) => WebIdbRequest<T>,
    mode: "readonly" | "readwrite",
  ): Promise<T> {
    const database = await this.ready;
    const request = makeRequest(
      database.transaction(KV_OBJECT_STORE, mode).objectStore(KV_OBJECT_STORE),
    );
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }
}

class IndexedDbArchiveStore {
  private readonly archivePrefix = "archive:";

  constructor(private readonly kv: IndexedDbBlobStore) {}

  async write(path: string, bytes: Uint8Array): Promise<void> {
    await this.kv.set(this.key(path), bytes);
  }

  async read(path: string): Promise<Uint8Array | null> {
    return this.kv.get(this.key(path));
  }

  private key(path: string): string {
    return `${this.archivePrefix}${path}`;
  }
}

class OpfsArchiveStore {
  constructor(private readonly root: WebOpfsRootDirectory) {}

  async write(path: string, bytes: Uint8Array): Promise<void> {
    const segments = path.split("/").filter((segment) => segment.length > 0);
    const fileName = segments.pop();
    if (fileName === undefined) {
      throw new Error(`Invalid archive path: ${path}`);
    }

    let directory = this.root;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }

    const fileHandle = await directory.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(bytes);
    await writable.close();
  }

  async read(path: string): Promise<Uint8Array | null> {
    try {
      const segments = path.split("/").filter((segment) => segment.length > 0);
      const fileName = segments.pop();
      if (fileName === undefined) {
        return null;
      }

      let directory = this.root;
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment);
      }

      const fileHandle = await directory.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }
}

interface ArchiveStore {
  write(path: string, bytes: Uint8Array): Promise<void>;
  read(path: string): Promise<Uint8Array | null>;
}

function packageArchivePath(appId: string, version: string): string {
  return `packages/${appId}/${version}.tpkg`;
}

function resolveBrowserStorage(
  options: WebPackageStorageOptions,
): WebStorageManager | undefined {
  return (
    options.storage ??
    (
      globalThis as {
        readonly navigator?: { readonly storage?: WebStorageManager };
      }
    ).navigator?.storage
  );
}

function resolveIndexedDb(options: WebPackageStorageOptions): WebIndexedDB {
  const indexedDB =
    options.indexedDB ??
    (globalThis as { readonly indexedDB?: WebIndexedDB }).indexedDB;
  if (indexedDB === undefined) {
    throw new Error("IndexedDB is required for web package storage");
  }

  return indexedDB;
}

async function createArchiveStore(
  options: WebPackageStorageOptions,
  kv: IndexedDbBlobStore,
): Promise<{ store: ArchiveStore; backend: "opfs" | "indexeddb" }> {
  const storage = resolveBrowserStorage(options);
  if (storage?.getDirectory !== undefined) {
    try {
      const root = await storage.getDirectory();
      return { store: new OpfsArchiveStore(root), backend: "opfs" };
    } catch {
      // Fall through to IndexedDB archive storage.
    }
  }

  return { store: new IndexedDbArchiveStore(kv), backend: "indexeddb" };
}

function catalogKeyValueAdapter(kv: IndexedDbBlobStore): KeyValueStore {
  return {
    async get(key: string): Promise<Uint8Array | undefined> {
      const value = await kv.get(key);
      return value ?? undefined;
    },
    async set(key: string, value: Uint8Array): Promise<void> {
      await kv.set(key, value);
    },
    async delete(key: string): Promise<void> {
      await kv.delete(key);
    },
  };
}

class WebPackageStorage implements WebPackageStorageSession {
  readonly archiveBackend: "opfs" | "indexeddb";

  private readonly provider: CryptoProvider;
  private readonly hostApiVersion: string;
  private readonly installedStore: InstalledPackageStore;
  private readonly casStore: CasStore;
  private readonly archiveStore: ArchiveStore;
  private readonly storage: WebStorageManager | undefined;
  private readonly catalogKv: KeyValueStore;

  constructor(
    options: WebPackageStorageOptions,
    kv: IndexedDbBlobStore,
    archive: { store: ArchiveStore; backend: "opfs" | "indexeddb" },
    installedStore: InstalledPackageStore,
  ) {
    this.provider = options.provider ?? new PureCryptoProvider();
    this.hostApiVersion = options.hostApiVersion ?? DEFAULT_HOST_API_VERSION;
    this.installedStore = installedStore;
    this.archiveStore = archive.store;
    this.archiveBackend = archive.backend;
    this.storage = resolveBrowserStorage(options);
    this.catalogKv = catalogKeyValueAdapter(kv);
    this.casStore = new CasStore(kv, (data) => this.provider.sha512(data));
  }

  async installArchive(
    archiveBytes: Uint8Array,
  ): Promise<WebPackageInstallResult> {
    const verified = verifyPackage(this.provider, archiveBytes, {
      hostApiVersion: this.hostApiVersion,
    });
    const appId = verified.manifest.name;
    const version = verified.manifest.version;
    const archivePath = packageArchivePath(appId, version);
    const existing = this.installedStore.get(appId, version);
    if (existing !== null) {
      const stored = await this.archiveStore.read(archivePath);
      if (stored !== null && stored.length === archiveBytes.length) {
        return {
          appId,
          version,
          packageHash: existing.packageHash,
          t256: encode256t(archiveBytes, (data) => this.provider.sha512(data)),
          archivePath,
          archiveBytes: stored.length,
        };
      }
    }

    const t256 = await this.casStore.put(archiveBytes);
    await this.archiveStore.write(archivePath, archiveBytes);
    this.installedStore.install(
      {
        appId,
        version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath,
      },
      archiveBytes.length,
    );
    await this.installedStore.save(this.catalogKv);

    return {
      appId,
      version,
      packageHash: verified.packageHash,
      t256,
      archivePath,
      archiveBytes: archiveBytes.length,
    };
  }

  async readArchive(
    appId: string,
    version: string,
  ): Promise<Uint8Array | null> {
    const record = this.installedStore.get(appId, version);
    if (record === null) {
      return null;
    }

    return this.archiveStore.read(record.archivePath);
  }

  listInstalled(): ReadonlyArray<InstalledPackageRecord> {
    return this.installedStore.list();
  }

  activeVersion(appId: string): string | null {
    return this.installedStore.activeVersion(appId);
  }

  getPackageUsedBytes(): number {
    return this.installedStore.storageUsedBytes();
  }

  async getQuotaInfo(): Promise<WebStorageQuotaInfo> {
    const storage = this.storage;
    const estimate = storage === undefined ? {} : await storage.estimate();
    const persisted =
      storage === undefined || storage.persisted === undefined
        ? false
        : await storage.persisted();
    return {
      usageBytes: estimate.usage ?? null,
      quotaBytes: estimate.quota ?? null,
      persisted,
      packageUsedBytes: this.getPackageUsedBytes(),
      packageQuotaBytes: this.installedStore.quotaBytes,
      archiveBackend: this.archiveBackend,
    };
  }

  async requestPersistence(): Promise<boolean> {
    if (this.storage?.persist === undefined) {
      return false;
    }

    return this.storage.persist();
  }
}

export async function createWebPackageStorage(
  options: WebPackageStorageOptions = {},
): Promise<WebPackageStorageSession> {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const kv = new IndexedDbBlobStore(resolveIndexedDb(options), dbName);
  const archive = await createArchiveStore(options, kv);
  const installedStore = new InstalledPackageStore(
    options.packageQuotaBytes ?? DEFAULT_PACKAGE_QUOTA_BYTES,
  );
  await installedStore.load(catalogKeyValueAdapter(kv));
  return new WebPackageStorage(options, kv, archive, installedStore);
}

export async function resetWebPackageStorage(
  options: WebPackageStorageOptions = {},
): Promise<void> {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const indexedDB = resolveIndexedDb(options) as WebIndexedDB & {
    deleteDatabase(name: string): WebIdbRequest<undefined>;
  };

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete web package DB"));
  });
}
