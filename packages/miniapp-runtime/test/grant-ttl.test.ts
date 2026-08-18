import { describe, expect, it } from "vitest";
import { GrantStore, type GrantKeyValueStore } from "../src/capabilities.js";
import {
  consentClassForCapability,
  grantTtlMsForCapabilities,
  GRANT_TTL_MS_BY_CONSENT_CLASS,
  isGrantLifecycleEffective,
} from "../src/grant-ttl.js";

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
}

describe("grant TTL defaults", () => {
  it("assigns consent classes and picks the shortest TTL in a batch", () => {
    expect(consentClassForCapability("storage:kv")).toBe("low");
    expect(consentClassForCapability("identity")).toBe("elevated");
    expect(consentClassForCapability("lxmf:send")).toBe("sensitive");
    expect(consentClassForCapability("device:camera:frames")).toBe("sensitive");

    expect(grantTtlMsForCapabilities(["storage:kv"])).toBe(
      GRANT_TTL_MS_BY_CONSENT_CLASS.low,
    );
    expect(
      grantTtlMsForCapabilities(["storage:kv", "identity", "lxmf:send"]),
    ).toBe(GRANT_TTL_MS_BY_CONSENT_CLASS.sensitive);
  });

  it("requires an explicit finite ttlMs at every GrantStore.set call site", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    const ttlMs = grantTtlMsForCapabilities(["identity"]);

    await grants.set({
      appId: "app",
      publisherPublicKey: "publisher",
      declared: ["identity"],
      requestedGrants: ["identity"],
      now: 1_000,
      ttlMs,
    });

    const lifecycles = await grants.authority("app", "publisher");
    expect(lifecycles.identity?.expiresAt).toBe(1_000 + ttlMs);
    expect(lifecycles.identity?.expiresAt).toBeLessThan(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("treats expired grants as ineffective for re-launch pre-check", async () => {
    const store = new MemoryStore();
    await new GrantStore(store).set({
      appId: "app",
      publisherPublicKey: "publisher",
      declared: ["identity"],
      requestedGrants: ["identity"],
      now: 10,
      ttlMs: 5,
    });

    const lifecycles = await new GrantStore(store).authority(
      "app",
      "publisher",
    );
    expect(isGrantLifecycleEffective(lifecycles.identity, 15)).toBe(false);
    expect(isGrantLifecycleEffective(lifecycles.identity, 12)).toBe(true);
  });

  it("re-prompts after expiry by clearing effective authority on use", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    await grants.set({
      appId: "app",
      publisherPublicKey: "publisher",
      declared: ["identity"],
      requestedGrants: ["identity"],
      now: 10,
      ttlMs: 5,
    });

    expect(
      (await grants.use("app", "publisher", "identity", 16))?.granted,
    ).toEqual([]);
  });
});
