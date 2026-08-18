import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
  type LaunchManifest,
} from "../src/index.js";
import { grantTtlMsForCapabilities } from "../src/grant-ttl.js";
import {
  BACKGROUND_GRANT_COST,
  BACKGROUND_SLOT_LIMIT,
  BackgroundBudgetError,
  assertBackgroundSlotAvailable,
  presentBackgroundGrant,
  shouldKeepRunningOnHostSuspend,
} from "../src/background-execution.js";

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

function helloBundle(label: string): Uint8Array {
  return new TextEncoder()
    .encode(`import { ui } from "@twistedpear/miniapp-sdk";
await ui.render({
  root: { id: "root", type: "text", props: { value: ${JSON.stringify(label)} } }
});
`);
}

function manifestFor(name: string): LaunchManifest {
  return {
    name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: ["runtime:background"],
    publisherPublicKey: "publisher",
  };
}

async function grantBackground(
  grants: GrantStore,
  appId: string,
): Promise<void> {
  await grants.set({
    appId,
    publisherPublicKey: "publisher",
    declared: ["runtime:background"],
    requestedGrants: ["runtime:background"],
    now: Date.now(),
    ttlMs: grantTtlMsForCapabilities(["runtime:background"]),
  });
}

describe("Android background execution", () => {
  it("states the grant cost honestly and rations slots", () => {
    const presented = presentBackgroundGrant("android");
    expect(presented.effective).toBe(true);
    expect(presented.slotLimit).toBe(BACKGROUND_SLOT_LIMIT);
    expect(presented.cost).toBe(BACKGROUND_GRANT_COST);
    expect(presentBackgroundGrant("ios").effective).toBe(false);
    assertBackgroundSlotAvailable(["notes"], "maps");
    expect(() =>
      assertBackgroundSlotAvailable(["notes", "maps"], "radio"),
    ).toThrow(BackgroundBudgetError);
  });

  it("keeps granted apps running inside an Android host suspend", async () => {
    const grants = new GrantStore(new MemoryStore());
    await grantBackground(grants, "notes");
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: new MemoryStore(),
      hostPlatform: "android",
    });
    await host.launch(manifestFor("notes"), helloBundle("notes"));
    await host.suspend("host-backgrounded");
    expect(host.snapshot().state).toBe("running");
    await host.stopAll("cleanup");
  });

  it("still suspends on iOS even when the grant is recorded", async () => {
    const grants = new GrantStore(new MemoryStore());
    await grantBackground(grants, "notes");
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: new MemoryStore(),
      hostPlatform: "ios",
    });
    await host.launch(manifestFor("notes"), helloBundle("notes"));
    const suspended = await host.suspend("host-backgrounded");
    expect(suspended.state).toBe("suspended");
    await host.stopAll("cleanup");
  });

  it("does not keep an ungranted Android app running across suspend", () => {
    expect(
      shouldKeepRunningOnHostSuspend({
        platform: "android",
        granted: [],
      }),
    ).toBe(false);
  });
});
