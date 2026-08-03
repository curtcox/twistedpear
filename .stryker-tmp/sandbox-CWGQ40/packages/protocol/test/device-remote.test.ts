// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  initialRemoteGrantStore,
  isRemoteGrantLive,
  remoteGrantKey,
  stepRemoteGrantStore
} from "../src/index.js";

describe("remote device grant store", () => {
  it("grants, expires, and never revives after clear-all (restart)", () => {
    let store = initialRemoteGrantStore();
    store = stepRemoteGrantStore(store, {
      kind: "remote/grant",
      at: 0,
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 100
    });
    const key = remoteGrantKey("peer-a", "camera", "derived");
    expect(isRemoteGrantLive(store.get(key), 50)).toBe(true);

    store = stepRemoteGrantStore(store, {
      kind: "remote/ttl",
      at: 100,
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived"
    });
    expect(isRemoteGrantLive(store.get(key), 100)).toBe(false);
    expect(store.get(key)?.phase).toBe("expired");

    store = stepRemoteGrantStore(store, {
      kind: "remote/grant",
      at: 200,
      peerId: "peer-a",
      classId: "camera",
      tierId: "derived",
      ttlMs: 100
    });
    store = stepRemoteGrantStore(store, { kind: "remote/clear-all", at: 201 });
    expect(store.size).toBe(0);
  });

  it("revokes immediately", () => {
    let store = initialRemoteGrantStore();
    store = stepRemoteGrantStore(store, {
      kind: "remote/grant",
      at: 0,
      peerId: "peer-b",
      classId: "location",
      tierId: "coarse",
      ttlMs: 10_000
    });
    store = stepRemoteGrantStore(store, {
      kind: "remote/revoke",
      at: 5,
      peerId: "peer-b",
      classId: "location",
      tierId: "coarse"
    });
    expect(isRemoteGrantLive(store.get(remoteGrantKey("peer-b", "location", "coarse")), 6)).toBe(
      false
    );
  });
});
