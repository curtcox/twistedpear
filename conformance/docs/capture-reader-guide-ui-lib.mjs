/**
 * Shared helpers for reader-guide documentation captures.
 */
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Install the renderer's preload contract with an in-memory message bus. */
export function desktopHostMock({ emitName, messagesName }) {
  const messages = [];
  const listeners = [];
  globalThis[messagesName] = messages;
  globalThis[emitName] = (message) => {
    for (const listener of listeners) listener(message);
  };
  globalThis.twistedPearHost = {
    getStatus: async () => ({ running: true }),
    send: async (message) => messages.push(message),
    getNtfyStatus: async () => ({ configured: false }),
    ntfyRequest: async () => ({ status: 501, headers: {}, body: "" }),
    saveIdentityBackup: async () => undefined,
    openIdentityBackup: async () => null,
    setIdentityContentProtection: async () => undefined,
    saveModerationReport: async () => undefined,
    onWorkletMessage: (listener) => {
      listeners.push(listener);
      return () => undefined;
    },
    onWorkletExit: () => () => undefined,
    frozenApi: [],
  };
}
import {
  GrantStore,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  AnnounceService,
} from "../../packages/miniapp-runtime/dist/index.js";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const rendererHtml = join(
  repoRoot,
  "apps/host-desktop/src/renderer/index.html",
);

export const fakeIdentity =
  "TPDEMO7LQ2X9C4M6K8R3V5N1B7D9F2H4J6L8P3S5W7Y9A2C4E6G8K1M3Q5T7V9X2Z4B6D8F1H3J5L7N9P2R4T6";
export const fakeHash = "7f3a1c9e42b68d05a7c31e9f42b68d05";
export const fakeT256 = "D".repeat(94);
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

function treeText(tree) {
  const values = [];
  const visit = (node) => {
    if (typeof node.props?.value === "string") values.push(node.props.value);
    if (typeof node.props?.label === "string") values.push(node.props.label);
    for (const child of node.children ?? []) visit(child);
  };
  if (tree?.root) visit(tree.root);
  return values.join("\n");
}

async function waitForTree(host, expected = "", timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tree = host.snapshot().widgetTree;
    if (tree !== null && (expected === "" || treeText(tree).includes(expected)))
      return tree;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(
    `Timed out waiting for mini-app text: ${expected}; state=${host.snapshot().state}; logs=${host
      .snapshot()
      .logs.map((entry) => entry.line)
      .join(" | ")}`,
  );
}

