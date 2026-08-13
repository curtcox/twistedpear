import { describe, expect, it } from "vitest";
import { createRegisterAnnounceHandler } from "../src/worklet-entry-announce.mjs";
import { joinCommunityNetwork } from "../src/worklet-entry-community.mjs";
import { createEnsureDevChannel } from "../src/worklet-entry-dev.mjs";
import { createWorkletPropagationPersistenceOps } from "../src/worklet-entry-propagation.mjs";
import { createQuiesceInterfaces } from "../src/worklet-entry-quiesce.mjs";

describe("createQuiesceInterfaces", () => {
  it("stops every interface before pushing a final status", async () => {
    const order: string[] = [];
    const stop = (name: string) => async () => {
      order.push(name);
    };

    await createQuiesceInterfaces({
      log: () => order.push("log"),
      stopTcpInterface: stop("tcp"),
      stopAutoInterface: stop("auto"),
      stopBleInterface: stop("ble"),
      stopRnodeInterface: stop("rnode"),
      stopFreenetInterface: stop("freenet"),
      pushStatus: () => order.push("status"),
    })();

    expect(order).toEqual([
      "log",
      "tcp",
      "auto",
      "ble",
      "rnode",
      "freenet",
      "status",
    ]);
  });
});

describe("joinCommunityNetwork", () => {
  function deps(startResults: boolean[]) {
    const log: string[] = [];
    const targets: unknown[] = [];
    let attempt = 0;
    return {
      log,
      targets,
      calls: {
        status: { tcpEnabled: false },
        pushStatus: () => {},
        log: (line: string) => log.push(line),
        communityNetwork: {
          label: "Community",
          privacyNotice: "traffic is public",
          endpoints: [
            { label: "alpha", host: "a.example", port: 4965 },
            { label: "beta", host: "b.example", port: 4965 },
          ],
        },
        stopTcpInterface: async () => {},
        setPendingTarget: (target: unknown) => targets.push(target),
        startTcpInterface: async () => startResults[attempt++] ?? false,
      },
    };
  }

  it("stops at the first endpoint that comes up", async () => {
    const harness = deps([true]);
    await joinCommunityNetwork(harness.calls);

    expect(harness.calls.status.tcpEnabled).toBe(true);
    expect(harness.targets).toEqual([
      { targetHost: "a.example", targetPort: 4965 },
    ]);
    expect(harness.log).toEqual([
      "traffic is public",
      "Trying alpha",
      "Joined Community through alpha",
    ]);
  });

  it("falls through to the next endpoint", async () => {
    const harness = deps([false, true]);
    await joinCommunityNetwork(harness.calls);

    expect(harness.targets).toHaveLength(2);
    expect(harness.log.at(-1)).toBe("Joined Community through beta");
  });

  it("reports that the bootstrap is unavailable when every endpoint fails", async () => {
    const harness = deps([false, false]);
    await joinCommunityNetwork(harness.calls);

    expect(harness.log.at(-1)).toContain("Community bootstrap unavailable");
  });
});

