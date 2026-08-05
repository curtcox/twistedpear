async function render() {
  const children = [
    textNode("brand", CATALOG.title, { fontSize: 24, fontWeight: "bold" }),
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
    children.push(
      textNode("toc-heading", "Contents", { fontSize: 20, fontWeight: "bold" }),
    );
    children.push(
      textNode(
        "toc-blurb",
        "Interactive diagnostic documentation. Open a chapter, then run embedded applets on this host.",
      ),
    );
    children.push(
      widgetButton(
        "open-diag",
        "Diagnostics · run all / export / compare",
        "hb.diagnostics",
      ),
    );
    children.push({
      id: "toc-search",
      type: "text-input",
      props: {
        value: searchQuery,
        placeholder: "Search chapters…",
        event: "hb.search",
      },
    });

    const query = searchQuery.trim().toLowerCase();
    let visibleCount = 0;

    for (const part of CATALOG.parts) {
      const visibleChapters = part.chapters.filter((chapter) =>
        chapterMatchesSearch(chapter, query),
      );
      if (visibleChapters.length === 0) {
        continue;
      }
      visibleCount += visibleChapters.length;
      children.push({ id: `part-sep-${part.id}`, type: "divider" });
      children.push(
        textNode(`part-${part.id}`, part.title, {
          fontSize: 16,
          fontWeight: "bold",
        }),
      );
      for (const chapter of visibleChapters) {
        const marker = chapterId === chapter.id ? "▶ " : "";
        children.push(
          widgetButton(
            `ch-${chapter.id}`,
            `${marker}${chapter.title}`,
            "hb.openchapter",
          ),
        );
      }
    }
    if (query.length > 0) {
      children.push(
        textNode(
          "toc-search-meta",
          visibleCount === 0
            ? "No chapters match your search."
            : `${visibleCount} chapter(s) match.`,
        ),
      );
    }
  } else if (view === "diagnostics") {
    renderDiagnostics(children);
  } else if (view === "chapter") {
    const chapter = findChapter(chapterId);
    children.push(widgetButton("back-toc", "← Contents", "hb.toc"));
    children.push({ id: "chapter-sep", type: "divider" });

    if (chapter === null) {
      children.push(
        textNode("missing-chapter", `Chapter not found: ${chapterId}`),
      );
    } else {
      children.push(
        textNode("chapter-part", chapter.partTitle, {
          fontSize: 12,
          fontWeight: "medium",
        }),
      );
      children.push(
        textNode("chapter-title", chapter.title, {
          fontSize: 20,
          fontWeight: "bold",
        }),
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
            "hb.openchapter",
          ),
        );
      }
      if (next !== null) {
        const nextChapter = findChapter(next);
        children.push(
          widgetButton(
            `ch-${next}`,
            `${nextChapter?.title ?? next} →`,
            "hb.openchapter",
          ),
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
        event: "hb.scroll",
      },
      style: { padding: 16, gap: 8 },
      children: [
        {
          id: "inner",
          type: "view",
          style: { gap: 8 },
          children,
        },
      ],
    },
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
    void kvSetText(
      `${SCROLL_KEY_PREFIX}${id}`,
      String(Math.max(0, Math.round(y))),
    );
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
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    // Probe — some CSPs allow constructing Function but reject calling it.
    const probe = new AsyncFunction("return 1");
    await probe();
    return new AsyncFunction(
      "sdk",
      "report",
      `${body}\nawait run(sdk, report);`,
    );
  } catch {
    const moduleSource = `${body}\nexport async function __handbookRun(sdk, report) {\n  await run(sdk, report);\n}\n`;
    const moduleUrl = URL.createObjectURL(
      new Blob([moduleSource], { type: "text/javascript" }),
    );
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
    source = CATALOG.seeds.find(
      (seed) => seed.path === `applets/${appletId}/main.js`,
    )?.content;
  }

  if (typeof source !== "string" || source.length === 0) {
    const failed = {
      status: "fail",
      details: "Applet source not found in workspace seeds.",
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
      timings: result.timings ?? { ms: Date.now() - started },
    };
  };

  try {
    const runner = await loadAppletRunner(source);
    await runner(makeSdk(), report);
    if (reported === null) {
      reported = {
        status: "fail",
        details: "Applet finished without calling report().",
        timings: { ms: Date.now() - started },
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    reported = {
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
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
  if (
    applet === null ||
    applet.preview === null ||
    !appletSupportsMode(applet, "preview")
  ) {
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

    const launched = await apps.preview(
      preview.project,
      preview.manifest,
      preview.grants,
    );
    if (launched === null || launched.launched !== true) {
      throw new Error(`Preview did not launch: ${JSON.stringify(launched)}`);
    }

    previewRunning = true;
    previewAppletId = appletId;
    appletResults[appletId] = {
      status: "pass",
      details: `Preview running (${packed.t256.slice(0, 12)}…). Use Stop preview when finished.`,
      timings: { ms: Date.now() - started },
    };
    statusLine = `${applet.title}: preview slot active`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    const unavailable =
      /not configured|UNCONFIGURED|CONFIRMATION_UNAVAILABLE|unavailable/i.test(
        message,
      );
    appletResults[appletId] = {
      status: notGranted ? "not-granted" : unavailable ? "unavailable" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
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
      json,
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

async function exportAppletToDevStudio(appletId) {
  const applet = findApplet(appletId);
  if (applet === null) {
    statusLine = `Unknown applet: ${appletId}`;
    await render();
    return;
  }

  statusLine = `Preparing DevStudio handoff for ${applet.title}…`;
  await render();

  let source = CATALOG.seeds.find(
    (seed) => seed.path === `applets/${appletId}/main.js`,
  )?.content;
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
    capabilities: applet.capabilities,
  };
  const payload = {
    kind: DEVSTUDIO_HANDOFF_KIND,
    version: 1,
    project,
    files: [
      {
        path: `${project}/app.json`,
        content: JSON.stringify(manifest, null, 2),
      },
      { path: `${project}/applet.js`, content: source },
      {
        path: `${project}/bundle.js`,
        content: globalThis.buildHandbookDevstudioBundle(source),
      },
    ],
  };

  try {
    const put = await share.put(JSON.stringify(payload));
    devstudioHandoffs[appletId] = { t256: put.t256, project };
    statusLine = `DevStudio handoff ready (${put.t256.slice(0, 12)}…)`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    statusLine = notGranted
      ? "Grant share:cas to export DevStudio handoffs."
      : `DevStudio handoff failed: ${message}`;
  }

  await render();
}

async function compareReport() {
  const t256 = compareInput.trim();
  if (t256.length === 0) {
    compareState = {
      local: compareState.local,
      remote: null,
      rows: [],
      error: "Paste a report 256t id first.",
    };
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
        error: "Remote report not found (null content).",
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
      error: error instanceof Error ? error.message : String(error),
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
      if (
        rest.startsWith(prefix) &&
        (best === null || chapter.id.length > best.length)
      ) {
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
    const y =
      typeof value === "object" && value !== null && typeof value.y === "number"
        ? value.y
        : 0;
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
