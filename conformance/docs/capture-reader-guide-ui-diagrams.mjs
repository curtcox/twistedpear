/**
 * Author the reader-guide diagrams whose captions ask for a diagram, not a UI capture.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "./capture-reader-guide-ui-lib.mjs";

const diagrams = [
  {
    file: "guide/images/01-mental-model.png",
    title: "The mental model",
    subtitle:
      "Mini-apps run inside your host. Everything they do crosses the host.",
    body: `
      <div class="host">
        <div class="host-label">Your host</div>
        <div class="apps">
          <div class="app">Chat</div>
          <div class="app">File drop</div>
          <div class="app">Handbook</div>
        </div>
        <div class="gate">everything crosses here</div>
      </div>
      <div class="peers">
        <div class="peer">Ana's phone</div>
        <div class="peer">Community desktop node</div>
      </div>`,
  },
  {
    file: "guide/images/08-sandbox-boundary.png",
    title: "What an app can and cannot reach",
    subtitle: "One doorway. Direct access to the rest of the device is closed.",
    body: `
      <div class="sandbox">
        <div class="app tall">Mini-app</div>
        <div class="gate">your grants</div>
        <div class="host-box">Host</div>
      </div>
      <div class="blocked">
        <div class="no">files</div>
        <div class="no">network</div>
        <div class="no">camera</div>
        <div class="no">other apps' data</div>
      </div>`,
  },
  {
    file: "authors/images/01-architecture.png",
    title: "Where your code sits",
    subtitle: "bundle.js inside a Bare Worker. The broker is the only doorway.",
    body: `
      <div class="stack">
        <div class="app">Your mini-app (bundle.js)</div>
        <div class="sandbox-ring">Sandbox — Bare Worker</div>
        <div class="gate">Broker (the only doorway)</div>
        <div class="services">
          <span>Identity</span><span>LXMF</span><span>Announce</span>
          <span>Storage</span><span>Resource</span><span>Presence</span>
          <span>Workspace</span><span>AI</span><span>Apps</span><span>Share</span>
        </div>
        <div class="network">Reticulum network stack · Hyperdrive</div>
      </div>
      <div class="blocked">
        <div class="no">fs</div>
        <div class="no">net</div>
        <div class="no">require</div>
        <div class="no">Bare APIs</div>
      </div>`,
  },
];

export async function runDiagramCaptures(browser, captureSection) {
  if (captureSection !== "all" && captureSection !== "guide") {
    if (captureSection !== "authors") return;
  }
  const wanted =
    captureSection === "authors"
      ? diagrams.filter((diagram) => diagram.file.startsWith("authors/"))
      : captureSection === "guide"
        ? diagrams.filter((diagram) => diagram.file.startsWith("guide/"))
        : diagrams;

  for (const diagram of wanted) {
    const output = join(repoRoot, diagram.file);
    mkdirSync(dirname(output), { recursive: true });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    try {
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>
        *{box-sizing:border-box}
        body{margin:0;background:#f6f8fa;color:#1f2328;font:16px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:36px 48px}
        h1{margin:0 0 8px;font-size:32px}
        .subtitle{color:#656d76;margin-bottom:28px}
        .host,.sandbox,.stack{background:#fff;border:1.5px solid #d0d7de;border-radius:14px;padding:20px 24px}
        .host-label,.sandbox-ring,.network{font-weight:700;margin-bottom:12px}
        .apps,.services,.blocked,.peers{display:flex;gap:12px;flex-wrap:wrap}
        .app,.peer,.host-box{background:#ddf4ff;border:1px solid #54aeff66;border-radius:10px;padding:18px 22px;font-weight:600;min-width:140px;text-align:center}
        .app.tall{min-height:120px;display:flex;align-items:center;justify-content:center}
        .gate{margin:16px 0;padding:10px;border:1.5px dashed #0969da;border-radius:8px;color:#0969da;font-weight:700;text-align:center}
        .peers{margin-top:22px}
        .peer{background:#dafbe1;border-color:#1a7f3766}
        .no{background:#ffebe9;border:1px solid #ff818266;color:#cf222e;border-radius:10px;padding:14px 18px;font-weight:700;text-decoration:line-through}
        .sandbox,.layout{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}
        .blocked{flex-direction:column;width:220px}
        .services span{background:#f0f3f6;border:1px solid #d0d7de;border-radius:8px;padding:8px 10px;font-size:13px}
        .layout{display:flex;gap:28px;align-items:flex-start}
        .stack .app{margin-bottom:12px}
      </style>
      <h1>${diagram.title}</h1>
      <p class="subtitle">${diagram.subtitle}</p>
      <div class="layout">${diagram.body}</div>`);
      await page.screenshot({ path: output, fullPage: false });
    } finally {
      await page.close();
    }
    console.log(`reader-guide diagram written to ${output}`);
  }
}
