#!/usr/bin/env node
// SPEC-BIND-LOOPBACK conformance: boot the platform on the packaged
// in-memory loopback binding and on the reference CI binding (disk-backed
// hyperbee, inline backends — the same construction as conformance/sdk-interop),
// run the shared call script over both, and require identical observable
// results minus timing.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CorestoreBeeBackend,
  GrantStore,
  MemoryKvStoreBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  createLoopbackBinding,
} from "../../packages/miniapp-runtime/dist/index.js";
import { normalizeResults, registerGrants, runCallScript } from "./calls.mjs";

const PRESENCE = { peers: 2, onlineInterfaces: 1, preferredInterface: "auto" };
const RESOURCES = new Map([
  ["offer:demo", new TextEncoder().encode("hello-resource")],
]);

async function runLoopback() {
  const binding = createLoopbackBinding({
    presence: PRESENCE,
    resources: RESOURCES,
  });
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(new MemoryKvStoreBackend()),
    ...binding,
  });
  await registerGrants(host);
  return runCallScript(host);
}

async function runReference() {
  const beePath = mkdtempSync(join(tmpdir(), "bind-loopback-bee-"));
  const beeBackend = new CorestoreBeeBackend(beePath, 1 << 16);
  await beeBackend.ready();
  try {
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(new MemoryKvStoreBackend()),
      kvBackend: new MemoryKvStoreBackend(),
      beeBackend,
      resourceBackend: {
        fetch: async (_appId, request) => {
          const bytes = RESOURCES.get(request.resourceId);
          if (bytes === undefined)
            throw new Error(`Resource not found: ${request.resourceId}`);
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
      presenceBackend: { snapshot: async () => PRESENCE },
    });
    await registerGrants(host);
    return await runCallScript(host);
  } finally {
    await beeBackend.close?.();
    rmSync(beePath, { recursive: true, force: true });
  }
}

const loopback = normalizeResults(await runLoopback());
const reference = normalizeResults(await runReference());

const loopbackText = JSON.stringify(loopback, null, 2);
const referenceText = JSON.stringify(reference, null, 2);
if (loopbackText !== referenceText) {
  const a = loopbackText.split("\n");
  const b = referenceText.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      console.error(
        `first divergence at line ${i}:\n  loopback:  ${a[i]}\n  reference: ${b[i]}`,
      );
      break;
    }
  }
  throw new Error(
    "loopback and reference bindings produced different observable results",
  );
}

console.log(
  `bind-loopback: ${loopback.length} calls identical across loopback and reference bindings`,
);

// SPEC-SDK vector suite over the loopback binding (the reference binding
// replays the same vectors in conformance/sdk-interop).
const { runSdkVectors } = await import("../sdk-interop/vectors.mjs");
const replay = await runSdkVectors("loopback");
if (replay.failures.length > 0) {
  for (const failure of replay.failures) console.error(failure);
  throw new Error(
    `SPEC-SDK vectors failed over the loopback binding (${replay.failures.length} failures)`,
  );
}
console.log(
  `bind-loopback: ${replay.vectors} SPEC-SDK vectors (${replay.steps} steps) passed over the loopback binding`,
);
