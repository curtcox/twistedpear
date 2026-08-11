/**
 * Handbook build — Part V reference chapter generation.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  contentDir,
  ensureDir,
  fail,
  root,
  writeText,
} from "./build-content.mjs";

function transformLimitationsMarkdown(source) {
  return source
    .replace(/^# Limitations[^\n]*\n\nCompanion[^\n]+\n\n/m, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[([^\]]+)\]\(docs\/web-host\.md\)/g, "[$1](chapter:host-web)")
    .replace(
      /\[([^\]]+)\]\(docs\/miniapp-runtime\.md\)/g,
      "[$1](chapter:ref-host-api)",
    )
    .replace(/\[([^\]]+)\]\(docs\/security-review\.md\)/g, "$1")
    .replace(/\[([^\]]+)\]\(docs\/ios-multicast-entitlement\.md\)/g, "$1")
    .replace(/\[([^\]]+)\]\(docs\/ios-submission\.md\)/g, "$1")
    .replace(/\[([^\]]+)\]\(\.\.\/STATUS-HARDWARE\.md\)/g, "STATUS-HARDWARE")
    .replace(/\[([^\]]+)\]\(\.\.\/PLAN\.md\)/g, "PLAN")
    .replace(
      /\[([^\]]+)\]\((?:\.\.\/)+LIMITATIONS\.md[^)]*\)/g,
      "[$1](chapter:ref-limitations)",
    )
    .replace(/\[([^\]]+)\]\([^)]*\.md[^)]*\)/g, "$1");
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
    "",
  ];
}

function generateLimitationsChapter(refDir) {
  const limitationsPath = join(root, "../../LIMITATIONS.md");
  if (!existsSync(limitationsPath)) {
    fail("LIMITATIONS.md not found for ref-limitations generation");
  }
  const body = transformLimitationsMarkdown(
    readFileSync(limitationsPath, "utf8"),
  );
  const limitationsMd = [
    ...referenceHeader("Known limitations"),
    "Platform compromises and measured constraints. Cross-linked from host chapters",
    "and the [live difference matrix](chapter:difference-matrix).",
    "",
    body.trim(),
  ].join("\n");
  writeText(join(refDir, "limitations.md"), `${limitationsMd}\n`);
}

export async function generateReferenceChapters() {
  const refDir = join(contentDir, "part-5-reference");
  ensureDir(refDir);
  generateLimitationsChapter(refDir);

  let capabilityDefinitions;
  let widgetTypes;
  let widgetPropKeys = new Map();
  let widgetStyleKeys = new Set();
  let codeEditorLanguages = new Set();
  let hostApiVersion = "0.3.0";
  let hostApiChangelog;
  let workspaceLimits = {
    maxFileBytes: 256 * 1024,
    maxTotalBytes: 4 * 1024 * 1024,
    maxFiles: 512,
  };
  let aiLimits = { maxMessages: 64, maxTokensCap: 8192 };
  let hostQuotas = {
    seedStorageBytes: 2 * 1024 * 1024 * 1024,
    propagationStoreBytes: 256 * 1024 * 1024,
    propagationMessageCount: 10_000,
    bandwidthBytesPerSecond: 512 * 1024,
  };
  let defaultRoles = {
    transport: true,
    seeder: true,
    propagation: false,
    attachRnsd: null,
  };
  let defaultInterfaces = {
    tcp: {
      enabled: false,
      mode: "client",
      targetHost: "127.0.0.1",
      targetPort: 4242,
    },
    websocket: { enabled: false, listenHost: "127.0.0.1", listenPort: 9480 },
    auto: { enabled: true, multicast: true, bonjour: true },
    i2p: { enabled: false },
    rnode: { enabled: false, baudRate: 115_200 },
  };
  try {
    const runtimeCaps =
      await import("../../packages/miniapp-runtime/dist/capabilities.js");
    capabilityDefinitions = runtimeCaps.CAPABILITY_DEFINITIONS;
    const runtimeUi =
      await import("../../packages/miniapp-runtime/dist/ui/schema.js");
    widgetTypes = [...runtimeUi.WIDGET_TYPES].sort();
    widgetPropKeys = runtimeUi.WIDGET_PROP_KEYS;
    widgetStyleKeys = runtimeUi.WIDGET_STYLE_KEYS;
    codeEditorLanguages = runtimeUi.CODE_EDITOR_LANGUAGES;
    const hostApi =
      await import("../../packages/miniapp-runtime/dist/host-api.js");
    hostApiVersion = hostApi.HOST_API_VERSION;
    hostApiChangelog = hostApi.HOST_API_CHANGELOG;
    const workspace =
      await import("../../packages/miniapp-runtime/dist/services/workspace.js");
    workspaceLimits = workspace.DEFAULT_WORKSPACE_LIMITS;
    const ai =
      await import("../../packages/miniapp-runtime/dist/services/ai.js");
    aiLimits = ai.DEFAULT_AI_SERVICE_LIMITS;
    const hostCore = await import("../../packages/host-core/dist/types.js");
    hostQuotas = hostCore.DEFAULT_QUOTAS;
    defaultRoles = hostCore.DEFAULT_DESKTOP_ROLES;
    defaultInterfaces = hostCore.DEFAULT_INTERFACE_CONFIG;
  } catch {
    capabilityDefinitions = [
      {
        id: "identity",
        description: "Use an app-scoped identity for signing and addressing.",
      },
      {
        id: "presence",
        description: "Read coarse peer/interface presence and host info.",
      },
      {
        id: "announce:subscribe",
        description: "Receive announces in the app namespace.",
      },
      { id: "announce:publish", description: "Publish the app destination." },
      {
        id: "lxmf:send",
        description: "Send LXMF messages from the app destination.",
      },
      {
        id: "lxmf:receive",
        description: "Receive LXMF messages for the app destination.",
      },
      {
        id: "storage:kv",
        description: "Store local key/value data for this app.",
      },
      {
        id: "storage:hyperbee",
        description: "Store ordered local Hyperbee data for this app.",
      },
      {
        id: "resource:fetch",
        description: "Fetch package resources through host budget rules.",
      },
      {
        id: "workspace",
        description:
          "Read and write project source files in this app's private workspace.",
      },
      {
        id: "ai:chat",
        description: "Send prompts to the host-configured AI service.",
      },
      {
        id: "ai:embed",
        description:
          "Send bounded text to the host-configured embedding model and rank vectors locally.",
      },
      {
        id: "apps:package",
        description:
          "Package and sign apps under this device's publisher identity.",
      },
      {
        id: "apps:publish",
        description:
          "Publish signed apps so other users can find and install them.",
      },
      {
        id: "apps:install",
        description: "Ask the host to install apps from a 256t id.",
      },
      {
        id: "apps:preview",
        description:
          "Run a built app in the host's sandboxed dev-preview slot.",
      },
      {
        id: "share:cas",
        description:
          "Store and retrieve bounded content-addressed data shared by 256t id.",
      },
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
      "view",
    ];
    hostApiChangelog = [
      {
        version: hostApiVersion,
        note: "See packages/miniapp-runtime/src/host-api.ts",
      },
    ];
  }

  const capabilitiesMd = [
    ...referenceHeader("Capabilities"),
    "Generated from `CAPABILITY_DEFINITIONS` in `packages/miniapp-runtime`.",
    "Every id below must be exercised by at least one Handbook applet (coverage gate).",
    "",
    ...capabilityDefinitions.map(
      (entry) => `- **\`${entry.id}\`** — ${entry.description}`,
    ),
    "",
    "Manifests declare the full list; users may grant a subset at install.",
    "Withholding a capability turns matching probes into `not-granted` cards.",
    "",
    "Tutorial: [Capability model](chapter:sdk-capabilities).",
    "Per-namespace guides: [Developing mini-apps](chapter:sdk-identity).",
  ].join("\n");

  const widgetLines = [];
  for (const type of widgetTypes) {
    const props = widgetPropKeys.get(type);
    const propList =
      props === undefined || props.size === 0
        ? "none"
        : [...props]
            .sort()
            .map((p) => `\`${p}\``)
            .join(", ");
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
      ? [...widgetStyleKeys]
          .sort()
          .map((key) => `- \`${key}\``)
          .join("\n")
      : "- See `WIDGET_STYLE_KEYS` in the runtime.",
    "",
    "## Limits",
    "",
    `- Widget tree JSON budget: 256 KiB (default validator)`,
    `- \`code-editor\` languages: ${[...codeEditorLanguages].sort().join(", ")}`,
    `- \`qr-code\` value: up to 512 characters (94-char 256t ids fit)`,
    "",
    "Live gallery: [Widget gallery](chapter:sdk-widget-gallery).",
  ].join("\n");

  const changelogLines = hostApiChangelog.map(
    (entry) => `- **\`${entry.version}\`** — ${entry.note}`,
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
    `- ${workspaceLimits.maxFiles} files per app`,
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
    "Distribution tutorial: [Publish, install & update](chapter:sdk-apps-update).",
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
    "LoRa bandwidth budgets apply — see [Known limitations](chapter:ref-limitations) §6.",
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
    `- Bandwidth cap: ${hostQuotas.bandwidthBytesPerSecond} bytes/s independently for ingress and egress`,
    "- Zero-burst hard ceiling shared by Reticulum interfaces and forwarding, Hyperdrive replication, and gateway bulk fetches",
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
    "`conformance/budgets/measured.json`.",
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
    "Tutorial: [Packaging & preview](chapter:sdk-apps-package).",
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
    "or `tp node --status-endpoint`.",
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
