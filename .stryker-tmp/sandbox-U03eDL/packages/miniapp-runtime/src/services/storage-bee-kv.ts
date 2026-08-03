// @ts-nocheck
import type { MiniappKvStoreBackend } from "./storage-kv.js";
import {
  storageBeeDescriptor,
  type StorageBeeBackend,
  type StorageBeeEntry,
  type StorageBeeListOptions
} from "./storage-bee.js";

function beeKey(appId: string, key: string): string {
  return `miniapp-bee:${appId}:${key}`;
}

function beeSeqKey(appId: string, key: string): string {
  return `miniapp-bee-seq:${appId}:${key}`;
}

export class KvStorageBeeBackend implements StorageBeeBackend {
  constructor(private readonly kv: MiniappKvStoreBackend) {}

  descriptor(appId: string) {
    return storageBeeDescriptor(appId);
  }

  async get(appId: string, key: string): Promise<Uint8Array | null> {
    return this.kv.get(beeKey(appId, key));
  }

  async put(appId: string, key: string, value: Uint8Array): Promise<void> {
    const seqRaw = await this.kv.get(beeSeqKey(appId, key));
    const seq = seqRaw === null ? 1 : Number(new TextDecoder().decode(seqRaw)) + 1;
    await this.kv.set(beeKey(appId, key), value);
    await this.kv.set(beeSeqKey(appId, key), new TextEncoder().encode(String(seq)));
  }

  async del(appId: string, key: string): Promise<void> {
    await this.kv.delete(beeKey(appId, key));
    await this.kv.delete(beeSeqKey(appId, key));
  }

  async list(appId: string, options?: StorageBeeListOptions): Promise<ReadonlyArray<StorageBeeEntry>> {
    const prefix = `miniapp-bee:${appId}:`;
    const keys = await this.kv.list(prefix);
    const entries: StorageBeeEntry[] = [];

    for (const storageKey of keys) {
      if (storageKey.startsWith("miniapp-bee-seq:")) {
        continue;
      }

      const key = storageKey.slice(prefix.length);
      if (options?.gte !== undefined && key < options.gte) {
        continue;
      }

      if (options?.lt !== undefined && key >= options.lt) {
        continue;
      }

      const value = await this.kv.get(storageKey);
      if (value === null) {
        continue;
      }

      const seqRaw = await this.kv.get(beeSeqKey(appId, key));
      const seq = seqRaw === null ? 0 : Number(new TextDecoder().decode(seqRaw));
      entries.push({ key, value, seq });
    }

    entries.sort((left, right) => left.key.localeCompare(right.key));
    if (options?.limit !== undefined) {
      return entries.slice(0, options.limit);
    }

    return entries;
  }
}
