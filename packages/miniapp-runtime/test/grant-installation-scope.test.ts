import { describe, expect, it } from "vitest";
import {
  GrantStore,
  grantStoreKey,
  type GrantKeyValueStore,
} from "../src/index.js";

/**
 * A user may run the same app on several of their machines and grant it
 * different capabilities on each. These tests pin the property that makes that
 * true — a grant belongs to one installation and has nowhere to record an
 * account — so that the account journal planned in docs/linked-devices-plan.md
 * cannot quietly acquire a path for grants to travel.
 */

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

const appId = "chat";
const publisher = "ab".repeat(32);
const declared = ["lxmf:send", "lxmf:receive", "storage:kv"] as const;

describe("grants are scoped to one installation", () => {
  it("keys a grant by app and publisher only, with no account dimension", () => {
    const key = grantStoreKey(appId, publisher);
    expect(key).toContain(appId);
    expect(key).toContain(publisher);
    // Nothing in the key identifies a user or an account. If this ever changes,
    // grants become addressable across a user's machines.
    expect(grantStoreKey(appId, publisher)).toBe(key);
  });

  it("does not let one machine's grant reach another machine", async () => {
    // Two installations of the same user: separate host-local stores.
    const phoneStore = new MemoryStore();
    const laptopStore = new MemoryStore();
    const phone = new GrantStore(phoneStore);
    const laptop = new GrantStore(laptopStore);

    await phone.set({
      appId,
      publisherPublicKey: publisher,
      declared: [...declared],
      requestedGrants: ["lxmf:send"],
      now: 1,
    });
    await laptop.set({
      appId,
      publisherPublicKey: publisher,
      declared: [...declared],
      requestedGrants: ["lxmf:send", "storage:kv"],
      now: 1,
    });

    expect((await phone.get(appId, publisher))?.granted).toEqual(["lxmf:send"]);
    expect((await laptop.get(appId, publisher))?.granted).toEqual([
      "lxmf:send",
      "storage:kv",
    ]);
  });

  it("leaves a second machine ungranted when the first grants everything", async () => {
    const phone = new GrantStore(new MemoryStore());
    const laptop = new GrantStore(new MemoryStore());
    await phone.set({
      appId,
      publisherPublicKey: publisher,
      declared: [...declared],
      requestedGrants: [...declared],
      now: 1,
    });

    expect((await phone.get(appId, publisher))?.granted).toEqual([...declared]);
    // The laptop has never been asked. Silence is not consent.
    expect(await laptop.get(appId, publisher)).toBeNull();
  });

  it("writes every persisted key under the same app/publisher prefix", async () => {
    const backing = new MemoryStore();
    const grants = new GrantStore(backing);
    await grants.set({
      appId,
      publisherPublicKey: publisher,
      declared: [...declared],
      requestedGrants: ["lxmf:send"],
      now: 1,
    });

    const prefix = grantStoreKey(appId, publisher);
    // Grant state, including the lifecycle authority record, must stay under
    // one installation-local prefix — no sibling, account, or roster namespace.
    expect([...backing.values.keys()].length).toBeGreaterThan(0);
    for (const key of backing.values.keys()) {
      expect(key.startsWith(prefix)).toBe(true);
    }
  });
});
