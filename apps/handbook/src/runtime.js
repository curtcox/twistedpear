import {
  ai,
  apps,
  announce,
  host,
  identity,
  lxmf,
  presence,
  resource,
  share,
  storage,
  ui,
  workspace
} from "@twistedpear/miniapp-sdk";

// Handbook runtime — TOC, chapter renderer, inline applet runner, diagnostics.
// CATALOG is injected by build.mjs immediately above this file in bundle.js.

const POSITION_KEY = "handbook:position";
const SEEDED_KEY = "handbook:seeded";
const SEED_VERSION_KEY = "handbook:seed-version";
const LAST_REPORT_KEY = "handbook:last-report";
const REPORT_SCHEMA_VERSION = 1;

/** @type {"toc" | "chapter" | "diagnostics"} */
let view = "toc";
/** @type {string | null} */
let chapterId = null;
/** @type {Record<string, { status: string, details: string, timings?: { ms: number } }>} */
let appletResults = {};
/** @type {string | null} */
let statusLine = null;
/** @type {boolean} */
let seeding = false;
/** @type {boolean} */
let runningAll = false;
/** @type {{ reportId: string | null, generatedAt: string | null, json: string | null }} */
let exportState = { reportId: null, generatedAt: null, json: null };
/** @type {string} */
let compareInput = "";
/** @type {{ local: object | null, remote: object | null, rows: Array<object>, error: string | null }} */
let compareState = { local: null, remote: null, rows: [], error: null };

function makeSdk() {
  return {
    identity,
    presence,
    host,
    announce,
    lxmf,
    storage,
    resource,
    workspace,
    ui,
    share,
    apps,
    ai
  };
}

function findChapter(id) {
  return CATALOG.chapters.find((chapter) => chapter.id === id) ?? null;
}

function findApplet(id) {
  return CATALOG.applets.find((applet) => applet.id === id) ?? null;
}

async function kvGetText(key) {
  const bytes = await storage.kv.get(key);
  if (bytes === null) {
    return null;
  }
  return new TextDecoder().decode(bytes);
}

async function kvSetText(key, value) {
  await storage.kv.set(key, new TextEncoder().encode(value));
}

async function ensureSeeds() {
  const version = await kvGetText(SEED_VERSION_KEY);
  const seeded = await kvGetText(SEEDED_KEY);
  if (seeded === "1" && version === CATALOG.version) {
    return;
  }

  seeding = true;
  try {
    for (const seed of CATALOG.seeds) {
      await workspace.write(seed.path, seed.content);
    }
    await kvSetText(SEEDED_KEY, "1");
    await kvSetText(SEED_VERSION_KEY, CATALOG.version);
  } finally {
    seeding = false;
  }
}

function widgetButton(id, label, event) {
  return { id, type: "button", props: { label, event } };
}

function textNode(id, value, style) {
  const node = { id, type: "text", props: { value } };
  if (style !== undefined) {
    node.style = style;
  }
  return node;
}

function headingStyle(level) {
  if (level === 1) {
    return { fontSize: 24, fontWeight: "bold" };
  }
  if (level === 2) {
    return { fontSize: 20, fontWeight: "bold" };
  }
  return { fontSize: 16, fontWeight: "bold" };
}

function resultCard(appletId, result) {
  if (result === undefined) {
    return textNode(`result-${appletId}-empty`, "Not run yet.");
  }

  const label = result.status.toUpperCase();
  const timing =
    result.timings && typeof result.timings.ms === "number" ? ` (${result.timings.ms} ms)` : "";
  return textNode(
    `result-${appletId}`,
    `${label}${timing}\n${result.details}`
  );
}

function explainStatus(status) {
  if (status === "not-granted") {
    return "This capability was withheld for this app. Grant it at install to run the probe.";
  }
  if (status === "unavailable") {
    return "This host does not implement the feature; that is an expected platform difference.";
  }
  if (status === "skipped") {
    return "Skipped.";
  }
  return null;
}

