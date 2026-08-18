import { describe, expect, it } from "vitest";
import {
  EGRESS_OFFER_CAPABILITIES,
  EgressDeniedError,
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  assertEgressAllowed,
} from "../src/index.js";
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
} from "@twistedpear/protocol";

describe("assertEgressAllowed", () => {
  const unusedBackend = {
    name: "unused",
    async spawn() {
      throw new Error("not used");
    },
  };

  function hostWithLxmf(now = () => 1_000) {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      now,
    });
    const capabilities = ["lxmf:send", "lxmf:receive"];
    const manifest = {
      name: "line-check",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities,
    };
    return { host, manifest, capabilities };
  }

  it("names the capabilities that require a live offer", () => {
    expect(EGRESS_OFFER_CAPABILITIES).toEqual([
      "lxmf:send",
      "link:probe",
      "device:stream",
    ]);
  });

  it("denies lxmf.send without a host-authored offer", async () => {
    const { host, manifest, capabilities } = hostWithLxmf();
    await host.setGrants("line-check", "publisher", capabilities, capabilities);
    const sent = await host.dispatchRaw(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "peer-a", subject: "hi", body: "hi" },
      },
      manifest,
      ["lxmf:send"],
    );
    expect(sent.ok).toBe(false);
    expect(sent.error).toMatchObject({ code: "EGRESS_DENIED" });
  });

  it("allows lxmf.send only to the offered peer", async () => {
    const { host, manifest, capabilities } = hostWithLxmf();
    await host.setGrants("line-check", "publisher", capabilities, capabilities);
    host.grantEgressOffer({
      appId: "line-check",
      capability: "lxmf:send",
      targetKind: "peer",
      targetId: "peer-a",
      ttlMs: 60_000,
    });
    const allowed = await host.dispatchRaw(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "peer-a", subject: "hi", body: "hi" },
      },
      manifest,
      ["lxmf:send"],
    );
    expect(allowed.ok).toBe(true);
    const denied = await host.dispatchRaw(
      {
        id: "2",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "peer-b", subject: "hi", body: "hi" },
      },
      manifest,
      ["lxmf:send"],
    );
    expect(denied.ok).toBe(false);
    expect(denied.error).toMatchObject({ code: "EGRESS_DENIED" });
  });

  it("expires an offer so a later send is denied", async () => {
    let at = 1_000;
    const { host, manifest, capabilities } = hostWithLxmf(() => at);
    await host.setGrants("line-check", "publisher", capabilities, capabilities);
    host.grantEgressOffer({
      appId: "line-check",
      capability: "lxmf:send",
      targetKind: "peer",
      targetId: "peer-a",
      ttlMs: 10,
    });
    at = 1_011;
    const sent = await host.dispatchRaw(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "peer-a", subject: "hi", body: "hi" },
      },
      manifest,
      ["lxmf:send"],
    );
    expect(sent.ok).toBe(false);
    expect(sent.error).toMatchObject({ code: "EGRESS_DENIED" });
  });

  it("does not require an offer for announce own-namespace or share:cas", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      casBackend: {
        put: async () => ({ t256: "t256", size: 1 }),
        get: async () => new Uint8Array([1]),
      },
    });
    const capabilities = [
      "announce:publish",
      "announce:subscribe",
      "share:cas",
    ];
    const manifest = {
      name: "line-check",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities,
    };
    await host.setGrants("line-check", "publisher", capabilities, capabilities);
    const published = await host.dispatchRaw(
      {
        id: "a",
        namespace: "announce",
        method: "publish",
        capability: "announce:publish",
        payload: {},
      },
      manifest,
      ["announce:publish"],
    );
    expect(published.ok).toBe(true);
    const shared = await host.dispatchRaw(
      {
        id: "s",
        namespace: "share.cas",
        method: "put",
        capability: "share:cas",
        payload: { content: "hello" },
      },
      manifest,
      ["share:cas"],
    );
    expect(shared.ok).toBe(true);
  });

  it("re-expresses ShareOffer on the general permit function", () => {
    let store = initialEgressOfferStore();
    expect(() =>
      assertEgressAllowed({
        offers: store,
        appId: "app",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-a",
        at: 1,
      }),
    ).toThrow(EgressDeniedError);
    store = stepEgressOfferStore(store, {
      kind: "egress/grant",
      offer: {
        id: "o1",
        appId: "app",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-a",
        displayLabel: "Ana",
        constraints: {},
        grantedAt: 0,
      },
      ttlMs: 10,
    });
    expect(
      assertEgressAllowed({
        offers: store,
        appId: "app",
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: "peer-a",
        at: 1,
      }).id,
    ).toBe("o1");
  });
});
