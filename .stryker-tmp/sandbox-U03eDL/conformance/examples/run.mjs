#!/usr/bin/env node
// @ts-nocheck
/**
 * Phase 4 M7 CI tier: pack, verify, grant, launch, and exercise each example app.
 * Peer-to-peer docker interop remains nightly/device-gated; this suite proves the
 * Phase 3 pipeline plus sandbox runtime for all three examples.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { unpackPackage, verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  CorestoreBeeBackend,
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../../packages/miniapp-runtime/dist/index.js";

const examplesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/examples");
const BLE_INSTALL_BUDGET_BYTES = 180 * 1024;
const EXAMPLE_NAMES = ["chat", "file-drop", "board"];

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

function collectTextValues(node) {
  const values = [];
  if (node.type === "text" && typeof node.props?.value === "string") {
    values.push(node.props.value);
  }

  for (const child of node.children ?? []) {
    values.push(...collectTextValues(child));
  }

  return values;
}

function treeContainsText(tree, needle) {
  return collectTextValues(tree.root).some((value) => value.includes(needle));
}

async function waitForTreeText(host, needle, timeoutMs = 15_000) {
  return waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    if (tree !== null && treeContainsText(tree, needle)) {
      return tree;
    }

    return null;
  }, timeoutMs);
}

async function tap(host, nodeId, event, value) {
  await host.handleUiEvent(nodeId, event, value);
  await sleep(250);
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
  const cwd = mkdtempSync(join(tmpdir(), `tp-example-${name}-`));
  const appDir = join(cwd, name);
  cpSync(join(examplesDir, name), appDir, { recursive: true });

  try {
    const initCode = await runInit({ cwd, identityPassphrase: "conformance identity passphrase", args: [] });
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
    if (archive.length > BLE_INSTALL_BUDGET_BYTES) {
      throw new Error(`${name}.tpkg exceeds BLE install budget (${archive.length} > ${BLE_INSTALL_BUDGET_BYTES})`);
    }

    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error(`Entry bundle missing for ${name}`);
    }

    return {
      app: verified.manifest,
      bundle,
      packageBytes: archive.length,
      publisherPublicKey: verified.manifest.publisherPublicKey
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

async function createHost(store, options = {}) {
  const hostOptions = {
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    resourceBackend: {
      fetch: async (_appId, request) => {
        const bytes = await store.get(`miniapp-resource:${request.resourceId}`);
        if (bytes === null) {
          throw new Error(`Resource not found: ${request.resourceId}`);
        }

        if (request.budgetBytes !== undefined && bytes.length > request.budgetBytes) {
          throw new Error(`Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`);
        }

        return bytes;
      }
    }
  };

  let beeBackend = null;
  if (options.beePath !== undefined) {
    beeBackend = new CorestoreBeeBackend(options.beePath, 256 * 1024);
    await beeBackend.ready();
    hostOptions.beeBackend = {
      descriptor: (appId) => beeBackend.descriptor(appId),
      get: async (appId, key) => beeBackend.get(appId, key),
      put: async (appId, key, value) => beeBackend.put(appId, key, value),
      del: async (appId, key) => beeBackend.del(appId, key),
      list: async (appId, listOptions) => beeBackend.list(appId, listOptions)
    };
  }

  const host = new MiniappHost(hostOptions);
  return { host, beeBackend };
}

async function exerciseChat(packed) {
  const store = new MemoryStore();
  const { host } = await createHost(store);

  try {
    const manifest = launchManifest(packed.app, packed.publisherPublicKey);
    await host.setGrants(manifest.name, manifest.publisherPublicKey, manifest.capabilities, manifest.capabilities);
    await host.launch(manifest, packed.bundle);
    await waitForTreeText(host, "Chat");
    await waitForTreeText(host, "Me:");

    const sent = await host.dispatchRaw(
      {
        id: "lxmf-send",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: manifest.name, subject: "hello", body: "Hi from conformance" }
      },
      manifest,
      manifest.capabilities
    );
    if (!sent.ok) {
      throw new Error(`lxmf send failed: ${sent.error?.message ?? "unknown"}`);
    }

    const inbox = await host.dispatchRaw(
      {
        id: "lxmf-receive",
        namespace: "lxmf",
        method: "receive",
        capability: "lxmf:receive"
      },
      manifest,
      manifest.capabilities
    );
    if (!inbox.ok || !Array.isArray(inbox.result) || inbox.result.length !== 1) {
      throw new Error("chat lxmf inbox did not receive the sent message");
    }

    if (inbox.result[0]?.body !== "Hi from conformance") {
      throw new Error("chat lxmf message body mismatch");
    }

    await host.stop();
  } finally {
    // chat does not use Hyperbee
  }
}

async function exerciseFileDrop(packed) {
  const store = new MemoryStore();
  const { host } = await createHost(store);

  try {
    await store.set("miniapp-resource:offer:demo", new TextEncoder().encode("phase4-demo-payload"));
    const manifest = launchManifest(packed.app, packed.publisherPublicKey);
    await host.setGrants(manifest.name, manifest.publisherPublicKey, manifest.capabilities, manifest.capabilities);
    await host.launch(manifest, packed.bundle);
    await waitForTreeText(host, "File Drop");
    await sleep(100);

    const fetched = await host.dispatchRaw(
      {
        id: "fetch-direct",
        namespace: "resource",
        method: "fetch",
        capability: "resource:fetch",
        payload: { resourceId: "offer:demo", budgetBytes: 4096 }
      },
      manifest,
      manifest.capabilities
    );
    if (!fetched.ok) {
      throw new Error(`resource.fetch failed: ${fetched.error?.message ?? "unknown"}`);
    }

    await host.handleUiEvent("fetch", "resource.fetch");
    await sleep(250);
    await waitFor(async () => {
      const tree = host.snapshot().widgetTree;
      if (tree === null) {
        return null;
      }

      const texts = collectTextValues(tree.root);
      const updated = texts.find((value) => value.includes("Fetched") || value.includes("Resource"));
      return updated !== undefined ? tree : null;
    });

    const cached = await store.get("miniapp-kv:file-drop:last-fetch");
    if (cached === null) {
      throw new Error("file-drop did not persist fetched bytes in KV");
    }

    await host.stop();
  } finally {
    // no bee backend for file-drop
  }
}

async function exerciseBoard(packed) {
  const store = new MemoryStore();
  const beePath = mkdtempSync(join(tmpdir(), "example-board-bee-"));
  const { host, beeBackend } = await createHost(store, { beePath });

  try {
    const manifest = launchManifest(packed.app, packed.publisherPublicKey);
    await host.setGrants(manifest.name, manifest.publisherPublicKey, manifest.capabilities, manifest.capabilities);
    await host.launch(manifest, packed.bundle);
    await waitForTreeText(host, "Board");

    await tap(host, "publish", "board.publish");
    await waitForTreeText(host, "Published 1 post");

    await tap(host, "refresh", "board.refresh");
    await waitForTreeText(host, "1 local post(s)");

    await host.stop();
  } finally {
    if (beeBackend !== null) {
      await beeBackend.close();
      rmSync(beePath, { recursive: true, force: true });
    }
  }
}

const EXERCISES = {
  chat: exerciseChat,
  "file-drop": exerciseFileDrop,
  board: exerciseBoard
};

async function main() {
  for (const name of EXAMPLE_NAMES) {
    const packed = await packExample(name);
    console.log(`examples: ${name} packed ${packed.packageBytes} bytes and verified`);
    await EXERCISES[name](packed);
    console.log(`examples: ${name} launch and exercise passed`);
  }

  console.log("examples: chat, file-drop, and board passed pack → verify → grant → launch → exercise");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
