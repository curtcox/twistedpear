#!/usr/bin/env node
/**
 * Capture the reader-guide images that are backed by real desktop-host surfaces.
 *
 * The host normally fills these panels over Electron IPC. Documentation captures use
 * deterministic throwaway values so they contain no operator identity or credentials.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  GrantStore,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  AnnounceService
} from "../../packages/miniapp-runtime/dist/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rendererHtml = join(repoRoot, "apps/host-desktop/src/renderer/index.html");

const fakeIdentity = "TPDEMO7LQ2X9C4M6K8R3V5N1B7D9F2H4J6L8P3S5W7Y9A2C4E6G8K1M3Q5T7V9X2Z4B6D8F1H3J5L7N9P2R4T6";
const fakeHash = "7f3a1c9e42b68d05a7c31e9f42b68d05";
const fakeT256 = "D".repeat(94);
const captureSection = process.env.CAPTURE_READER_GUIDE_SECTION ?? "all";

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
    if (tree !== null && (expected === "" || treeText(tree).includes(expected))) return tree;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for mini-app text: ${expected}`);
}

async function launchCookbookApp(name, configure = async () => {}, seed = async () => {}) {
  const store = new MemoryStore();
  const encoder = new TextEncoder();
  await seed(store);
  if (name === "ask-the-handbook") {
    await store.set(
      `miniapp-workspace:${name}:docs/identity.md`,
      encoder.encode("Back up an identity by exporting an encrypted .tpidentity file. Keep its passphrase separately. Recovery words restore the same identity.")
    );
    await store.set(
      `miniapp-workspace:${name}:docs/safety.md`,
      encoder.encode("Blocking drops future messages from an authenticated LXMF source. Reports remain local until exported.")
    );
  }

  const answers = {
    "ask-the-handbook": "Export an encrypted .tpidentity backup and keep its passphrase separately. The two recovery-word groups restore the same identity.",
    "form-forge": '[{"label":"Trail name","type":"text"},{"label":"Party size","type":"number"},{"label":"Checked out","type":"switch"}]',
    "pocket-translator": "Buenos días",
    "triage-notes": '{"subject":"Water pump inspection","location":"North shelter","severity":"high","action":"Send maintenance crew"}'
  };
  const aiBackend = {
    chat: async () => ({
      message: { role: "assistant", content: answers[name] ?? "Documentation response" },
      model: "docs-fixture",
      usage: null
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
          lower.includes("identity") || lower.includes("backup") || lower.includes("block") || lower.includes("report") ? 0 : 1
        ];
      }),
      model: "docs-embedding-fixture",
      usage: null
    })
  };
  const announceService = new AnnounceService();
  if (name === "app-relay") {
    await announceService.publish(
      "publisher-alpha",
      encoder.encode(JSON.stringify({ name: "Trail map", t256: fakeT256 })),
      "app-relay"
    );
    await announceService.publish(
      "publisher-bravo",
      encoder.encode(JSON.stringify({ name: "Water points", t256: `E${fakeT256.slice(1)}` })),
      "app-relay"
    );
  }
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: new KvStorageBeeBackend(store),
    announceService,
    presenceBackend: { snapshot: async () => ({ onlineInterfaces: 1, preferredInterface: "tcp", peers: 3 }) },
    aiBackend,
    resourceBackend: { fetch: async () => encoder.encode("documentation resource payload") },
    casBackend: {
      put: async (_appId, content) => ({ t256: fakeT256, size: content.length }),
      get: async (_appId, t256) => t256 === fakeT256
        ? encoder.encode("Field notes cover\n---\nWater and shelter\n---\nRadio plan and contacts")
        : null
    },
    confirmationChannel: { confirm: async () => ({ approved: true }) },
    appsBackend: {
      package: async () => ({ packageHash: "docs-package-hash", size: 3_712, t256: fakeT256 }),
      publish: async (_appId, request) => ({ t256: request.t256, driveKey: "docs-drive-key", version: "1.0.0" }),
      install: async () => ({ appId: "docs-installed-app", version: "1.0.0", trusted: true }),
      preview: async () => ({ launched: true }),
      stopPreview: async () => undefined
    }
  });
  const manifest = JSON.parse(readFileSync(join(repoRoot, "cookbook/apps", name, "app.manifest.json"), "utf8"));
  const launchManifest = { ...manifest, publisherPublicKey: "docs-publisher" };
  await host.setGrants(name, launchManifest.publisherPublicKey, manifest.capabilities, manifest.capabilities);
  await host.launch(launchManifest, new Uint8Array(readFileSync(join(repoRoot, "cookbook/apps", name, "bundle.js"))));
  await waitForTree(host);
  await configure(host);
  return host;
}

function startStaticServer(root) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const resolvedRoot = normalize(root);
    const resolvedPath = normalize(join(resolvedRoot, relativePath));
    if ((!resolvedPath.startsWith(resolvedRoot + sep) && resolvedPath !== resolvedRoot) ||
        !existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
      response.writeHead(404).end();
      return;
    }
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
    response.writeHead(200, { "content-type": types[extname(resolvedPath)] ?? "application/octet-stream" });
    createReadStream(resolvedPath).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") return reject(new Error("static server did not bind"));
      resolve({ url: `http://127.0.0.1:${address.port}/`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

const scenes = [
  { file: "guide/images/00-hero-desktop-host.png", kind: "main" },
  { file: "guide/images/02-desktop-main-window.png", kind: "main" },
  { file: "guide/images/03-create-identity.png", kind: "identity-create" },
  { file: "guide/images/03-identity-created.png", kind: "status" },
  { file: "guide/images/03-show-my-identity.png", kind: "identity-show" },
  { file: "guide/images/03-recovery-words.png", kind: "identity-recovery" },
  { file: "guide/images/04-interfaces-settings.png", kind: "interfaces" },
  { file: "guide/images/05-catalog.png", kind: "catalog" },
  { file: "guide/images/05-install-from-256t.png", kind: "install" },
  { file: "guide/images/05-capability-review.png", kind: "capability-review" },
  { file: "guide/images/05-trusted-publishers.png", kind: "trust" },
  { file: "guide/images/06-grants.png", kind: "grants" },
  { file: "guide/images/06-host-confirmation.png", kind: "send-confirm" },
  { file: "guide/images/06-runtime-controls.png", kind: "runtime" },
  { file: "guide/images/07-propagation-role.png", kind: "roles" },
  { file: "guide/images/07-local-safety.png", kind: "safety" },
  { file: "guide/images/08-untrusted-publisher.png", kind: "untrusted-review" },
  { file: "guide/images/09-roles.png", kind: "roles" },
  { file: "authors/images/02-install-devstudio.png", kind: "devstudio-review" },
  { file: "authors/images/03-publisher-recovery.png", kind: "identity-recovery" },
  { file: "authors/images/05-capability-review.png", kind: "capability-review" },
  { file: "authors/images/06-runtime-storage.png", kind: "runtime" },
  { file: "authors/images/08-host-confirmation.png", kind: "publish-confirm" },
  { file: "authors/images/11-runtime-controls.png", kind: "runtime" },
  { file: "cookbook/images/01-dev-install.png", kind: "dev-install" },
  { file: "cookbook/images/01-capability-review.png", kind: "net-ledger-review" },
  { file: "cookbook/images/08-host-confirmation.png", kind: "publish-confirm" }
];

const browser = await chromium.launch();
try {
  for (const scene of captureSection === "all" ? scenes : []) {
    const output = join(repoRoot, scene.file);
    mkdirSync(dirname(output), { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`file://${rendererHtml}`, { waitUntil: "load" });
    await page.evaluate(({ kind, fakeIdentity, fakeHash }) => {
      const panels = [...document.querySelectorAll("main > .panel")];
      const panel = (title) => panels.find((candidate) => candidate.querySelector("h2")?.textContent === title);
      const show = (...titles) => {
        for (const candidate of panels) {
          candidate.hidden = !titles.includes(candidate.querySelector("h2")?.textContent ?? "");
        }
      };
      const html = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.innerHTML = value;
      };
      const status = (identity = true) => html("#status-grid", `
        <dt>Running</dt><dd>yes</dd>
        <dt>Identity</dt><dd>${identity ? `${fakeHash.slice(0, 16)}…${fakeHash.slice(-8)}` : "Not created"}</dd>
        <dt>Transport</dt><dd>enabled</dd>
        <dt>Online interfaces</dt><dd>2</dd>
        <dt>Catalog entries</dt><dd>3</dd>
        <dt>Installed</dt><dd>3</dd>`);
      const catalog = () => html("#catalog-list", `
        <li class="item-row"><strong>Handbook</strong><span class="muted">v0.5.0 · TwistedPear</span><button>Install</button></li>
        <li class="item-row"><strong>Chat</strong><span class="muted">v0.3.0 · Example publisher</span><button>Install</button></li>
        <li class="item-row"><strong>File drop</strong><span class="muted">v0.2.0 · Example publisher</span><button>Install</button></li>`);
      const installed = (dev = false) => html("#installed-list", `
        <li class="item-row"><strong>${dev ? "Unit converter" : "Handbook"}</strong>${dev ? " <strong>DEV</strong>" : ""}<span class="muted">v0.1.0</span><button>Open</button><button>Remove</button></li>
        ${dev ? "" : '<li class="item-row"><strong>Chat</strong><span class="muted">v0.3.0</span><button>Open</button><button>Remove</button></li>'}`);
      const modal = (title, rows, capabilities = []) => {
        html("#host-modal", `<h3>${title}</h3><p class="fingerprint">Publisher key: demo-publisher-7f3a1c9e…</p>${rows.map(([label, value]) => `<p><span class="muted">${label}:</span> ${value}</p>`).join("")}${capabilities.map((item, index) => `<label class="grant-row"><input type="checkbox" ${index === capabilities.length - 1 ? "" : "checked"}><span>${item}</span></label>`).join("")}<div class="modal-actions"><button>Cancel</button><button class="primary">Approve</button></div>`);
        document.querySelector("#host-modal-overlay").hidden = false;
      };

      document.body.classList.remove("miniapp-running");
      document.querySelector("header h1").textContent = "TwistedPear Host";
      document.querySelector("#subtitle").textContent = "Desktop always-on peer · Documentation identity";
      status();
      catalog();
      installed();

      switch (kind) {
        case "main":
          show("Node status", "Catalog", "Installed");
          break;
        case "status":
          show("Node status");
          break;
        case "identity-create":
          show("Identity backup");
          document.querySelector("#identity-result").textContent = "No host identity yet. Choose a passphrase to create one.";
          break;
        case "identity-show": {
          show("Trusted publishers");
          const qr = globalThis.qrcode(0, "M");
          qr.addData(fakeIdentity);
          qr.make();
          html("#trust-identity-view", `<h3>My identity</h3><div style="background:white;padding:12px;width:max-content">${qr.createSvgTag(5, 0)}</div><p class="fingerprint" style="max-width:56rem;word-break:break-all">${fakeIdentity}</p>`);
          break;
        }
        case "identity-recovery":
          show("Identity backup");
          document.querySelector("#identity-result").textContent = "Recovery words revealed. Store both labelled groups offline.";
          document.querySelector("#identity-words-first").value = "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual";
          document.querySelector("#identity-words-second").value = "adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album";
          break;
        case "interfaces":
          show("Settings");
          document.querySelector("#setting-tcp").checked = true;
          document.querySelector("#setting-auto").checked = true;
          document.querySelector("#setting-rnode-port").value = "";
          break;
        case "catalog":
          show("Catalog");
          break;
        case "install":
          show("Catalog");
          document.querySelector("#install-256t-input").value = fakeIdentity;
          break;
        case "trust":
          show("Trusted publishers");
          html("#trust-list", `<li class="item-row"><strong>Example publisher</strong><span class="muted">demo-publisher-7f3a1c9e…</span><button>Remove</button></li>`);
          break;
        case "grants":
          show("Grants");
          html("#grants-panel", `<h3>Chat</h3><label class="grant-row"><input type="checkbox" checked> identity — use an app-scoped address</label><label class="grant-row"><input type="checkbox" checked> lxmf:send — send messages</label><label class="grant-row"><input type="checkbox" checked> lxmf:receive — receive messages</label>`);
          break;
        case "runtime":
          show("Runtime controls");
          document.querySelector("#limits-app").textContent = "Handbook · running · 38 broker messages";
          document.querySelector("#limit-rate").value = "50";
          document.querySelector("#limit-kv").value = "1048576";
          document.querySelector("#limit-memory").value = "67108864";
          document.querySelector("#limits-note").textContent = "KV used: 18,432 bytes · memory limit applies on next launch";
          break;
        case "roles":
          show("Settings");
          document.querySelector("#setting-propagation").checked = true;
          document.querySelector("#setting-developer").checked = false;
          break;
        case "safety":
          show("Safety");
          document.querySelector("#moderation-source").value = fakeHash;
          document.querySelector("#moderation-label").value = "Repeated spam sender";
          document.querySelector("#moderation-reason").value = "spam";
          document.querySelector("#moderation-note").value = "Repeated unsolicited catalog messages.";
          html("#moderation-blocked", `<li class="item-row"><strong>Repeated spam sender</strong><span class="muted">${fakeHash}</span></li>`);
          html("#moderation-muted", '<li class="muted">No muted senders</li>');
          document.querySelector("#moderation-summary").textContent = "1 blocked · 0 muted · 1 local report";
          break;
        case "devstudio-review":
          show("Catalog");
          modal("Install DevStudio?", [["Version", "0.1.0"], ["Package size", "84 KiB"]], ["workspace — edit project files", "apps:preview — run a live preview", "apps:package — sign packages", "ai:chat — request model-assisted edits"]);
          break;
        case "capability-review":
          show("Catalog");
          modal("Review capabilities", [["App", "Field log"]], ["storage:kv — save local observations", "announce:subscribe — discover nearby peers", "presence — read interface status"]);
          break;
        case "publish-confirm":
          show("Installed");
          modal("Publish package?", [["App", "Sticker mill"], ["Version", "0.1.0"], ["Size", "37 KiB"], ["Action", "Sign and announce from this host"]]);
          break;
        case "send-confirm":
          show("Installed");
          modal("Allow Chat to send?", [["Destination", "demo-peer-42b68d05…"], ["Payload", "18 bytes"]]);
          break;
        case "untrusted-review":
          show("Catalog");
          modal("Install from an untrusted publisher?", [["App", "Trail notes"], ["Trust", "Publisher is not in your trusted list"]], ["storage:kv — save notes locally", "presence — read connection status"]);
          break;
        case "dev-install":
          show("Installed");
          installed(true);
          break;
        case "net-ledger-review":
          show("Catalog");
          modal("Install Net ledger?", [["Version", "0.1.0"]], ["identity — use an app-scoped address", "lxmf:send — send check-ins", "lxmf:receive — receive check-ins", "storage:kv — hold the outbox"]);
          break;
      }

      // Documentation captures use the actual dark host theme and a fixed, uncluttered viewport.
      document.documentElement.style.background = "#0f1419";
      const visiblePanels = panels.filter((candidate) => !candidate.hidden);
      if (visiblePanels.length === 1) visiblePanels[0].style.minHeight = "610px";
    }, { kind: scene.kind, fakeIdentity, fakeHash });
    await page.screenshot({ path: output, fullPage: false });
    await page.close();
    console.log(`reader-guide capture written to ${output}`);
  }

  if (captureSection === "all") {
    const webHostRoot = join(repoRoot, "dist/web-host");
    const webHostOutput = join(repoRoot, "guide/images/02-web-host-tab.png");
    mkdirSync(dirname(webHostOutput), { recursive: true });
    const staticServer = await startStaticServer(webHostRoot);
    const webPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await webPage.goto(staticServer.url, { waitUntil: "load" });
      await webPage.getByText("Web leaf host").first().waitFor({ timeout: 15_000 });
      await webPage.screenshot({ path: webHostOutput, fullPage: false });
    } finally {
      await webPage.close();
      await staticServer.close();
    }
    console.log(`reader-guide capture written to ${webHostOutput}`);
  }

  const cookbookScenes = [
    {
      file: "cookbook/images/02-unit-converter.png",
      app: "unit-converter",
      expected: "26.098 mi",
      assertion: { selector: ".widget-button", minimum: 5 },
      configure: async (host) => host.handleUiEvent("input", "conv.input", "42")
    },
    {
      file: "cookbook/images/02-breath-pacer.png",
      app: "breath-pacer",
      expected: "Breathe in",
      assertion: { selector: "progress.widget-progress", minimum: 1 },
      configure: async (host) => {
        await host.handleUiEvent("toggle", "pace.toggle");
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    },
    {
      file: "cookbook/images/07-pocket-translator.png",
      app: "pocket-translator",
      expected: "From the local phrasebook",
      assertion: { text: "Buenos días" },
      configure: async (host) => {
        await host.handleUiEvent("source", "pt.source", "Good morning");
        await waitForTree(host, "Good morning");
        await host.handleUiEvent("go", "pt.go");
        await waitForTree(host, "Translated and saved");
        await host.handleUiEvent("go", "pt.go");
      }
    },
    {
      file: "cookbook/images/07-ask-the-handbook.png",
      app: "ask-the-handbook",
      expected: "Answered from 1 file(s) · semantic",
      assertion: { text: "Sources: docs/identity.md" },
      configure: async (host) => {
        await host.handleUiEvent("question", "ah.q", "How do I back up my identity?");
        await waitForTree(host, "How do I back up my identity?");
        await host.handleUiEvent("ask", "ah.ask");
      }
    },
    {
      file: "cookbook/images/07-triage-notes.png",
      app: "triage-notes",
      expected: "Review before filing",
      assertion: { text: "subject: Water pump inspection" },
      configure: async (host) => {
        await host.handleUiEvent("dictation", "tn.text", "The water pump at the north shelter failed and needs a maintenance crew today.");
        await waitForTree(host, "water pump");
        await host.handleUiEvent("structure", "tn.structure");
      }
    },
    {
      file: "cookbook/images/02-dice-table.png",
      app: "dice-table",
      expected: "d20:",
      assertion: { selector: ".widget-scroll p", minimum: 10 },
      configure: async (host) => {
        for (let index = 0; index < 13; index += 1) {
          await host.handleUiEvent("d20", "dice.roll.20");
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    },
    {
      file: "cookbook/images/03-pocket-notes.png",
      app: "pocket-notes",
      expected: "Unsaved changes",
      assertion: { text: "Unsaved changes" },
      configure: async (host) => host.handleUiEvent(
        "editor",
        "note.change",
        "Check the north cache inventory before Friday. Bring replacement labels."
      )
    },
    {
      file: "cookbook/images/03-field-log.png",
      app: "field-log",
      expected: "3 entries held locally",
      assertion: { text: "Creek level" },
      configure: async (host) => {
        for (const entry of ["Creek level below the red marker", "South gate latch repaired", "Three deer tracks near camp"]) {
          await host.handleUiEvent("draft", "log.draft", entry);
          await host.handleUiEvent("add", "log.add");
          await new Promise((resolve) => setTimeout(resolve, 2));
        }
      }
    },
    {
      file: "cookbook/images/03-split-the-bill.png",
      app: "split-the-bill",
      expected: "3 people",
      assertion: { text: "is owed" },
      configure: async (host) => {
        for (const [who, what, amount] of [["Ari", "Fuel", "42.00"], ["Bea", "Food", "27.00"], ["Cal", "Permits", "15.00"]]) {
          await host.handleUiEvent("who", "bill.who", who);
          await host.handleUiEvent("what", "bill.what", what);
          await host.handleUiEvent("amount", "bill.amount", amount);
          await host.handleUiEvent("add", "bill.add");
        }
      }
    },
    {
      file: "cookbook/images/03-streak-tracker.png",
      app: "streak-tracker",
      expected: "9 day streak",
      assertion: { text: "9 day streak" },
      configure: async () => {},
      seed: async (store) => {
        const days = [];
        const today = new Date();
        for (let offset = 8; offset >= 0; offset -= 1) {
          const day = new Date(today);
          day.setUTCDate(day.getUTCDate() - offset);
          days.push(day.toISOString().slice(0, 10));
        }
        await store.set("miniapp-kv:streak-tracker:streak-state", new TextEncoder().encode(JSON.stringify({ days })));
      }
    },
    {
      file: "cookbook/images/06-photo-drop.png",
      app: "photo-drop",
      expected: fakeT256,
      assertion: { selector: ".widget-qr", minimum: 1 },
      configure: async (host) => host.handleUiEvent("put", "pd.put")
    },
    {
      file: "cookbook/images/06-recipe-box.png",
      app: "recipe-box",
      expected: "recipes/Trail-bread.md",
      assertion: { text: "2/512 files" },
      configure: async (host) => {
        await host.handleUiEvent("newname", "rb.name", "Trail bread");
        await host.handleUiEvent("create", "rb.create");
        await host.handleUiEvent("editor", "rb.text", "# Trail bread\n\n## Ingredients\nFlour, salt, water\n\n## Method\nBake in a covered pan.");
        await host.handleUiEvent("save", "rb.save");
        await host.handleUiEvent("newname", "rb.name", "Camp stew");
        await host.handleUiEvent("create", "rb.create");
      }
    },
    {
      file: "cookbook/images/06-zine-reader.png",
      app: "zine-reader",
      expected: "3 / 3",
      assertion: { text: "Radio plan and contacts" },
      configure: async (host) => {
        await host.handleUiEvent("id", "zr.id", fakeT256);
        await host.handleUiEvent("open", "zr.open");
        await waitForTree(host, "1 / 3");
        await host.handleUiEvent("next", "zr.next");
        await waitForTree(host, "2 / 3");
        await host.handleUiEvent("next", "zr.next");
      }
    },
    {
      file: "cookbook/images/09-nine-line.png",
      app: "nine-line",
      expected: "over the 220-byte ceiling",
      assertion: { text: "over the 220-byte ceiling" },
      configure: async (host) => {
        await host.handleUiEvent("recipient", "nl.to", "rescue-control");
        await host.handleUiEvent("line-0", "nl.field.0", "Ridge north of checkpoint seven ".repeat(10));
        await host.handleUiEvent("send", "nl.send");
      }
    },
    {
      file: "cookbook/images/05-neighborhood-board.png",
      app: "neighborhood-board",
      expected: "Water available at the school entrance",
      assertion: { text: "publisher-c" },
      configure: async () => {},
      seed: async (store) => {
        const posts = [
          ["0001", "publisher-a", "Water available at the school entrance", "2026-07-21T14:00:00.000Z"],
          ["0002", "publisher-b", "Bridge inspection starts at 16:00", "2026-07-21T14:15:00.000Z"],
          ["0003", "publisher-c", "Spare batteries at the north shelter", "2026-07-21T14:30:00.000Z"]
        ];
        for (const [key, from, text, at] of posts) {
          await store.set(`miniapp-bee:neighborhood-board:p/${key}`, new TextEncoder().encode(JSON.stringify({ from, text, at })));
        }
      }
    },
    {
      file: "cookbook/images/05-swap-shelf.png",
      app: "swap-shelf",
      expected: "Offered",
      assertion: { text: "Hand-crank radio" },
      configure: async (host) => {
        await host.handleUiEvent("draft", "ss.draft", "Hand-crank radio, working, trade for batteries");
        await host.handleUiEvent("offer", "ss.offer");
      }
    },
    {
      file: "cookbook/images/08-form-forge.png",
      app: "form-forge",
      expected: "Designed 3 fields",
      assertion: { text: "Party size (number)" },
      configure: async (host) => {
        await host.handleUiEvent("brief", "ff.brief", "A trailhead sign-in sheet");
        await host.handleUiEvent("design", "ff.design");
      }
    },
    {
      file: "cookbook/images/08-sticker-mill.png",
      app: "sticker-mill",
      expected: "Packaged 3712 bytes",
      assertion: { selector: ".widget-qr", minimum: 1 },
      configure: async (host) => {
        await host.handleUiEvent("label", "sm.label", "CHECKED");
        await host.handleUiEvent("colour", "sm.colour", "#26734d");
        await host.handleUiEvent("package", "sm.package");
      }
    },
    {
      file: "cookbook/images/08-app-relay.png",
      app: "app-relay",
      expected: "Trusting 1 publisher(s)",
      assertion: { text: "Trail map" },
      configure: async (host) => {
        await waitForTree(host, "Water points");
        await host.handleUiEvent("draft", "ar.draft", "publisher-alpha");
        await host.handleUiEvent("trust", "ar.trust");
      }
    }
  ];
  const rendererServer = await startStaticServer(dirname(rendererHtml));
  try {
    for (const scene of captureSection === "all" || captureSection === "cookbook" ? cookbookScenes : []) {
      const host = await launchCookbookApp(scene.app, scene.configure, scene.seed);
      try {
        const tree = await waitForTree(host, scene.expected);
        const output = join(repoRoot, scene.file);
        mkdirSync(dirname(output), { recursive: true });
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.goto(rendererServer.url, { waitUntil: "load" });
        await page.evaluate(async ({ app, tree }) => {
          document.body.classList.add("miniapp-running");
          document.querySelector("header h1").textContent = "TwistedPear Host";
          document.querySelector("#subtitle").textContent = "Desktop always-on peer · Cookbook fixture";
          document.querySelector("#miniapp-title").textContent = app;
          const { renderWidgetTree } = await import("./widgets.js");
          renderWidgetTree(tree, document.querySelector("#widget-root"));
        }, { app: scene.app, tree });
        const assertionPassed = await page.evaluate((assertion) => {
          if (assertion.selector !== undefined) {
            return document.querySelectorAll(assertion.selector).length >= assertion.minimum;
          }
          return document.querySelector("#widget-root")?.textContent?.includes(assertion.text) === true;
        }, scene.assertion);
        if (!assertionPassed) throw new Error(`Rendered cookbook assertion failed for ${scene.app}`);
        await page.screenshot({ path: output, fullPage: false });
        await page.close();
        console.log(`reader-guide capture written to ${output}`);
      } finally {
        await host.stop();
      }
    }
  } finally {
    await rendererServer.close();
  }
} finally {
  await browser.close();
}
