import { describe, expect, it } from "vitest";
import {
  MiniappKvQuotaError,
  NamespacedKvService,
  type MiniappKvStoreBackend,
} from "../src/services/storage-kv.js";

class DurableBackend implements MiniappKvStoreBackend {
  constructor(readonly values = new Map<string, Uint8Array>()) {}

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

describe("NamespacedKvService durable quota accounting", () => {
  it("counts values written before the service restarts", async () => {
    const backend = new DurableBackend();
    const first = new NamespacedKvService(backend, "notes", 4);
    await first.set("existing", new Uint8Array([1, 2, 3]));

    const restarted = new NamespacedKvService(backend, "notes", 4);
    await expect(
      restarted.set("new", new Uint8Array([4, 5])),
    ).rejects.toBeInstanceOf(MiniappKvQuotaError);
    await expect(restarted.get("existing")).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("does not charge an overwritten value twice after restart", async () => {
    const backend = new DurableBackend();
    await new NamespacedKvService(backend, "notes", 4).set(
      "existing",
      new Uint8Array([1, 2, 3]),
    );

    const restarted = new NamespacedKvService(backend, "notes", 4);
    await expect(
      restarted.set("existing", new Uint8Array([1, 2, 3, 4])),
    ).resolves.toBeUndefined();
  });
});
