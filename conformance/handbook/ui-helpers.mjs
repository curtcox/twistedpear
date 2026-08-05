/**
 * Shared Handbook UI harness helpers (Node + mobile worklet slices).
 */

export function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

export async function waitFor(evaluate, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }
    await sleep(50);
  }
  throw new Error("waitFor timeout");
}

export function collectTextValues(node) {
  const values = [];
  if (node.type === "text" && typeof node.props?.value === "string") {
    values.push(node.props.value);
  }
  for (const child of node.children ?? []) {
    values.push(...collectTextValues(child));
  }
  return values;
}

export function treeContainsText(tree, needle) {
  return collectTextValues(tree.root).some((value) => value.includes(needle));
}

export async function waitForTreeText(host, needle, timeoutMs = 20_000) {
  try {
    return await waitFor(async () => {
      const tree = host.snapshot().widgetTree;
      if (tree !== null && treeContainsText(tree, needle)) {
        return tree;
      }
      return null;
    }, timeoutMs);
  } catch (error) {
    const snapshot = host.snapshot();
    const detail = snapshot.logs.map((entry) => entry.line).join(" | ");
    throw new Error(
      `${error instanceof Error ? error.message : String(error)} waiting for ${JSON.stringify(needle)}; state=${snapshot.state}; logs=${detail}`
    );
  }
}

export async function tap(host, nodeId, event, value) {
  await host.handleUiEvent(nodeId, event, value);
  await sleep(300);
}

export function findNodeById(node, id) {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNodeById(child, id);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

export function assertGrantIntroShowsGranted(tree) {
  if (!treeContainsText(tree, "Capabilities at install")) {
    return;
  }
  const texts = collectTextValues(tree.root);
  if (!texts.some((value) => value.includes("✓ granted"))) {
    throw new Error("grant intro missing granted markers from host.info().grantedCapabilities");
  }
  if (!texts.some((value) => value.includes("identity") && value.includes("✓ granted"))) {
    throw new Error("grant intro missing identity granted marker");
  }
}

export async function dismissGrantIntroIfNeeded(host, logPrefix = "handbook") {
  const tree = host.snapshot().widgetTree;
  if (tree !== null && treeContainsText(tree, "Capabilities at install")) {
    assertGrantIntroShowsGranted(tree);
    console.log(`${logPrefix}: grant intro shows live granted status`);
    await tap(host, "grant-intro-continue", "hb.grantintro.dismiss");
    await waitForTreeText(host, "Contents");
    console.log(`${logPrefix}: grant intro dismissed`);
  }
}

/**
 * @param {import("../../packages/miniapp-runtime/dist/index.js").MiniappHost} host
 * @param {{ get: (key: string) => Promise<Uint8Array | null> }} store
 * @param {{ appId?: string, logPrefix?: string }} [options]
 */
export async function assertReaderUx(host, store, options = {}) {
  const appId = options.appId ?? "handbook";
  const logPrefix = options.logPrefix ?? "handbook";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tree = host.snapshot().widgetTree;
    if (tree !== null && findNodeById(tree.root, "open-diag") !== null) {
      break;
    }
    try {
      await tap(host, "back-toc", "hb.toc");
    } catch {
      try {
        await tap(host, "back-toc-diag", "hb.toc");
      } catch {
        // ignore
      }
    }
    await sleep(200);
  }
  await waitForTreeText(host, "Contents");

  await tap(host, "toc-search", "hb.search", "widget gallery");
  await waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    if (tree === null) {
      return null;
    }
    if (
      treeContainsText(tree, "chapter(s) match") &&
      findNodeById(tree.root, "ch-sdk-widget-gallery") !== null &&
      findNodeById(tree.root, "ch-host-android") === null
    ) {
      return tree;
    }
    return null;
  }, 10_000);
  console.log(`${logPrefix}: TOC search passed`);

  await tap(host, "toc-search", "hb.search", "");
  await sleep(200);

  await tap(host, "ch-what-is-twistedpear", "hb.openchapter");
  await waitForTreeText(host, "What TwistedPear is");
  if (findNodeById(host.snapshot().widgetTree.root, "ch-reticulum-fundamentals") === null) {
    throw new Error("missing next-chapter navigation button");
  }
  console.log(`${logPrefix}: chapter prev/next navigation passed`);

  await tap(host, "root", "hb.scroll", { y: 200 });
  await sleep(600);
  const scrollKey = `miniapp-kv:${appId}:${appId}:scroll:what-is-twistedpear`;
  const scrollBytes = await store.get(scrollKey);
  if (scrollBytes === null) {
    throw new Error("handbook did not persist chapter scroll offset");
  }
  const scrollY = Number.parseInt(new TextDecoder().decode(scrollBytes), 10);
  if (!Number.isFinite(scrollY) || scrollY < 50) {
    throw new Error(`unexpected scroll offset persisted: ${scrollY}`);
  }

  await tap(host, "back-toc", "hb.toc");
  await waitForTreeText(host, "Contents");
  await tap(host, "ch-what-is-twistedpear", "hb.openchapter");
  await waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    if (tree === null) {
      return null;
    }
    const root = findNodeById(tree.root, "root");
    const offset = root?.props?.scrollOffset;
    if (typeof offset === "number" && offset >= 50) {
      return root;
    }
    return null;
  }, 10_000);
  console.log(`${logPrefix}: scroll position restored (${scrollY} px)`);

  await tap(host, "back-toc", "hb.toc");
  await waitForTreeText(host, "Contents");
}

/** Navigate back to TOC from chapter or diagnostics views. */
export async function returnToToc(host) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tree = host.snapshot().widgetTree;
    if (tree !== null && findNodeById(tree.root, "open-diag") !== null) {
      return;
    }
    try {
      await tap(host, "back-toc", "hb.toc");
    } catch {
      try {
        await tap(host, "back-toc-diag", "hb.toc");
      } catch {
        // ignore
      }
    }
    await sleep(200);
  }
  await waitFor(async () => {
    const next = host.snapshot().widgetTree;
    if (next !== null && findNodeById(next.root, "open-diag") !== null) {
      return next;
    }
    return null;
  }, 20_000);
}
