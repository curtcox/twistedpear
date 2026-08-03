// @ts-nocheck
export interface StorageBeeDescriptor {
  readonly appId: string;
  readonly namespace: string;
  readonly localOnly: true;
}

export interface StorageBeeEntry {
  readonly key: string;
  readonly value: Uint8Array;
  readonly seq: number;
}

export interface StorageBeeListOptions {
  readonly gte?: string;
  readonly lt?: string;
  readonly limit?: number;
}

export class StorageBeeQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageBeeQuotaError";
  }
}

export interface StorageBeeBackend {
  get(appId: string, key: string): Promise<Uint8Array | null>;
  put(appId: string, key: string, value: Uint8Array): Promise<void>;
  del(appId: string, key: string): Promise<void>;
  list(appId: string, options?: StorageBeeListOptions): Promise<ReadonlyArray<StorageBeeEntry>>;
  descriptor(appId: string): StorageBeeDescriptor;
}

export function storageBeeDescriptor(appId: string): StorageBeeDescriptor {
  return {
    appId,
    namespace: `miniapp-bee:${appId}`,
    localOnly: true
  };
}
