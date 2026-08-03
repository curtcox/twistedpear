// @ts-nocheck
import Corestore from "corestore";
import Hyperbee from "hyperbee";
import type { StorageBeeBackend, StorageBeeEntry, StorageBeeListOptions } from "./storage-bee.js";
import { StorageBeeQuotaError, storageBeeDescriptor } from "./storage-bee.js";

interface OpenBee {
  readonly bee: InstanceType<typeof Hyperbee>;
}

export class CorestoreBeeBackend implements StorageBeeBackend {
  private readonly store: InstanceType<typeof Corestore>;
  private readonly bees = new Map<string, OpenBee>();

  constructor(
    private readonly storagePath: string,
    private readonly quotaBytes = 1024 * 1024
  ) {
    this.store = new Corestore(storagePath);
  }

  async ready(): Promise<void> {
    await this.store.ready();
  }

  async close(): Promise<void> {
    for (const entry of this.bees.values()) {
      await entry.bee.close();
    }
    this.bees.clear();
    await this.store.close();
  }

  descriptor(appId: string) {
    return storageBeeDescriptor(appId);
  }

  async get(appId: string, key: string): Promise<Uint8Array | null> {
    const bee = await this.openBee(appId);
    const entry = await bee.get(key);
    return entry === null ? null : Uint8Array.from(entry.value);
  }

  async put(appId: string, key: string, value: Uint8Array): Promise<void> {
    const current = await this.get(appId, key);
    const currentLen = current?.length ?? 0;
    const projected = (await this.estimateUsage(appId)) - currentLen + value.length;
    if (projected > this.quotaBytes) {
      throw new StorageBeeQuotaError(`Hyperbee quota exceeded for ${appId}`);
    }

    const bee = await this.openBee(appId);
    await bee.put(key, value);
  }

  async del(appId: string, key: string): Promise<void> {
    const bee = await this.openBee(appId);
    await bee.del(key);
  }

  async list(appId: string, options: StorageBeeListOptions = {}): Promise<ReadonlyArray<StorageBeeEntry>> {
    const bee = await this.openBee(appId);
    const entries: StorageBeeEntry[] = [];
    const streamOptions: { gte?: string; lt?: string } = {};
    if (options.gte !== undefined) {
      streamOptions.gte = options.gte;
    }
    if (options.lt !== undefined) {
      streamOptions.lt = options.lt;
    }
    const stream = bee.createReadStream(streamOptions);

    for await (const node of stream) {
      entries.push({
        key: String(node.key),
        value: Uint8Array.from(node.value),
        seq: node.seq
      });
      if (options.limit !== undefined && entries.length >= options.limit) {
        break;
      }
    }

    return entries;
  }

  private async openBee(appId: string): Promise<InstanceType<typeof Hyperbee>> {
    const existing = this.bees.get(appId);
    if (existing !== undefined) {
      return existing.bee;
    }

    const core = this.store.get({ name: storageBeeDescriptor(appId).namespace });
    const bee = new Hyperbee(core);
    await bee.ready();
    this.bees.set(appId, { bee });
    return bee;
  }

  private async estimateUsage(appId: string): Promise<number> {
    const entries = await this.list(appId);
    return entries.reduce((total, entry) => total + entry.value.length, 0);
  }
}
