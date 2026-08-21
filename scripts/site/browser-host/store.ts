export class MemoryStore {
  private readonly values = new Map<string, Uint8Array>();

  async get(key: string) {
    return this.values.get(key)?.slice() ?? null;
  }

  async set(key: string, value: Uint8Array) {
    this.values.set(key, value.slice());
  }

  async delete(key: string) {
    this.values.delete(key);
  }

  async list(prefix: string) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }

  clear() {
    this.values.clear();
  }
}

export const EDITOR_STORE_PREFIX = "tp.editor.v1/";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export type StorageFallbackReason = "blocked" | "quota";

export class LocalStorageStore {
  private readonly memory = new MemoryStore();
  private fallback: StorageFallbackReason | null = null;
  private readonly onFallback: (reason: StorageFallbackReason) => void;

  constructor(onFallback: (reason: StorageFallbackReason) => void = () => undefined) {
    this.onFallback = onFallback;
  }

  get fallbackReason(): StorageFallbackReason | null {
    return this.fallback;
  }

  probe(): StorageFallbackReason | null {
    try {
      const storage = window.localStorage;
      const probeKey = `${EDITOR_STORE_PREFIX}__probe`;
      storage.setItem(probeKey, "1");
      storage.removeItem(probeKey);
      return null;
    } catch {
      this.useMemory("blocked");
      return "blocked";
    }
  }

  async get(key: string) {
    if (this.fallback !== null) return this.memory.get(key);
    try {
      const raw = window.localStorage.getItem(EDITOR_STORE_PREFIX + key);
      return raw === null ? null : base64ToBytes(raw);
    } catch {
      this.useMemory("blocked");
      return this.memory.get(key);
    }
  }

  async set(key: string, value: Uint8Array) {
    if (this.fallback !== null) {
      await this.memory.set(key, value);
      return;
    }
    try {
      window.localStorage.setItem(EDITOR_STORE_PREFIX + key, bytesToBase64(value));
    } catch (error) {
      const reason: StorageFallbackReason =
        error instanceof DOMException && error.name === "QuotaExceededError"
          ? "quota"
          : "blocked";
      this.useMemory(reason);
      await this.memory.set(key, value);
    }
  }

  async delete(key: string) {
    if (this.fallback !== null) {
      await this.memory.delete(key);
      return;
    }
    try {
      window.localStorage.removeItem(EDITOR_STORE_PREFIX + key);
    } catch {
      this.useMemory("blocked");
      await this.memory.delete(key);
    }
  }

  async list(prefix: string) {
    if (this.fallback !== null) return this.memory.list(prefix);
    try {
      const keys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const full = window.localStorage.key(index);
        if (full === null || !full.startsWith(EDITOR_STORE_PREFIX)) continue;
        const key = full.slice(EDITOR_STORE_PREFIX.length);
        if (key.startsWith(prefix)) keys.push(key);
      }
      return keys;
    } catch {
      this.useMemory("blocked");
      return this.memory.list(prefix);
    }
  }

  clearNamespace() {
    if (this.fallback !== null) {
      this.memory.clear();
      return;
    }
    try {
      const toRemove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const full = window.localStorage.key(index);
        if (full !== null && full.startsWith(EDITOR_STORE_PREFIX)) {
          toRemove.push(full);
        }
      }
      for (const key of toRemove) window.localStorage.removeItem(key);
    } catch {
      this.useMemory("blocked");
      this.memory.clear();
    }
  }

  private useMemory(reason: StorageFallbackReason) {
    if (this.fallback !== null) return;
    this.fallback = reason;
    this.onFallback(reason);
  }
}
