/**
 * Shared helpers for reader-guide documentation captures.
 */
import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
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

async function waitForTree(host, expected = "") {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const tree = host.snapshot().widgetTree;
    if (tree !== null && (expected === "" || treeText(tree).includes(expected)))
      return tree;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for mini-app text: ${expected}`);
}

async function launchCookbookApp(
  name,
  configure = async () => {},
  seed = async () => {},
) {
  const store = new MemoryStore();
  const encoder = new TextEncoder();
  await seed(store);
  if (name === "ask-the-handbook") {
    await store.set(
      `miniapp-workspace:${name}:docs/identity.md`,
      encoder.encode(
        "Back up an identity by exporting an encrypted .tpidentity file. Keep its passphrase separately. Recovery words restore the same identity.",
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
      "Export an encrypted .tpidentity backup and keep its passphrase separately. The two recovery-word groups restore the same identity.",
    "form-forge":
      '[{"label":"Trail name","type":"text"},{"label":"Party size","type":"number"},{"label":"Checked out","type":"switch"}]',
    "pocket-translator": "Buenos días",
    "triage-notes":
      '{"subject":"Water pump inspection","location":"North shelter","severity":"high","action":"Send maintenance crew"}',
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
    hostInfoBackend: {
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
    readFileSync(
      join(repoRoot, "cookbook/apps", name, "app.manifest.json"),
      "utf8",
    ),
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
    new Uint8Array(
      readFileSync(join(repoRoot, "cookbook/apps", name, "bundle.js")),
    ),
  );
  await waitForTree(host);
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
export {
  treeText,
  waitForTree,
  launchCookbookApp,
  readAppAssets,
  startStaticServer,
};
