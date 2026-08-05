import {
  ai,
  apps,
  announce,
  device,
  freenet,
  host,
  identity,
  lxmf,
  peers,
  presence,
  relay,
  resource,
  share,
  storage,
  ui,
  workspace,
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

const DIAGNOSTIC_GROUP_ORDER = [
  "crypto",
  "interfaces",
  "storage",
  "distribution",
  "runtime",
];
const DIAGNOSTIC_GROUP_LABELS = {
  crypto: "Crypto & messaging",
  interfaces: "Interfaces & presence",
  storage: "Storage & workspace",
  distribution: "Distribution & fetch",
  runtime: "Runtime & UI",
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
    relay,
    device,
    freenet,
    host,
    announce,
    lxmf,
    peers,
    storage,
    resource,
    workspace,
    ui,
    share,
    apps,
    ai,
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
    next: index < order.length - 1 ? order[index + 1] : null,
  };
}

function chapterMatchesSearch(chapterMeta, query) {
  if (query.length === 0) {
    return true;
  }
  const chapter = findChapter(chapterMeta.id);
  const haystack =
    `${chapterMeta.title} ${chapter?.searchText ?? ""}`.toLowerCase();
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
    result.timings && typeof result.timings.ms === "number"
      ? ` (${result.timings.ms} ms)`
      : "";
  const procedureMatch =
    typeof result.details === "string"
      ? result.details.match(/(?:Guided procedure[^:]*:\n)([\s\S]+)$/)
      : null;
  const body =
    procedureMatch !== null &&
    (result.status === "unavailable" || result.status === "skipped")
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
    textNode(`${bid}-header`, block.headers.join(" · "), {
      fontWeight: "bold",
    }),
  );
  const items = block.rows.map((row) => row.join(" — "));
  children.push({
    id: `${bid}-rows`,
    type: "list",
    props: { items },
  });
}

async function renderGrantIntro(children) {
  children.push(
    textNode("grant-intro-title", "Capabilities at install", {
      fontSize: 20,
      fontWeight: "bold",
    }),
  );
  children.push(
    textNode(
      "grant-intro-blurb",
      "The Handbook requested the capabilities below. You may grant a subset at install — withheld capabilities turn matching applets into not-granted teaching cards instead of errors.",
    ),
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
    children.push(
      textNode(`grant-cap-${i}`, `• ${cap.id} — ${cap.description}${status}`),
    );
  }

  children.push(
    textNode(
      "grant-intro-note",
      "Revoke or add grants later in host Settings. Double-gated apps:* capabilities also require a host confirmation on each call.",
    ),
  );
  children.push(
    widgetButton(
      "grant-intro-continue",
      "Continue to Handbook",
      "hb.grantintro.dismiss",
    ),
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
    children.push(
      textNode(`missing-${appletId}`, `Missing applet: ${appletId}`),
    );
    return;
  }

  children.push({ id: `applet-sep-${appletId}`, type: "divider" });
  children.push(
    textNode(`applet-title-${appletId}`, `Applet: ${applet.title}`, {
      fontSize: 16,
      fontWeight: "bold",
    }),
  );
  children.push(
    textNode(
      `applet-caps-${appletId}`,
      `Requires: ${applet.capabilities.join(", ")}`,
    ),
  );
  children.push({
    id: `applet-src-${appletId}`,
    type: "code-editor",
    props: {
      documentId: `applets/${appletId}/main.js`,
      language: "javascript",
      readOnly: true,
    },
  });
  children.push(
    widgetButton(`applet-run-${appletId}`, "Run applet", "hb.runapplet"),
  );
  if (appletSupportsMode(applet, "preview") && applet.preview !== null) {
    children.push(
      widgetButton(
        `applet-preview-${appletId}`,
        "Run as real app",
        "hb.runpreview",
      ),
    );
    if (previewRunning && previewAppletId === appletId) {
      children.push(
        widgetButton(
          `applet-stoppreview-${appletId}`,
          "Stop preview",
          "hb.stoppreview",
        ),
      );
      children.push(
        textNode(
          `applet-preview-active-${appletId}`,
          "Preview is running in the host dev-preview slot. Stop preview to return here.",
        ),
      );
    }
  }
  children.push(
    widgetButton(
      `applet-devstudio-${appletId}`,
      "Open in DevStudio",
      "hb.devstudio",
    ),
  );

  const handoff = devstudioHandoffs[appletId];
  if (handoff !== undefined) {
    children.push(
      textNode(
        `applet-devstudio-meta-${appletId}`,
        `DevStudio handoff: ${handoff.project}\nPaste in DevStudio → Import from 256t`,
      ),
    );
    children.push({
      id: `applet-devstudio-qr-${appletId}`,
      type: "qr-code",
      props: {
        value: handoff.t256,
        caption: handoff.project,
        size: 96,
      },
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
          readOnly: true,
        },
      });
      continue;
    }
    if (block.type === "chapter-link") {
      children.push(
        widgetButton(
          `link-${block.chapterId}-${bid}`,
          `→ ${block.label}`,
          "hb.openchapter",
        ),
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
        memoryBytes: null,
      },
      error: error instanceof Error ? error.message : String(error),
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
            timings: { ms: 0 },
          }
        : {
            appletId: applet.id,
            status: result.status,
            details: result.details,
            timings: result.timings ?? { ms: 0 },
          };
    return {
      ...row,
      expectations: applet.expectations ?? {},
    };
  });

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    handbookVersion: CATALOG.version,
    generatedAt: new Date().toISOString(),
    host: hostInfo,
    dropCensus: hostInfo?.dropCensus ?? { byReason: {}, byPeer: {} },
    results,
  };
}

