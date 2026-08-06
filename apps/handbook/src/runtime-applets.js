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