function renderAppletBlock(appletId, children) {
  const applet = findApplet(appletId);
  if (applet === null) {
    children.push(textNode(`missing-${appletId}`, `Missing applet: ${appletId}`));
    return;
  }

  children.push({ id: `applet-sep-${appletId}`, type: "divider" });
  children.push(
    textNode(`applet-title-${appletId}`, `Applet: ${applet.title}`, {
      fontSize: 16,
      fontWeight: "bold"
    })
  );
  children.push(
    textNode(
      `applet-caps-${appletId}`,
      `Requires: ${applet.capabilities.join(", ")}`
    )
  );
  children.push({
    id: `applet-src-${appletId}`,
    type: "code-editor",
    props: {
      documentId: `applets/${appletId}/main.js`,
      language: "javascript",
      readOnly: true
    }
  });
  children.push(
    widgetButton(`applet-run-${appletId}`, "Run applet", "hb.runapplet")
  );

  const result = appletResults[appletId];
  children.push(resultCard(appletId, result));
  if (result !== undefined) {
    const explanation = explainStatus(result.status);
    if (explanation !== null) {
      children.push(textNode(`applet-explain-${appletId}`, explanation));
    }
  }
}

function renderChapterBlocks(chapter, children) {
  let blockIndex = 0;
  for (const block of chapter.blocks) {
    const bid = `${chapter.id}-b${blockIndex++}`;
    if (block.type === "heading") {
      children.push(textNode(bid, block.text, headingStyle(block.level)));
      continue;
    }
    if (block.type === "paragraph") {
      children.push(textNode(bid, block.text));
      continue;
    }
    if (block.type === "list") {
      for (let i = 0; i < block.items.length; i += 1) {
        children.push(textNode(`${bid}-i${i}`, `• ${block.items[i]}`));
      }
      continue;
    }
    if (block.type === "code") {
      children.push({
        id: bid,
        type: "code-editor",
        props: {
          documentId: block.documentId,
          language: block.language,
          readOnly: true
        }
      });
      continue;
    }
    if (block.type === "chapter-link") {
      children.push(
        widgetButton(`link-${block.chapterId}-${bid}`, `→ ${block.label}`, "hb.openchapter")
      );
      continue;
    }
    if (block.type === "applet") {
      renderAppletBlock(block.appletId, children);
    }
  }
}

