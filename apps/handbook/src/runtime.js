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
const SCROLL_KEY_PREFIX = "handbook:scroll:";
const SEEDED_KEY = "handbook:seeded";
const SEED_VERSION_KEY = "handbook:seed-version";
const GRANT_INTRO_KEY = "handbook:grant-intro-seen";
const LAST_REPORT_KEY = "handbook:last-report";
const REPORT_SCHEMA_VERSION = 1;
const DEVSTUDIO_HANDOFF_KIND = "tp.devstudio.workspace.v1";

const DIAGNOSTIC_GROUP_ORDER = ["crypto", "interfaces", "storage", "distribution", "runtime"];
const DIAGNOSTIC_GROUP_LABELS = {
  crypto: "Crypto & messaging",
  interfaces: "Interfaces & presence",
  storage: "Storage & workspace",
  distribution: "Distribution & fetch",
  runtime: "Runtime & UI"
};

/** @type {"toc" | "chapter" | "diagnostics" | "grant-intro"} */
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
/** @type {string} */
let searchQuery = "";
/** @type {number} */
let chapterScrollOffset = 0;
/** @type {number | null} */
let scrollSaveTimer = null;
/** @type {{ local: object | null, remote: object | null, rows: Array<object>, error: string | null }} */
let compareState = { local: null, remote: null, rows: [], error: null };
/** @type {Record<string, { t256: string, project: string }>} */
let devstudioHandoffs = {};
/** @type {boolean} */
let previewRunning = false;
/** @type {string | null} */
let previewAppletId = null;

function appletSupportsMode(applet, mode) {
  const modes = applet.executionModes ?? ["inline"];
  return modes.includes(mode);
}

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

function chapterNavigationOrder() {
  const order = [];
  for (const part of CATALOG.parts) {
    for (const chapter of part.chapters) {
      order.push(chapter.id);
    }
  }
  return order;
}

function chapterNeighbors(id) {
  const order = chapterNavigationOrder();
  const index = order.indexOf(id);
  if (index < 0) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null
  };
}

