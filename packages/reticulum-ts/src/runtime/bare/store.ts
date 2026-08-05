import type { KeyValueStore } from "../runtime.js";

type BareFsModule = {
  access(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  unlink(path: string): Promise<void>;
};

class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | undefined> {
    const value = this.values.get(key);
    return value === undefined ? undefined : Uint8Array.from(value);
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, Uint8Array.from(value));
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

let bareFsModule: BareFsModule | null = null;
let bareFsUnavailable = false;

async function loadBareFs(): Promise<BareFsModule | null> {
  if (bareFsUnavailable) {
    return null;
  }

  if (bareFsModule !== null) {
    return bareFsModule;
  }

  try {
    bareFsModule = (await import("bare-fs")) as BareFsModule;
    return bareFsModule;
  } catch {
    bareFsUnavailable = true;
    return null;
  }
}

export interface BareKeyValueStoreOptions {
  readonly rootPath: string;
}

export class BareKeyValueStore implements KeyValueStore {
  private readonly rootPath: string;
  private memoryFallback: MemoryKeyValueStore | null = null;

  constructor(options: BareKeyValueStoreOptions) {
    this.rootPath = options.rootPath.replace(/\/$/, "");
  }

  private pathFor(key: string): string {
    const encoded = Array.from(key, (char) =>
      (char.codePointAt(0) ?? 0).toString(16).padStart(2, "0"),
    ).join("");
    return `${this.rootPath}/${encoded}`;
  }

  private async resolveStore(): Promise<
    | { kind: "memory"; store: MemoryKeyValueStore }
    | { kind: "fs"; fs: BareFsModule }
  > {
    const fs = await loadBareFs();
    if (fs === null) {
      this.memoryFallback ??= new MemoryKeyValueStore();
      return { kind: "memory", store: this.memoryFallback };
    }

    return { kind: "fs", fs };
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const resolved = await this.resolveStore();
    if (resolved.kind === "memory") {
      return resolved.store.get(key);
    }

    const path = this.pathFor(key);
    try {
      await resolved.fs.access(path);
      return await resolved.fs.readFile(path);
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    const resolved = await this.resolveStore();
    if (resolved.kind === "memory") {
      await resolved.store.set(key, value);
      return;
    }

    try {
      await resolved.fs.mkdir(this.rootPath, { recursive: true });
      await resolved.fs.writeFile(this.pathFor(key), value);
    } catch {
      // Relative cwd / sandbox failures: keep serving from memory for this runtime.
      bareFsUnavailable = true;
      this.memoryFallback ??= new MemoryKeyValueStore();
      await this.memoryFallback.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    const resolved = await this.resolveStore();
    if (resolved.kind === "memory") {
      await resolved.store.delete(key);
      return;
    }

    const path = this.pathFor(key);
    try {
      await resolved.fs.unlink(path);
    } catch {
      // Missing keys are not an error.
    }
  }
}
