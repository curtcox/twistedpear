import { describe, expect, it } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  GrantStore,
  HOST_API_VERSION,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type LaunchManifest,
} from "../src/index.js";
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

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

function textBundle(source: string): Uint8Array {
  return new TextEncoder().encode(source);
}

function helloBundle(label: string): Uint8Array {
  return textBundle(`import { ui } from "@twistedpear/miniapp-sdk";
await ui.render({
  root: {
    id: "root",
    type: "text",
    props: { value: ${JSON.stringify(label)} }
  }
});
`);
}

function manifestFor(name: string): LaunchManifest {
  return {
    name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: ["apps:channel"],
    publisherPublicKey: "publisher",
  };
}

async function grantChannel(
  store: MemoryStore,
  appId: string,
): Promise<GrantStore> {
  const grants = new GrantStore(store);
  const now = Date.now();
  await grants.set({
    appId,
    publisherPublicKey: "publisher",
    declared: ["apps:channel"],
    requestedGrants: ["apps:channel"],
    now,
    ttlMs: grantTtlMsForCapabilities(["apps:channel"]),
  });
  return grants;
}

async function launchPair(options?: {
  confirm?: (request: ConfirmationRequest) => Promise<{ approved: boolean }>;
}): Promise<{
  host: MiniappHost;
  confirmations: ConfirmationRequest[];
}> {
  const store = new MemoryStore();
  await grantChannel(store, "alpha");
  await grantChannel(store, "beta");
  const confirmations: ConfirmationRequest[] = [];
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    confirmationChannel: {
      async confirm(request) {
        confirmations.push(request);
        if (options?.confirm !== undefined) return options.confirm(request);
        return { approved: true };
      },
    },
  });
  await host.launch(manifestFor("alpha"), helloBundle("alpha"));
  await host.launch(manifestFor("beta"), helloBundle("beta"));
  return { host, confirmations };
}

function channelRequest(
  id: string,
  method: string,
  payload?: unknown,
): {
  id: string;
  namespace: string;
  method: string;
  payload?: unknown;
} {
  return {
    id,
    namespace: "apps.channel",
    method,
    ...(payload === undefined ? {} : { payload }),
  };
}

describe("app-to-app channel", () => {
  it("declares apps:channel and bumps the host API", () => {
    const entry = CAPABILITY_DEFINITIONS.find(
      (item) => item.id === "apps:channel",
    );
    expect(entry?.description).toContain("named when you grant this");
    expect(HOST_API_VERSION).toBe("0.15.0");
  });

  it("delivers a message only after both sides grant the named destination", async () => {
    const { host, confirmations } = await launchPair();
    host.switchForeground("alpha");

    const oneSided = await host.dispatchRaw(
      channelRequest("open-alpha", "open", { appId: "beta" }),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    expect(oneSided.ok).toBe(true);

    const blocked = await host.dispatchRaw(
      channelRequest("send-early", "send", {
        appId: "beta",
        payload: "hello",
      }),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    expect(blocked.ok).toBe(false);
    expect(blocked.error?.code).toBe("CHANNEL_NOT_GRANTED");

    host.switchForeground("alpha");
    const other = await host.dispatchRaw(
      channelRequest("open-beta", "open", { appId: "alpha" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(other.ok).toBe(false);
    expect(other.error?.code).toBe("FOREGROUND_REQUIRED");

    host.switchForeground("beta");
    const opened = await host.dispatchRaw(
      channelRequest("open-beta-fg", "open", { appId: "alpha" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(opened.ok).toBe(true);

    host.switchForeground("alpha");
    const sent = await host.dispatchRaw(
      channelRequest("send", "send", { appId: "beta", payload: "hello" }),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    expect(sent.ok).toBe(true);

    const received = await host.dispatchRaw(
      channelRequest("recv", "receive"),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(received.ok).toBe(true);
    expect(received.result).toEqual([
      expect.objectContaining({
        from: { appId: "alpha", publisherPublicKey: "publisher" },
        payload: "hello",
      }),
    ]);

    expect(confirmations.map((entry) => entry.kind)).toEqual([
      "app-channel",
      "app-channel",
    ]);
    expect(confirmations[0]?.summary.destination).toBe("beta");
    expect(confirmations[1]?.summary.destination).toBe("alpha");

    const peers = await host.dispatchRaw(
      channelRequest("peers", "peers"),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    expect(peers.result).toEqual([
      { appId: "beta", publisherPublicKey: "publisher" },
    ]);

    await host.stopAll();
  });

  it("refuses a missing, self, or unapproved destination before asking", async () => {
    const { host, confirmations } = await launchPair({
      confirm: async () => ({ approved: false }),
    });

    const missing = await host.dispatchRaw(
      channelRequest("missing", "open", { appId: "gamma" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(missing.error?.code).toBe("CHANNEL_PEER_NOT_RUNNING");

    const self = await host.dispatchRaw(
      channelRequest("self", "open", { appId: "beta" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(self.error?.code).toBe("CHANNEL_SELF");
    expect(confirmations).toEqual([]);

    const denied = await host.dispatchRaw(
      channelRequest("deny", "open", { appId: "alpha" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("CONFIRMATION_DENIED");
    expect(confirmations).toHaveLength(1);

    await host.stopAll();
  });

  it("drops queued messages when the destination stops", async () => {
    const { host } = await launchPair();
    host.switchForeground("alpha");
    await host.dispatchRaw(
      channelRequest("open-a", "open", { appId: "beta" }),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    host.switchForeground("beta");
    await host.dispatchRaw(
      channelRequest("open-b", "open", { appId: "alpha" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    await host.dispatchRaw(
      channelRequest("send", "send", { appId: "alpha", payload: "queued" }),
      manifestFor("beta"),
      ["apps:channel"],
    );

    host.switchForeground("alpha");
    await host.stop();
    expect(host.snapshot().appId).toBe("beta");

    const afterStop = await host.dispatchRaw(
      channelRequest("recv", "receive"),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    expect(afterStop.result).toEqual([]);

    const sendGone = await host.dispatchRaw(
      channelRequest("send-gone", "send", { appId: "alpha", payload: "nope" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(sendGone.error?.code).toBe("CHANNEL_PEER_NOT_RUNNING");

    await host.stopAll();
  });

  it("closes the channel when apps:channel is revoked", async () => {
    const { host } = await launchPair();
    host.switchForeground("alpha");
    await host.dispatchRaw(
      channelRequest("open-a", "open", { appId: "beta" }),
      manifestFor("alpha"),
      ["apps:channel"],
    );
    host.switchForeground("beta");
    await host.dispatchRaw(
      channelRequest("open-b", "open", { appId: "alpha" }),
      manifestFor("beta"),
      ["apps:channel"],
    );

    await host.revokeGrant("alpha", "publisher", "apps:channel");
    const sent = await host.dispatchRaw(
      channelRequest("send", "send", { appId: "alpha", payload: "hi" }),
      manifestFor("beta"),
      ["apps:channel"],
    );
    expect(sent.error?.code).toBe("CHANNEL_NOT_GRANTED");
    await host.stopAll();
  });
});