function diffDropCensus(localReport, remoteReport) {
  const local = localReport.dropCensus?.byReason ?? {};
  const remote = remoteReport.dropCensus?.byReason ?? {};
  const keys = [
    ...new Set([...Object.keys(local), ...Object.keys(remote)]),
  ].sort();
  return keys.map((key) => {
    const localCount = local[key] ?? 0;
    const remoteCount = remote[key] ?? 0;
    const same = localCount === remoteCount;
    return {
      appletId: `drop:${key}`,
      local: String(localCount),
      remote: String(remoteCount),
      same,
      expectedDiff: false,
      unexpected: !same,
      note: same ? "same drop count" : "drop census differs",
      localExpected: null,
      remoteExpected: null,
    };
  });
}

function diffReports(localReport, remoteReport) {
  const remoteById = new Map(
    (remoteReport.results ?? []).map((row) => [row.appletId, row]),
  );
  const localPlatform = localReport.host?.platform ?? "unknown";
  const remotePlatform = remoteReport.host?.platform ?? "unknown";
  const rows = [...diffDropCensus(localReport, remoteReport)];
  for (const local of localReport.results ?? []) {
    const remote = remoteById.get(local.appletId);
    const applet = findApplet(local.appletId);
    const localExpected =
      local.expectations?.[localPlatform] ??
      applet?.expectations?.[localPlatform] ??
      null;
    const remoteExpected =
      remote?.expectations?.[remotePlatform] ??
      applet?.expectations?.[remotePlatform] ??
      null;
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
      remoteExpected,
    });
  }
  return rows;
}

function renderDiagnostics(children) {
  children.push(widgetButton("back-toc-diag", "← Contents", "hb.toc"));
  children.push({ id: "diag-sep", type: "divider" });
  children.push(
    textNode("diag-title", "Diagnostics", { fontSize: 20, fontWeight: "bold" }),
  );
  children.push(
    textNode(
      "diag-blurb",
      "Run every applet on this host, export a shareable report, or paste another report’s 256t id to compare.",
    ),
  );

  children.push(
    widgetButton(
      "diag-run-all",
      runningAll ? "Running all…" : "Run all diagnostics",
      "hb.runall",
    ),
  );

  const counts = {
    pass: 0,
    fail: 0,
    unavailable: 0,
    "not-granted": 0,
    skipped: 0,
  };
  const grouped = appletsByDiagnosticGroup();
  for (const group of DIAGNOSTIC_GROUP_ORDER) {
    const applets = grouped[group];
    if (applets === undefined || applets.length === 0) {
      continue;
    }
    children.push(
      textNode(`diag-group-${group}`, DIAGNOSTIC_GROUP_LABELS[group] ?? group, {
        fontSize: 14,
        fontWeight: "bold",
      }),
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
          `  ${applet.id}: ${status.toUpperCase()}`,
        ),
      );
    }
  }
  children.push(
    textNode(
      "diag-summary",
      `Summary — pass ${counts.pass}, fail ${counts.fail}, unavailable ${counts.unavailable}, not-granted ${counts["not-granted"]}, skipped ${counts.skipped}`,
    ),
  );

  children.push({ id: "diag-export-sep", type: "divider" });
  children.push(
    widgetButton("diag-export", "Export report (share.put)", "hb.export"),
  );
  if (exportState.reportId !== null) {
    children.push(
      textNode(
        "diag-export-meta",
        `Exported ${exportState.generatedAt ?? ""}\n${exportState.reportId}`,
      ),
    );
    children.push({
      id: "diag-export-qr",
      type: "qr-code",
      props: {
        value: exportState.reportId,
        caption: "Scan or copy report 256t id",
      },
    });
  }

  children.push({ id: "diag-compare-sep", type: "divider" });
  children.push(
    textNode("diag-compare-label", "Compare with remote report id:"),
  );
  children.push({
    id: "diag-compare-input",
    type: "text-input",
    props: {
      value: compareInput,
      placeholder: "Paste 256t id",
      event: "hb.compare.input",
    },
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
        `Local host: ${localPlat}  ·  Remote host: ${remotePlat}`,
      ),
    );
    const dropRows = compareState.rows.filter(
      (row) =>
        typeof row.appletId === "string" && row.appletId.startsWith("drop:"),
    );
    if (dropRows.length > 0) {
      children.push(
        textNode("diag-compare-group-drops", "Announce drop census", {
          fontSize: 14,
          fontWeight: "bold",
        }),
      );
      for (const row of dropRows) {
        const mark = row.same ? "=" : "≠";
        children.push(
          textNode(
            `diag-compare-${row.appletId}`,
            `  ${mark} ${row.appletId.slice("drop:".length)}  local=${row.local} remote=${row.remote}`,
          ),
        );
      }
    }
    const grouped = appletsByDiagnosticGroup();
    for (const group of DIAGNOSTIC_GROUP_ORDER) {
      const applets = grouped[group];
      if (applets === undefined || applets.length === 0) {
        continue;
      }
      const groupRows = compareState.rows.filter((row) =>
        applets.some((applet) => applet.id === row.appletId),
      );
      if (groupRows.length === 0) {
        continue;
      }
      children.push(
        textNode(
          `diag-compare-group-${group}`,
          DIAGNOSTIC_GROUP_LABELS[group] ?? group,
          { fontSize: 14, fontWeight: "bold" },
        ),
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
            `  ${mark} ${row.appletId}: ${row.local} / ${row.remote}${expectNote}${row.note ? ` — ${row.note}` : ""}`,
          ),
        );
      }
    }
  }
}
