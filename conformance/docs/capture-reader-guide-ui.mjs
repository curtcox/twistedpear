#!/usr/bin/env node
/**
 * Capture the reader-guide images that are backed by real desktop-host surfaces.
 *
 * The host normally fills these panels over Electron IPC. Documentation captures use
 * deterministic throwaway values so they contain no operator identity or credentials.
 */
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rendererHtml = join(repoRoot, "apps/host-desktop/src/renderer/index.html");

const fakeIdentity = "TPDEMO7LQ2X9C4M6K8R3V5N1B7D9F2H4J6L8P3S5W7Y9A2C4E6G8K1M3Q5T7V9X2Z4B6D8F1H3J5L7N9P2R4T6";
const fakeHash = "7f3a1c9e42b68d05a7c31e9f42b68d05";

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
    const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
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
  { file: "guide/images/04-interfaces-settings.png", kind: "interfaces" },
  { file: "guide/images/05-catalog.png", kind: "catalog" },
  { file: "guide/images/05-install-from-256t.png", kind: "install" },
  { file: "guide/images/05-capability-review.png", kind: "capability-review" },
  { file: "guide/images/05-trusted-publishers.png", kind: "trust" },
  { file: "guide/images/06-grants.png", kind: "grants" },
  { file: "guide/images/06-host-confirmation.png", kind: "send-confirm" },
  { file: "guide/images/06-runtime-controls.png", kind: "runtime" },
  { file: "guide/images/07-propagation-role.png", kind: "roles" },
  { file: "guide/images/08-untrusted-publisher.png", kind: "untrusted-review" },
  { file: "guide/images/09-roles.png", kind: "roles" },
  { file: "authors/images/02-install-devstudio.png", kind: "devstudio-review" },
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
  for (const scene of scenes) {
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
} finally {
  await browser.close();
}
