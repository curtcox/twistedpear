#!/usr/bin/env node
/**
 * Capture the reader-guide images that are backed by real desktop-host surfaces.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import {
  fakeHash,
  fakeIdentity,
  rendererHtml,
  repoRoot,
  startStaticServer,
} from "./capture-reader-guide-ui-lib.mjs";
import { runCookbookCaptures } from "./capture-reader-guide-ui-cookbook.mjs";
import { runDiagramCaptures } from "./capture-reader-guide-ui-diagrams.mjs";
import { runExampleAppCaptures } from "./capture-reader-guide-ui-apps.mjs";
import {
  captureComposite,
  runAuthorCaptures,
} from "./capture-reader-guide-ui-authors.mjs";

const captureSection = process.env.CAPTURE_READER_GUIDE_SECTION ?? "all";
const captureScenes =
  process.env.CAPTURE_READER_GUIDE_SCENES?.split(",").filter(Boolean);
const captureFiles =
  process.env.CAPTURE_READER_GUIDE_FILES?.split(",").filter(Boolean);

const scenes = [
  { file: "guide/images/00-hero-desktop-host.png", kind: "main" },
  { file: "guide/images/02-desktop-main-window.png", kind: "main" },
  { file: "guide/images/03-create-identity.png", kind: "identity-create" },
  { file: "guide/images/03-identity-created.png", kind: "status" },
  { file: "guide/images/10-status-annotated.png", kind: "status-annotated" },
  { file: "guide/images/03-show-my-identity.png", kind: "identity-show" },
  { file: "guide/images/03-recovery-words.png", kind: "identity-recovery" },
  { file: "guide/images/04-tcp-connected.png", kind: "tcp-connected" },
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
  {
    file: "authors/images/03-publisher-recovery.png",
    kind: "identity-recovery",
  },
  {
    file: "authors/images/05-capability-review.png",
    kind: "capability-review",
  },
  { file: "authors/images/06-runtime-storage.png", kind: "runtime" },
  { file: "authors/images/08-host-confirmation.png", kind: "publish-confirm" },
  { file: "authors/images/11-runtime-controls.png", kind: "runtime" },
  { file: "authors/images/02-preview-grants.png", kind: "preview-grants" },
  { file: "authors/images/04-render-rejection.png", kind: "render-rejection" },
  { file: "cookbook/images/01-dev-install.png", kind: "dev-install" },
  {
    file: "cookbook/images/01-capability-review.png",
    kind: "net-ledger-review",
  },
  { file: "cookbook/images/08-host-confirmation.png", kind: "publish-confirm" },
  { file: "guide/images/03-reset-confirmation.png", kind: "identity-reset" },
  { file: "guide/images/04-announce-browser.png", kind: "announce-browser" },
  { file: "guide/images/04-local-discovery.png", kind: "local-discovery" },
  { file: "guide/images/05-slow-install-warning.png", kind: "slow-install" },
  { file: "guide/images/06-update-available.png", kind: "update-available" },
  { file: "guide/images/09-storage.png", kind: "storage" },
  { file: "guide/images/10-stalled-transfer.png", kind: "stalled-transfer" },
  { file: "authors/images/07-announce-peers.png", kind: "announce-peers" },
  {
    file: "authors/images/10-update-available.png",
    kind: "author-update-available",
  },
  {
    file: "authors/images/12-slow-install-warning.png",
    kind: "slow-install-rnode",
  },
  { file: "authors/images/13-package-summary.png", kind: "package-summary" },
];

const browser = await chromium.launch();
const chromeScenes =
  captureSection === "authors"
    ? scenes.filter((scene) => scene.file.startsWith("authors/"))
    : captureSection === "guide"
      ? scenes.filter((scene) => scene.file.startsWith("guide/"))
      : scenes;
try {
  for (const scene of captureFiles !== undefined
    ? scenes.filter((candidate) => captureFiles.includes(candidate.file))
    : captureScenes === undefined
      ? captureSection === "all" ||
        captureSection === "guide" ||
        captureSection === "authors"
        ? chromeScenes
        : []
      : scenes.filter((candidate) => captureScenes.includes(candidate.kind))) {
    const output = join(repoRoot, scene.file);
    mkdirSync(dirname(output), { recursive: true });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    await page.goto(`file://${rendererHtml}`, { waitUntil: "load" });
    await page.evaluate(
      ({ kind, fakeIdentity, fakeHash }) => {
        const panels = [...document.querySelectorAll("main > .panel")];
        const show = (...titles) => {
          for (const candidate of panels) {
            candidate.hidden = !titles.includes(
              candidate.querySelector("h2")?.textContent ?? "",
            );
          }
        };
        const html = (selector, value) => {
          const element = document.querySelector(selector);
          if (element) element.innerHTML = value;
        };
        const status = (identity = true) =>
          html(
            "#status-grid",
            `
        <dt>Running</dt><dd>yes</dd>
        <dt>Identity</dt><dd>${identity ? `${fakeHash.slice(0, 16)}…${fakeHash.slice(-8)}` : "Not created"}</dd>
        <dt>Transport</dt><dd>enabled</dd>
        <dt>Online interfaces</dt><dd>2</dd>
        <dt>Catalog entries</dt><dd>3</dd>
        <dt>Installed</dt><dd>3</dd>`,
          );
        const catalog = () =>
          html(
            "#catalog-list",
            `
        <li class="item-row"><strong>Handbook</strong><span class="muted">v0.5.0 · TwistedPear</span><button>Install</button></li>
        <li class="item-row"><strong>Chat</strong><span class="muted">v0.3.0 · Example publisher</span><button>Install</button></li>
        <li class="item-row"><strong>File drop</strong><span class="muted">v0.2.0 · Example publisher</span><button>Install</button></li>`,
          );
        const installed = (dev = false) =>
          html(
            "#installed-list",
            `
        <li class="item-row"><strong>${dev ? "Unit converter" : "Handbook"}</strong>${dev ? " <strong>DEV</strong>" : ""}<span class="muted">v0.1.0</span><button>Open</button><button>Remove</button></li>
        ${dev ? "" : '<li class="item-row"><strong>Chat</strong><span class="muted">v0.3.0</span><button>Open</button><button>Remove</button></li>'}`,
          );
        const modal = (title, rows, capabilities = []) => {
          html(
            "#host-modal",
            `<h3>${title}</h3><p class="fingerprint">Publisher key: demo-publisher-7f3a1c9e…</p>${rows.map(([label, value]) => `<p><span class="muted">${label}:</span> ${value}</p>`).join("")}${capabilities.map((item, index) => `<label class="grant-row"><input type="checkbox" ${index === capabilities.length - 1 ? "" : "checked"}><span>${item}</span></label>`).join("")}<div class="modal-actions"><button>Cancel</button><button class="primary">Approve</button></div>`,
          );
          document.querySelector("#host-modal-overlay").hidden = false;
        };

        document.body.classList.remove("miniapp-running");
        document.querySelector("header h1").textContent = "TwistedPear Host";
        document.querySelector("#subtitle").textContent =
          "Desktop always-on peer · Documentation identity";
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
            document.querySelector("#identity-result").textContent =
              "No host identity yet. Choose a passphrase to create one.";
            break;
          case "identity-show": {
            show("Trusted publishers");
            const qr = globalThis.qrcode(0, "M");
            qr.addData(fakeIdentity);
            qr.make();
            html(
              "#trust-identity-view",
              `<h3>My identity</h3><div style="background:white;padding:12px;width:max-content">${qr.createSvgTag(5, 0)}</div><p class="fingerprint" style="max-width:56rem;word-break:break-all">${fakeIdentity}</p>`,
            );
            break;
          }
          case "identity-recovery":
            show("Identity backup");
            document.querySelector("#identity-result").textContent =
              "Recovery words revealed. Store both labelled groups offline.";
            document.querySelector("#identity-words-first").value =
              "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual";
            document.querySelector("#identity-words-second").value =
              "adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album";
            break;
          case "tcp-connected":
            show("Relay & Interfaces");
            document.querySelector("#setting-tcp").checked = true;
            document.querySelector("#setting-auto").checked = true;
            html(
              "#relay-interface-table",
              `<p>tcp: online · BOTH · 1250000 bps · ↓12.4 KiB ↑3.1 KiB</p><p>auto: online · BOTH · — bps · ↓2.0 KiB ↑1.1 KiB</p>`,
            );
            break;
          case "status-annotated":
            show("Node status");
            html(
              "#status-grid",
              `
        <dt>Running</dt><dd>true</dd>
        <dt>Identity</dt><dd>${fakeHash.slice(0, 16)}…${fakeHash.slice(-8)}</dd>
        <dt>Transport</dt><dd>true</dd>
        <dt>Link online</dt><dd>true</dd>
        <dt>Online interfaces</dt><dd>2</dd>
        <dt>Announces</dt><dd>41</dd>
        <dt>Preferred</dt><dd>tcp</dd>
        <dt>Propagation</dt><dd>false</dd>
        <dt>Catalog</dt><dd>3</dd>
        <dt>Installed</dt><dd>3</dd>`,
            );
            {
              const panel = document.querySelector(
                "main > .panel:not([hidden])",
              );
              const notes = document.createElement("ol");
              notes.style.marginTop = "18px";
              notes.style.lineHeight = "1.55";
              notes.innerHTML = `
                <li><strong>Running</strong> — worklet is up. Healthy: true.</li>
                <li><strong>Identity</strong> — this host's destination hash exists.</li>
                <li><strong>Link online</strong> — at least one path is live.</li>
                <li><strong>Online interfaces</strong> — TCP and Auto both up.</li>
                <li><strong>Announces</strong> — counter climbs while peers are reachable.</li>
                <li><strong>Propagation</strong> — false unless you opted into holding mail.</li>`;
              panel?.append(notes);
            }
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
            html(
              "#trust-list",
              `<li class="item-row"><strong>Example publisher</strong><span class="muted">demo-publisher-7f3a1c9e…</span><button>Remove</button></li>`,
            );
            break;
          case "grants":
            show("Grants");
            html(
              "#grants-panel",
              `<h3>Chat</h3><label class="grant-row"><input type="checkbox" checked> identity — use an app-scoped address</label><label class="grant-row"><input type="checkbox" checked> lxmf:send — send messages</label><label class="grant-row"><input type="checkbox" checked> lxmf:receive — receive messages</label>`,
            );
            break;
          case "runtime":
            show("Runtime controls");
            document.querySelector("#limits-app").textContent =
              "Handbook · running · 38 broker messages";
            document.querySelector("#limit-rate").value = "50";
            document.querySelector("#limit-kv").value = "1048576";
            document.querySelector("#limit-memory").value = "67108864";
            document.querySelector("#limits-note").textContent =
              "KV used: 18,432 bytes · memory limit applies on next launch";
            break;
          case "roles":
            show("Settings");
            document.querySelector("#setting-propagation").checked = true;
            document.querySelector("#setting-developer").checked = false;
            break;
          case "safety":
            show("Safety");
            document.querySelector("#moderation-source").value = fakeHash;
            document.querySelector("#moderation-label").value =
              "Repeated spam sender";
            document.querySelector("#moderation-reason").value = "spam";
            document.querySelector("#moderation-note").value =
              "Repeated unsolicited catalog messages.";
            html(
              "#moderation-blocked",
              `<li class="item-row"><strong>Repeated spam sender</strong><span class="muted">${fakeHash}</span></li>`,
            );
            html(
              "#moderation-muted",
              '<li class="muted">No muted senders</li>',
            );
            document.querySelector("#moderation-summary").textContent =
              "1 blocked · 0 muted · 1 local report";
            break;
          case "devstudio-review":
            show("Catalog");
            modal(
              "Install DevStudio?",
              [
                ["Version", "0.1.0"],
                ["Package size", "84 KiB"],
              ],
              [
                "workspace — edit project files",
                "apps:preview — run a live preview",
                "apps:package — sign packages",
                "ai:chat — request model-assisted edits",
              ],
            );
            break;
          case "capability-review":
            show("Catalog");
            modal(
              "Review capabilities",
              [["App", "Field log"]],
              [
                "storage:kv — save local observations",
                "announce:subscribe — discover nearby peers",
                "presence — read interface status",
              ],
            );
            break;
          case "publish-confirm":
            show("Installed");
            modal("Publish package?", [
              ["App", "Sticker mill"],
              ["Version", "0.1.0"],
              ["Size", "37 KiB"],
              ["Action", "Sign and announce from this host"],
            ]);
            break;
          case "send-confirm":
            show("Installed");
            modal("Allow Chat to send?", [
              ["Destination", "demo-peer-42b68d05…"],
              ["Payload", "18 bytes"],
            ]);
            break;
          case "untrusted-review":
            show("Catalog");
            modal(
              "Install from an untrusted publisher?",
              [
                ["App", "Trail notes"],
                ["Trust", "Publisher is not in your trusted list"],
              ],
              [
                "storage:kv — save notes locally",
                "presence — read connection status",
              ],
            );
            break;
          case "preview-grants":
            show("Installed");
            modal(
              "Run hello-app in the preview slot?",
              [
                ["Requesting app", "DevStudio"],
                ["Publisher", "demo-publisher-7f3a1c9e…"],
                [
                  "Note",
                  "Grants must be a subset of the app's declared capabilities.",
                ],
              ],
              [
                "storage:kv — Store local data",
                "lxmf:send — Send messages",
              ],
            );
            break;
          case "render-rejection":
            show("Mini-app", "Log");
            document.querySelector("#miniapp-title").textContent = "Board";
            html(
              "#widget-root",
              `<p style="font-size:20px;font-weight:700;margin:0 0 8px">Board</p><p>2 local post(s), 2 announce(s) on board</p><button>Publish post</button><button>Refresh board</button>`,
            );
            document.querySelector("#log").textContent =
              `WidgetValidationError: unknown component type "table" at node "results-table"\nrender rejected — previous tree retained`;
            break;
          case "dev-install":
            show("Installed");
            installed(true);
            break;
          case "net-ledger-review":
            show("Catalog");
            modal(
              "Install Net ledger?",
              [["Version", "0.1.0"]],
              [
                "identity — use an app-scoped address",
                "lxmf:send — send check-ins",
                "lxmf:receive — receive check-ins",
                "storage:kv — hold the outbox",
              ],
            );
            break;
          case "identity-reset":
            show("Identity backup");
            modal("Reset identity?", [
              [
                "Warning",
                "The current address will be unreachable forever. Installed apps' data will be orphaned.",
              ],
            ]);
            html(
              "#host-modal",
              `<h3>Reset identity?</h3><p>The current address will be unreachable forever. Installed apps' data will be orphaned.</p><label class="grant-row"><input type="checkbox"><span>I have a backup or do not need this identity</span></label><div class="modal-actions"><button>Cancel</button><button disabled>Reset</button></div>`,
            );
            document.querySelector("#host-modal-overlay").hidden = false;
            break;
          case "announce-browser": {
            show("Catalog");
            const visible = panels.find((panel) => !panel.hidden);
            const heading = visible?.querySelector("h2");
            if (heading) heading.textContent = "Announce browser";
            html(
              "#catalog-list",
              `<li class="item-row"><strong>bd91…c4e2</strong><span class="muted">seen 3s ago · Chat</span></li><li class="item-row"><strong>7f3a…8d05</strong><span class="muted">seen 11s ago · Handbook</span></li><li class="item-row"><strong>a2c4…9f1b</strong><span class="muted">seen 42s ago · File drop</span></li><li class="item-row"><strong>e6g8…3q5t</strong><span class="muted">seen 2m ago · Board</span></li>`,
            );
            break;
          }
          case "local-discovery": {
            show("Catalog");
            const visible = panels.find((panel) => !panel.hidden);
            const heading = visible?.querySelector("h2");
            if (heading) heading.textContent = "Announce browser";
            html(
              "#catalog-list",
              `<li class="item-row"><strong>ana-desktop · 7f3a…8d05</strong><span class="muted">local network · seen 3s ago</span></li><li class="item-row"><strong>workshop-node · bd91…c4e2</strong><span class="muted">local network · seen 8s ago</span></li>`,
            );
            break;
          }
          case "slow-install":
            show("Catalog");
            modal("This download is 340 KiB", [
              ["Interface", "Bluetooth"],
              ["Estimate", "about 2 minutes"],
            ]);
            html(
              "#host-modal",
              `<h3>This will take a while.</h3><p>This download is 340 KiB. Over your current Bluetooth link that will take about 2 minutes. Continue?</p><p class="muted">Interface: Bluetooth</p><div class="modal-actions"><button>Cancel</button><button class="primary">Continue</button></div>`,
            );
            document.querySelector("#host-modal-overlay").hidden = false;
            break;
          case "slow-install-rnode":
            show("Catalog");
            html(
              "#host-modal",
              `<h3>This will take a while.</h3><p>Board 1.2.0 is 41 KiB. Your only connection is an RNode radio at about 1.2 kbit/s. Estimated transfer: 4 minutes 40 seconds.</p><p class="muted">Automatic bulk transfer is disabled above 64 KiB on this link.</p><div class="modal-actions"><button>Cancel</button><button class="primary">Continue anyway</button></div>`,
            );
            document.querySelector("#host-modal-overlay").hidden = false;
            break;
          case "update-available":
            show("Installed");
            html(
              "#installed-list",
              `<li class="item-row"><strong>Chat</strong><span class="muted">1.2.0 installed · 1.3.0 available</span><button>Update</button><button>Launch</button></li><p class="muted">Newly requested: announce:subscribe — discover nearby peers</p>`,
            );
            break;
          case "author-update-available":
            show("Installed");
            html(
              "#installed-list",
              `<li class="item-row"><strong>Board 1.1.0</strong><span class="muted">1.2.0 available</span><button>Update</button><button>Rollback to 1.0.0</button><button>Launch</button></li><p>demo-publisher-7f3a1c9e… · Trusted · 18 KiB</p><p class="muted">Signed by the same publisher — your permissions carry over.</p><p class="muted">The running app keeps version 1.1.0 until it is restarted.</p>`,
            );
            break;
          case "storage": {
            show("Settings");
            const visible = panels.find((panel) => !panel.hidden);
            const heading = visible?.querySelector("h2");
            if (heading) heading.textContent = "Storage";
            html(
              ".settings-grid",
              `<p>Installed apps 42 MiB · App data 18 MiB · Seeded packages 96 MiB · Held messages 4 MiB · Free 840 MiB</p><div style="display:flex;height:18px;border-radius:6px;overflow:hidden;margin:12px 0;border:1px solid #33475a"><span style="flex:42;background:#5b8def"></span><span style="flex:18;background:#7ee787"></span><span style="flex:96;background:#d4a017"></span><span style="flex:4;background:#f0883e"></span><span style="flex:84;background:#1f2d3a"></span></div><table style="width:100%;border-collapse:collapse"><tr><td>Installed apps</td><td>42 MiB</td></tr><tr><td>App data</td><td>18 MiB</td></tr><tr><td>Seeded packages</td><td>96 MiB</td></tr><tr><td>Held messages</td><td>4 MiB</td></tr><tr><td>Free</td><td>840 MiB</td></tr></table><div class="item-row" style="margin-top:16px"><button>Clear seeded packages</button></div><p class="muted">Clearing seeded packages only removes copies held for other people.</p>`,
            );
            break;
          }
          case "stalled-transfer":
            show("Catalog");
            html(
              "#catalog-list",
              `<li class="item-row"><strong>Board 1.2.0</strong><span class="muted">Installing · Bluetooth</span></li><p>████████░░░░░░░░ 41%</p><p class="muted">0 B/s · stalled</p><div class="item-row"><button>Cancel</button></div>`,
            );
            break;
          case "announce-peers":
            show("Mini-app");
            document.body.classList.add("miniapp-running");
            document.querySelector("#miniapp-title").textContent = "Board";
            html(
              "#widget-root",
              `<p>4 peers announcing · publishing as bd91…</p><ul class="item-list"><li class="item-row"><code>ana-desk · 7f3a…8d05</code><span class="muted">heard 2 min ago · 3 posts</span></li><li class="item-row"><code>workshop · a2c4…9f1b</code><span class="muted">heard 2 min ago · 1 post</span></li><li class="item-row"><code>field-n3 · e6g8…3q5t</code><span class="muted">heard 4 min ago · 0 posts</span></li><li class="item-row" style="opacity:.55"><code>old-node · 11aa…22bb</code><span class="muted">not heard in 20 min</span></li></ul><button>Refresh</button>`,
            );
            break;
          case "package-summary":
            show("Installed");
            html(
              "#host-modal",
              `<h3>Publish hello-app 0.1.0?</h3><p>Package size: 2.6 KiB · Files: 1 · Capabilities: 4 · minHostApi: 0.1.0</p><p>Signed by: demo-publisher-7f3a1c9e…</p><p>Est. install over LoRa: 18 s</p><p>identity — use an app-scoped address<br>storage:kv — save notes locally<br>announce:publish — show this app nearby<br>announce:subscribe — list nearby apps</p><p class="muted">Publishing is permanent. This version cannot be withdrawn.</p><div class="modal-actions"><button>Back</button><button class="primary">Publish</button></div>`,
            );
            document.querySelector("#host-modal-overlay").hidden = false;
            break;
        }

        // Documentation captures use the actual dark host theme and a fixed, uncluttered viewport.
        document.documentElement.style.background = "#0f1419";
        const visiblePanels = panels.filter((candidate) => !candidate.hidden);
        if (visiblePanels.length === 1)
          visiblePanels[0].style.minHeight = "610px";
      },
      { kind: scene.kind, fakeIdentity, fakeHash },
    );
    await page.screenshot({ path: output, fullPage: false });
    await page.close();
    console.log(`reader-guide capture written to ${output}`);
  }

  if (
    (captureSection === "all" || captureSection === "guide") &&
    captureScenes === undefined &&
    captureFiles === undefined
  ) {
    const webHostRoot = join(repoRoot, "dist/web-host");
    const webHostOutput = join(repoRoot, "guide/images/02-web-host-tab.png");
    mkdirSync(dirname(webHostOutput), { recursive: true });
    const staticServer = await startStaticServer(webHostRoot);
    const webPage = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    try {
      await webPage.goto(staticServer.url, { waitUntil: "load" });
      await webPage
        .getByText("Web leaf host")
        .first()
        .waitFor({ timeout: 15_000 });
      await webPage.screenshot({ path: webHostOutput, fullPage: false });

      const gatewayOutput = join(repoRoot, "guide/images/04-web-gateway.png");
      await webPage.evaluate(() => {
        for (const node of document.querySelectorAll("div, span, p")) {
          if (node.childElementCount === 0 && node.textContent?.startsWith("Gateway:")) {
            node.textContent = "Gateway: wss://tp-demo.example:9474";
          }
          if (node.childElementCount === 0 && node.textContent?.startsWith("Gateway link:")) {
            node.textContent = "Gateway link: online";
          }
        }
      });
      await webPage.screenshot({ path: gatewayOutput, fullPage: false });
      console.log(`reader-guide capture written to ${gatewayOutput}`);
    } finally {
      await webPage.close();
      await staticServer.close();
    }
    console.log(`reader-guide capture written to ${webHostOutput}`);
  }

  if (
    (captureSection === "all" || captureSection === "guide") &&
    captureScenes === undefined &&
    captureFiles === undefined
  ) {
    await captureComposite(browser, {
      file: "guide/images/07-delivery-states.png",
      title: "Delivery states",
      subtitle: "Four consecutive Chat messages, four LXMF outcomes",
      columns: 2,
      tiles: [
        {
          label: "sending · delivered",
          html: "to ana-desk · 7f3a…8d05\n\nhello — sending…\nhello — delivered ✓",
        },
        {
          label: "held · failed",
          html: "to workshop · bd91…c4e2\n\nstatus ping — held for delivery ⏳\n  a propagation server is holding it\nhello — failed — no route\n  [Retry]",
        },
      ],
    });
    await captureComposite(browser, {
      file: "guide/images/09-tp-node.png",
      title: "tp node",
      subtitle: "Headless node startup beside the localhost status endpoint",
      columns: 2,
      tiles: [
        {
          label: "terminal",
          html: `$ tp node --propagation --status-endpoint\nidentity  7f3a1c9e…42b68d05\nroles     transport · seeder · propagation\ninterfaces  auto online · tcp online\nannounce  destination bd91c4e2 seen via auto\nstatus    http://127.0.0.1:9473/status`,
        },
        {
          label: "127.0.0.1:9473/status",
          html: `{
  "running": true,
  "identity": "7f3a1c9e…42b68d05",
  "transport": true,
  "propagation": true,
  "onlineInterfaces": ["auto", "tcp"],
  "announces": 41
}`,
        },
      ],
    });
  }
  if (captureScenes === undefined && captureFiles === undefined) {
    await runDiagramCaptures(browser, captureSection);
    await runExampleAppCaptures(browser, captureSection);
    await runCookbookCaptures(browser, captureSection);
    await runAuthorCaptures(browser, captureSection);
  }
} finally {
  await browser.close();
}

process.exit(0);
