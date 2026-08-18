import { describe, expect, it } from "vitest";
import {
  CapabilityError,
  GrantStore,
  assertCapabilityAllowed,
  validateManifestCapabilities,
  type GrantKeyValueStore,
} from "../src/capabilities.js";
import { grantTtlMsForCapabilities } from "../src/grant-ttl.js";

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

describe("mini-app capabilities", () => {
  it("deduplicates known manifest capabilities", () => {
    expect(
      validateManifestCapabilities(["identity", "identity", "lxmf:send"]),
    ).toEqual(["identity", "lxmf:send"]);
  });

  it("rejects unknown manifest capabilities with minHostApi guidance", () => {
    expect(() => validateManifestCapabilities(["future:magic"])).toThrow(
      /minHostApi/,
    );
  });

  it("enforces declared and granted capabilities", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "lxmf:send",
        declared: ["lxmf:send"],
        granted: [],
      }),
    ).toThrow(CapabilityError);

    expect(() =>
      assertCapabilityAllowed({
        capability: "lxmf:send",
        declared: ["identity"],
        granted: ["lxmf:send"],
      }),
    ).toThrow(CapabilityError);

    expect(
      assertCapabilityAllowed({
        capability: "lxmf:send",
        declared: ["lxmf:send"],
        granted: ["lxmf:send"],
      }),
    ).toBe("lxmf:send");
  });

  it("persists grants and applies revocation to later reads", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    await grants.set({
      appId: "app",
      publisherPublicKey: "publisher",
      declared: ["identity", "lxmf:send"],
      requestedGrants: ["identity", "lxmf:send"],
      now: 10,
      ttlMs: grantTtlMsForCapabilities(["identity", "lxmf:send"]),
    });

    expect(await grants.get("app", "publisher")).toMatchObject({
      appId: "app",
      publisherPublicKey: "publisher",
      granted: ["identity", "lxmf:send"],
      updatedAt: 10,
    });

    await grants.revoke("app", "publisher", "lxmf:send", 11);
    expect((await grants.get("app", "publisher"))?.granted).toEqual([
      "identity",
    ]);
  });

  it("persists approve and first use across GrantStore restarts", async () => {
    const store = new MemoryStore();
    await new GrantStore(store).set({
      appId: "app",
      publisherPublicKey: "publisher",
      declared: ["identity"],
      requestedGrants: ["identity"],
      now: 10,
      ttlMs: 100,
    });

    expect(
      (await new GrantStore(store).use("app", "publisher", "identity", 11))
        ?.granted,
    ).toEqual(["identity"]);
    expect(
      (await new GrantStore(store).use("app", "publisher", "identity", 12))
        ?.granted,
    ).toEqual(["identity"]);
  });

  it("does not revive revoked authority before or after first use", async () => {
    for (const firstUse of [false, true]) {
      const store = new MemoryStore();
      let grants = new GrantStore(store);
      await grants.set({
        appId: "app",
        publisherPublicKey: "publisher",
        declared: ["identity"],
        requestedGrants: ["identity"],
        now: 10,
        ttlMs: 100,
      });
      if (firstUse) await grants.use("app", "publisher", "identity", 11);
      await grants.revoke("app", "publisher", "identity", 12);

      grants = new GrantStore(store);
      await expect(
        grants.set({
          appId: "app",
          publisherPublicKey: "publisher",
          declared: ["identity"],
          requestedGrants: ["identity"],
          now: 13,
          ttlMs: 100,
        }),
      ).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
      expect((await grants.get("app", "publisher"))?.granted).toEqual([]);
    }
  });

  it("does not revive denied or expired authority after restart", async () => {
    const deniedStore = new MemoryStore();
    await new GrantStore(deniedStore).deny("app", "publisher", "identity", 10);
    await expect(
      new GrantStore(deniedStore).set({
        appId: "app",
        publisherPublicKey: "publisher",
        declared: ["identity"],
        requestedGrants: ["identity"],
        now: 11,
        ttlMs: grantTtlMsForCapabilities(["identity"]),
      }),
    ).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });

    const expiredStore = new MemoryStore();
    await new GrantStore(expiredStore).set({
      appId: "app",
      publisherPublicKey: "publisher",
      declared: ["identity"],
      requestedGrants: ["identity"],
      now: 10,
      ttlMs: 2,
    });
    expect(
      (
        await new GrantStore(expiredStore).use(
          "app",
          "publisher",
          "identity",
          12,
        )
      )?.granted,
    ).toEqual([]);
    await expect(
      new GrantStore(expiredStore).set({
        appId: "app",
        publisherPublicKey: "publisher",
        declared: ["identity"],
        requestedGrants: ["identity"],
        now: 13,
        ttlMs: grantTtlMsForCapabilities(["identity"]),
      }),
    ).rejects.toMatchObject({ code: "CAPABILITY_DENIED" });
  });
});
