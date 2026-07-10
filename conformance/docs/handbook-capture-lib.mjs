/**
 * Shared Handbook documentation screenshot helpers.
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { chromium } from "playwright";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  HOST_API_VERSION,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../../packages/miniapp-runtime/dist/index.js";
import {
  dismissGrantIntroIfNeeded,
  findNodeById,
  tap,
  treeContainsText,
  waitFor,
  waitForTreeText
} from "../handbook/ui-helpers.mjs";

const docsRoot = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(docsRoot, "../..");
export const handbookDir = join(repoRoot, "apps/handbook");

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

export function buildCaptureDeps() {
  const build = spawnSync(
    "npm",
    [
      "run",
      "build",
      "--workspace=@twistedpear/miniapp-runtime",
      "--workspace=@twistedpear/widget-renderer-rn",
      "--workspace=@twistedpear/app-registry",
      "--workspace=@twistedpear/reticulum-ts",
      "--workspace=@twistedpear/cli"
    ],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

export function buildHandbookContent() {
  const result = spawnSync("npm", ["run", "build:handbook"], { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function packHandbook() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-handbook-capture-"));
  const appDir = join(cwd, "handbook");
  mkdirSync(appDir, { recursive: true });
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
    const verified = verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error("Handbook entry bundle missing");
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

function createCaptureHost(store, packed, platform) {
  return new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: new KvStorageBeeBackend(store),
    presenceBackend: {
      snapshot: async () => ({ onlineInterfaces: 0, preferredInterface: null, peers: 0 })
    },
    hostInfoBackend: {
      info: async () => ({
        platform,
        hostVersion: "capture",
        hostApiVersion: HOST_API_VERSION,
        roles: { transport: false, seeder: false, propagation: false },
        interfaceTypes: platform === "ios" || platform === "android" ? ["tcp"] : [],
        quotas: {
          kvQuotaBytes: null,
          seedStorageUsedBytes: null,
          seedStorageQuotaBytes: null,
          memoryBytes: null
        },
        grantedCapabilities: packed.app.capabilities ?? []
      })
    },
    confirmationChannel: { confirm: async () => ({ approved: true }) },
    aiBackend: {
      chat: async () => ({
        message: { role: "assistant", content: "ok" },
        model: "capture",
        usage: { promptTokens: 1, completionTokens: 1 }
      })
    }
  });
}

/**
 * @param {{ platform?: "web" | "ios" | "android", scene?: "search" | "chapter", logPrefix?: string }} options
 */
export async function captureHandbookWidgetTree(options = {}) {
  const platform = options.platform ?? "web";
  const scene = options.scene ?? "search";
  const logPrefix = options.logPrefix ?? "handbook-capture";

  const packed = await packHandbook();
  const store = new MemoryStore();
  const host = createCaptureHost(store, packed, platform);

  try {
    await host.setGrants(
      packed.app.name,
      packed.publisherPublicKey,
      packed.app.capabilities ?? [],
      packed.app.capabilities ?? []
    );
    await host.launch(
      {
        name: packed.app.name,
        version: packed.app.version,
        entry: packed.app.entry,
        capabilities: packed.app.capabilities ?? [],
        publisherPublicKey: packed.publisherPublicKey
      },
      packed.bundle
    );

    await waitForTreeText(host, "TwistedPear Handbook");
    await dismissGrantIntroIfNeeded(host, logPrefix);
    await waitForTreeText(host, "Contents");

    if (scene === "search") {
      await tap(host, "toc-search", "hb.search", "widget gallery");
      await waitFor(async () => {
        const tree = host.snapshot().widgetTree;
        if (tree === null) {
          return null;
        }
        if (
          treeContainsText(tree, "chapter(s) match") &&
          findNodeById(tree.root, "ch-sdk-widget-gallery") !== null
        ) {
          return tree;
        }
        return null;
      }, 10_000);
    } else {
      await tap(host, "ch-what-is-twistedpear", "hb.openchapter");
      await waitForTreeText(host, "What TwistedPear is");
      await waitFor(async () => {
        const tree = host.snapshot().widgetTree;
        if (tree === null) {
          return null;
        }
        if (findNodeById(tree.root, "ch-reticulum-fundamentals") !== null) {
          return tree;
        }
        return null;
      }, 10_000);
    }

    const tree = host.snapshot().widgetTree;
    if (tree === null) {
      throw new Error(`missing widget tree for scene ${scene}`);
    }

    return tree;
  } finally {
    await host.stop();
  }
}

export function writeCapturePage(tree, captureDir, layout = {}) {
  const maxWidth = layout.maxWidth ?? 960;
  const pageBackground = layout.pageBackground ?? "#f4f4f5";
  const rootBackground = layout.rootBackground ?? "#fff";

  rmSync(captureDir, { recursive: true, force: true });
  mkdirSync(captureDir, { recursive: true });

  buildSync({
    entryPoints: [join(docsRoot, "handbook-capture-entry.mjs")],
    bundle: true,
    platform: "browser",
    format: "iife",
    outfile: join(captureDir, "handbook-capture.bundle.js"),
    alias: {
      "react-native": "react-native-web"
    },
    define: {
      __DEV__: "false",
      "process.env.NODE_ENV": '"production"'
    },
    logLevel: "warning"
  });

  writeFileSync(
    join(captureDir, "page.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>handbook capture</title>
    <style>
      html, body { margin: 0; background: ${pageBackground}; }
      #root { max-width: ${maxWidth}px; margin: 0 auto; min-height: 100vh; background: ${rootBackground}; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>window.__HANDBOOK_CAPTURE_TREE__ = ${JSON.stringify(tree)};</script>
    <script src="./handbook-capture.bundle.js"></script>
  </body>
</html>`
  );
}

export async function screenshotCapturePage({ captureDir, output, viewport }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.goto(`file://${join(captureDir, "page.html")}`, { waitUntil: "load" });
    await page.waitForFunction(() => globalThis.__HANDBOOK_CAPTURE_READY__ === true, undefined, {
      timeout: 30_000
    });
    mkdirSync(dirname(output), { recursive: true });
    await page.screenshot({ path: output, fullPage: true });
  } finally {
    await browser.close();
  }
}

export async function captureHandbookScreenshot({
  output,
  viewport,
  layout,
  platform = "web",
  scene = "search",
  logPrefix = "handbook-capture",
  captureDir = join(docsRoot, ".tmp-handbook-capture")
}) {
  buildCaptureDeps();
  buildHandbookContent();
  const tree = await captureHandbookWidgetTree({ platform, scene, logPrefix });
  writeCapturePage(tree, captureDir, layout);
  await screenshotCapturePage({ captureDir, output, viewport });
  rmSync(captureDir, { recursive: true, force: true });
  return output;
}
