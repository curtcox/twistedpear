import type { CryptoProvider, KeyValueStore } from "@twistedpear/reticulum-ts";
import { Identity, hexToBytes } from "@twistedpear/reticulum-ts";
import type { AppAnnounceSummary } from "./announce.js";
import { decodeAppAnnounceData, verifyAppAnnounceSummary } from "./announce.js";
import { compareSemver, type AppManifest } from "./manifest.js";
import { verifyManifestSignature } from "./signing.js";

export const DEFAULT_CATALOG_MAX_ENTRIES = 256;
export const DEFAULT_CATALOG_MAX_PER_PUBLISHER = 16;
export const DEFAULT_CATALOG_ENTRY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CatalogEntry {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly name: string;
  readonly version: string;
  readonly packageSize: number;
  readonly packageHash: string;
  readonly driveKey: string;
  readonly resourceAvailable: boolean;
  readonly destinationHash: string;
  readonly receivedAt: number;
  readonly expiresAt: number;
  readonly manifest: AppManifest | null;
}

export interface CatalogIngestOptions {
  readonly destinationHash: string;
  readonly appData: Uint8Array;
  readonly manifest?: AppManifest;
  readonly packageHash?: string;
  readonly now?: number;
}

export interface CatalogStoreOptions {
  readonly maxEntries?: number;
  readonly maxPerPublisher?: number;
  readonly entryTtlMs?: number;
}

export class CatalogStore {
  private readonly entries = new Map<string, CatalogEntry>();
  private readonly pinnedKeys = new Map<string, string>();
  private readonly publisherCounts = new Map<string, number>();

  constructor(
    private readonly provider: CryptoProvider,
    private readonly options: CatalogStoreOptions = {}
  ) {}

  get maxEntries(): number {
    return this.options.maxEntries ?? DEFAULT_CATALOG_MAX_ENTRIES;
  }

  get maxPerPublisher(): number {
    return this.options.maxPerPublisher ?? DEFAULT_CATALOG_MAX_PER_PUBLISHER;
  }

  get entryTtlMs(): number {
    return this.options.entryTtlMs ?? DEFAULT_CATALOG_ENTRY_TTL_MS;
  }

  list(): ReadonlyArray<CatalogEntry> {
    this.pruneExpired();
    return [...this.entries.values()].sort((left, right) => right.receivedAt - left.receivedAt);
  }

  get(appId: string): CatalogEntry | null {
    this.pruneExpired();
    return this.entries.get(appId) ?? null;
  }

  ingest(options: CatalogIngestOptions): CatalogEntry | null {
    const now = options.now ?? Date.now();
    let summary: AppAnnounceSummary;

    try {
      summary = decodeAppAnnounceData(options.appData);
    } catch {
      return null;
    }

    if (summary.formatVersion !== 1) {
      return null;
    }

    if (options.manifest !== undefined) {
      const publisherIdentity = Identity.fromPublicKey(this.provider, hexToBytes(options.manifest.publisherPublicKey));
      if (publisherIdentity === null) {
        return null;
      }

      if (!verifyAppAnnounceSummary(this.provider, summary, options.manifest, publisherIdentity, options.packageHash ?? summary.packageHash)) {
        return null;
      }
    }

    if (options.manifest !== undefined && !verifyManifestSignature(this.provider, options.manifest)) {
      return null;
    }

    const appId = `${summary.publisherKeyHash}:${summary.name}`;
    const pinnedKey = this.pinnedKeys.get(appId);

    if (pinnedKey !== undefined && pinnedKey !== summary.publisherKeyHash) {
      return null;
    }

    const existing = this.entries.get(appId);
    if (existing !== undefined) {
      if (existing.publisherPublicKey !== summary.publisherKeyHash) {
        return null;
      }

      if (compareSemver(summary.version, existing.version) < 0) {
        return null;
      }
    } else if (this.entries.size >= this.maxEntries) {
      return null;
    }

    const publisherCount = this.publisherCounts.get(summary.publisherKeyHash) ?? 0;
    if (existing === undefined && publisherCount >= this.maxPerPublisher) {
      return null;
    }

    const entry: CatalogEntry = {
      appId,
      publisherPublicKey: summary.publisherKeyHash,
      name: summary.name,
      version: summary.version,
      packageSize: summary.packageSize,
      packageHash: options.packageHash ?? summary.packageHash,
      driveKey: summary.driveKey,
      resourceAvailable: summary.resourceAvailable,
      destinationHash: options.destinationHash,
      receivedAt: now,
      expiresAt: now + this.entryTtlMs,
      manifest: options.manifest ?? existing?.manifest ?? null
    };

    if (existing === undefined) {
      this.publisherCounts.set(summary.publisherKeyHash, publisherCount + 1);
      this.pinnedKeys.set(appId, summary.publisherKeyHash);
    }

    this.entries.set(appId, entry);
    return entry;
  }

  remove(appId: string): boolean {
    const entry = this.entries.get(appId);
    if (entry === undefined) {
      return false;
    }

    this.entries.delete(appId);
    const count = this.publisherCounts.get(entry.publisherPublicKey) ?? 1;
    if (count <= 1) {
      this.publisherCounts.delete(entry.publisherPublicKey);
    } else {
      this.publisherCounts.set(entry.publisherPublicKey, count - 1);
    }

    return true;
  }

