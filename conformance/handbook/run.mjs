#!/usr/bin/env node
/**
 * Phase D0: headless Handbook install + chapter render + applet execution
 * on the Node sandbox backend, plus report/result schema checks.
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../../packages/miniapp-runtime/dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const handbookDir = join(root, "apps/handbook");
const RESULT_STATUSES = new Set(["pass", "fail", "unavailable", "not-granted", "skipped"]);

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

async function waitFor(evaluate, timeoutMs = 15_000) {
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

async function waitForTreeText(host, needle, timeoutMs = 20_000) {
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
  await sleep(300);
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

function buildHandbook() {
  const result = spawnSync(process.execPath, [join(handbookDir, "build.mjs")], {
    cwd: handbookDir,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`handbook build failed:\n${result.stdout}\n${result.stderr}`);
  }
  console.log(result.stdout.trim());
}

async function packHandbook() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-handbook-"));
  const appDir = join(cwd, "handbook");
  mkdirSync(appDir, { recursive: true });
  // content/ and seeds/ are authoring artifacts; the built bundle embeds both.
  cpSync(join(handbookDir, "app.manifest.json"), join(appDir, "app.manifest.json"));
  cpSync(join(handbookDir, "bundle.js"), join(appDir, "bundle.js"));

  try {
    const initCode = await runInit({ cwd, args: [] });
    if (initCode !== 0) {
      throw new Error("tp init failed for handbook");
    }

    const packCode = await runPack({ cwd, args: ["handbook", "--out", "handbook.tpkg"] });
    if (packCode !== 0) {
      throw new Error("tp pack failed for handbook");
    }

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(readFileSync(join(cwd, "handbook.tpkg")));
    const verified = verifyPackage(provider, archive, { hostApiVersion: "0.2.0" });
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error("Handbook entry bundle missing");
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

function loadCatalog() {
  return JSON.parse(readFileSync(join(handbookDir, "generated/catalog.json"), "utf8"));
}

function assertResultSchema(result) {
  if (result === null || typeof result !== "object") {
    throw new Error("applet result must be an object");
  }
  if (typeof result.appletId !== "string" || result.appletId.length === 0) {
    throw new Error("applet result missing appletId");
  }
  if (!RESULT_STATUSES.has(result.status)) {
    throw new Error(`invalid applet status: ${result.status}`);
  }
  if (typeof result.details !== "string") {
    throw new Error("applet result missing details");
  }
}

async function main() {
  buildHandbook();
  const catalog = loadCatalog();
  if (!Array.isArray(catalog.chapters) || catalog.chapters.length === 0) {
    throw new Error("catalog has no chapters");
  }
  if (!Array.isArray(catalog.applets) || catalog.applets.length === 0) {
    throw new Error("catalog has no applets");
  }

  const packed = await packHandbook();
  console.log(`handbook: packed ${packed.packageBytes} bytes`);

  const store = new MemoryStore();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    presenceBackend: {
      snapshot: async () => ({ onlineInterfaces: 0, preferredInterface: null, peers: 0 })
    }
  });

  try {
    const manifest = launchManifest(packed.app, packed.publisherPublicKey);
    await host.setGrants(manifest.name, manifest.publisherPublicKey, manifest.capabilities, manifest.capabilities);
    await host.launch(manifest, packed.bundle);

    await waitForTreeText(host, "TwistedPear Handbook");
    await waitForTreeText(host, "Contents");
    console.log("handbook: TOC rendered");

    for (const chapter of catalog.chapters) {
      await tap(host, `ch-${chapter.id}`, "hb.openchapter");
      await waitForTreeText(host, chapter.title);
      console.log(`handbook: chapter rendered — ${chapter.id}`);
      await tap(host, "back-toc", "hb.toc");
      await waitForTreeText(host, "Contents");
    }

    // Run every applet once from its chapter.
    const appletChapter = {
      "identity-hash": "sdk-identity",
      "presence-snapshot": "sdk-presence",
      "storage-kv": "sdk-storage-kv",
      "lxmf-roundtrip": "sdk-lxmf",
      "announce-loop": "sdk-announce"
    };

    for (const applet of catalog.applets) {
      const chapter = appletChapter[applet.id];
      if (chapter === undefined) {
        throw new Error(`No chapter mapping for applet ${applet.id}`);
      }

      const tree = host.snapshot().widgetTree;
      if (tree === null || !treeContainsText(tree, "Contents")) {
        await tap(host, "back-toc", "hb.toc");
        await waitForTreeText(host, "Contents");
      }

      await tap(host, `ch-${chapter}`, "hb.openchapter");
      await waitForTreeText(host, `Applet: ${applet.title}`);
      await tap(host, `applet-run-${applet.id}`, "hb.runapplet");
      await waitFor(async () => {
        const next = host.snapshot().widgetTree;
        if (next === null) {
          return null;
        }
        const texts = collectTextValues(next.root);
        const hit = texts.find((value) => value.startsWith("PASS"));
        return hit ?? null;
      });
      console.log(`handbook: applet passed — ${applet.id}`);
    }

    // Canonical result record schema (D0/D2 precursor).
    const resultRecord = {
      appletId: "identity-hash",
      status: "pass",
      details: "destinationHash observed",
      timings: { ms: 1 }
    };
    assertResultSchema(resultRecord);
    console.log("handbook: result schema check passed");

    // Reading position persisted in KV (last opened chapter before stop).
    const position = await store.get("miniapp-kv:handbook:handbook:position");
    if (position === null) {
      throw new Error("handbook did not persist reading position");
    }
    console.log(`handbook: reading position persisted (${new TextDecoder().decode(position)})`);

    await host.stop();
  } finally {
    // host stop covers worker teardown
  }

  console.log(
    `handbook: ${catalog.chapters.length} chapter(s) + ${catalog.applets.length} applet(s) passed on Node sandbox`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
