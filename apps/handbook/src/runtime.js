import {
  ai,
  apps,
  announce,
  identity,
  lxmf,
  presence,
  resource,
  share,
  storage,
  ui,
  workspace
} from "@twistedpear/miniapp-sdk";

// Handbook runtime — TOC, chapter renderer, inline applet runner, reading position.
// CATALOG is injected by build.mjs immediately above this file in bundle.js.

const POSITION_KEY = "handbook:position";
const SEEDED_KEY = "handbook:seeded";
const SEED_VERSION_KEY = "handbook:seed-version";

/** @type {"toc" | "chapter"} */
let view = "toc";
/** @type {string | null} */
let chapterId = null;
/** @type {Record<string, { status: string, details: string, timings?: { ms: number } }>} */
let appletResults = {};
/** @type {string | null} */
let statusLine = null;
/** @type {boolean} */
let seeding = false;

function makeSdk() {
  return {
    identity,
    presence,
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

function stripAppletExports(source) {
  return source
    .replace(/export\s+async\s+function\s+run\s*/, "async function run ")
    .replace(/export\s+\{[^}]+\}\s*;?/g, "");
}

async function runAppletInline(appletId) {
  const applet = findApplet(appletId);
  if (applet === null) {
    statusLine = `Unknown applet: ${appletId}`;
    await render();
    return;
  }

  statusLine = `Running ${applet.title}…`;
  await render();

  let source;
  try {
    source = await workspace.read(`applets/${appletId}/main.js`);
  } catch {
    source = CATALOG.seeds.find((seed) => seed.path === `applets/${appletId}/main.js`)?.content;
  }

  if (typeof source !== "string" || source.length === 0) {
    appletResults[appletId] = {
      status: "fail",
      details: "Applet source not found in workspace seeds."
    };
    statusLine = null;
    await render();
    return;
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
  statusLine = `${applet.title}: ${reported.status}`;
  await render();
}

function chapterIdFromNode(nodeId) {
  if (nodeId.startsWith("ch-")) {
    return nodeId.slice(3);
  }
  if (nodeId.startsWith("link-")) {
    const rest = nodeId.slice("link-".length);
    const cut = rest.lastIndexOf("-");
    // link-${chapterId}-${bid} — chapter ids may contain hyphens; bid starts with chapter id.
    // Prefer matching known chapter ids by longest prefix.
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

async function handleEvent({ nodeId, event }) {
  if (event === "hb.toc") {
    await openToc();
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

await render();
