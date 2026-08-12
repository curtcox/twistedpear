/**
 * BUG-MINIAPP-IDENTITY-BACKEND.
 *
 * The worklet hosts wire the app-scoped identity backend themselves, and the
 * regression that broke every mini-app launch lived in that wiring rather than
 * in either package: `createInstallationIdentityLoader` returns null while the
 * node is still starting, and the backend turned that not-yet into a hard
 * failure. The ID-APPSCOPE tests never touched a worklet path, so nothing
 * caught it.
 *
 * These drive the real loader, the real backend, and a real MiniappHost broker
 * dispatch, because that composition is the thing that was wrong.
 */
import { describe, expect, it } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import { createAppScopedIdentityBackend } from "../../packages/host-core/dist/app-scoped-identity.js";
import { GrantStore } from "../../packages/miniapp-runtime/dist/capabilities.js";
import { MiniappHost } from "../../packages/miniapp-runtime/dist/host.js";
import { createInstallationIdentityLoader } from "../../packages/worklet-core/src/miniapp-host-shared-core.mjs";

const provider = new NodeCryptoProvider();
/** A real 32-byte publisher key: the derivation rejects anything else. */
const publisherPublicKey = "ab".repeat(64);

const manifest = {
  name: "chat",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["identity"],
  publisherPublicKey,
};

function memoryStore() {
  const values = new Map();
  return {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
    async list(prefix) {
      return [...values.keys()].filter((key) => key.startsWith(prefix));
    },
  };
}

/**
 * Wires the host exactly as `createWorkletMiniappHost` does: a publisher
 * identity getter that may not have an identity yet, funnelled through the
 * installation loader into the app-scoped backend.
 */
function workletHost({ getPublisherIdentity, readiness }) {
  const audit = [];
  const logs = [];
  const bytes = memoryStore();
  const host = new MiniappHost({
    backend: {
      name: "unused",
      async spawn() {
        throw new Error("this test never launches a sandbox");
      },
    },
    grantStore: new GrantStore(bytes),
    kvBackend: bytes,
    now: () => 0,
    brokerAudit: (entry) => audit.push(entry),
    callbacks: { onLog: (entry) => logs.push(entry) },
    identityBackend: createAppScopedIdentityBackend({
      provider,
      getInstallationIdentity: createInstallationIdentityLoader({
        getPublisherIdentity,
      }),
      readiness,
    }),
  });

  const request = {
    id: "1",
    namespace: "identity",
    method: "destinationHash",
    capability: "identity",
  };

  return {
    audit,
    logs,
    async destinationHash() {
      return host.dispatchRaw(request, manifest, ["identity"]);
    },
    async ungrantedDestinationHash() {
      return host.dispatchRaw(request, manifest, []);
    },
  };
}

/** Advances without real waiting, so a readiness window costs no test time. */
function fakeClock() {
  let nowMs = 0;
  return {
    now: () => nowMs,
    delay: async (ms) => {
      nowMs += ms;
    },
  };
}

describe("worklet mini-app hosts and a node that has not started", () => {
  it("serves an app launched before the identity exists", async () => {
    const installation = new Identity(provider);
    // The node finishes starting on the fourth ask, so the wait loop is the
    // thing under test rather than a lucky first poll.
    let asks = 0;
    const host = workletHost({
      getPublisherIdentity: async () => {
        asks += 1;
        return asks < 4 ? null : installation;
      },
      readiness: { timeoutMs: 15_000, ...fakeClock() },
    });

    const response = await host.destinationHash();
    expect(asks).toBe(4);
    expect(response.ok).toBe(true);
    expect(response.result).toMatch(/^[0-9a-f]+$/);
    expect(host.audit.map((entry) => entry.outcome)).toEqual(["allowed"]);
    expect(host.logs.map((entry) => entry.line)).not.toContain(
      "broker denied identity.destinationHash",
    );
  });

  it("tells an app the identity is unavailable rather than denied", async () => {
    const host = workletHost({
      getPublisherIdentity: async () => null,
      readiness: { timeoutMs: 0 },
    });

    const response = await host.destinationHash();
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("IDENTITY_UNAVAILABLE");
    // The capability was granted; only the backend failed. Recording this as a
    // denial is what made the original bug read as a grant problem.
    expect(host.audit.map((entry) => entry.outcome)).toEqual([
      "allowed",
      "failed",
    ]);
    expect(host.logs.map((entry) => entry.line)).not.toContain(
      "broker denied identity.destinationHash",
    );
  });

  it("still refuses an app that was never granted identity", async () => {
    const installation = new Identity(provider);
    const host = workletHost({
      getPublisherIdentity: async () => installation,
    });

    // Negative control: waiting out a not-ready identity must not have loosened
    // the capability gate for an app that simply has no grant.
    const response = await host.ungrantedDestinationHash();
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("CAPABILITY_DENIED");
    expect(host.audit.map((entry) => entry.outcome)).toEqual(["denied"]);
    expect(host.logs.map((entry) => entry.line)).toContain(
      "broker denied identity.destinationHash",
    );
  });
});
