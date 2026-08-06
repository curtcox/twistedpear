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
