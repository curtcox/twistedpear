export class MiniappKvQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MiniappKvQuotaError";
  }
}

export interface MiniappKvStoreBackend {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<ReadonlyArray<string>>;
}

export class NamespacedKvService {
  constructor(
    private readonly backend: MiniappKvStoreBackend,
    private readonly appId: string,
    private readonly quotaBytes = 1024 * 1024,
  ) {}

  async get(key: string): Promise<Uint8Array | null> {
    return this.backend.get(this.key(key));
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    const keys = await this.backend.list(this.prefix());
    let total = value.length;
    for (const existing of keys) {
      if (existing !== this.key(key)) {
        const bytes = await this.backend.get(existing);
        total += bytes?.length ?? 0;
      }
    }

    if (total > this.quotaBytes) {
      throw new MiniappKvQuotaError(`KV quota exceeded for ${this.appId}`);
    }

    await this.backend.set(this.key(key), value);
  }

  async delete(key: string): Promise<void> {
    await this.backend.delete(this.key(key));
  }

  async list(): Promise<ReadonlyArray<string>> {
    const prefix = this.prefix();
    return (await this.backend.list(prefix)).map((key) =>
      key.slice(prefix.length),
    );
  }

  private key(key: string): string {
    if (key.length === 0 || key.includes("..")) {
      throw new Error(`Invalid KV key: ${key}`);
    }

    return `${this.prefix()}${key}`;
  }

  private prefix(): string {
    return `miniapp-kv:${this.appId}:`;
  }
}

export {
  ReplicaCapError,
  TopicLogStore,
  missingReplicaEntries,
} from "./storage-sync.js";
export type { TopicLogOptions, ReplicaIngestOptions } from "./storage-sync.js";
