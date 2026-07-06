import { describe, expect, it } from "vitest";
import {
  CapabilityError,
  GrantStore,
  assertCapabilityAllowed,
  validateManifestCapabilities,
  type GrantKeyValueStore
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
}

describe("mini-app capabilities", () => {
  it("deduplicates known manifest capabilities", () => {
    expect(validateManifestCapabilities(["identity", "identity", "lxmf:send"])).toEqual(["identity", "lxmf:send"]);
  });

  it("rejects unknown manifest capabilities with minHostApi guidance", () => {
    expect(() => validateManifestCapabilities(["future:magic"])).toThrow(/minHostApi/);
  });

  it("enforces declared and granted capabilities", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "lxmf:send",
        declared: ["lxmf:send"],
        granted: []
      })
    ).toThrow(CapabilityError);

    expect(() =>
      assertCapabilityAllowed({
        capability: "lxmf:send",
        declared: ["identity"],
        granted: ["lxmf:send"]
      })
    ).toThrow(CapabilityError);

    expect(
      assertCapabilityAllowed({
        capability: "lxmf:send",
        declared: ["lxmf:send"],
        granted: ["lxmf:send"]
      })
    ).toBe("lxmf:send");
  });

  it("persists grants and applies revocation to later reads", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    await grants.set("app", "publisher", ["identity", "lxmf:send"], ["identity", "lxmf:send"], 10);

    expect(await grants.get("app", "publisher")).toMatchObject({
      appId: "app",
      publisherPublicKey: "publisher",
      granted: ["identity", "lxmf:send"],
      updatedAt: 10
    });

    await grants.revoke("app", "publisher", "lxmf:send", 11);
    expect((await grants.get("app", "publisher"))?.granted).toEqual(["identity"]);
  });
});
