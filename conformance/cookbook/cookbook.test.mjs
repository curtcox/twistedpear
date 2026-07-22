import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
  HOST_API_VERSION,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  AnnounceService,
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
  ["ai.chatStream", "ai:chat"],
  ["ai.embed", "ai:embed"],
  ["ai.search", "ai:embed"],
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

function validateDocumentation() {
  const imageRoot = join(repositoryRoot, "cookbook/images");
  const imageNames = readdirSync(imageRoot).filter((name) => name.endsWith(".png"));
  const cookbookChapters = readdirSync(join(repositoryRoot, "cookbook"))
    .filter((name) => /^\d{2}-.+\.md$/.test(name))
    .map((name) => readFileSync(join(repositoryRoot, "cookbook", name), "utf8"))
    .join("\n");
  const staleWarning = "Cookbook samples are not exercised by CI";
  expect(readFileSync(join(repositoryRoot, "cookbook/README.md"), "utf8")).not.toContain(staleWarning);

  const discoveryChapter = readFileSync(
    join(repositoryRoot, "cookbook/05-apps-that-find-each-other.md"),
    "utf8"
  );
  expect(discoveryChapter, "chapter 5 discloses the host-local announce backend").toContain(
    "The cookbook examples do not discover another device"
  );
  expect(discoveryChapter, "chapter 5 links the underlying Reticulum announce model").toContain(
    "https://reticulum.network/manual/understanding.html#public-key-announcements"
  );
  expect(discoveryChapter, "chapter 5 distinguishes interface peers from mini-app discovery").toContain(
    "A visible peer is necessary but not sufficient"
  );

  for (const name of appNames) {
    const readmePath = join(appsRoot, name, "README.md");
    expect(existsSync(readmePath), `${name} README`).toBe(true);
    const readme = readFileSync(readmePath, "utf8");
    expect(readme, `${name} purpose`).toMatch(/^# .+\n[\s\S]+?\n\n.+\n\nRecipe and screenshots:/);
    expect(readme, `${name} explanation`).toContain("## What it shows");
    expect(readme, `${name} capabilities`).toContain("## Capabilities");
    expect(readme, `${name} run instructions`).toContain("## Run it");
    expect(readme, `${name} CI status`).toContain("documented primary workflow in CI");
    expect(readme, `${name} stale CI warning`).not.toContain(staleWarning);

    const screenshot = imageNames.find((imageName) => imageName.endsWith(`-${name}.png`));
    expect(screenshot, `${name} cookbook screenshot`).toBeDefined();
    expect(cookbookChapters, `${name} screenshot is referenced by the cookbook`).toContain(`/cookbook/images/${screenshot}`);
    const png = readFileSync(join(imageRoot, screenshot));
    expect([...png.subarray(0, 8)], `${name} screenshot PNG signature`).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length, `${name} screenshot is not a placeholder stub`).toBeGreaterThan(10_000);
  }
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
    expect(await runInit({ cwd: temporaryRoot, identityPassphrase: "conformance identity passphrase", args: [] })).toBe(0);
    expect(await runPack({ cwd: temporaryRoot, args: [name, "--out", `${name}.tpkg`] })).toBe(0);
  } finally {
    consoleLog.mockRestore();
  }

  const archive = new Uint8Array(readFileSync(join(temporaryRoot, `${name}.tpkg`)));
  expect(archive.length, `${name} BLE install budget`).toBeLessThanOrEqual(180 * 1024);
  return verifyPackage(new NodeCryptoProvider(), archive, { hostApiVersion: HOST_API_VERSION });
}

const fakeT256 = "D".repeat(94);

function treeText(tree) {
  const values = [];
  const visit = (node) => {
    if (typeof node.props?.value === "string") values.push(node.props.value);
    if (typeof node.props?.label === "string") values.push(node.props.label);
    for (const child of node.children ?? []) visit(child);
  };
  if (tree?.root !== undefined) visit(tree.root);
  return values.join("\n");
}

