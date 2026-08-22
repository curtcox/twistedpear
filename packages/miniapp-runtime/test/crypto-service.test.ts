import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CryptoService,
  CryptoServiceError,
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
} from "../src/index.js";

class MemoryStore implements GrantKeyValueStore {
  readonly values = new Map<string, Uint8Array>();
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

async function waitUntil(
  condition: () => boolean,
  timeoutMs = 3_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("crypto service", () => {
  it("hashes, hmacs, compares, and bounds randomBytes", async () => {
    const service = new CryptoService({
      randomBytes: (n) => new Uint8Array(n).fill(9),
    });
    const payload = new TextEncoder().encode("payload");
    const key = new TextEncoder().encode("key");
    expect([...service.hash("sha256", payload)]).toEqual([
      ...createHash("sha256").update(payload).digest(),
    ]);
    expect([...service.hmac("sha256", key, payload)]).toEqual([
      ...createHmac("sha256", key).update(payload).digest(),
    ]);
    expect(service.timingSafeEqual(payload, payload)).toBe(true);
    expect([...service.randomBytes(4)]).toEqual([9, 9, 9, 9]);
    expect(() => service.randomBytes(10_000)).toThrow(CryptoServiceError);
    expect(() => service.hash("md5", payload)).toThrow(CryptoServiceError);
  });

  it("is available inside the sandbox without a capability", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      cryptoEntropy: { randomBytes: (n) => new Uint8Array(n).fill(3) },
    });
    await host.launch(
      {
        name: "crypto-app",
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: [],
        publisherPublicKey: "publisher",
      },
      new TextEncoder().encode(`
const bytes = await sdk.crypto.randomBytes(4);
const digest = await sdk.crypto.hash("sha256", bytes);
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: String(digest.length) } }
});
`),
    );
    await waitUntil(() =>
      JSON.stringify(host.snapshot().widgetTree).includes("32"),
    );
    await host.stopAll();
  });
});
