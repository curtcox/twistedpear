import { T256Error, decode256t, encode256t, verify256t, type Sha512Fn } from "./codec.js";

export interface CasKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<ReadonlyArray<string>>;
}

export interface CasStoreOptions {
  readonly maxBlobBytes?: number;
  readonly maxTotalBytes?: number;
}

export class CasQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CasQuotaError";
  }
}

const KEY_PREFIX = "cas:";

/** Local SHA-512-keyed content-addressable store. Inline ids (<= 64 bytes) are
 *  answered from the id itself and never occupy storage. */
export class CasStore {
  private readonly maxBlobBytes: number;
  private readonly maxTotalBytes: number;

  constructor(
    private readonly backend: CasKeyValueStore,
    private readonly sha512: Sha512Fn,
    options: CasStoreOptions = {}
  ) {
    this.maxBlobBytes = options.maxBlobBytes ?? 16 * 1024 * 1024;
    this.maxTotalBytes = options.maxTotalBytes ?? 256 * 1024 * 1024;
  }

  async put(content: Uint8Array): Promise<string> {
    const id = encode256t(content, this.sha512);
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return id;
    }

    if (content.length > this.maxBlobBytes) {
      throw new CasQuotaError(`CAS blob exceeds ${this.maxBlobBytes} bytes`);
    }

    const key = this.key(id);
    if ((await this.backend.get(key)) !== null) {
      return id;
    }

    const keys = await this.backend.list(KEY_PREFIX);
    let total = content.length;
    for (const existing of keys) {
      total += (await this.backend.get(existing))?.length ?? 0;
    }

    if (total > this.maxTotalBytes) {
      throw new CasQuotaError(`CAS store exceeds ${this.maxTotalBytes} bytes`);
    }

    await this.backend.set(key, content);
    return id;
  }

  async get(id: string): Promise<Uint8Array | null> {
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return decoded.inline;
    }

    const stored = await this.backend.get(this.key(id));
    if (stored === null) {
      return null;
    }

    if (!verify256t(id, stored, this.sha512)) {
      throw new T256Error("HASH_MISMATCH", "Stored CAS content does not match its 256t id");
    }

    return stored;
  }

  async has(id: string): Promise<boolean> {
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return true;
    }

    return (await this.backend.get(this.key(id))) !== null;
  }

  async delete(id: string): Promise<void> {
    const decoded = decode256t(id);
    if (decoded.inline !== null) {
      return;
    }

    await this.backend.delete(this.key(id));
  }

  private key(id: string): string {
    const hex = [...decode256t(id).sha512!].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${KEY_PREFIX}${hex}`;
  }
}