async function launchCookbookApp(
  name,
  configure = async () => {},
  seed = async () => {},
  options = {},
) {
  const appDir = options.appDir ?? join(repoRoot, "cookbook/apps", name);
  const store = new MemoryStore();
  const encoder = new TextEncoder();
  await seed(store);
  if (name === "ask-the-handbook") {
    await store.set(
      `miniapp-workspace:${name}:docs/identity.md`,
      encoder.encode(
        "Back up an identity by exporting an encrypted .tpidentity file. Keep its passphrase separately.",
      ),
    );
    await store.set(
      `miniapp-workspace:${name}:docs/safety.md`,
      encoder.encode(
        "Blocking drops future messages from an authenticated LXMF source. Reports remain local until exported.",
      ),
    );
  }

  const answers = {
    "ask-the-handbook":
      "Export an encrypted .tpidentity file and keep its passphrase separately.",
    "form-forge":
      '[{"label":"Trail name","type":"text"},{"label":"Party size","type":"number"},{"label":"Checked out","type":"switch"}]',
    "pocket-translator": "Buenos días",
    "triage-notes":
      '{"subject":"Water pump inspection","location":"North shelter","severity":"high","action":"Send maintenance crew"}',
    devstudio: `import { ui } from "@twistedpear/miniapp-sdk";

let taps = 0;

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 8 },
      children: [
        { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20 } },
        { id: "count", type: "text", props: { value: \`Taps: \${taps}\` } },
        { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } },
        { id: "reset", type: "button", props: { label: "Reset", event: "hello.reset" } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "hello.tap") taps += 1;
  if (event === "hello.reset") taps = 0;
  await render();
});

await render();
`,
  };
  const aiBackend = {
    chat: async () => ({
      message: {
        role: "assistant",
        content: answers[name] ?? "Documentation response",
      },
      model: "docs-fixture",
      usage: null,
    }),
    stream: async function* () {
      const answer = answers[name] ?? "Documentation response";
      const split = Math.max(1, Math.floor(answer.length / 2));
      yield { delta: answer.slice(0, split), model: "docs-fixture" };
      yield { delta: answer.slice(split), model: "docs-fixture" };
    },
    embed: async (_appId, request) => ({
      vectors: request.inputs.map((input) => {
        const lower = input.toLowerCase();
        return [
          lower.includes("identity") || lower.includes("backup") ? 1 : 0,
          lower.includes("block") || lower.includes("report") ? 1 : 0,
          lower.includes("identity") ||
          lower.includes("backup") ||
          lower.includes("block") ||
          lower.includes("report")
            ? 0
            : 1,
        ];
      }),
      model: "docs-embedding-fixture",
      usage: null,
    }),
  };
  const announceService = new AnnounceService();
  if (name === "app-relay") {
    await announceService.publish(
      "publisher-alpha",
      encoder.encode(JSON.stringify({ name: "Trail map", t256: fakeT256 })),
      "app-relay",
    );
    await announceService.publish(
      "publisher-bravo",
      encoder.encode(
        JSON.stringify({ name: "Water points", t256: `E${fakeT256.slice(1)}` }),
      ),
      "app-relay",
    );
  }
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: new KvStorageBeeBackend(store),
    announceService,
    presenceBackend: {
      snapshot: async () => ({
        onlineInterfaces: 1,
        preferredInterface: "web-demo",
        peers: name === "beacon-lite" ? 2 : 3,
      }),
    },
    hostInfoBackend: options.hostInfoBackend ?? {
      info: async () => ({
        platform: "web",
        hostVersion: "cookbook-fixture",
        hostApiVersion: "0.3.0",
        roles: { transport: false, seeder: false, propagation: false },
        interfaceTypes: ["web-demo"],
        quotas: {
          kvQuotaBytes: 1_048_576,
          seedStorageUsedBytes: null,
          seedStorageQuotaBytes: null,
          memoryBytes: null,
        },
      }),
    },
    aiBackend,
    resourceBackend: {
      fetch: async () => encoder.encode("documentation resource payload"),
    },
    casBackend: {
      put: async (_appId, content) => ({
        t256: fakeT256,
        size: content.length,
      }),
      get: async (_appId, t256) =>
        t256 === fakeT256
          ? encoder.encode(
              "Field notes cover\n---\nWater and shelter\n---\nRadio plan and contacts",
            )
          : null,
    },
    confirmationChannel: { confirm: async () => ({ approved: true }) },
    appsBackend: {
      package: async () => ({
        packageHash: "docs-package-hash",
        size: 3_712,
        t256: fakeT256,
      }),
      publish: async (_appId, request) => ({
        t256: request.t256,
        driveKey: "docs-drive-key",
        version: "1.0.0",
      }),
      install: async () => ({
        appId: "docs-installed-app",
        version: "1.0.0",
        trusted: true,
      }),
      preview: async () => ({ launched: true }),
      stopPreview: async () => undefined,
    },
  });
  const manifest = JSON.parse(
    readFileSync(join(appDir, "app.manifest.json"), "utf8"),
  );
  const launchManifest = { ...manifest, publisherPublicKey: "docs-publisher" };
  await host.setGrants(
    name,
    launchManifest.publisherPublicKey,
    manifest.capabilities,
    manifest.capabilities,
  );
  await host.launch(
    launchManifest,
    new Uint8Array(readFileSync(join(appDir, "bundle.js"))),
  );
  await waitForTree(host, "", options.launchTimeoutMs ?? 10_000);
  await configure(host, store);
  return host;
}

/** Read a cookbook app's `assets/*.svg` into the { name: svg } map the renderer resolves. */
function readAppAssets(name) {
  const assetsDir = join(repoRoot, "cookbook/apps", name, "assets");
  if (!existsSync(assetsDir)) return {};
  const assets = {};
  for (const file of readdirSync(assetsDir)) {
    if (file.endsWith(".svg"))
      assets[file.slice(0, -".svg".length)] = readFileSync(
        join(assetsDir, file),
        "utf8",
      );
  }
  return assets;
}

