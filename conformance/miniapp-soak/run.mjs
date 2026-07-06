#!/usr/bin/env node
/**
 * Phase 4 M8 mini-app soak: launch / suspend / resume / stop across example apps.
 * Set SOAK_DURATION_MS for longer nightly runs (default 15 s).
 */

import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  CorestoreBeeBackend,
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../../packages/miniapp-runtime/dist/index.js";

const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/examples");
const EXAMPLE_NAMES = ["chat", "file-drop", "board"];
const SOAK_DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? "15000");

class MemoryStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await sleep(50);
  }

  throw new Error("waitFor timeout");
}

function launchManifest(app, publisherPublicKey) {
  return {
    name: app.name,
    version: app.version,
    entry: app.entry,
    capabilities: app.capabilities ?? [],
    publisherPublicKey
  };
}

async function packExample(name) {
  const cwd = mkdtempSync(join(tmpdir(), `tp-soak-${name}-`));
  const appDir = join(cwd, name);
  cpSync(join(examplesDir, name), appDir, { recursive: true });

  try {
    const initCode = await runInit({ cwd, args: [] });
    if (initCode !== 0) {
      throw new Error(`tp init failed for ${name}`);
    }

    const packCode = await runPack({ cwd, args: [name, "--out", `${name}.tpkg`] });
    if (packCode !== 0) {
      throw new Error(`tp pack failed for ${name}`);
    }

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(readFileSync(join(cwd, `${name}.tpkg`)));
    const verified = verifyPackage(provider, archive, { hostApiVersion: "0.1.0" });
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error(`Entry bundle missing for ${name}`);
    }

    return {
      app: verified.manifest,
      bundle,
      publisherPublicKey: verified.manifest.publisherPublicKey
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

async function createHost(store, beePath) {
  const beeBackend = new CorestoreBeeBackend(beePath, 256 * 1024);
  await beeBackend.ready();

  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: {
      descriptor: (appId) => beeBackend.descriptor(appId),
      get: async (appId, key) => beeBackend.get(appId, key),
      put: async (appId, key, value) => beeBackend.put(appId, key, value),
      del: async (appId, key) => beeBackend.del(appId, key),
      list: async (appId, listOptions) => beeBackend.list(appId, listOptions)
    },
    resourceBackend: {
      fetch: async (_appId, request) => {
        const bytes = await store.get(`miniapp-resource:${request.resourceId}`);
        if (bytes === null) {
          throw new Error(`Resource not found: ${request.resourceId}`);
        }

        return bytes;
      }
    }
  });

  return { host, beeBackend };
}

async function cycleApp(host, packed, flapInterface) {
  const manifest = launchManifest(packed.app, packed.publisherPublicKey);
  await host.setGrants(manifest.name, manifest.publisherPublicKey, manifest.capabilities, manifest.capabilities);
  await host.launch(manifest, packed.bundle);
  await waitFor(async () => (host.snapshot().widgetTree === null ? null : host.snapshot().widgetTree));

  if (flapInterface) {
    await host.suspend("interface-offline");
    await sleep(25);
    await host.resume();
  }

  await host.stop();
}

async function main() {
  const packed = [];
  for (const name of EXAMPLE_NAMES) {
    packed.push({ name, ...(await packExample(name)) });
  }

  const store = new MemoryStore();
  const beePath = mkdtempSync(join(tmpdir(), "miniapp-soak-bee-"));
  const { host, beeBackend } = await createHost(store, beePath);
  await store.set("miniapp-resource:offer:demo", new TextEncoder().encode("soak-payload"));

  const started = Date.now();
  let cycles = 0;
  let interfaceFlaps = 0;

  try {
    while (Date.now() - started < SOAK_DURATION_MS) {
      const flap = interfaceFlaps % 2 === 0;
      for (const example of packed) {
        await cycleApp(host, example, flap);
        cycles += 1;
      }

      interfaceFlaps += 1;
    }

    const snapshot = host.snapshot();
    if (snapshot.state !== "stopped") {
      await host.stop();
    }

    console.log(
      `miniapp-soak: ${cycles} launch cycles across ${EXAMPLE_NAMES.join(", ")} in ${Date.now() - started}ms (${interfaceFlaps} interface flaps)`
    );
  } finally {
    await beeBackend.close();
    rmSync(beePath, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