async function waitForText(host, expected) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const text = treeText(host.snapshot().widgetTree);
    if (text.includes(expected)) return text;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`mini-app did not render expected text ${JSON.stringify(expected)}; tree=${treeText(host.snapshot().widgetTree)}`);
}

async function settle() {
  await new Promise((resolveWait) => setTimeout(resolveWait, 30));
}

async function createHost(name = "") {
  const store = new MemoryStore();
  const encoder = new TextEncoder();
  const bee = new KvStorageBeeBackend(store);
  if (name === "ask-the-handbook") {
    await store.set(
      "miniapp-workspace:ask-the-handbook:docs/identity.md",
      encoder.encode("Back up an identity by exporting an encrypted identity file. Keep its passphrase separately.")
    );
  }
  const answers = {
    "ask-the-handbook": "Export an encrypted identity backup and keep its passphrase separately.",
    "form-forge": '[{"label":"Name","type":"text"},{"label":"Party size","type":"number"},{"label":"Checked in","type":"switch"}]',
    "pocket-translator": "Buenos días",
    "triage-notes": '{"subject":"Water pump inspection","location":"North shelter","severity":"high","action":"Send maintenance crew"}'
  };
  const announceService = new AnnounceService();
  if (name === "app-relay") {
    await announceService.publish(
      "publisher-alpha",
      encoder.encode(JSON.stringify({ name: "Trail map", t256: fakeT256 })),
      "app-relay"
    );
  }
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: bee,
    presenceBackend: {
      snapshot: async () => ({ onlineInterfaces: 1, preferredInterface: "tcp", peers: 1 })
    },
    announceService,
    aiBackend: {
      chat: async () => ({
        message: { role: "assistant", content: answers[name] ?? "Cookbook response" },
        model: "cookbook-test",
        usage: null
      }),
      stream: async function* () {
        yield { delta: answers[name] ?? "Cookbook response", model: "cookbook-test", usage: null };
      },
      embed: async (_appId, request) => ({
        vectors: request.inputs.map((input) => [input.toLowerCase().includes("identity") ? 1 : 0, 1]),
        model: "cookbook-test",
        usage: null
      })
    },
    resourceBackend: {
      fetch: async () => new TextEncoder().encode("cookbook resource")
    },
    casBackend: {
      put: async (_appId, content) => ({ t256: fakeT256, size: content.length }),
      get: async (_appId, t256) => t256 === fakeT256
        ? encoder.encode("Field notes cover\n---\nWater and shelter\n---\nRadio plan and contacts")
        : null
    },
    confirmationChannel: { confirm: async () => ({ approved: true }) },
    appsBackend: {
      package: async () => ({ packageHash: "cookbook-package", size: 3_712, t256: fakeT256 }),
      publish: async (_appId, request) => ({ t256: request.t256, driveKey: "cookbook-drive", version: "1.0.0" }),
      install: async () => ({ appId: "installed-app", version: "1.0.0", trusted: true }),
      preview: async () => ({ launched: true }),
      stopPreview: async () => undefined
    }
  });
  return { host, store, announceService };
}

