#!/usr/bin/env node
/**
 * Phase 4 M3 SDK interop: exercise broker namespaces, grants, quotas, and cross-app isolation.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CorestoreBeeBackend,
  GrantStore,
  MiniappBroker,
  MiniappHost,
  NodeWorkerSandboxBackend,
  StorageBeeQuotaError,
  assertCapabilityAllowed,
  CapabilityError,
} from "../../packages/miniapp-runtime/dist/index.js";

function createMemoryStore() {
  const values = new Map();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    delete: async (key) => {
      values.delete(key);
    },
    list: async (prefix) =>
      [...values.keys()].filter((key) => key.startsWith(prefix)),
  };
}

function manifest(appId, capabilities) {
  return {
    name: appId,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities,
    publisherPublicKey: `publisher-${appId}`,
  };
}

async function dispatch(host, request, appManifest, grants) {
  return host.dispatchRaw(request, appManifest, grants);
}

async function main() {
  const store = createMemoryStore();
  const beePath = mkdtempSync(join(tmpdir(), "sdk-interop-bee-"));
  const beeBackend = new CorestoreBeeBackend(beePath, 128);
  await beeBackend.ready();

  const resources = new Map([
    ["offer:demo", new TextEncoder().encode("hello-resource")],
  ]);

  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend,
    kvQuotaBytes: 64,
    resourceBackend: {
      fetch: async (_appId, request) => {
        const bytes = resources.get(request.resourceId);
        if (bytes === undefined) {
          throw new Error(`Resource not found: ${request.resourceId}`);
        }

        if (
          request.budgetBytes !== undefined &&
          bytes.length > request.budgetBytes
        ) {
          throw new Error(
            `Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`,
          );
        }

        return bytes;
      },
    },
    presenceBackend: {
      snapshot: async () => ({
        peers: 2,
        onlineInterfaces: 1,
        preferredInterface: "auto",
      }),
    },
  });

  const appA = manifest("app-a", [
    "identity",
    "lxmf:send",
    "lxmf:receive",
    "storage:kv",
    "storage:hyperbee",
    "announce:publish",
    "announce:subscribe",
    "resource:fetch",
    "presence",
  ]);
  const appB = manifest("app-b", [
    "identity",
    "lxmf:send",
    "lxmf:receive",
    "storage:kv",
    "storage:hyperbee",
    "announce:publish",
    "announce:subscribe",
    "resource:fetch",
    "presence",
  ]);

  const allGrants = appA.capabilities;
  await host.setGrants(
    "app-a",
    appA.publisherPublicKey,
    appA.capabilities,
    allGrants,
  );
  await host.setGrants(
    "app-b",
    appB.publisherPublicKey,
    appB.capabilities,
    allGrants,
  );

  const destinationA = await dispatch(
    host,
    {
      id: "id-1",
      namespace: "identity",
      method: "destinationHash",
      capability: "identity",
    },
    appA,
    allGrants,
  );
  if (!destinationA.ok || typeof destinationA.result !== "string") {
    throw new Error("identity.destinationHash failed for app-a");
  }

  const signed = await dispatch(
    host,
    {
      id: "id-2",
      namespace: "identity",
      method: "sign",
      capability: "identity",
      payload: { payload: new TextEncoder().encode("payload") },
    },
    appA,
    allGrants,
  );
  if (!signed.ok) {
    throw new Error("identity.sign failed");
  }

  await dispatch(
    host,
    {
      id: "id-3",
      namespace: "lxmf",
      method: "send",
      capability: "lxmf:send",
      payload: { to: "app-b", subject: "ping", body: "hello" },
    },
    appA,
    allGrants,
  );

  const inboxB = await dispatch(
    host,
    {
      id: "id-4",
      namespace: "lxmf",
      method: "receive",
      capability: "lxmf:receive",
    },
    appB,
    allGrants,
  );
  if (
    !inboxB.ok ||
    !Array.isArray(inboxB.result) ||
    inboxB.result.length !== 1
  ) {
    throw new Error("lxmf receive on app-b failed");
  }

  const inboxA = await dispatch(
    host,
    {
      id: "id-5",
      namespace: "lxmf",
      method: "receive",
      capability: "lxmf:receive",
    },
    appA,
    allGrants,
  );
  if (
    !inboxA.ok ||
    !Array.isArray(inboxA.result) ||
    inboxA.result.length !== 0
  ) {
    throw new Error("app-a should not see app-b traffic in its inbox");
  }

  await dispatch(
    host,
    {
      id: "id-6",
      namespace: "storage.kv",
      method: "set",
      capability: "storage:kv",
      payload: { key: "secret", value: new TextEncoder().encode("a") },
    },
    appA,
    allGrants,
  );

  const crossKv = await dispatch(
    host,
    {
      id: "id-7",
      namespace: "storage.kv",
      method: "get",
      capability: "storage:kv",
      payload: { key: "secret" },
    },
    appB,
    allGrants,
  );
  if (!crossKv.ok || crossKv.result !== null) {
    throw new Error("KV isolation failed between apps");
  }

  await beeBackend.put("app-a", "post:1", new TextEncoder().encode("alpha"));
  await beeBackend.put("app-b", "post:1", new TextEncoder().encode("beta"));
  const beeCross = await dispatch(
    host,
    {
      id: "id-8",
      namespace: "storage.bee",
      method: "get",
      capability: "storage:hyperbee",
      payload: { key: "post:1" },
    },
    appB,
    allGrants,
  );
  if (!beeCross.ok || new TextDecoder().decode(beeCross.result) !== "beta") {
    throw new Error("Hyperbee read failed for app-b");
  }

  await dispatch(
    host,
    {
      id: "id-9",
      namespace: "announce",
      method: "publish",
      capability: "announce:publish",
      payload: {
        appData: new TextEncoder().encode("board-post"),
        namespace: "board",
      },
    },
    appA,
    allGrants,
  );

  const announces = await dispatch(
    host,
    {
      id: "id-10",
      namespace: "announce",
      method: "subscribe",
      capability: "announce:subscribe",
      payload: { namespace: "board" },
    },
    appB,
    allGrants,
  );
  if (
    !announces.ok ||
    !Array.isArray(announces.result) ||
    announces.result.length === 0
  ) {
    throw new Error("announce.subscribe failed");
  }

  const fetched = await dispatch(
    host,
    {
      id: "id-11",
      namespace: "resource",
      method: "fetch",
      capability: "resource:fetch",
      payload: { resourceId: "offer:demo", budgetBytes: 32 },
    },
    appA,
    allGrants,
  );
  if (
    !fetched.ok ||
    new TextDecoder().decode(fetched.result) !== "hello-resource"
  ) {
    throw new Error("resource.fetch failed");
  }

  const presence = await dispatch(
    host,
    {
      id: "id-12",
      namespace: "presence",
      method: "snapshot",
      capability: "presence",
    },
    appA,
    allGrants,
  );
  if (!presence.ok || presence.result?.peers !== 2) {
    throw new Error("presence.snapshot failed");
  }

  try {
    assertCapabilityAllowed({
      capability: "storage:kv",
      declared: ["storage:kv"],
      granted: [],
    });
    throw new Error("expected capability denial");
  } catch (error) {
    if (!(error instanceof CapabilityError)) {
      throw error;
    }
  }

  await host.revokeGrant("app-a", appA.publisherPublicKey, "storage:kv");
  const denied = await dispatch(
    host,
    {
      id: "id-13",
      namespace: "storage.kv",
      method: "get",
      capability: "storage:kv",
      payload: { key: "secret" },
    },
    appA,
    [],
  );
  if (denied.ok || denied.error?.code !== "CAPABILITY_DENIED") {
    throw new Error("grant enforcement failed closed");
  }

  const kvQuota = await dispatch(
    host,
    {
      id: "id-14",
      namespace: "storage.kv",
      method: "set",
      capability: "storage:kv",
      payload: { key: "big", value: new Uint8Array(96) },
    },
    appA,
    allGrants,
  );
  if (kvQuota.ok) {
    throw new Error("expected KV quota denial via broker");
  }

  const quotaBee = new CorestoreBeeBackend(join(beePath, "quota-only"), 24);
  await quotaBee.ready();
  await quotaBee.put(
    "quota-app",
    "a",
    new TextEncoder().encode("123456789012345678901234"),
  );
  try {
    await quotaBee.put(
      "quota-app",
      "b",
      new TextEncoder().encode("123456789012345678901234"),
    );
    throw new Error("expected Hyperbee quota error");
  } catch (error) {
    if (!(error instanceof StorageBeeQuotaError)) {
      throw error;
    }
  }
  await quotaBee.close();

  const broker = new MiniappBroker({
    maxMessagesPerSecond: 1,
    now: () => 2_000,
  });
  broker.register("ui", "render", null, () => "ok");
  const limited = await broker.dispatch(
    { id: "flood-1", namespace: "ui", method: "render" },
    {
      appId: "flood",
      publisherPublicKey: "pub",
      declaredCapabilities: [],
      grantedCapabilities: [],
    },
  );
  if (!limited.ok) {
    throw new Error("first broker message should pass");
  }

  const throttled = await broker.dispatch(
    { id: "flood-2", namespace: "ui", method: "render" },
    {
      appId: "flood",
      publisherPublicKey: "pub",
      declaredCapabilities: [],
      grantedCapabilities: [],
    },
  );
  if (throttled.error?.code !== "RATE_LIMITED") {
    throw new Error("broker rate limit not enforced");
  }

  await beeBackend.close();
  rmSync(beePath, { recursive: true, force: true });

  console.log(
    "sdk-interop: identity, lxmf, storage, announce, resource, presence, grants, quotas passed",
  );

  // SPEC-SDK vector suite over the reference binding (the loopback binding
  // replays the same vectors in conformance/bind-loopback).
  const { runSdkVectors } = await import("./vectors.mjs");
  const replay = await runSdkVectors("reference");
  if (replay.failures.length > 0) {
    for (const failure of replay.failures) console.error(failure);
    throw new Error(
      `SPEC-SDK vectors failed over the reference binding (${replay.failures.length} failures)`,
    );
  }
  console.log(
    `sdk-interop: ${replay.vectors} SPEC-SDK vectors (${replay.steps} steps) passed over the reference binding`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
