#!/usr/bin/env node
/**
 * Smoke-test Handbook per-part packages: pack, launch, verify scoped TOC.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  HOST_API_VERSION,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
} from "../../packages/miniapp-runtime/dist/index.js";
import {
  dismissGrantIntroIfNeeded,
  tap,
  waitForTreeText,
} from "./ui-helpers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const handbookDir = join(root, "apps/handbook");
const partsRoot = join(handbookDir, "generated/part-packages");

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

function ensurePartPackages() {
  if (existsSync(partsRoot)) {
    return;
  }
  const result = spawnSync("npm", ["run", "build:handbook"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function packPartDir(partId) {
  const sourceDir = join(partsRoot, partId);
  const manifest = JSON.parse(
    readFileSync(join(sourceDir, "app.manifest.json"), "utf8"),
  );
  const appFolder = manifest.name;

  const cwd = mkdtempSync(join(tmpdir(), "tp-handbook-part-smoke-"));
  const appDir = join(cwd, appFolder);
  mkdirSync(appDir, { recursive: true });
  cpSync(
    join(sourceDir, "app.manifest.json"),
    join(appDir, "app.manifest.json"),
  );
  cpSync(join(sourceDir, "bundle.js"), join(appDir, "bundle.js"));

  try {
    const initCode = await runInit({
      cwd,
      identityPassphrase: "conformance identity passphrase",
      args: [],
    });
    if (initCode !== 0) {
      throw new Error(`tp init failed for ${partId}`);
    }

    const packCode = await runPack({
      cwd,
      args: [appFolder, "--out", `${appFolder}.tpkg`],
    });
    if (packCode !== 0) {
      throw new Error(`tp pack failed for ${partId}`);
    }

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(
      readFileSync(join(cwd, `${appFolder}.tpkg`)),
    );
    const verified = verifyPackage(provider, archive, {
      hostApiVersion: HOST_API_VERSION,
    });
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error(`${appFolder} entry bundle missing`);
    }

    return {
      partId,
      app: verified.manifest,
      bundle,
      publisherPublicKey: verified.manifest.publisherPublicKey,
      packageBytes: archive.length,
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function chapterButtonIds(tree) {
  const ids = [];
  function walk(node) {
    if (typeof node.id === "string" && node.id.startsWith("ch-")) {
      ids.push(node.id.slice(3));
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
  walk(tree.root);
  return ids;
}

export async function runHandbookPartPackagesSmoke() {
  ensurePartPackages();
  const toc = JSON.parse(
    readFileSync(join(handbookDir, "content/toc.json"), "utf8"),
  );
  const partIds = readdirSync(partsRoot)
    .filter((entry) => statSync(join(partsRoot, entry)).isDirectory())
    .sort();

  if (partIds.length !== toc.parts.length) {
    throw new Error(
      `expected ${toc.parts.length} part packages, found ${partIds.length}`,
    );
  }

  for (const part of toc.parts) {
    const packed = await packPartDir(part.id);
    if (packed.app.name !== `handbook-${part.id}`) {
      throw new Error(`unexpected app id ${packed.app.name} for ${part.id}`);
    }

    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      beeBackend: new KvStorageBeeBackend(store),
      hostInfoBackend: {
        info: async () => ({
          platform: "node",
          hostVersion: "test",
          hostApiVersion: HOST_API_VERSION,
          roles: { transport: false, seeder: false, propagation: false },
          interfaceTypes: [],
          quotas: {
            kvQuotaBytes: null,
            seedStorageUsedBytes: null,
            seedStorageQuotaBytes: null,
            memoryBytes: null,
          },
          grantedCapabilities: packed.app.capabilities ?? [],
        }),
      },
      presenceBackend: {
        snapshot: async () => ({
          onlineInterfaces: 0,
          preferredInterface: null,
          peers: 0,
        }),
      },
      confirmationChannel: { confirm: async () => ({ approved: true }) },
      aiBackend: {
        chat: async () => ({
          message: { role: "assistant", content: "ok" },
          model: "part-smoke",
          usage: { promptTokens: 1, completionTokens: 1 },
        }),
      },
    });

    try {
      await host.setGrants(
        packed.app.name,
        packed.publisherPublicKey,
        packed.app.capabilities ?? [],
        packed.app.capabilities ?? [],
      );
      await host.launch(
        {
          name: packed.app.name,
          version: packed.app.version,
          entry: packed.app.entry,
          capabilities: packed.app.capabilities ?? [],
          publisherPublicKey: packed.publisherPublicKey,
        },
        packed.bundle,
      );

      await waitForTreeText(host, "TwistedPear Handbook");
      await dismissGrantIntroIfNeeded(host, `handbook-part/${part.id}`);
      await waitForTreeText(host, "Contents");

      const tree = host.snapshot().widgetTree;
      if (tree === null) {
        throw new Error(`${part.id}: missing widget tree`);
      }

      const visibleChapterIds = new Set(chapterButtonIds(tree));
      const expectedChapterIds = part.chapters.map((chapter) => chapter.id);
      for (const chapterId of expectedChapterIds) {
        if (!visibleChapterIds.has(chapterId)) {
          throw new Error(`${part.id}: missing chapter button ch-${chapterId}`);
        }
      }

      const firstChapter = expectedChapterIds[0];
      await tap(host, `ch-${firstChapter}`, "hb.openchapter");
      const title =
        part.chapters.find((chapter) => chapter.id === firstChapter)?.title ??
        firstChapter;
      await waitForTreeText(host, title);

      console.log(
        `handbook-part/${part.id}: ${expectedChapterIds.length} chapter(s), ${packed.packageBytes} bytes packed`,
      );
    } finally {
      await host.stop();
    }
  }

  return partIds.length;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runHandbookPartPackagesSmoke()
    .then((count) => {
      console.log(`handbook parts: ${count} package(s) passed smoke`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