function chapterMatchesSearch(chapterMeta, query) {
  if (query.length === 0) {
    return true;
  }
  const chapter = findChapter(chapterMeta.id);
  const haystack = `${chapterMeta.title} ${chapter?.searchText ?? ""}`.toLowerCase();
  return haystack.includes(query);
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
  const procedureMatch =
    typeof result.details === "string"
      ? result.details.match(/(?:Guided procedure[^:]*:\n)([\s\S]+)$/)
      : null;
  const body =
    procedureMatch !== null && (result.status === "unavailable" || result.status === "skipped")
      ? `${label}${timing}\n\nGuided procedure:\n${procedureMatch[1].trim()}`
      : `${label}${timing}\n${result.details}`;
  return textNode(`result-${appletId}`, body);
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

function renderTableBlock(bid, block, children) {
  children.push(
    textNode(`${bid}-header`, block.headers.join(" · "), { fontWeight: "bold" })
  );
  const items = block.rows.map((row) => row.join(" — "));
  children.push({
    id: `${bid}-rows`,
    type: "list",
    props: { items }
  });
}

async function renderGrantIntro(children) {
  children.push(
    textNode("grant-intro-title", "Capabilities at install", { fontSize: 20, fontWeight: "bold" })
  );
  children.push(
    textNode(
      "grant-intro-blurb",
      "The Handbook requested the capabilities below. You may grant a subset at install — withheld capabilities turn matching applets into not-granted teaching cards instead of errors."
    )
  );

  /** @type {Set<string>} */
  let granted = new Set();
  try {
    const info = await host.info();
    if (Array.isArray(info.grantedCapabilities)) {
      granted = new Set(info.grantedCapabilities);
    }
  } catch {
    // presence withheld — list manifest capabilities without live grant status
  }

  const caps = CATALOG.manifestCapabilities ?? [];
  for (let i = 0; i < caps.length; i += 1) {
    const cap = caps[i];
    const status =
      granted.size === 0
        ? ""
        : granted.has(cap.id)
          ? " ✓ granted"
          : " ✗ withheld";
    children.push(textNode(`grant-cap-${i}`, `• ${cap.id} — ${cap.description}${status}`));
  }

  children.push(
    textNode(
      "grant-intro-note",
      "Revoke or add grants later in host Settings. Double-gated apps:* capabilities also require a host confirmation on each call."
    )
  );
  children.push(
    widgetButton("grant-intro-continue", "Continue to Handbook", "hb.grantintro.dismiss")
  );
}

function appletsByDiagnosticGroup() {
  /** @type {Record<string, typeof CATALOG.applets>} */
  const grouped = {};
  for (const group of DIAGNOSTIC_GROUP_ORDER) {
    grouped[group] = [];
  }
  for (const applet of CATALOG.applets) {
    const group = applet.group ?? "runtime";
    if (grouped[group] === undefined) {
      grouped[group] = [];
    }
    grouped[group].push(applet);
  }
  return grouped;
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
  if (appletSupportsMode(applet, "preview") && applet.preview !== null) {
    children.push(
      widgetButton(`applet-preview-${appletId}`, "Run as real app", "hb.runpreview")
    );
    if (previewRunning && previewAppletId === appletId) {
      children.push(
        widgetButton(`applet-stoppreview-${appletId}`, "Stop preview", "hb.stoppreview")
      );
      children.push(
        textNode(
          `applet-preview-active-${appletId}`,
          "Preview is running in the host dev-preview slot. Stop preview to return here."
        )
      );
    }
  }
  children.push(
    widgetButton(`applet-devstudio-${appletId}`, "Open in DevStudio", "hb.devstudio")
  );

  const handoff = devstudioHandoffs[appletId];
  if (handoff !== undefined) {
    children.push(
      textNode(
        `applet-devstudio-meta-${appletId}`,
        `DevStudio handoff: ${handoff.project}\nPaste in DevStudio → Import from 256t`
      )
    );
    children.push({
      id: `applet-devstudio-qr-${appletId}`,
      type: "qr-code",
      props: {
        value: handoff.t256,
        caption: handoff.project,
        size: 96
      }
    });
  }

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
    if (block.type === "table") {
      renderTableBlock(bid, block, children);
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
    const row =
      result === undefined
        ? {
            appletId: applet.id,
            status: "skipped",
            details: "Not run",
            timings: { ms: 0 }
          }
        : {
            appletId: applet.id,
            status: result.status,
            details: result.details,
            timings: result.timings ?? { ms: 0 }
          };
    return {
      ...row,
      expectations: applet.expectations ?? {}
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
  const localPlatform = localReport.host?.platform ?? "unknown";
  const remotePlatform = remoteReport.host?.platform ?? "unknown";
  const rows = [];
  for (const local of localReport.results ?? []) {
    const remote = remoteById.get(local.appletId);
    const applet = findApplet(local.appletId);
    const localExpected =
      local.expectations?.[localPlatform] ?? applet?.expectations?.[localPlatform] ?? null;
    const remoteExpected =
      remote?.expectations?.[remotePlatform] ?? applet?.expectations?.[remotePlatform] ?? null;
    const remoteStatus = remote?.status ?? "missing";
    const same = remote !== undefined && remote.status === local.status;
    const expectedDiff =
      localExpected !== null &&
      remoteExpected !== null &&
      localExpected !== remoteExpected;
    const unexpected = !same && !expectedDiff;
    let note = "";
    if (expectedDiff) {
      note = `expected ${localExpected} vs ${remoteExpected}`;
    } else if (unexpected) {
      note = "unexpected difference";
    } else if (same) {
      note = "same status";
    }
    rows.push({
      appletId: local.appletId,
      local: local.status,
      remote: remoteStatus,
      same,
      expectedDiff,
      unexpected,
      note,
      localExpected,
      remoteExpected
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
  const grouped = appletsByDiagnosticGroup();
  for (const group of DIAGNOSTIC_GROUP_ORDER) {
    const applets = grouped[group];
    if (applets === undefined || applets.length === 0) {
      continue;
    }
    children.push(
      textNode(
        `diag-group-${group}`,
        DIAGNOSTIC_GROUP_LABELS[group] ?? group,
        { fontSize: 14, fontWeight: "bold" }
      )
    );
    for (const applet of applets) {
      const result = appletResults[applet.id];
      const status = result?.status ?? "skipped";
      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
      children.push(
        textNode(
          `diag-row-${applet.id}`,
          `  ${applet.id}: ${status.toUpperCase()}`
        )
      );
    }
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
    const grouped = appletsByDiagnosticGroup();
    for (const group of DIAGNOSTIC_GROUP_ORDER) {
      const applets = grouped[group];
      if (applets === undefined || applets.length === 0) {
        continue;
      }
      const groupRows = compareState.rows.filter((row) =>
        applets.some((applet) => applet.id === row.appletId)
      );
      if (groupRows.length === 0) {
        continue;
      }
      children.push(
        textNode(
          `diag-compare-group-${group}`,
          DIAGNOSTIC_GROUP_LABELS[group] ?? group,
          { fontSize: 14, fontWeight: "bold" }
        )
      );
      for (const row of groupRows) {
        const mark = row.expectedDiff ? "≈" : row.same ? "=" : "≠";
        const expectNote =
          row.localExpected !== null && row.remoteExpected !== null
            ? ` [exp ${row.localExpected}/${row.remoteExpected}]`
            : "";
        children.push(
          textNode(
            `diag-diff-${row.appletId}`,
            `  ${mark} ${row.appletId}: ${row.local} / ${row.remote}${expectNote}${row.note ? ` — ${row.note}` : ""}`
          )
        );
      }
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

  if (view === "grant-intro") {
    await renderGrantIntro(children);
  } else if (view === "toc") {
    children.push(textNode("toc-heading", "Contents", { fontSize: 20, fontWeight: "bold" }));
    children.push(
      textNode(
        "toc-blurb",
        "Interactive diagnostic documentation. Open a chapter, then run embedded applets on this host."
      )
    );
    children.push(widgetButton("open-diag", "Diagnostics · run all / export / compare", "hb.diagnostics"));
    children.push({
      id: "toc-search",
      type: "text-input",
      props: {
        value: searchQuery,
        placeholder: "Search chapters…",
        event: "hb.search"
      }
    });

    const query = searchQuery.trim().toLowerCase();
    let visibleCount = 0;

    for (const part of CATALOG.parts) {
      const visibleChapters = part.chapters.filter((chapter) => chapterMatchesSearch(chapter, query));
      if (visibleChapters.length === 0) {
        continue;
      }
      visibleCount += visibleChapters.length;
      children.push({ id: `part-sep-${part.id}`, type: "divider" });
      children.push(textNode(`part-${part.id}`, part.title, { fontSize: 16, fontWeight: "bold" }));
      for (const chapter of visibleChapters) {
        const marker = chapterId === chapter.id ? "▶ " : "";
        children.push(
          widgetButton(`ch-${chapter.id}`, `${marker}${chapter.title}`, "hb.openchapter")
        );
      }
    }
    if (query.length > 0) {
      children.push(
        textNode(
          "toc-search-meta",
          visibleCount === 0 ? "No chapters match your search." : `${visibleCount} chapter(s) match.`
        )
      );
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
      const { prev, next } = chapterNeighbors(chapter.id);
      children.push({ id: "chapter-nav-sep", type: "divider" });
      if (prev !== null) {
        const prevChapter = findChapter(prev);
        children.push(
          widgetButton(
            `ch-${prev}`,
            `← ${prevChapter?.title ?? prev}`,
            "hb.openchapter"
          )
        );
      }
      if (next !== null) {
        const nextChapter = findChapter(next);
        children.push(
          widgetButton(
            `ch-${next}`,
            `${nextChapter?.title ?? next} →`,
            "hb.openchapter"
          )
        );
      }
    }
  }

  await ui.render({
    root: {
      id: "root",
      type: "scroll",
      props: {
        scrollOffset: view === "chapter" ? chapterScrollOffset : 0,
        event: "hb.scroll"
      },
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

async function loadChapterScroll(id) {
  const raw = await kvGetText(`${SCROLL_KEY_PREFIX}${id}`);
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
  chapterScrollOffset = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function scheduleScrollSave(id, y) {
  if (scrollSaveTimer !== null) {
    clearTimeout(scrollSaveTimer);
  }
  scrollSaveTimer = setTimeout(() => {
    scrollSaveTimer = null;
    void kvSetText(`${SCROLL_KEY_PREFIX}${id}`, String(Math.max(0, Math.round(y))));
  }, 250);
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
  await loadChapterScroll(id);
  await render();
}

async function dismissGrantIntro() {
  await kvSetText(GRANT_INTRO_KEY, "1");
  view = "toc";
  statusLine = null;
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

/**
 * Load applet `run(sdk, report)`. Prefer AsyncFunction (Node sandbox). Fall back
 * to blob-URL import when CSP blocks eval (browser iframe worker has no
 * unsafe-eval).
 */
async function loadAppletRunner(source) {
  const body = stripAppletExports(source);
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    // Probe — some CSPs allow constructing Function but reject calling it.
    const probe = new AsyncFunction("return 1");
    await probe();
    return new AsyncFunction("sdk", "report", `${body}\nawait run(sdk, report);`);
  } catch {
    const moduleSource = `${body}\nexport async function __handbookRun(sdk, report) {\n  await run(sdk, report);\n}\n`;
    const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
    try {
      const mod = await import(moduleUrl);
      if (typeof mod.__handbookRun !== "function") {
        throw new Error("Applet module did not export __handbookRun");
      }
      return (sdk, report) => mod.__handbookRun(sdk, report);
    } finally {
      URL.revokeObjectURL(moduleUrl);
    }
  }
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
    const runner = await loadAppletRunner(source);
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

async function seedPreviewProject(preview) {
  const project = preview.project;
  for (const [name, content] of Object.entries(preview.files)) {
    await workspace.write(`${project}/${name}`, content);
  }
}

async function runAppletPreviewSlot(appletId) {
  const applet = findApplet(appletId);
  if (applet === null || applet.preview === null || !appletSupportsMode(applet, "preview")) {
    statusLine = `Preview not available for: ${appletId}`;
    await render();
    return;
  }

  if (previewRunning) {
    statusLine = "Stop the current preview before starting another.";
    await render();
    return;
  }

  const preview = applet.preview;
  statusLine = `Launching preview for ${applet.title}…`;
  await render();

  const started = Date.now();
  try {
    await seedPreviewProject(preview);
    const packed = await apps.packageProject(preview.project, preview.manifest);
    if (packed === null || typeof packed.t256 !== "string") {
      throw new Error(`Package failed: ${JSON.stringify(packed)}`);
    }

    const launched = await apps.preview(preview.project, preview.manifest, preview.grants);
    if (launched === null || launched.launched !== true) {
      throw new Error(`Preview did not launch: ${JSON.stringify(launched)}`);
    }

    previewRunning = true;
    previewAppletId = appletId;
    appletResults[appletId] = {
      status: "pass",
      details: `Preview running (${packed.t256.slice(0, 12)}…). Use Stop preview when finished.`,
      timings: { ms: Date.now() - started }
    };
    statusLine = `${applet.title}: preview slot active`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable = /not configured|UNCONFIGURED|CONFIRMATION_UNAVAILABLE|unavailable/i.test(
      message
    );
    appletResults[appletId] = {
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started }
    };
    statusLine = `${applet.title}: preview failed`;
  }

  await render();
}

async function stopAppletPreview() {
  if (!previewRunning) {
    return;
  }

  try {
    await apps.stopPreview();
  } catch (error) {
    statusLine = `Stop preview failed: ${error instanceof Error ? error.message : String(error)}`;
    await render();
    return;
  }

  previewRunning = false;
  previewAppletId = null;
  statusLine = "Preview stopped";
  await render();
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

function buildDevstudioBundle(appletSource) {
  const body = appletSource.replace(/^export\s+async\s+function\s+run\s*\(/m, "async function appletRun(");
  return `import {
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

${body}

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

let reported = null;
await appletRun(makeSdk(), (result) => {
  reported = result;
});

await ui.render({
  root: {
    id: "root",
    type: "scroll",
    style: { padding: 12, gap: 8 },
    children: [
      {
        id: "result",
        type: "text",
        props: {
          value: reported
            ? \`\${reported.status.toUpperCase()}\\n\${reported.details}\`
            : "Applet finished without calling report()."
        }
      }
    ]
  }
});
`;
}

async function exportAppletToDevStudio(appletId) {
  const applet = findApplet(appletId);
  if (applet === null) {
    statusLine = `Unknown applet: ${appletId}`;
    await render();
    return;
  }

  statusLine = `Preparing DevStudio handoff for ${applet.title}…`;
  await render();

  let source = CATALOG.seeds.find((seed) => seed.path === `applets/${appletId}/main.js`)?.content;
  if (source === undefined) {
    try {
      source = await workspace.read(`applets/${appletId}/main.js`);
    } catch {
      source = undefined;
    }
  }

  if (source === undefined) {
    statusLine = "Applet source not found in workspace seeds.";
    await render();
    return;
  }

  const project = `hb-${appletId}`;
  const manifest = {
    name: project,
    version: "0.1.0",
    entry: "bundle.js",
    capabilities: applet.capabilities
  };
  const payload = {
    kind: DEVSTUDIO_HANDOFF_KIND,
    version: 1,
    project,
    files: [
      { path: `${project}/app.json`, content: JSON.stringify(manifest, null, 2) },
      { path: `${project}/applet.js`, content: source },
      { path: `${project}/bundle.js`, content: buildDevstudioBundle(source) }
    ]
  };

  try {
    const put = await share.put(JSON.stringify(payload));
    devstudioHandoffs[appletId] = { t256: put.t256, project };
    statusLine = `DevStudio handoff ready (${put.t256.slice(0, 12)}…)`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted = /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    statusLine = notGranted
      ? "Grant share:cas to export DevStudio handoffs."
      : `DevStudio handoff failed: ${message}`;
  }

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

function appletIdFromDevStudioNode(nodeId) {
  if (nodeId.startsWith("applet-devstudio-")) {
    return nodeId.slice("applet-devstudio-".length);
  }
  return null;
}

function appletIdFromPreviewNode(nodeId) {
  if (nodeId.startsWith("applet-preview-")) {
    return nodeId.slice("applet-preview-".length);
  }
  if (nodeId.startsWith("applet-stoppreview-")) {
    return nodeId.slice("applet-stoppreview-".length);
  }
  return null;
}

async function handleEvent({ nodeId, event, value }) {
  if (event === "hb.grantintro.dismiss") {
    await dismissGrantIntro();
    return;
  }

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

  if (event === "hb.runpreview") {
    const id = appletIdFromPreviewNode(nodeId);
    if (id !== null) {
      await runAppletPreviewSlot(id);
    }
    return;
  }

  if (event === "hb.stoppreview") {
    await stopAppletPreview();
    return;
  }

  if (event === "hb.devstudio") {
    const id = appletIdFromDevStudioNode(nodeId);
    if (id !== null) {
      await exportAppletToDevStudio(id);
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

  if (event === "hb.search") {
    searchQuery = typeof value === "string" ? value : String(value ?? "");
    view = "toc";
    await render();
    return;
  }

  if (event === "hb.scroll" && view === "chapter" && chapterId !== null) {
    const y = typeof value === "object" && value !== null && typeof value.y === "number" ? value.y : 0;
    chapterScrollOffset = y;
    scheduleScrollSave(chapterId, y);
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

const grantIntroSeen = await kvGetText(GRANT_INTRO_KEY);
if (grantIntroSeen !== "1") {
  view = "grant-intro";
} else {
  const saved = await kvGetText(POSITION_KEY);
  if (saved !== null && findChapter(saved) !== null) {
    chapterId = saved;
    view = "chapter";
    await loadChapterScroll(saved);
  } else {
    view = "toc";
  }
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