describe("createEnsureDevChannel", () => {
  function harness() {
    const sent: Record<string, unknown>[] = [];
    const log: string[] = [];
    const sideLoaded: unknown[] = [];
    let created = 0;
    let options: Record<string, (...args: never[]) => unknown> = {};

    const ensure = createEnsureDevChannel({
      createDevChannelClient: (next: typeof options) => {
        created += 1;
        options = next;
        return { id: created };
      },
      send: (message: Record<string, unknown>) => sent.push(message),
      log: (line: string) => log.push(line),
      ensureMiniappHost: () => ({
        isDeveloperMode: () => true,
        devSideLoad: async (manifest: unknown, bytes: unknown) => {
          sideLoaded.push([manifest, bytes]);
        },
      }),
    });

    return {
      ensure,
      sent,
      log,
      sideLoaded,
      created: () => created,
      options: () => options,
    };
  }

  it("creates the client once and reuses it", () => {
    const h = harness();
    expect(h.ensure()).toBe(h.ensure());
    expect(h.created()).toBe(1);
  });

  it("reads developer mode from the current mini-app host", () => {
    const h = harness();
    h.ensure();
    expect(h.options().isDeveloperMode()).toBe(true);
  });

  it.each([
    ["onConnected", ["127.0.0.1:9000"], "connected", "127.0.0.1:9000"],
    ["onBundleLoaded", ["hello"], "loaded", "hello"],
    ["onError", ["boom"], "error", "boom"],
  ] as const)("reports %s to the host", (hook, args, state, detail) => {
    const h = harness();
    h.ensure();
    h.options()[hook]?.(...(args as never[]));

    expect(h.sent).toEqual([{ type: "dev-channel", state, detail }]);
    expect(h.log).toHaveLength(1);
    expect(h.log[0]).toContain(detail);
  });

  it("reports disconnection without a detail", () => {
    const h = harness();
    h.ensure();
    h.options().onDisconnected?.();

    expect(h.sent).toEqual([{ type: "dev-channel", state: "disconnected" }]);
  });

  it("side-loads a received bundle into the mini-app host", async () => {
    const h = harness();
    h.ensure();
    const bytes = new Uint8Array([1, 2]);
    await h.options().onBundle?.({ name: "hello" } as never, bytes as never);

    expect(h.sideLoaded).toEqual([[{ name: "hello" }, bytes]]);
  });
});

describe("createWorkletPropagationPersistenceOps", () => {
  function harness(stored: Uint8Array | undefined) {
    let cache: { entries: unknown[] } | null = null;
    const written: unknown[] = [];
    const ops = createWorkletPropagationPersistenceOps({
      runtime: {
        store: {
          get: async () => stored,
          set: async (_key: string, value: unknown) => {
            written.push(value);
          },
        },
      },
      propagationStoreKey: "propagation",
      setPropagationStoreCache: (next: { entries: unknown[] }) => {
        cache = next;
      },
      getPropagationStoreCache: () => cache,
    });
    return { ops, cache: () => cache, written };
  }

  it("starts from an empty cache when nothing is stored", async () => {
    const h = harness(undefined);
    await h.ops.loadPropagationCache();
    expect(h.cache()).toEqual({ entries: [] });
  });

  it("restores a stored cache", async () => {
    const raw = new TextEncoder().encode(
      JSON.stringify({
        entries: [{ transientIdHex: "aa", lxmfDataHex: "bb", storedAt: 5 }],
      }),
    );
    const h = harness(raw);
    await h.ops.loadPropagationCache();

    expect(h.cache()).toEqual({
      entries: [{ transientIdHex: "aa", lxmfDataHex: "bb", storedAt: 5 }],
    });
  });

  it("falls back to an empty cache when the stored blob is corrupt", async () => {
    const h = harness(new TextEncoder().encode("{not json"));
    await h.ops.loadPropagationCache();
    expect(h.cache()).toEqual({ entries: [] });
  });

  it("round-trips entries through hex", async () => {
    const h = harness(undefined);
    await h.ops.loadPropagationCache();
    const persistence = h.ops.createPersistence();

    persistence.save([
      {
        transientId: new Uint8Array([0xaa]),
        lxmfData: new Uint8Array([0xbb, 0xcc]),
        storedAt: 7,
      },
    ]);

    expect(h.cache()).toEqual({
      entries: [{ transientIdHex: "aa", lxmfDataHex: "bbcc", storedAt: 7 }],
    });
    expect(persistence.load()).toEqual([
      {
        transientId: new Uint8Array([0xaa]),
        lxmfData: new Uint8Array([0xbb, 0xcc]),
        storedAt: 7,
      },
    ]);
    expect(h.written).toHaveLength(1);
  });

  it("loads nothing before the cache is populated", () => {
    expect(harness(undefined).ops.createPersistence().load()).toEqual([]);
  });
});

