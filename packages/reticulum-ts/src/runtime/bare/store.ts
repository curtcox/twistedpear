import type { KeyValueStore } from "../runtime.js";

type BareFsModule = {
  access(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  unlink(path: string): Promise<void>;
};

let bareFsModule: BareFsModule | null = null;

async function loadBareFs(): Promise<BareFsModule> {
  bareFsModule ??= (await import("bare-fs")) as BareFsModule;
  return bareFsModule;
}

export interface BareKeyValueStoreOptions {
  readonly rootPath: string;
}

export class BareKeyValueStore implements KeyValueStore {
  private readonly rootPath: string;

  constructor(options: BareKeyValueStoreOptions) {
    this.rootPath = options.rootPath.replace(/\/$/, "");
  }

  private pathFor(key: string): string {
    const encoded = Array.from(key, (char) => (char.codePointAt(0) ?? 0).toString(16).padStart(2, "0")).join("");
    return `${this.rootPath}/${encoded}`;
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const fs = await loadBareFs();
    const path = this.pathFor(key);
    try {
      await fs.access(path);
      return await fs.readFile(path);
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    const fs = await loadBareFs();
    await fs.mkdir(this.rootPath, { recursive: true });
    await fs.writeFile(this.pathFor(key), value);
  }

  async delete(key: string): Promise<void> {
    const fs = await loadBareFs();
    const path = this.pathFor(key);
    try {
      await fs.unlink(path);
    } catch {
      // Missing keys are not an error.
    }
  }
}