async function fetchHostInfoSafe() {
  try {
    return await host.info();
  } catch (error) {
    return {
      platform: "unknown",
      hostVersion: "unknown",
      hostApiVersion: "unknown",
      roles: { transport: false, seeder: false, propagation: false },
      interfaceTypes: [],
      quotas: {
        kvQuotaBytes: null,
        seedStorageUsedBytes: null,
        seedStorageQuotaBytes: null,
        memoryBytes: null
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function buildReportDocument(hostInfo) {
  const results = CATALOG.applets.map((applet) => {
    const result = appletResults[applet.id];
    if (result === undefined) {
      return {
        appletId: applet.id,
        status: "skipped",
        details: "Not run",
        timings: { ms: 0 }
      };
    }
    return {
      appletId: applet.id,
      status: result.status,
      details: result.details,
      timings: result.timings ?? { ms: 0 }
    };
  });

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    handbookVersion: CATALOG.version,
    generatedAt: new Date().toISOString(),
    host: hostInfo,
    results
  };
}

function diffReports(localReport, remoteReport) {
  const remoteById = new Map(
    (remoteReport.results ?? []).map((row) => [row.appletId, row])
  );
  const rows = [];
  for (const local of localReport.results ?? []) {
    const remote = remoteById.get(local.appletId);
    rows.push({
      appletId: local.appletId,
      local: local.status,
      remote: remote?.status ?? "missing",
      same: remote !== undefined && remote.status === local.status
    });
  }
  return rows;
}

function renderDiagnostics(children) {
  children.push(widgetButton("back-toc-diag", "← Contents", "hb.toc"));
  children.push({ id: "diag-sep", type: "divider" });
  children.push(textNode("diag-title", "Diagnostics", { fontSize: 20, fontWeight: "bold" }));
  children.push(
    textNode(
      "diag-blurb",
      "Run every applet on this host, export a shareable report, or paste another report’s 256t id to compare."
    )
  );

  children.push(
    widgetButton(
      "diag-run-all",
      runningAll ? "Running all…" : "Run all diagnostics",
      "hb.runall"
    )
  );

  const counts = { pass: 0, fail: 0, unavailable: 0, "not-granted": 0, skipped: 0 };
  for (const applet of CATALOG.applets) {
    const result = appletResults[applet.id];
    const status = result?.status ?? "skipped";
    if (counts[status] !== undefined) {
      counts[status] += 1;
    }
    children.push(
      textNode(
        `diag-row-${applet.id}`,
        `${applet.id}: ${(result?.status ?? "skipped").toUpperCase()}`
      )
    );
  }
  children.push(
    textNode(
      "diag-summary",
      `Summary — pass ${counts.pass}, fail ${counts.fail}, unavailable ${counts.unavailable}, not-granted ${counts["not-granted"]}, skipped ${counts.skipped}`
    )
  );

  children.push({ id: "diag-export-sep", type: "divider" });
  children.push(widgetButton("diag-export", "Export report (share.put)", "hb.export"));
  if (exportState.reportId !== null) {
    children.push(
      textNode(
        "diag-export-meta",
        `Exported ${exportState.generatedAt ?? ""}\n${exportState.reportId}`
      )
    );
    children.push({
      id: "diag-export-qr",
      type: "qr-code",
      props: {
        value: exportState.reportId,
        caption: "Scan or copy report 256t id"
      }
    });
  }

  children.push({ id: "diag-compare-sep", type: "divider" });
  children.push(textNode("diag-compare-label", "Compare with remote report id:"));
  children.push({
    id: "diag-compare-input",
    type: "text-input",
    props: {
      value: compareInput,
      placeholder: "Paste 256t id",
      event: "hb.compare.input"
    }
  });
  children.push(widgetButton("diag-compare", "Compare report", "hb.compare"));

  if (compareState.error !== null) {
    children.push(textNode("diag-compare-error", compareState.error));
  }
  if (compareState.rows.length > 0) {
    const localPlat = compareState.local?.host?.platform ?? "?";
    const remotePlat = compareState.remote?.host?.platform ?? "?";
    children.push(
      textNode(
        "diag-compare-hosts",
        `Local host: ${localPlat}  ·  Remote host: ${remotePlat}`
      )
    );
    for (const row of compareState.rows) {
      const mark = row.same ? "=" : "≠";
      children.push(
        textNode(
          `diag-diff-${row.appletId}`,
          `${mark} ${row.appletId}: ${row.local} / ${row.remote}`
        )
      );
    }
  }
}

async function render() {
  const children = [
    textNode("brand", CATALOG.title, { fontSize: 24, fontWeight: "bold" })
  ];

  if (statusLine !== null) {
    children.push(textNode("status", statusLine));
  }

  if (seeding) {
    children.push(textNode("seeding", "Seeding documentation workspace…"));
  }

  if (view === "toc") {
    children.push(textNode("toc-heading", "Contents", { fontSize: 20, fontWeight: "bold" }));
    children.push(
      textNode(
        "toc-blurb",
        "Interactive diagnostic documentation. Open a chapter, then run embedded applets on this host."
      )
    );
    children.push(widgetButton("open-diag", "Diagnostics · run all / export / compare", "hb.diagnostics"));

    for (const part of CATALOG.parts) {
      children.push({ id: `part-sep-${part.id}`, type: "divider" });
      children.push(textNode(`part-${part.id}`, part.title, { fontSize: 16, fontWeight: "bold" }));
      for (const chapter of part.chapters) {
        const marker = chapterId === chapter.id ? "▶ " : "";
        children.push(
          widgetButton(`ch-${chapter.id}`, `${marker}${chapter.title}`, "hb.openchapter")
        );
      }
    }
  } else if (view === "diagnostics") {
    renderDiagnostics(children);
  } else if (view === "chapter") {
    const chapter = findChapter(chapterId);
    children.push(widgetButton("back-toc", "← Contents", "hb.toc"));
    children.push({ id: "chapter-sep", type: "divider" });

    if (chapter === null) {
      children.push(textNode("missing-chapter", `Chapter not found: ${chapterId}`));
    } else {
      children.push(
        textNode("chapter-part", chapter.partTitle, { fontSize: 12, fontWeight: "medium" })
      );
      children.push(
        textNode("chapter-title", chapter.title, { fontSize: 20, fontWeight: "bold" })
      );
      renderChapterBlocks(chapter, children);
    }
  }

  await ui.render({
    root: {
      id: "root",
      type: "scroll",
      style: { padding: 16, gap: 8 },
      children: [
        {
          id: "inner",
          type: "view",
          style: { gap: 8 },
          children
        }
      ]
    }
  });
}

async function openChapter(id) {
  if (findChapter(id) === null) {
    statusLine = `Unknown chapter: ${id}`;
    await render();
    return;
  }

  chapterId = id;
  view = "chapter";
  statusLine = null;
  await kvSetText(POSITION_KEY, id);
  await render();
}

async function openToc() {
  view = "toc";
  statusLine = null;
  await render();
}

async function openDiagnostics() {
  view = "diagnostics";
  statusLine = null;
  await render();
}

function stripAppletExports(source) {
  return source
    .replace(/export\s+async\s+function\s+run\s*/, "async function run ")
    .replace(/export\s+\{[^}]+\}\s*;?/g, "");
}

async function runAppletInline(appletId, options = {}) {
  const { quiet = false } = options;
  const applet = findApplet(appletId);
  if (applet === null) {
    if (!quiet) {
      statusLine = `Unknown applet: ${appletId}`;
      await render();
    }
    return null;
  }

  if (!quiet) {
    statusLine = `Running ${applet.title}…`;
    await render();
  }

  let source;
  try {
    source = await workspace.read(`applets/${appletId}/main.js`);
  } catch {
    source = CATALOG.seeds.find((seed) => seed.path === `applets/${appletId}/main.js`)?.content;
  }

  if (typeof source !== "string" || source.length === 0) {
    const failed = {
      status: "fail",
      details: "Applet source not found in workspace seeds."
    };
    appletResults[appletId] = failed;
    if (!quiet) {
      statusLine = null;
      await render();
    }
    return { appletId, ...failed };
  }

  const started = Date.now();
  /** @type {{ status: string, details: string, timings?: { ms: number } } | null} */
  let reported = null;
  const report = (result) => {
    reported = {
      status: result.status,
      details: result.details,
      timings: result.timings ?? { ms: Date.now() - started }
    };
  };

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const body = stripAppletExports(source);
    const runner = new AsyncFunction("sdk", "report", `${body}\nawait run(sdk, report);`);
    await runner(makeSdk(), report);
    if (reported === null) {
      reported = {
        status: "fail",
        details: "Applet finished without calling report().",
        timings: { ms: Date.now() - started }
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    reported = {
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    };
  }

  appletResults[appletId] = reported;
  if (!quiet) {
    statusLine = `${applet.title}: ${reported.status}`;
    await render();
  }
  return { appletId, ...reported };
}

async function runAllDiagnostics() {
  if (runningAll) {
    return;
  }
  runningAll = true;
  statusLine = "Running all diagnostics…";
  view = "diagnostics";
  await render();

  try {
    for (const applet of CATALOG.applets) {
      statusLine = `Running ${applet.title}…`;
      await render();
      await runAppletInline(applet.id, { quiet: true });
      // Restore Handbook chrome after applets that call ui.render (e.g. widget gallery).
      statusLine = `Finished ${applet.title}: ${appletResults[applet.id]?.status ?? "?"}`;
      await render();
    }
    statusLine = `All diagnostics finished (${CATALOG.applets.length} applets)`;
  } finally {
    runningAll = false;
    await render();
  }
}

async function exportReport() {
  statusLine = "Building diagnostic report…";
  await render();

  const hostInfo = await fetchHostInfoSafe();
  const document = buildReportDocument(hostInfo);
  const json = JSON.stringify(document);

  try {
    const put = await share.put(json);
    exportState = {
      reportId: put.t256,
      generatedAt: document.generatedAt,
      json
    };
    await kvSetText(LAST_REPORT_KEY, json);
    compareState = { ...compareState, local: document };
    statusLine = `Report exported (${put.t256.slice(0, 12)}…)`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    exportState = { reportId: null, generatedAt: document.generatedAt, json };
    await kvSetText(LAST_REPORT_KEY, json);
    compareState = { ...compareState, local: document };
    statusLine = `Report built locally but share.put failed: ${message}`;
  }

  view = "diagnostics";
  await render();
}

async function compareReport() {
  const t256 = compareInput.trim();
  if (t256.length === 0) {
    compareState = { local: compareState.local, remote: null, rows: [], error: "Paste a report 256t id first." };
    await render();
    return;
  }

  statusLine = "Fetching remote report…";
  await render();

  let local = compareState.local;
  if (local === null) {
    const cached = await kvGetText(LAST_REPORT_KEY);
    if (cached !== null) {
      try {
        local = JSON.parse(cached);
      } catch {
        local = null;
      }
    }
  }
  if (local === null) {
    const hostInfo = await fetchHostInfoSafe();
    local = buildReportDocument(hostInfo);
  }

  try {
    const remoteJson = await share.get(t256);
    if (typeof remoteJson !== "string" || remoteJson.length === 0) {
      compareState = {
        local,
        remote: null,
        rows: [],
        error: "Remote report not found (null content)."
      };
      statusLine = null;
      await render();
      return;
    }
    const remote = JSON.parse(remoteJson);
    const rows = diffReports(local, remote);
    compareState = { local, remote, rows, error: null };
    statusLine = `Compared ${rows.length} applet row(s)`;
  } catch (error) {
    compareState = {
      local,
      remote: null,
      rows: [],
      error: error instanceof Error ? error.message : String(error)
    };
    statusLine = null;
  }

  view = "diagnostics";
  await render();
}

function chapterIdFromNode(nodeId) {
  if (nodeId.startsWith("ch-")) {
    return nodeId.slice(3);
  }
  if (nodeId.startsWith("link-")) {
    const rest = nodeId.slice("link-".length);
    let best = null;
    for (const chapter of CATALOG.chapters) {
      const prefix = `${chapter.id}-`;
      if (rest.startsWith(prefix) && (best === null || chapter.id.length > best.length)) {
        best = chapter.id;
      }
    }
    return best;
  }
  return null;
}

function appletIdFromRunNode(nodeId) {
  if (nodeId.startsWith("applet-run-")) {
    return nodeId.slice("applet-run-".length);
  }
  return null;
}

async function handleEvent({ nodeId, event, value }) {
  if (event === "hb.toc") {
    await openToc();
    return;
  }

  if (event === "hb.diagnostics") {
    await openDiagnostics();
    return;
  }

  if (event === "hb.openchapter") {
    const id = chapterIdFromNode(nodeId);
    if (id !== null) {
      await openChapter(id);
    }
    return;
  }

  if (event === "hb.runapplet") {
    const id = appletIdFromRunNode(nodeId);
    if (id !== null) {
      await runAppletInline(id);
    }
    return;
  }

  if (event === "hb.runall") {
    await runAllDiagnostics();
    return;
  }

  if (event === "hb.export") {
    await exportReport();
    return;
  }

  if (event === "hb.compare.input") {
    compareInput = typeof value === "string" ? value : String(value ?? "");
    return;
  }

  if (event === "hb.compare") {
    await compareReport();
  }
}

ui.onEvent((event) => {
  void handleEvent(event).catch(async (error) => {
    statusLine = `Error: ${error instanceof Error ? error.message : String(error)}`;
    await render();
  });
});

await ensureSeeds();

const saved = await kvGetText(POSITION_KEY);
if (saved !== null && findChapter(saved) !== null) {
  chapterId = saved;
  view = "chapter";
} else {
  view = "toc";
}

const cachedReport = await kvGetText(LAST_REPORT_KEY);
if (cachedReport !== null) {
  try {
    compareState = { ...compareState, local: JSON.parse(cachedReport) };
  } catch {
    // ignore corrupt cache
  }
}

await render();