async function launchApp(host, name) {
  const manifest = JSON.parse(readFileSync(join(appsRoot, name, "app.manifest.json"), "utf8"));
  const bundle = new Uint8Array(readFileSync(join(appsRoot, name, manifest.entry)));
  const launchManifest = { ...manifest, publisherPublicKey: manifest.publisherPublicKey ?? "cookbook-test-publisher" };
  await host.setGrants(
    launchManifest.name,
    launchManifest.publisherPublicKey,
    launchManifest.capabilities,
    launchManifest.capabilities
  );
  await host.launch(launchManifest, bundle);
  await waitForRender(host);
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

function findNode(tree, id) {
  let found;
  const visit = (node) => {
    if (node.id === id) found = node;
    for (const child of node.children ?? []) visit(child);
  };
  if (tree?.root !== undefined) visit(tree.root);
  return found;
}

const behaviorScenarios = {
  "app-relay": async (host) => {
    await waitForText(host, "Trail map");
    await host.handleUiEvent("draft", "ar.draft", "publisher-alpha");
    await settle();
    await host.handleUiEvent("trust", "ar.trust");
    await waitForText(host, "Trusting 1 publisher(s)");
    await host.handleUiEvent("install-0", "ar.install.0");
    return "Installed";
  },
  "ask-the-handbook": async (host) => {
    await host.handleUiEvent("question", "ah.q", "How do I back up my identity?");
    await host.handleUiEvent("ask", "ah.ask");
    return "Answered from 1 file(s)";
  },
  "beacon-lite": async (host) => {
    await host.handleUiEvent("note", "bl.note", "all clear");
    await host.handleUiEvent("send", "bl.send");
    return "Beaconed";
  },
  "breath-pacer": async (host) => {
    await host.handleUiEvent("toggle", "pace.toggle");
    return "Stop";
  },
  "dead-drop": async (host) => {
    await host.handleUiEvent("peer", "dd.peer", "peer-one");
    await host.handleUiEvent("note", "dd.note", "Meet at the north shelter");
    await host.handleUiEvent("drop", "dd.drop");
    return "Dropped";
  },
  "dice-table": async (host) => {
    for (let index = 0; index < 13; index += 1) {
      await host.handleUiEvent("d20", "dice.roll.20");
      await settle();
    }
    const list = findNode(host.snapshot().widgetTree, "history-list");
    expect(list?.children).toHaveLength(11);
    return "d20:";
  },
  "field-log": async (host) => {
    await host.handleUiEvent("draft", "log.draft", "Creek level rising");
    await host.handleUiEvent("add", "log.add");
    return "Creek level rising";
  },
  "form-forge": async (host) => {
    await host.handleUiEvent("brief", "ff.brief", "A trailhead sign-in sheet");
    await host.handleUiEvent("design", "ff.design");
    return "Designed 3 fields";
  },
  "link-weather": async (host) => {
    await host.handleUiEvent("refresh", "lw.refresh");
    return "Read at";
  },
  "neighborhood-board": async (host) => {
    await host.handleUiEvent("draft", "nb.draft", "Water at the school entrance");
    await host.handleUiEvent("post", "nb.post");
    return "Published. Only hosts within radio reach";
  },
  "net-ledger": async (host) => {
    await host.handleUiEvent("call", "nl.call", "N0CALL");
    await host.handleUiEvent("note", "nl.note", "portable");
    await host.handleUiEvent("checkin", "nl.checkin");
    return "1 check-ins logged locally";
  },
  "nine-line": async (host) => {
    await host.handleUiEvent("recipient", "nl.to", "rescue-control");
    await host.handleUiEvent("line-0", "nl.field.0", "Ridge north");
    await host.handleUiEvent("send", "nl.send");
    return "Sent";
  },
  "photo-drop": async (host) => {
    await host.handleUiEvent("put", "pd.put");
    return "Shared";
  },
  "pocket-notes": async (host) => {
    await host.handleUiEvent("editor", "note.change", "hello");
    await waitForText(host, "Unsaved changes");
    await host.handleUiEvent("save", "note.save");
    return "Saved 5 characters";
  },
  "pocket-translator": async (host) => {
    await host.handleUiEvent("source", "pt.source", "Good morning");
    await settle();
    await host.handleUiEvent("go", "pt.go");
    await waitForText(host, "Translated and saved to the phrasebook");
    await host.handleUiEvent("go", "pt.go");
    return "From the local phrasebook";
  },
  "recipe-box": async (host) => {
    await host.handleUiEvent("newname", "rb.name", "Trail bread");
    await settle();
    await host.handleUiEvent("create", "rb.create");
    await waitForText(host, "Open: recipes/Trail-bread.md");
    await host.handleUiEvent("editor", "rb.text", "# Trail bread\nFlour, salt, water");
    await settle();
    await host.handleUiEvent("save", "rb.save");
    return "Saved · 1/512 files";
  },
  "roll-call": async (host) => {
    await host.handleUiEvent("draft", "rc.draft", "peer-one");
    await host.handleUiEvent("add", "rc.add");
    await host.handleUiEvent("call", "rc.call");
    return "Asked 1";
  },
  "signal-check": async (host) => {
    await host.handleUiEvent("peer", "sc.peer", "peer-one");
    await host.handleUiEvent("ping", "sc.ping");
    return "Sent ping";
  },
  "split-the-bill": async (host) => {
    await host.handleUiEvent("who", "bill.who", "Mina");
    await host.handleUiEvent("what", "bill.what", "Fuel");
    await host.handleUiEvent("amount", "bill.amount", "42.50");
    await host.handleUiEvent("add", "bill.add");
    return "Added";
  },
  "sticker-mill": async (host) => {
    await host.handleUiEvent("label", "sm.label", "CHECKED");
    await settle();
    await host.handleUiEvent("package", "sm.package");
    await waitForText(host, "Packaged 3712 bytes");
    await host.handleUiEvent("publish", "sm.publish");
    return "Published. Anyone who heard the announce can install it.";
  },
  "streak-tracker": async (host) => {
    await host.handleUiEvent("today", "streak.toggle", true);
    return "Saved";
  },
  "swap-shelf": async (host) => {
    await host.handleUiEvent("draft", "ss.draft", "Hand-crank radio");
    await host.handleUiEvent("offer", "ss.offer");
    return "Offered";
  },
  "triage-notes": async (host) => {
    await host.handleUiEvent("dictation", "tn.text", "The water pump failed at the north shelter");
    await settle();
    await host.handleUiEvent("structure", "tn.structure");
    await waitForText(host, "Review before filing");
    await host.handleUiEvent("file", "tn.file");
    return "Filed";
  },
  "unit-converter": async (host) => {
    await host.handleUiEvent("input", "conv.input", "1");
    await host.handleUiEvent("unit-m-ft", "conv.select.m-ft");
    return "3.281 ft";
  },
  "zine-reader": async (host) => {
    await host.handleUiEvent("id", "zr.id", fakeT256);
    await settle();
    await host.handleUiEvent("open", "zr.open");
    await waitForText(host, "Fetched and cached");
    await host.handleUiEvent("next", "zr.next");
    await waitForText(host, "2 / 3");
    await host.handleUiEvent("next", "zr.next");
    return "Radio plan and contacts";
  }
};

beforeAll(async () => {
  expect(appNames).toHaveLength(25);
  expect(Object.keys(behaviorScenarios).sort()).toEqual(appNames);
  validateDocumentation();
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

    const { host } = await createHost(name);
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

  it("performs its documented primary workflow", async () => {
    const manifest = JSON.parse(readFileSync(join(appsRoot, name, "app.manifest.json"), "utf8"));
    const bundle = new Uint8Array(readFileSync(join(appsRoot, name, manifest.entry)));
    const { host } = await createHost(name);
    const launchManifest = { ...manifest, publisherPublicKey: manifest.publisherPublicKey ?? "cookbook-test-publisher" };
    try {
      await host.setGrants(
        launchManifest.name,
        launchManifest.publisherPublicKey,
        launchManifest.capabilities,
        launchManifest.capabilities
      );
      await host.launch(launchManifest, bundle);
      await waitForRender(host);
      const expected = await behaviorScenarios[name](host);
      await waitForText(host, expected);
    } finally {
      await host.stop();
    }
  }, 20_000);
});

// Chapter 5 is about apps finding *each other*. The per-app scenarios above only exercise the
// publish half — an app announcing its own post. These cover the receive half: an announce that
// arrived from another host is decoded, stored, and rendered. Without them a bug in the
// subscribe→decode→store→render branch (the thing that makes discovery work) passes CI unseen.
describe("cookbook chapter 5 — hearing another host's announce", () => {
  const encoder = new TextEncoder();

  it("neighborhood-board stores and renders a post announced by a peer", async () => {
    const { host, announceService } = await createHost("neighborhood-board");
    try {
      await announceService.publish(
        "peer-9c31f7a2e4b0",
        encoder.encode(JSON.stringify({ text: "Water at the school entrance", at: "2026-07-21T09:14:00.000Z" })),
        "neighborhood-board"
      );
      await launchApp(host, "neighborhood-board");
      const text = await waitForText(host, "Water at the school entrance");
      expect(text, "byline is the announcing destination, not the payload or \"me\"").toContain("peer-9c31f7a");
    } finally {
      await host.stop();
    }
  }, 20_000);

  it("neighborhood-board drops unparseable and wrong-typed announces without crashing", async () => {
    const { host, announceService } = await createHost("neighborhood-board");
    try {
      // A peer runs arbitrary code and can send anything. None of these may take down the
      // subscription loop or reach the board, but a valid post published alongside them must.
      await announceService.publish("peer-garbage", new Uint8Array([0xff, 0x00, 0x10]), "neighborhood-board");
      await announceService.publish("peer-wrongtype", encoder.encode(JSON.stringify({ text: 42 })), "neighborhood-board");
      await announceService.publish("peer-nullpayload", encoder.encode("null"), "neighborhood-board");
      await announceService.publish(
        "peer-9c31f7a2e4b0",
        encoder.encode(JSON.stringify({ text: "Real post", at: "2026-07-21T09:14:00.000Z" })),
        "neighborhood-board"
      );
      await launchApp(host, "neighborhood-board");
      const text = await waitForText(host, "Real post");
      expect(text, "malformed announces are silently dropped").not.toContain("42");
    } finally {
      await host.stop();
    }
  }, 20_000);

  it("swap-shelf stores and renders a listing announced by a peer", async () => {
    const { host, announceService } = await createHost("swap-shelf");
    try {
      await announceService.publish(
        "peer-3f0a5b1c9d22",
        encoder.encode(JSON.stringify({ i: "Camping stove, works, free" })),
        "swap-shelf"
      );
      await launchApp(host, "swap-shelf");
      const text = await waitForText(host, "Camping stove, works, free");
      expect(text, "listing shows the announcing peer's address prefix").toContain("peer-3f0a5b1");
    } finally {
      await host.stop();
    }
  }, 20_000);

  it("swap-shelf drops an unparseable announce without crashing", async () => {
    const { host, announceService } = await createHost("swap-shelf");
    try {
      await announceService.publish("peer-garbage", new Uint8Array([0xff, 0x00, 0x10]), "swap-shelf");
      await announceService.publish(
        "peer-3f0a5b1c9d22",
        encoder.encode(JSON.stringify({ i: "Hand-crank radio" })),
        "swap-shelf"
      );
      await launchApp(host, "swap-shelf");
      await waitForText(host, "Hand-crank radio");
    } finally {
      await host.stop();
    }
  }, 20_000);

  it("an announce in one namespace is invisible to a different app", async () => {
    const { host, announceService } = await createHost("swap-shelf");
    try {
      // A neighborhood-board post must never surface in swap-shelf: namespaces do not cross.
      await announceService.publish(
        "peer-9c31f7a2e4b0",
        encoder.encode(JSON.stringify({ text: "Water at the school entrance", at: "2026-07-21T09:14:00.000Z" })),
        "neighborhood-board"
      );
      await launchApp(host, "swap-shelf");
      await settle();
      const text = treeText(host.snapshot().widgetTree);
      expect(text, "cross-namespace announce must not leak into swap-shelf").not.toContain("Water at the school entrance");
    } finally {
      await host.stop();
    }
  }, 20_000);
});