function startStaticServer(root) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const relativePath =
      pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const resolvedRoot = normalize(root);
    const resolvedPath = normalize(join(resolvedRoot, relativePath));
    if (
      (!resolvedPath.startsWith(resolvedRoot + sep) &&
        resolvedPath !== resolvedRoot) ||
      !existsSync(resolvedPath) ||
      !statSync(resolvedPath).isFile()
    ) {
      response.writeHead(404).end();
      return;
    }
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
    };
    response.writeHead(200, {
      "content-type":
        types[extname(resolvedPath)] ?? "application/octet-stream",
    });
    createReadStream(resolvedPath).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string")
        return reject(new Error("static server did not bind"));
      resolve({
        url: `http://127.0.0.1:${address.port}/`,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections?.();
            server.close(done);
          }),
      });
    });
  });
}

function compositeTileSrc(tile) {
  if (tile.image === undefined) return null;
  const file =
    tile.image.startsWith("/") || /^[A-Za-z]:/.test(tile.image)
      ? tile.image
      : join(repoRoot, tile.image);
  return `data:image/png;base64,${readFileSync(file).toString("base64")}`;
}

export async function captureComposite(browser, scene, options = {}) {
  const extraCss =
    typeof options === "string" ? options : (options.extraCss ?? "");
  const fixtureTag =
    typeof options === "string" ? "div" : (options.fixtureTag ?? "div");
  const output = join(repoRoot, scene.file);
  mkdirSync(dirname(output), { recursive: true });
  const tiles = scene.tiles.map((tile) => ({
    ...tile,
    src: compositeTileSrc(tile),
  }));
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#09111a;color:#eef5ff;font:14px system-ui;padding:24px}
      h1{margin:0 0 8px;font-size:28px}.subtitle{color:#9fb0c3;margin-bottom:18px}
      .grid{display:grid;grid-template-columns:repeat(${scene.columns},1fr);gap:14px;height:690px}
      .tile{min-width:0;overflow:hidden;border:1px solid #33475a;border-radius:14px;background:#101b26;display:flex;flex-direction:column}
      .tile img{width:100%;height:calc(100% - 38px);object-fit:cover;object-position:left top}
      .label{height:38px;padding:10px 12px;color:#cfe2f5;font-weight:700;background:#142333}
      ${extraCss}
    </style><h1>${scene.title}</h1><div class="subtitle">${scene.subtitle}</div><div class="grid">
      ${tiles
        .map(
          (tile) =>
            `<section class="tile">${tile.src === null ? `<${fixtureTag} class="fixture">${tile.html}</${fixtureTag}>` : `<img alt="" src="${tile.src}">`}<div class="label">${tile.label}</div></section>`,
        )
        .join("")}
    </div>`);
    await page.screenshot({ path: output, fullPage: false });
  } finally {
    await page.close();
  }
  console.log(`reader-guide composite written to ${output}`);
}

export async function paintMiniapp(
  page,
  rendererServer,
  { title, tree, assets, documents, scrollTo },
) {
  await page.goto(rendererServer.url, { waitUntil: "load" });
  await page.evaluate(
    async ({ title, tree, assets, documents, widgetsUrl, scrollTo }) => {
      document.body.classList.add("miniapp-running");
      document.querySelector("header h1").textContent = "TwistedPear Host";
      document.querySelector("#subtitle").textContent =
        "Desktop always-on peer · Documentation identity";
      document.querySelector("#miniapp-title").textContent = title;
      const { renderWidgetTree } = await import(widgetsUrl);
      renderWidgetTree(
        tree,
        document.querySelector("#widget-root"),
        undefined,
        {
          ...(assets === undefined ? {} : { assets }),
          ...(documents === undefined
            ? {}
            : {
                readDocument: async (documentId) => documents[documentId] ?? "",
              }),
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (typeof scrollTo === "string" && scrollTo.length > 0) {
        const match = [...document.querySelectorAll("button, .widget-qr, p")]
          .reverse()
          .find((node) => node.textContent?.includes(scrollTo));
        (match ?? document.querySelector(scrollTo))?.scrollIntoView({
          block: "center",
        });
      }
    },
    {
      title,
      tree,
      assets,
      documents,
      scrollTo,
      widgetsUrl: `${rendererServer.url}widgets.js`,
    },
  );
}

export {
  treeText,
  waitForTree,
  launchCookbookApp,
  readAppAssets,
  startStaticServer,
};
