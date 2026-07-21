import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { ESLint } from "eslint";
import ts from "typescript";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  validateManifestCapabilities
} from "../../packages/miniapp-runtime/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appsRoot = join(repositoryRoot, "cookbook/apps");
const appNames = readdirSync(appsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const temporaryDirectories = [];

const API_CAPABILITIES = new Map([
  ["identity.destinationHash", "identity"],
  ["identity.sign", "identity"],
  ["presence.snapshot", "presence"],
  ["host.info", "presence"],
  ["announce.publish", "announce:publish"],
  ["announce.subscribe", "announce:subscribe"],
  ["lxmf.send", "lxmf:send"],
  ["lxmf.receive", "lxmf:receive"],
  ["storage.kv.", "storage:kv"],
  ["storage.bee.", "storage:hyperbee"],
  ["resource.fetch", "resource:fetch"],
  ["workspace.", "workspace"],
  ["ai.chat", "ai:chat"],
  ["apps.preview", "apps:preview"],
  ["apps.stopPreview", "apps:preview"],
  ["apps.packageProject", "apps:package"],
  ["apps.publish", "apps:publish"],
  ["apps.install", "apps:install"],
  ["share.", "share:cas"]
]);

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

function diagnosticText(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
  if (diagnostic.file === undefined || diagnostic.start === undefined) return message;
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${message}`;
}

async function validateSources() {
  const roots = appNames.map((name) => join(appsRoot, name, "bundle.js"));
  const compilerOptions = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: false,
    skipLibCheck: true
  };
  const program = ts.createProgram(roots, compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(diagnostics.map(diagnosticText), "cookbook TypeScript diagnostics").toEqual([]);

  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      js.configs.recommended,
      {
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: "module",
          globals: {
            ArrayBuffer: "readonly",
            Date: "readonly",
            Error: "readonly",
            JSON: "readonly",
            Map: "readonly",
            Math: "readonly",
            Number: "readonly",
            Object: "readonly",
            Promise: "readonly",
            Set: "readonly",
            String: "readonly",
            TextDecoder: "readonly",
            TextEncoder: "readonly",
            Uint8Array: "readonly",
            clearInterval: "readonly",
            clearTimeout: "readonly",
            setInterval: "readonly",
            setTimeout: "readonly"
          }
        },
        rules: {
          "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }]
        }
      }
    ]
  });
  const results = await eslint.lintFiles(roots);
  const errors = results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity === 2)
      .map((message) => `${result.filePath}:${message.line}:${message.column} ${message.message}`)
  );
  expect(errors, "cookbook ESLint errors").toEqual([]);
}

function validateDeclaredCapabilities(manifest, source) {
  const declared = new Set(validateManifestCapabilities(manifest.capabilities ?? []));
  const sourceFile = ts.createSourceFile("bundle.js", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const calls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) calls.push(node.expression.getText(sourceFile));
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const missing = [];
  for (const [surface, capability] of API_CAPABILITIES) {
    const used = surface.endsWith(".")
      ? calls.some((call) => call.startsWith(surface))
      : calls.includes(surface);
    if (used && !declared.has(capability)) missing.push(`${surface} requires ${capability}`);
  }
  expect(missing, `${manifest.name} capability declarations`).toEqual([]);
}

async function packApp(name) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), `tp-cookbook-${name}-`));
  temporaryDirectories.push(temporaryRoot);
  cpSync(join(appsRoot, name), join(temporaryRoot, name), { recursive: true });

  const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    expect(await runInit({ cwd: temporaryRoot, args: [] })).toBe(0);
    expect(await runPack({ cwd: temporaryRoot, args: [name, "--out", `${name}.tpkg`] })).toBe(0);
  } finally {
    consoleLog.mockRestore();
  }

  const archive = new Uint8Array(readFileSync(join(temporaryRoot, `${name}.tpkg`)));
  expect(archive.length, `${name} BLE install budget`).toBeLessThanOrEqual(180 * 1024);
  return verifyPackage(new NodeCryptoProvider(), archive, { hostApiVersion: "0.4.0" });
}

function createHost() {
  const store = new MemoryStore();
  const bee = new KvStorageBeeBackend(store);
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: bee,
    presenceBackend: {
      snapshot: async () => ({ onlineInterfaces: 1, preferredInterface: "tcp", peers: 1 })
    },
    aiBackend: {
      chat: async () => ({
        message: { role: "assistant", content: "{}" },
        model: "cookbook-test",
        usage: null
      })
    },
    resourceBackend: {
      fetch: async () => new TextEncoder().encode("cookbook resource")
    },
    casBackend: {
      put: async (_appId, content) => ({ t256: "A".repeat(94), size: content.length }),
      get: async () => null
    }
  });
  return host;
}

async function waitForRender(host) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const snapshot = host.snapshot();
    if (snapshot.widgetTree !== null) return snapshot.widgetTree;
    if (snapshot.state === "crashed") throw new Error(snapshot.logs.map((entry) => entry.line).join("\n"));
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  const snapshot = host.snapshot();
  throw new Error(
    `mini-app did not render within 10 seconds (state=${snapshot.state}):\n${snapshot.logs
      .map((entry) => entry.line)
      .join("\n")}`
  );
}

beforeAll(async () => {
  expect(appNames).toHaveLength(25);
  await validateSources();
});

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe.each(appNames)("cookbook app %s", (name) => {
  it("validates, packs through tp, starts, and renders", async () => {
    const manifest = JSON.parse(readFileSync(join(appsRoot, name, "app.manifest.json"), "utf8"));
    const source = readFileSync(join(appsRoot, name, "bundle.js"), "utf8");
    validateDeclaredCapabilities(manifest, source);

    const packed = await packApp(name);
    expect(packed.manifest.name).toBe(manifest.name);
    const bundle = packed.files.get(packed.manifest.entry);
    expect(bundle).toBeDefined();

    const host = createHost();
    try {
      const launchManifest = {
        name: packed.manifest.name,
        version: packed.manifest.version,
        entry: packed.manifest.entry,
        capabilities: packed.manifest.capabilities,
        publisherPublicKey: packed.manifest.publisherPublicKey
      };
      await host.setGrants(
        launchManifest.name,
        launchManifest.publisherPublicKey,
        launchManifest.capabilities,
        launchManifest.capabilities
      );
      await host.launch(launchManifest, bundle);
      const tree = await waitForRender(host);
      expect(tree.root.id).toBe("root");
    } finally {
      await host.stop();
    }
  }, 20_000);
});