describe("createRegisterAnnounceHandler", () => {
  function harness(reticulum: unknown, ingested: unknown = null) {
    const sent: Record<string, unknown>[] = [];
    const log: string[] = [];
    const casLocators: unknown[] = [];
    const status = { announcesSeen: 0, dropCensus: null as unknown };
    let responder: () => Promise<void> = async () => {};
    let pushedCatalogs = 0;
    let persisted = 0;

    const register = createRegisterAnnounceHandler({
      getReticulum: () => reticulum,
      status,
      pushStatus: () => {},
      send: (message: Record<string, unknown>) => sent.push(message),
      log: (line: string) => log.push(line),
      ingestCasLocator: (data: unknown) => casLocators.push(data),
      respondToCasLocatorRequest: async () => responder(),
      ensureCatalog: () => ({ catalogStore: { ingest: () => ingested } }),
      persistCatalogState: () => {
        persisted += 1;
      },
      pushCatalog: () => {
        pushedCatalogs += 1;
      },
      dropCensus: {
        record: () => {},
        snapshot: () => ({ byReason: {}, byPeer: {} }),
      },
    });

    return {
      register,
      sent,
      log,
      casLocators,
      status,
      persisted: () => persisted,
      pushedCatalogs: () => pushedCatalogs,
      setResponder: (next: () => Promise<void>) => {
        responder = next;
      },
    };
  }

  function stubReticulum() {
    const state: {
      announce: { receivedAnnounce: (info: unknown) => void } | null;
      drop: ((drop: unknown) => void) | null;
    } = { announce: null, drop: null };
    return {
      state,
      reticulum: {
        registerAnnounceHandler: (handler: typeof state.announce) => {
          state.announce = handler;
        },
        registerDropObserver: (observer: typeof state.drop) => {
          state.drop = observer;
        },
      },
    };
  }

  it("does nothing when the stack is not up", () => {
    expect(() => harness(null).register()).not.toThrow();
  });

  it("forwards a bare announce to the host", () => {
    const stub = stubReticulum();
    const h = harness(stub.reticulum);
    h.register();

    stub.state.announce?.receivedAnnounce({
      destinationHash: new Uint8Array([0xab, 0xcd]),
      packet: { hops: 2 },
      appData: null,
    });

    expect(h.status.announcesSeen).toBe(1);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0]?.type).toBe("announce");
    expect(h.sent[0]?.entry).toMatchObject({
      destinationHash: "abcd",
      hops: 2,
      appDataHex: null,
    });
  });

  it("ingests app data and stays quiet when the catalog rejects it", async () => {
    const stub = stubReticulum();
    const h = harness(stub.reticulum);
    h.register();

    const appData = new Uint8Array([0x01]);
    stub.state.announce?.receivedAnnounce({
      destinationHash: new Uint8Array([0xab]),
      packet: { hops: 0 },
      appData,
    });
    await Promise.resolve();

    expect(h.casLocators).toEqual([appData]);
    expect(h.log).toEqual([]);
    expect(h.pushedCatalogs()).toBe(0);
  });

  it("logs and republishes the catalog when an entry is ingested", async () => {
    const stub = stubReticulum();
    const h = harness(stub.reticulum, { name: "hello", version: "1.0.0" });
    h.register();

    stub.state.announce?.receivedAnnounce({
      destinationHash: new Uint8Array([0xab]),
      packet: { hops: 0 },
      appData: new Uint8Array([0x01]),
    });
    await Promise.resolve();

    expect(h.log).toEqual(["Catalog: hello v1.0.0"]);
    expect(h.persisted()).toBe(1);
    expect(h.pushedCatalogs()).toBe(1);
  });

  it("logs a failed CAS locator response", async () => {
    const stub = stubReticulum();
    const h = harness(stub.reticulum);
    h.setResponder(async () => {
      throw new Error("no route");
    });
    h.register();

    stub.state.announce?.receivedAnnounce({
      destinationHash: new Uint8Array([0xab]),
      packet: { hops: 0 },
      appData: new Uint8Array([0x01]),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(h.log).toEqual(["CAS locator response failed: no route"]);
  });

  it("records drops into the census when the stack supports observers", () => {
    const stub = stubReticulum();
    const h = harness(stub.reticulum);
    h.register();

    stub.state.drop?.({ stage: "ingress", reason: "malformed" });

    expect(h.status.dropCensus).toEqual({ byReason: {}, byPeer: {} });
  });

  it("skips the drop observer on a stack that has none", () => {
    const h = harness({ registerAnnounceHandler: () => {} });
    expect(() => h.register()).not.toThrow();
  });
});
