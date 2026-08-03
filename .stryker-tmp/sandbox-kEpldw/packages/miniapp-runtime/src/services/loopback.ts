/**
 * SPEC-BIND-LOOPBACK: the packaged in-memory substrate binding. Implements
 * every backend interface the broker consumes with no network and no disk
 * beneath them, so the entire platform — broker, SDK, apps, renderers — can
 * boot and be conformance-tested in isolation. Delivery works to self and
 * between locally hosted apps (they share one binding instance); announce is
 * a local echo; presence is a static snapshot.
 */
// @ts-nocheck

import type { MiniappKvStoreBackend } from "./storage-kv.js";
import type {
  StorageBeeBackend,
  StorageBeeDescriptor,
  StorageBeeEntry,
  StorageBeeListOptions
} from "./storage-bee.js";
import { StorageBeeQuotaError, storageBeeDescriptor } from "./storage-bee.js";
import type { ResourceFetchBackend, ResourceFetchRequest } from "./resource.js";
import type { PresenceBackend, PresenceSnapshot } from "./presence.js";
import { AnnounceService } from "./announce.js";

export class MemoryKvStoreBackend implements MiniappKvStoreBackend {
  private readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key)?.slice() ?? null;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value.slice());
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
  }
}

export class MemoryBeeBackend implements StorageBeeBackend {
  private readonly stores = new Map<string, Map<string, { value: Uint8Array; seq: number }>>();
  private seq = 0;

  constructor(private readonly quotaBytes?: number) {}

  private store(appId: string): Map<string, { value: Uint8Array; seq: number }> {
    let store = this.stores.get(appId);
    if (store === undefined) {
      store = new Map();
      this.stores.set(appId, store);
    }
    return store;
  }

  async get(appId: string, key: string): Promise<Uint8Array | null> {
    return this.store(appId).get(key)?.value.slice() ?? null;
  }

  async put(appId: string, key: string, value: Uint8Array): Promise<void> {
    if (this.quotaBytes !== undefined) {
      const store = this.store(appId);
      let used = 0;
      for (const [existingKey, entry] of store) {
        if (existingKey !== key) used += entry.value.length;
      }
      if (used + value.length > this.quotaBytes) {
        throw new StorageBeeQuotaError(
          `hyperbee quota exceeded for ${appId}: ${used + value.length} > ${this.quotaBytes}`
        );
      }
    }
    this.seq += 1;
    this.store(appId).set(key, { value: value.slice(), seq: this.seq });
  }

  async del(appId: string, key: string): Promise<void> {
    this.store(appId).delete(key);
  }

  async list(appId: string, options: StorageBeeListOptions = {}): Promise<ReadonlyArray<StorageBeeEntry>> {
    const entries = [...this.store(appId).entries()]
      .filter(([key]) => (options.gte === undefined || key >= options.gte) && (options.lt === undefined || key < options.lt))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, { value, seq }]) => ({ key, value: value.slice(), seq }));
    return options.limit === undefined ? entries : entries.slice(0, options.limit);
  }

  descriptor(appId: string): StorageBeeDescriptor {
    return storageBeeDescriptor(appId);
  }
}

export class LoopbackResourceBackend implements ResourceFetchBackend {
  private readonly resources = new Map<string, Uint8Array>();

  register(resourceId: string, bytes: Uint8Array): void {
    this.resources.set(resourceId, bytes.slice());
  }

  async fetch(_appId: string, request: ResourceFetchRequest): Promise<Uint8Array> {
    const bytes = this.resources.get(request.resourceId);
    if (bytes === undefined) {
      throw new Error(`Resource not found: ${request.resourceId}`);
    }
    if (request.budgetBytes !== undefined && bytes.length > request.budgetBytes) {
      throw new Error(`Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`);
    }
    return bytes.slice();
  }
}

export class StaticPresenceBackend implements PresenceBackend {
  constructor(
    private readonly value: PresenceSnapshot = {
      peers: 0,
      onlineInterfaces: 1,
      preferredInterface: "loopback"
    }
  ) {}

  async snapshot(): Promise<PresenceSnapshot> {
    return this.value;
  }
}

export interface LoopbackBindingOptions {
  readonly beeQuotaBytes?: number;
  readonly presence?: PresenceSnapshot;
  readonly resources?: ReadonlyMap<string, Uint8Array>;
}

export interface LoopbackBinding {
  /** Spread into MiniappHostOptions; supply sandbox backend and grant store separately. */
  readonly kvBackend: MiniappKvStoreBackend;
  readonly lxmfBackend: MiniappKvStoreBackend;
  readonly beeBackend: MemoryBeeBackend;
  readonly announceService: AnnounceService;
  readonly presenceBackend: PresenceBackend;
  readonly resourceBackend: LoopbackResourceBackend;
}

/**
 * One shared binding instance = one loopback substrate. Hosts booted on the
 * same instance deliver LXMF between their apps; separate instances are
 * isolated islands.
 */
export function createLoopbackBinding(options: LoopbackBindingOptions = {}): LoopbackBinding {
  const resourceBackend = new LoopbackResourceBackend();
  for (const [resourceId, bytes] of options.resources ?? []) {
    resourceBackend.register(resourceId, bytes);
  }
  return {
    kvBackend: new MemoryKvStoreBackend(),
    // A dedicated KV keeps LXMF loopback delivery out of app-visible storage.
    lxmfBackend: new MemoryKvStoreBackend(),
    beeBackend: new MemoryBeeBackend(options.beeQuotaBytes),
    announceService: new AnnounceService(),
    presenceBackend: new StaticPresenceBackend(options.presence),
    resourceBackend
  };
}
