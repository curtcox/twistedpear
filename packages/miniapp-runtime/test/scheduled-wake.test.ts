import { describe, expect, it } from "vitest";
import {
  MiniappHost,
  GrantStore,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
  type LaunchManifest,
} from "../src/index.js";
import { grantTtlMsForCapabilities } from "../src/grant-ttl.js";
import {
  WAKE_GRANT_COST,
  WAKE_MAX_BUDGET_MS,
  WAKE_MIN_INTERVAL_MS,
  WakeBudgetError,
  allocateWake,
  dueWakes,
  presentWakeGrant,
} from "../src/scheduled-wake.js";

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

function helloBundle(): Uint8Array {
  return new TextEncoder()
    .encode(`import { ui } from "@twistedpear/miniapp-sdk";
await ui.render({
  root: { id: "root", type: "text", props: { value: "ok" } }
});
`);
}

function manifestFor(name: string): LaunchManifest {
  return {
    name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: ["runtime:wake"],
    publisherPublicKey: "publisher",
  };
}

describe("scheduled wake rationing", () => {
  it("states the cost as a per-host budget, not a per-app timer", () => {
    const android = presentWakeGrant("android");
    expect(android.cost).toBe(WAKE_GRANT_COST);
    expect(android.slotLimit).toBe(3);
    expect(presentWakeGrant("ios").slotLimit).toBe(1);
    expect(presentWakeGrant("web").slotLimit).toBe(0);
  });

  it("refuses a fourth Android wake and an interval below the floor", () => {
    const held = ["a", "b", "c"].reduce<ReturnType<typeof allocateWake>[]>(
      (grants, appId, index) => [
        ...grants,
        allocateWake(
          grants,
          {
            appId,
            publisherPublicKey: "publisher",
            intervalMs: WAKE_MIN_INTERVAL_MS,
            budgetMs: 1_000,
          },
          "android",
          index,
        ),
      ],
      [],
    );
    expect(() =>
      allocateWake(
        held,
        {
          appId: "d",
          publisherPublicKey: "publisher",
          intervalMs: WAKE_MIN_INTERVAL_MS,
          budgetMs: 1_000,
        },
        "android",
        10,
      ),
    ).toThrow(/Revoke one of: a, b, c/);
    expect(() =>
      allocateWake(
        [],
        {
          appId: "a",
          publisherPublicKey: "publisher",
          intervalMs: WAKE_MIN_INTERVAL_MS - 1,
          budgetMs: 1_000,
        },
        "android",
        0,
      ),
    ).toThrow(WakeBudgetError);
    expect(() =>
      allocateWake(
        [],
        {
          appId: "a",
          publisherPublicKey: "publisher",
          intervalMs: WAKE_MIN_INTERVAL_MS,
          budgetMs: WAKE_MAX_BUDGET_MS + 1,
        },
        "android",
        0,
      ),
    ).toThrow(WakeBudgetError);
  });

  it("wakes a granted app when its interval elapses", async () => {
    const grants = new GrantStore(new MemoryStore());
    await grants.set({
      appId: "notes",
      publisherPublicKey: "publisher",
      declared: ["runtime:wake"],
      requestedGrants: ["runtime:wake"],
      now: 0,
      ttlMs: grantTtlMsForCapabilities(["runtime:wake"]),
    });
    let now = 0;
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: new MemoryStore(),
      hostPlatform: "android",
      now: () => now,
    });
    await host.launch(manifestFor("notes"), helloBundle());
    await host.suspend("host-backgrounded");
    host.requestWake("notes", "publisher", {
      intervalMs: WAKE_MIN_INTERVAL_MS,
      budgetMs: 1_000,
    });
    expect(dueWakes(host.listWakeGrants(), now)).toEqual([]);
    now = WAKE_MIN_INTERVAL_MS;
    const woken = await host.tickWakes();
    expect(woken).toEqual(["notes"]);
    expect(host.snapshot().state).toBe("running");
    await host.stopAll("cleanup");
  });
});