  pruneExpired(now = Date.now()): number {
    let removed = 0;

    for (const [appId, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.remove(appId);
        removed += 1;
      }
    }

    return removed;
  }

  async save(store: KeyValueStore): Promise<void> {
    const payload = {
      entries: [...this.entries.entries()],
      pinnedKeys: [...this.pinnedKeys.entries()],
      publisherCounts: [...this.publisherCounts.entries()]
    };

    await store.set("catalog", new TextEncoder().encode(JSON.stringify(payload)));
  }

  async load(store: KeyValueStore): Promise<void> {
    const raw = await store.get("catalog");
    if (raw === null) {
      return;
    }

    const payload = JSON.parse(new TextDecoder().decode(raw)) as {
      entries: ReadonlyArray<[string, CatalogEntry]>;
      pinnedKeys: ReadonlyArray<[string, string]>;
      publisherCounts: ReadonlyArray<[string, number]>;
    };

    this.entries.clear();
    this.pinnedKeys.clear();
    this.publisherCounts.clear();

    for (const [key, value] of payload.entries) {
      this.entries.set(key, value);
    }

    for (const [key, value] of payload.pinnedKeys) {
      this.pinnedKeys.set(key, value);
    }

    for (const [key, value] of payload.publisherCounts) {
      this.publisherCounts.set(key, value);
    }
  }
}

export function catalogEntryKey(entry: CatalogEntry): string {
  return entry.appId;
}

export function installedPackageKey(appId: string, version: string): string {
  return `installed:${appId}:${version}`;
}

export interface InstalledPackageRecord {
  readonly appId: string;
  readonly version: string;
  readonly packageHash: string;
  readonly installedAt: number;
  readonly manifest: AppManifest;
  readonly archivePath: string;
}

export class InstalledPackageStore {
  private readonly packages = new Map<string, InstalledPackageRecord>();
  private readonly versionsByApp = new Map<string, string[]>();

  constructor(
    readonly quotaBytes: number,
    private usedBytes = 0
  ) {}

  list(): ReadonlyArray<InstalledPackageRecord> {
    return [...this.packages.values()].sort((left, right) => right.installedAt - left.installedAt);
  }

  get(appId: string, version: string): InstalledPackageRecord | null {
    return this.packages.get(installedPackageKey(appId, version)) ?? null;
  }

  latestVersion(appId: string): string | null {
    const versions = this.versionsByApp.get(appId);
    if (versions === undefined || versions.length === 0) {
      return null;
    }

    return versions[versions.length - 1] ?? null;
  }

  previousVersion(appId: string): string | null {
    const versions = this.versionsByApp.get(appId);
    if (versions === undefined || versions.length < 2) {
      return null;
    }

    return versions[versions.length - 2] ?? null;
  }

  canInstall(sizeBytes: number): boolean {
    return this.usedBytes + sizeBytes <= this.quotaBytes;
  }

  install(record: InstalledPackageRecord, sizeBytes: number): void {
    const key = installedPackageKey(record.appId, record.version);
    const existing = this.packages.get(key);
    if (existing !== undefined) {
      return;
    }

    while (!this.canInstall(sizeBytes) && this.packages.size > 0) {
      this.evictOldest();
    }

    if (!this.canInstall(sizeBytes)) {
      throw new Error("Storage quota exceeded");
    }

    this.packages.set(key, record);
    this.usedBytes += sizeBytes;
    const versions = this.versionsByApp.get(record.appId) ?? [];
    versions.push(record.version);
    versions.sort(compareSemver);
    this.versionsByApp.set(record.appId, versions);
  }

  remove(appId: string, version: string, sizeBytes: number): boolean {
    const key = installedPackageKey(appId, version);
    const existing = this.packages.get(key);
    if (existing === undefined) {
      return false;
    }

    this.packages.delete(key);
    this.usedBytes = Math.max(0, this.usedBytes - sizeBytes);
    const versions = (this.versionsByApp.get(appId) ?? []).filter((entry) => entry !== version);
    if (versions.length === 0) {
      this.versionsByApp.delete(appId);
    } else {
      this.versionsByApp.set(appId, versions);
    }

    return true;
  }

  private evictOldest(): void {
    let oldest: InstalledPackageRecord | null = null;

    for (const record of this.packages.values()) {
      if (oldest === null || record.installedAt < oldest.installedAt) {
        oldest = record;
      }
    }

    if (oldest !== null) {
      this.remove(oldest.appId, oldest.version, 0);
    }
  }

  async save(store: KeyValueStore): Promise<void> {
    await store.set(
      "installed-packages",
      new TextEncoder().encode(
        JSON.stringify({
          packages: [...this.packages.entries()],
          versionsByApp: [...this.versionsByApp.entries()],
          usedBytes: this.usedBytes
        })
      )
    );
  }

  async load(store: KeyValueStore): Promise<void> {
    const raw = await store.get("installed-packages");
    if (raw === null) {
      return;
    }

    const payload = JSON.parse(new TextDecoder().decode(raw)) as {
      packages: ReadonlyArray<[string, InstalledPackageRecord]>;
      versionsByApp: ReadonlyArray<[string, string[]]>;
      usedBytes: number;
    };

    this.packages.clear();
    this.versionsByApp.clear();

    for (const [key, value] of payload.packages) {
      this.packages.set(key, value);
    }

    for (const [key, value] of payload.versionsByApp) {
      this.versionsByApp.set(key, value);
    }

    this.usedBytes = payload.usedBytes;
  }
}
