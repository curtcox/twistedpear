#!/usr/bin/env node
/**
 * Handbook content pipeline (Phase D0).
 * - Markdown subset → structured chapter blocks
 * - Applets → workspace seeds + catalog entries
 * - Broken-link check
 * - Emit bundle.js (catalog + runtime) and generated/catalog.json
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  existsSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const contentDir = join(root, "content");
const seedsDir = join(root, "seeds");
const generatedDir = join(root, "generated");
const runtimePath = join(root, "src", "runtime.js");
const bundlePath = join(root, "bundle.js");
const catalogOutPath = join(generatedDir, "catalog.json");

const EXPECTATION_VALUES = new Set(["pass", "unavailable", "device-gated", "fail"]);
const DIAGNOSTIC_GROUPS = new Set(["crypto", "interfaces", "storage", "distribution", "runtime"]);
const EXECUTION_MODES = new Set(["inline", "preview"]);
const HANDBOOK_PLATFORMS = ["android", "ios", "desktop", "web", "node"];
const SDK_NAMESPACES = [
  "identity",
  "presence",
  "host",
  "announce",
  "lxmf",
  "storage",
  "resource",
  "workspace",
  "share",
  "apps",
  "ai",
  "ui"
];
const MIN_CHAPTER_WORDS = {
  "part-1-concepts": 80,
  "part-2-hosts": 80,
  "part-3-sdk": 80,
  "part-4-diagnostics": 40
};

function isTableSeparator(line) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return null;
  }
  const cells = trimmed
    .slice(1, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
  return cells;
}

function fail(message) {
  console.error(`handbook build: ${message}`);
  process.exit(1);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeText(path, text) {
  ensureDir(dirname(path));
  writeFileSync(path, text);
}

function parseInlineLinks(line) {
  const links = [];
  const text = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, target) => {
    links.push({ label, target });
    return label;
  });
  return { text, links };
}

function parseMarkdown(markdown, chapterId) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  let codeFenceIndex = 0;
  let paragraphLinks = [];

  const flushParagraph = (buffer) => {
    if (buffer.length === 0) {
      return;
    }
    const joined = buffer.join(" ").trim();
    if (joined.length === 0) {
      return;
    }
    const { text, links } = parseInlineLinks(joined);
    blocks.push({ type: "paragraph", text });
    for (const link of links) {
      paragraphLinks.push(link);
      if (link.target.startsWith("chapter:")) {
        blocks.push({
          type: "chapter-link",
          label: link.label,
          chapterId: link.target.slice("chapter:".length)
        });
      }
    }
    buffer.length = 0;
  };

  const paragraphBuffer = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      flushParagraph(paragraphBuffer);
      const languageRaw = line.slice(3).trim() || "text";
      const language =
        languageRaw === "js" || languageRaw === "javascript"
          ? "javascript"
          : languageRaw === "json"
            ? "json"
            : "text";
      i += 1;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i >= lines.length) {
        fail(`Unclosed code fence in chapter ${chapterId}`);
      }
      i += 1;
      const documentId = `chapters/${chapterId}/sample-${codeFenceIndex++}.${language === "javascript" ? "js" : language === "json" ? "json" : "txt"}`;
      blocks.push({ type: "code", documentId, language, content: codeLines.join("\n") + "\n" });
      continue;
    }

    const appletMatch = line.match(/^\{\{applet:([A-Za-z0-9][A-Za-z0-9._-]*)\}\}\s*$/);
    if (appletMatch !== null) {
      flushParagraph(paragraphBuffer);
      blocks.push({ type: "applet", appletId: appletMatch[1] });
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch !== null) {
      flushParagraph(paragraphBuffer);
      const level = headingMatch[1].length;
      const { text } = parseInlineLinks(headingMatch[2].trim());
      blocks.push({ type: "heading", level, text });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      flushParagraph(paragraphBuffer);
      const headerCells = parseTableRow(line);
      if (headerCells === null || i + 1 >= lines.length || !isTableSeparator(lines[i + 1])) {
        paragraphBuffer.push(line.trim());
        i += 1;
        continue;
      }
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowCells = parseTableRow(lines[i]);
        if (rowCells === null) {
          break;
        }
        rows.push(rowCells);
        i += 1;
      }
      blocks.push({ type: "table", headers: headerCells, rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph(paragraphBuffer);
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const { text, links } = parseInlineLinks(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        items.push(text);
        paragraphLinks.push(...links);
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph(paragraphBuffer);
      i += 1;
      continue;
    }

    paragraphBuffer.push(line.trim());
    i += 1;
  }

  flushParagraph(paragraphBuffer);
  return { blocks, links: paragraphLinks };
}

function loadToc() {
  const toc = JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf8"));
  if (!Array.isArray(toc.parts) || toc.parts.length === 0) {
    fail("toc.json must declare at least one part");
  }
  return toc;
}

function loadApplets() {
  const appletsRoot = join(contentDir, "applets");
  if (!existsSync(appletsRoot)) {
    return [];
  }

  const applets = [];
  for (const entry of readdirSync(appletsRoot).sort()) {
    const dir = join(appletsRoot, entry);
    if (!statSync(dir).isDirectory()) {
      continue;
    }

    const manifestPath = join(dir, "applet.json");
    const mainPath = join(dir, "main.js");
    if (!existsSync(manifestPath) || !existsSync(mainPath)) {
      fail(`Applet ${entry} needs applet.json and main.js`);
    }

    const meta = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (meta.id !== entry) {
      fail(`Applet folder "${entry}" must match applet.json id "${meta.id}"`);
    }
    if (!Array.isArray(meta.capabilities) || meta.capabilities.length === 0) {
      fail(`Applet ${entry} must declare capabilities`);
    }
    if (!meta.expectations || typeof meta.expectations !== "object") {
      fail(`Applet ${entry} must declare expectations`);
    }
    if (meta.group !== undefined && !DIAGNOSTIC_GROUPS.has(meta.group)) {
      fail(`Applet ${entry} has invalid diagnostic group "${meta.group}"`);
    }
    const executionModes = meta.executionModes ?? ["inline"];
    if (!Array.isArray(executionModes) || executionModes.length === 0) {
      fail(`Applet ${entry} must declare executionModes (default inline)`);
    }
    for (const mode of executionModes) {
      if (!EXECUTION_MODES.has(mode)) {
        fail(`Applet ${entry} has invalid execution mode "${mode}"`);
      }
    }
    if (executionModes.includes("preview")) {
      const preview = meta.preview;
      if (preview === undefined || typeof preview !== "object") {
        fail(`Applet ${entry} with preview mode must declare preview config`);
      }
      if (typeof preview.project !== "string" || preview.project.length === 0) {
        fail(`Applet ${entry} preview.project is required`);
      }
      if (preview.manifest === undefined || typeof preview.manifest !== "object") {
        fail(`Applet ${entry} preview.manifest is required`);
      }
      if (!Array.isArray(preview.grants)) {
        fail(`Applet ${entry} preview.grants must be an array`);
      }
      if (preview.files === undefined || typeof preview.files !== "object") {
        fail(`Applet ${entry} preview.files is required`);
      }
    }
    for (const [platform, expectation] of Object.entries(meta.expectations)) {
      if (!EXPECTATION_VALUES.has(expectation)) {
        fail(`Applet ${entry} has invalid expectation "${expectation}" for ${platform}`);
      }
    }

    const source = readFileSync(mainPath, "utf8");
    if (!/export\s+async\s+function\s+run\s*\(/.test(source)) {
      fail(`Applet ${entry} main.js must export async function run(sdk, report)`);
    }

    applets.push({
      id: meta.id,
      title: meta.title,
      group: meta.group ?? "runtime",
      executionModes,
      preview: meta.preview ?? null,
      capabilities: meta.capabilities,
      surfaces: meta.surfaces ?? [],
      expectations: meta.expectations,
      source
    });
  }

  return applets;
}

function chapterTextForSearch(chapter) {
  const parts = [chapter.title, chapter.partTitle];
  for (const block of chapter.blocks) {
    if (block.type === "paragraph" || block.type === "heading") {
      parts.push(block.text);
    }
    if (block.type === "list") {
      parts.push(...block.items);
    }
    if (block.type === "table") {
      parts.push(...block.headers);
      for (const row of block.rows) {
        parts.push(...row);
      }
    }
  }
  return parts.join(" ");
}

function chapterWordCount(chapter) {
  return chapterTextForSearch(chapter)
    .split(/\s+/)
    .filter((token) => token.length > 0).length;
}

function transformLimitationsMarkdown(source) {
  return source
    .replace(/^# Limitations[^\n]*\n\nCompanion[^\n]+\n\n/m, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[([^\]]+)\]\(docs\/web-host\.md\)/g, "[$1](chapter:host-web)")
    .replace(/\[([^\]]+)\]\(docs\/miniapp-runtime\.md\)/g, "[$1](chapter:ref-host-api)")
    .replace(/\[([^\]]+)\]\(docs\/security-review\.md\)/g, "$1")
    .replace(/\[([^\]]+)\]\(docs\/ios-multicast-entitlement\.md\)/g, "$1")
    .replace(/\[([^\]]+)\]\(docs\/ios-submission\.md\)/g, "$1")
    .replace(/\[([^\]]+)\]\(\.\.\/STATUS-HARDWARE\.md\)/g, "STATUS-HARDWARE")
    .replace(/\[([^\]]+)\]\(\.\.\/PLAN\.md\)/g, "PLAN")
    .replace(/\[([^\]]+)\]\((?:\.\.\/)+LIMITATIONS\.md[^)]*\)/g, "[$1](chapter:ref-limitations)")
    .replace(/\[([^\]]+)\]\([^)]*\.md[^)]*\)/g, "$1");
}

function generateLimitationsChapter(refDir) {
  const limitationsPath = join(root, "../../LIMITATIONS.md");
  if (!existsSync(limitationsPath)) {
    fail("LIMITATIONS.md not found for ref-limitations generation");
  }
  const body = transformLimitationsMarkdown(readFileSync(limitationsPath, "utf8"));
  const limitationsMd = [
    ...referenceHeader("Known limitations"),
    "Platform compromises and measured constraints. Cross-linked from host chapters",
    "and the [live difference matrix](chapter:difference-matrix).",
    "",
    body.trim()
  ].join("\n");
  writeText(join(refDir, "limitations.md"), `${limitationsMd}\n`);
}

function referenceHeader(title) {
  return [
    `# ${title}`,
    "",
    "",
    "<!-- tp-doc",
    "lifecycle: live",
    "audited: 2026-07-21",
    "register: none",
    "-->",
    ""
  ];
}

function resetSeeds() {
  rmSync(seedsDir, { recursive: true, force: true });
  ensureDir(seedsDir);
}

async function generateReferenceChapters() {
  const refDir = join(contentDir, "part-5-reference");
  ensureDir(refDir);
  generateLimitationsChapter(refDir);

  let capabilityDefinitions = [];
  let widgetTypes = [];
  let widgetPropKeys = new Map();
  let widgetStyleKeys = new Set();
  let codeEditorLanguages = new Set();
  let hostApiVersion = "0.3.0";
  let hostApiChangelog = [];
  let workspaceLimits = { maxFileBytes: 256 * 1024, maxTotalBytes: 4 * 1024 * 1024, maxFiles: 512 };
  let aiLimits = { maxMessages: 64, maxTokensCap: 8192 };
  let hostQuotas = {
    seedStorageBytes: 2 * 1024 * 1024 * 1024,
    propagationStoreBytes: 256 * 1024 * 1024,
    propagationMessageCount: 10_000,
    bandwidthBytesPerSecond: 512 * 1024
  };
  let defaultRoles = { transport: true, seeder: true, propagation: false, attachRnsd: null };
  let defaultInterfaces = {
    tcp: { enabled: false, mode: "client", targetHost: "127.0.0.1", targetPort: 4242 },
    websocket: { enabled: false, listenHost: "127.0.0.1", listenPort: 9480 },
    auto: { enabled: true, multicast: true, bonjour: true },
    i2p: { enabled: false },
    rnode: { enabled: false, baudRate: 115_200 }
  };
  try {
    const runtimeCaps = await import("../../packages/miniapp-runtime/dist/capabilities.js");
    capabilityDefinitions = runtimeCaps.CAPABILITY_DEFINITIONS;
    const runtimeUi = await import("../../packages/miniapp-runtime/dist/ui/schema.js");
    widgetTypes = [...runtimeUi.WIDGET_TYPES].sort();
    widgetPropKeys = runtimeUi.WIDGET_PROP_KEYS;
    widgetStyleKeys = runtimeUi.WIDGET_STYLE_KEYS;
    codeEditorLanguages = runtimeUi.CODE_EDITOR_LANGUAGES;
    const hostApi = await import("../../packages/miniapp-runtime/dist/host-api.js");
    hostApiVersion = hostApi.HOST_API_VERSION;
    hostApiChangelog = hostApi.HOST_API_CHANGELOG;
    const workspace = await import("../../packages/miniapp-runtime/dist/services/workspace.js");
    workspaceLimits = workspace.DEFAULT_WORKSPACE_LIMITS;
    const ai = await import("../../packages/miniapp-runtime/dist/services/ai.js");
    aiLimits = ai.DEFAULT_AI_SERVICE_LIMITS;
    const hostCore = await import("../../packages/host-core/dist/types.js");
    hostQuotas = hostCore.DEFAULT_QUOTAS;
    defaultRoles = hostCore.DEFAULT_DESKTOP_ROLES;
    defaultInterfaces = hostCore.DEFAULT_INTERFACE_CONFIG;
  } catch {
    capabilityDefinitions = [
      { id: "identity", description: "Use an app-scoped identity for signing and addressing." },
      { id: "presence", description: "Read coarse peer/interface presence and host info." },
      { id: "announce:subscribe", description: "Receive announces in the app namespace." },
      { id: "announce:publish", description: "Publish the app destination." },
      { id: "lxmf:send", description: "Send LXMF messages from the app destination." },
      { id: "lxmf:receive", description: "Receive LXMF messages for the app destination." },
      { id: "storage:kv", description: "Store local key/value data for this app." },
      { id: "storage:hyperbee", description: "Store ordered local Hyperbee data for this app." },
      { id: "resource:fetch", description: "Fetch package resources through host budget rules." },
      { id: "workspace", description: "Read and write project source files in this app's private workspace." },
      { id: "ai:chat", description: "Send prompts to the host-configured AI service." },
      { id: "ai:embed", description: "Send bounded text to the host-configured embedding model and rank vectors locally." },
      { id: "apps:package", description: "Package and sign apps under this device's publisher identity." },
      { id: "apps:publish", description: "Publish signed apps so other users can find and install them." },
      { id: "apps:install", description: "Ask the host to install apps from a 256t id." },
      { id: "apps:preview", description: "Run a built app in the host's sandboxed dev-preview slot." },
      { id: "share:cas", description: "Store and retrieve bounded content-addressed data shared by 256t id." }
    ];
    widgetTypes = [
      "button",
      "code-editor",
      "divider",
      "image",
      "list",
      "progress",
      "qr-code",
      "scroll",
      "spacer",
      "switch",
      "text",
      "text-input",
      "view"
    ];
    hostApiChangelog = [{ version: hostApiVersion, note: "See packages/miniapp-runtime/src/host-api.ts" }];
  }

  const capabilitiesMd = [
    ...referenceHeader("Capabilities"),
    "Generated from `CAPABILITY_DEFINITIONS` in `packages/miniapp-runtime`.",
    "Every id below must be exercised by at least one Handbook applet (coverage gate).",
    "",
    ...capabilityDefinitions.map((entry) => `- **\`${entry.id}\`** — ${entry.description}`),
    "",
    "Manifests declare the full list; users may grant a subset at install.",
    "Withholding a capability turns matching probes into `not-granted` cards.",
    "",
    "Tutorial: [Capability model](chapter:sdk-capabilities).",
    "Per-namespace guides: [Developing mini-apps](chapter:sdk-identity)."
  ].join("\n");

  const widgetLines = [];
  for (const type of widgetTypes) {
    const props = widgetPropKeys.get(type);
    const propList =
      props === undefined || props.size === 0 ? "none" : [...props].sort().map((p) => `\`${p}\``).join(", ");
    widgetLines.push(`- **\`${type}\`** — props: ${propList}`);
  }

  const widgetsMd = [
    ...referenceHeader("Widget protocol"),
    "Generated from `WIDGET_TYPES` / `WIDGET_PROP_KEYS` in `packages/miniapp-runtime`.",
    "",
    "Hosts render a declarative tree (`ui.render`). Unknown types, props, styles,",
    "duplicate ids, or oversized trees are rejected.",
    "",
    "## Components",
    "",
    ...widgetLines,
    "",
    "## Styles",
    "",
    widgetStyleKeys.size > 0
      ? [...widgetStyleKeys].sort().map((key) => `- \`${key}\``).join("\n")
      : "- See `WIDGET_STYLE_KEYS` in the runtime.",
    "",
    "## Limits",
    "",
    `- Widget tree JSON budget: 256 KiB (default validator)`,
    `- \`code-editor\` languages: ${[...codeEditorLanguages].sort().join(", ")}`,
    `- \`qr-code\` value: up to 512 characters (94-char 256t ids fit)`,
    "",
    "Live gallery: [Widget gallery](chapter:sdk-widget-gallery)."
  ].join("\n");

  const changelogLines = hostApiChangelog.map(
    (entry) => `- **\`${entry.version}\`** — ${entry.note}`
  );

  const hostApiMd = [
    ...referenceHeader("Host API"),
    `Current \`HOST_API_VERSION\`: **\`${hostApiVersion}\`**.`,
    "Manifests pin \`minHostApi\`; hosts reject packages that require a newer API.",
    "",
    "## Changelog",
    "",
    ...changelogLines,
    "",
    "## host.info()",
    "",
    "Returns platform id, host version, API version, roles, interface types, and quota",
    "snapshot — used by the [live difference matrix](chapter:difference-matrix).",
    "",
    "## Workspace quotas",
    "",
    `- ${workspaceLimits.maxFileBytes} bytes/file`,
    `- ${workspaceLimits.maxTotalBytes} bytes total per app`,
    `- ${workspaceLimits.maxFiles} files per app`
  ].join("\n");

  const packagesMd = [
    ...referenceHeader("Package format"),
    "Mini-apps ship as deterministic **\`.tpkg\`** archives:",
    "",
    "- Signed manifest (name, version, entry, capabilities, publisher key, `minHostApi`)",
    "- Entry bundle (`bundle.js`) and assets",
    "- Ed25519 signature over the manifest hash",
    "",
    "Packaging flow: [Packaging & preview](chapter:sdk-apps-package).",
    "Distribution tutorial: [Publish, install & update](chapter:sdk-apps-update)."
  ].join("\n");

  const interfacesMd = [
    ...referenceHeader("Network interfaces"),
    "Reticulum peers attach through typed **PacketInterface** implementations.",
    "The [live difference matrix](chapter:difference-matrix) lists which types",
    "`host.info()` reports for **this** host.",
    "",
    "## WebSocket (browser gateway)",
    "",
    "- **Leaf client** — browser tab or CI harness dials `ws://` / `wss://` on a gateway.",
    "- **Gateway** — desktop host or `tp node --ws-listen [host:]port`.",
    "- **Framing** — one Reticulum wire packet per binary WebSocket message.",
    "- **Auth** — optional shared token (`--ws-token`).",
    "",
    "Web host chapter: [Web host](chapter:host-web).",
    "",
    "WebSocket wire format is documented in the platform repo under",
    "`docs/websocket-interface.md` (not shipped inside the Handbook bundle).",
    "",
    "## TCP / AutoInterface / Bonjour",
    "",
    "Desktop and mobile worklets enable TCP client mode, LAN multicast (AutoInterface),",
    "and Bonjour discovery when the platform permits. iOS multicast requires the",
    "networking multicast entitlement; web hosts omit these entirely.",
    "",
    "## BLE phone pipe",
    "",
    "Android and iOS expose a BLE GATT byte stream for peer links. Web Bluetooth is",
    "central-only and not used for the phone-pipe role. Device-gated Handbook probes:",
    "[Device-gated probes](chapter:device-gated-probes).",
    "",
    "## RNode serial",
    "",
    "USB serial on desktop/Android; BLE-only on iOS. WebSerial (Chromium) is optional.",
    "LoRa bandwidth budgets apply — see [Known limitations](chapter:ref-limitations) §6."
  ].join("\n");

  const quotasMd = [
    ...referenceHeader("Quotas & limits"),
    "Generated from `DEFAULT_QUOTAS` (`host-core`) and miniapp-runtime defaults.",
    "`host.info()` includes a quota snapshot for diagnostics.",
    "",
    "## Host node quotas (desktop / `tp node`)",
    "",
    `- Seed storage: ${hostQuotas.seedStorageBytes} bytes`,
    `- Propagation store: ${hostQuotas.propagationStoreBytes} bytes`,
    `- Propagation messages: ${hostQuotas.propagationMessageCount}`,
    `- Bandwidth cap: ${hostQuotas.bandwidthBytesPerSecond} bytes/s`,
    "",
    "Override in `<data-dir>/config.json` — see [Host configuration](chapter:ref-host-config).",
    "",
    "## Mini-app workspace (`workspace` capability)",
    "",
    `- ${workspaceLimits.maxFileBytes} bytes per file`,
    `- ${workspaceLimits.maxTotalBytes} bytes total per app`,
    `- ${workspaceLimits.maxFiles} files per app`,
    "",
    "## Widget & AI limits",
    "",
    "- Widget tree JSON: 256 KiB (default validator)",
    `- AI chat: ${aiLimits.maxMessages} messages, ${aiLimits.maxTokensCap} max tokens cap`,
    "",
    "## Transport budgets",
    "",
    "BLE install budgets (~180 KiB at measured rates) and Resource fetch caps are",
    "enforced per link type. See [Resource fetch](chapter:sdk-resource-fetch) and",
    "`conformance/budgets/measured.json`."
  ].join("\n");

  const cliMd = [
    ...referenceHeader("CLI commands"),
    "The `tp` CLI scaffolds, packs, publishes, and runs headless peers. Publisher",
    "identity comes from `tp init` (Reticulum keypair in the project or data dir).",
    "",
    "## Project workflow",
    "",
    "- `tp init [--force]` — create or load publisher identity",
    "- `tp create <hello|chat-min> [app-dir]` — scaffold a mini-app template",
    "- `tp dev <app-dir> [--host host:port]` — build and side-load to a dev-mode host",
    "- `tp pack <app-dir> [--out file.tpkg]` — build unsigned `.tpkg` archive",
    "- `tp sign <file.tpkg>` — re-sign an existing package",
    "- `tp publish <app-dir>` — pack, sign, publish to Hyperdrive",
    "- `tp update <app-dir> --version <semver>` — bump version and republish",
    "",
    "## Headless hosts",
    "",
    "- `tp node` — transport/seeder/propagation peer (`--ws-listen`, `--serve-web`, …)",
    "- `tp seed` — headless Hyperdrive seeder (`--transport`, `--state-dir`)",
    "",
    "## Trust",
    "",
    "- `tp trust list|show|add|remove` — manage trusted publisher keys",
    "",
    "Handbook packaging in CI: `npm run build:handbook` then `tp pack` in a temp dir.",
    "Tutorial: [Packaging & preview](chapter:sdk-apps-package)."
  ].join("\n");

  const hostConfigMd = [
    ...referenceHeader("Host configuration"),
    "Generated from `defaultHostConfig()` defaults in `packages/host-core`.",
    "Desktop and `tp node` persist overrides in `<data-dir>/config.json`.",
    "",
    "## Data directory",
    "",
    "- macOS: `~/Library/Application Support/TwistedPear/host`",
    "- Linux: `~/.local/share/twistedpear/host`",
    "- Windows: `%APPDATA%/TwistedPear/host`",
    "- Identity: `<data-dir>/identity`",
    "- Config: `<data-dir>/config.json`",
    "",
    "Platform paths: [Desktop host](chapter:host-desktop). Headless flags:",
    "[CLI commands](chapter:ref-cli).",
    "",
    "## Roles (desktop defaults)",
    "",
    `- Transport node: ${defaultRoles.transport}`,
    `- Seeder / LAN mirror: ${defaultRoles.seeder}`,
    `- Propagation server: ${defaultRoles.propagation}`,
    `- Attach to external rnsd: ${defaultRoles.attachRnsd === null ? "off" : "on"}`,
    "",
    "Web hosts force leaf roles — see [Web host](chapter:host-web).",
    "",
    "## Interfaces (desktop defaults)",
    "",
    `- TCP client: ${defaultInterfaces.tcp.enabled ? "on" : "off"} (target ${defaultInterfaces.tcp.targetHost}:${defaultInterfaces.tcp.targetPort})`,
    `- WebSocket gateway: ${defaultInterfaces.websocket.enabled ? "on" : "off"} (listen ${defaultInterfaces.websocket.listenHost}:${defaultInterfaces.websocket.listenPort})`,
    `- AutoInterface multicast: ${defaultInterfaces.auto.enabled && defaultInterfaces.auto.multicast}`,
    `- Bonjour discovery: ${defaultInterfaces.auto.enabled && defaultInterfaces.auto.bonjour}`,
    `- I2P SAM: ${defaultInterfaces.i2p.enabled}`,
    `- RNode serial: ${defaultInterfaces.rnode.enabled}`,
    "",
    "Interface behavior: [Network interfaces](chapter:ref-interfaces).",
    "",
    "## Quotas",
    "",
    "Seed storage, propagation store, message count, and bandwidth caps match",
    "[Quotas & limits](chapter:ref-quotas). Override under the `quotas` key.",
    "",
    "## AI endpoint",
    "",
    "`ai` is `null` until configured (desktop **Settings → AI** or `config.json`). Chat and",
    "embedding models are configured separately. Mini-apps use `ai:chat` and `ai:embed` through",
    "the host proxy — see [AI chat](chapter:sdk-ai-chat).",
    "",
    "## Status endpoint",
    "",
    "Opt-in JSON at `http://127.0.0.1:9473/status` when `statusEndpoint: true`",
    "or `tp node --status-endpoint`."
  ].join("\n");

  writeText(join(refDir, "capabilities.md"), `${capabilitiesMd}\n`);
  writeText(join(refDir, "widgets.md"), `${widgetsMd}\n`);
  writeText(join(refDir, "host-api.md"), `${hostApiMd}\n`);
  writeText(join(refDir, "packages.md"), `${packagesMd}\n`);
  writeText(join(refDir, "interfaces.md"), `${interfacesMd}\n`);
  writeText(join(refDir, "quotas.md"), `${quotasMd}\n`);
  writeText(join(refDir, "cli.md"), `${cliMd}\n`);
  writeText(join(refDir, "host-config.md"), `${hostConfigMd}\n`);
}

async function build() {
  await generateReferenceChapters();
  const toc = loadToc();
  const applets = loadApplets();
  const appletIds = new Set(applets.map((applet) => applet.id));
  const chapterIds = new Set();
  const chapters = [];
  const allLinks = [];

  resetSeeds();
  ensureDir(generatedDir);

  for (const part of toc.parts) {
    for (const chapter of part.chapters) {
      if (chapterIds.has(chapter.id)) {
        fail(`Duplicate chapter id: ${chapter.id}`);
      }
      chapterIds.add(chapter.id);

      const markdownPath = join(contentDir, chapter.file);
      if (!existsSync(markdownPath)) {
        fail(`Missing chapter file: ${chapter.file}`);
      }

      const markdown = readFileSync(markdownPath, "utf8");
      const { blocks, links } = parseMarkdown(markdown, chapter.id);
      allLinks.push(...links.map((link) => ({ ...link, from: chapter.id })));

      const seedBlocks = [];
      for (const block of blocks) {
        if (block.type === "code") {
          writeText(join(seedsDir, block.documentId), block.content);
          seedBlocks.push({ type: "code", documentId: block.documentId, language: block.language });
        } else if (block.type === "applet") {
          if (!appletIds.has(block.appletId)) {
            fail(`Chapter ${chapter.id} references unknown applet ${block.appletId}`);
          }
          seedBlocks.push({ type: "applet", appletId: block.appletId });
        } else {
          seedBlocks.push(block);
        }
      }

      // Also store the authored markdown for content-by-reference readers / DevStudio.
      writeText(join(seedsDir, `chapters/${chapter.id}/source.md`), markdown);

      chapters.push({
        id: chapter.id,
        title: chapter.title,
        partId: part.id,
        partTitle: part.title,
        blocks: seedBlocks,
        searchText: ""
      });
    }
  }

  for (const chapter of chapters) {
    chapter.searchText = chapterTextForSearch(chapter).toLowerCase();
    const minWords = MIN_CHAPTER_WORDS[chapter.partId];
    if (minWords !== undefined) {
      const words = chapterWordCount(chapter);
      if (words < minWords) {
        fail(`Chapter ${chapter.id} is too thin (${words} < ${minWords} words)`);
      }
    }
  }

  for (const link of allLinks) {
    if (link.target.startsWith("chapter:")) {
      const targetId = link.target.slice("chapter:".length);
      if (!chapterIds.has(targetId)) {
        fail(`Broken chapter link from ${link.from}: ${link.target}`);
      }
    } else if (link.target.startsWith("http://") || link.target.startsWith("https://")) {
      // External URLs are allowed.
    } else if (link.target.startsWith("../") || link.target.endsWith(".md")) {
      fail(`Dead in-app link from ${link.from}: ${link.target} — use chapter:id targets`);
    } else {
      fail(`Unsupported link target from ${link.from}: ${link.target}`);
    }
  }

  for (const applet of applets) {
    for (const platform of HANDBOOK_PLATFORMS) {
      if (applet.expectations[platform] === undefined) {
        fail(`Applet ${applet.id} missing expectation for platform ${platform}`);
      }
    }
  }

  for (const applet of applets) {
    writeText(join(seedsDir, `applets/${applet.id}/main.js`), applet.source);
    writeText(
      join(seedsDir, `applets/${applet.id}/applet.json`),
      `${JSON.stringify(
        {
          id: applet.id,
          title: applet.title,
          group: applet.group,
          executionModes: applet.executionModes,
          preview: applet.preview,
          capabilities: applet.capabilities,
          surfaces: applet.surfaces,
          expectations: applet.expectations
        },
        null,
        2
      )}\n`
    );
  }

  // Coverage gate: every CAPABILITY_DEFINITIONS id must be exercised by ≥ 1
  // applet and every applet referenced by ≥ 1 chapter. CI fails on new surface
  // without docs.
  const referencedApplets = new Set();
  const coveredCapabilities = new Set();
  for (const chapter of chapters) {
    for (const block of chapter.blocks) {
      if (block.type === "applet") {
        referencedApplets.add(block.appletId);
      }
    }
  }
  for (const applet of applets) {
    if (!referencedApplets.has(applet.id)) {
      fail(`Applet ${applet.id} is not referenced by any chapter`);
    }
    for (const capability of applet.capabilities) {
      coveredCapabilities.add(capability);
    }
  }

  let capabilityDefinitions = [];
  let capabilityDescriptions = new Map();
  try {
    const runtimeCaps = await import(
      "../../packages/miniapp-runtime/dist/capabilities.js"
    );
    capabilityDefinitions = runtimeCaps.CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    capabilityDescriptions = new Map(
      runtimeCaps.CAPABILITY_DEFINITIONS.map((entry) => [entry.id, entry.description])
    );
  } catch {
    // Fall back when dist is not built yet; D1 CI always runs after `npm run build`.
    capabilityDefinitions = [
      "identity",
      "presence",
      "announce:subscribe",
      "announce:publish",
      "lxmf:send",
      "lxmf:receive",
      "storage:kv",
      "storage:hyperbee",
      "resource:fetch",
      "workspace",
      "ai:chat",
      "ai:embed",
      "apps:package",
      "apps:publish",
      "apps:install",
      "apps:preview",
      "share:cas"
    ];
    capabilityDescriptions = new Map(capabilityDefinitions.map((id) => [id, id]));
  }

  for (const capability of capabilityDefinitions) {
    if (!coveredCapabilities.has(capability)) {
      fail(`Capability "${capability}" is not exercised by any applet`);
    }
  }

  const allChapterText = chapters.map((chapter) => chapter.searchText).join("\n");
  const allSurfacePrefixes = applets
    .flatMap((applet) => (applet.surfaces ?? []).map((surface) => surface.split(".")[0]))
    .join(" ")
    .toLowerCase();
  for (const namespace of SDK_NAMESPACES) {
    if (!allChapterText.includes(namespace) && !allSurfacePrefixes.includes(namespace)) {
      fail(`SDK namespace "${namespace}" is not referenced in any chapter or applet surface`);
    }
  }

  const manifestPath = join(root, "app.manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifestCapabilities = (manifest.capabilities ?? []).map((id) => ({
    id,
    description: capabilityDescriptions.get(id) ?? id
  }));

  const catalog = {
    title: toc.title,
    version: manifest.version ?? "0.2.0",
    manifestCapabilities,
    parts: toc.parts.map((part) => ({
      id: part.id,
      title: part.title,
      chapters: part.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title }))
    })),
    chapters,
    applets: applets.map(({ source, ...rest }) => ({
      ...rest,
      sourcePath: `applets/${rest.id}/main.js`
    })),
    seeds: collectSeedManifest(seedsDir)
  };

  writeText(catalogOutPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const runtime = readFileSync(runtimePath, "utf8");
  const bundle = `/* Generated by apps/handbook/build.mjs — do not edit by hand. */\nconst CATALOG = ${JSON.stringify(catalog)};\n${runtime}`;
  writeText(bundlePath, bundle);

  buildPartPackages({
    toc,
    chapters,
    applets,
    manifest,
    capabilityDescriptions,
    runtime,
    seeds: catalog.seeds
  });

  console.log(
    `handbook build: ${chapters.length} chapter(s), ${applets.length} applet(s), ${catalog.seeds.length} seed file(s) → bundle.js; ${toc.parts.length} part package(s) → generated/part-packages/`
  );
}

function buildPartPackages({ toc, chapters, applets, manifest, capabilityDescriptions, runtime, seeds }) {
  const partsRoot = join(generatedDir, "part-packages");
  rmSync(partsRoot, { recursive: true, force: true });

  for (const part of toc.parts) {
    const partChapters = chapters.filter((chapter) => chapter.partId === part.id);
    const referencedApplets = new Set();
    for (const chapter of partChapters) {
      for (const block of chapter.blocks) {
        if (block.type === "applet") {
          referencedApplets.add(block.appletId);
        }
      }
    }

    const partApplets = applets
      .filter((applet) => referencedApplets.has(applet.id))
      .map(({ source, ...rest }) => ({
        ...rest,
        sourcePath: `applets/${rest.id}/main.js`
      }));

    const chapterIds = new Set(partChapters.map((chapter) => chapter.id));
    const partSeeds = seeds.filter((seed) => {
      if (seed.path.startsWith("chapters/")) {
        const chapterId = seed.path.split("/")[1];
        return chapterIds.has(chapterId);
      }
      if (seed.path.startsWith("applets/")) {
        return [...referencedApplets].some((id) => seed.path.startsWith(`applets/${id}/`));
      }
      return false;
    });

    const partCapabilityIds = new Set(["identity", "presence", "storage:kv", "workspace"]);
    for (const applet of partApplets) {
      for (const capability of applet.capabilities ?? []) {
        partCapabilityIds.add(capability);
      }
    }

    const partManifest = {
      ...manifest,
      name: `handbook-${part.id}`,
      capabilities: (manifest.capabilities ?? []).filter((id) => partCapabilityIds.has(id))
    };
    if (partManifest.capabilities.length === 0) {
      partManifest.capabilities = ["identity", "storage:kv"];
    }

    const partManifestCapabilities = partManifest.capabilities.map((id) => ({
      id,
      description: capabilityDescriptions.get(id) ?? id
    }));

    const partCatalog = {
      title: `${toc.title} — ${part.title}`,
      version: manifest.version ?? "0.2.0",
      manifestCapabilities: partManifestCapabilities,
      parts: [
        {
          id: part.id,
          title: part.title,
          chapters: part.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title }))
        }
      ],
      chapters: partChapters,
      applets: partApplets,
      seeds: partSeeds
    };

    const partDir = join(partsRoot, part.id);
    writeText(join(partDir, "app.manifest.json"), `${JSON.stringify(partManifest, null, 2)}\n`);
    writeText(
      join(partDir, "bundle.js"),
      `/* Generated part package ${part.id} */\nconst CATALOG = ${JSON.stringify(partCatalog)};\n${runtime}`
    );
  }
}

function collectSeedManifest(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const rel = prefix === "" ? entry : `${prefix}/${entry}`;
    if (statSync(full).isDirectory()) {
      files.push(...collectSeedManifest(full, rel));
    } else {
      files.push({
        path: rel.split("\\").join("/"),
        content: readFileSync(full, "utf8")
      });
    }
  }
  return files;
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
