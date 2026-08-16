#!/usr/bin/env node
/**
 * Accessibility scanning with axe-core, ratcheted per surface and per rule.
 *
 * There was no accessibility check anywhere, on any surface, and several UIs
 * ship. This adds one, and the hardest part was choosing what to point it at.
 *
 * **Not the fourteen `conformance/web-*` harnesses.** Every one of them serves a
 * page whose entire body is `<script src="…bundle.js">`; they drive logic in a
 * browser rather than rendering anything. axe on `web-handbook` reports on an
 * empty document, which is a green tick over nothing — the same measurement
 * that cannot fail that this round has already paid for twice. (`web-examples`
 * and `web-widget-renderer` do build DOM, and are worth adding next; they were
 * left out of the first pass so the ratchet starts on surfaces a reader
 * actually looks at.)
 *
 * The surfaces below are those. The Handbook reader is rendered here exactly the
 * way `conformance/docs/capture-handbook-web-ui.mjs` renders it for the
 * documentation screenshots — the real widget tree, through react-native-web,
 * in Chromium — so what axe sees is what a reader sees. The desktop host
 * renderer is the shipped HTML shell of the Electron app.
 *
 * Two scoping decisions, both load-bearing:
 *
 *  - The reader scan is scoped to `#root`, not the document. The page around it
 *    is the capture harness's own shell, and scanning it reported
 *    `landmark-one-main`, `region` and `page-has-heading-one` — three findings
 *    about a wrapper TwistedPear does not ship. Ratcheting those would have
 *    pinned the test harness's HTML and called it product accessibility.
 *  - The desktop host is scanned whole, because there the document *is* the
 *    product, and landmark and heading structure is exactly the thing to hold.
 *
 * axe is injected with `page.evaluate` rather than `addScriptTag`: the desktop
 * renderer ships `script-src 'self'`, which blocks an injected inline script and
 * should keep doing so.
 */
import {
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

import {
  buildCaptureDeps,
  buildHandbookContent,
  captureHandbookWidgetTree,
  writeCapturePage,
} from "../docs/handbook-capture-lib.mjs";
import {
  desktopHostMock,
  startStaticServer,
} from "../docs/capture-reader-guide-ui-lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const RATCHET_PATH = join(repoRoot, "accessibility-ratchet.json");
const REPORT_PATH = join(
  repoRoot,
  "artifacts/accessibility/accessibility.json",
);

const write = process.argv.includes("--write");

// Resolved rather than reached for by path. `node_modules/axe-core/…` happens to
// work here and is a lie about how the dependency is found — it breaks under any
// hoisting layout, and it hides the dependency from Knip, which reported
// `axe-core` as unused devDependency for exactly that reason.
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const axeVersion = require("axe-core/package.json").version;

/**
 * Run axe over one already-loaded page and return `{ruleId: nodeCount}`.
 *
 * `resultTypes: ["violations"]` keeps axe from assembling the passes and
 * incomplete lists, which it otherwise builds for every node on the page.
 */
async function scan(page, context) {
  const results = await page.evaluate(
    async (selector) =>
      await globalThis.axe.run(
        selector === null ? document : document.querySelector(selector),
        { resultTypes: ["violations"] },
      ),
    context,
  );
  /** @type {Record<string, {impact: string, nodes: number, help: string}>} */
  const byRule = {};
  for (const violation of results.violations) {
    byRule[violation.id] = {
      impact: violation.impact,
      nodes: violation.nodes.length,
      help: violation.help,
    };
  }
  return byRule;
}

/**
 * Scan twice and refuse to report a surface whose two answers differ.
 *
 * The standing rule is not to ratchet a noisy measurement, and the only way to
 * know whether this one is noisy is to ask it twice. It is not: three repeats
 * per surface gave identical rule sets and identical node counts, which is why
 * node counts are ratcheted rather than a bare violation count. This assertion
 * is what keeps that true — if a future rule starts depending on layout timing
 * or animation, the gate says so instead of flapping.
 */
async function scanTwice(page, context, surface) {
  const first = await scan(page, context);
  const second = await scan(page, context);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(
      `${surface}: axe gave two different answers for the same page — ${JSON.stringify(first)} then ${JSON.stringify(second)}. A measurement this unstable must not be ratcheted; scope it or pin the rule set before recording it.`,
    );
  }
  return first;
}

async function withPage(browser, viewport, body) {
  const page = await browser.newPage({ viewport });
  try {
    return await body(page);
  } finally {
    await page.close();
  }
}

/** The Handbook reader, rendered from its real widget tree. */
async function scanReaderScenes(browser) {
  buildCaptureDeps();
  buildHandbookContent();

  /** @type {Record<string, any>} */
  const surfaces = {};
  for (const scene of ["search", "chapter"]) {
    const tree = await captureHandbookWidgetTree({
      platform: "web",
      scene,
      logPrefix: "accessibility",
    });
    // Outside the repository: a run that dies between writing the page and
    // deleting it would otherwise leave generated HTML behind for the
    // formatting gate to report as a file nobody wrote.
    const captureDir = mkdtempSync(join(tmpdir(), `tp-a11y-${scene}-`));
    writeCapturePage(tree, captureDir, { maxWidth: 960 });
    const surface = `handbook-${scene}`;
    surfaces[surface] = await withPage(
      browser,
      { width: 960, height: 900 },
      async (page) => {
        await page.goto(`file://${join(captureDir, "page.html")}`, {
          waitUntil: "load",
        });
        await page.waitForFunction(
          () => globalThis.__HANDBOOK_CAPTURE_READY__ === true,
          undefined,
          { timeout: 60_000 },
        );
        await page.evaluate(axeSource);
        return scanTwice(page, "#root", surface);
      },
    );
    rmSync(captureDir, { recursive: true, force: true });
  }
  return surfaces;
}

/** The desktop host's shipped renderer shell, with its status grid populated. */
async function scanDesktopHost(browser) {
  const rendererRoot = join(repoRoot, "apps/host-desktop/src/renderer");
  const server = await startStaticServer(rendererRoot);
  try {
    return await withPage(
      browser,
      { width: 960, height: 720 },
      async (page) => {
        await page.addInitScript(desktopHostMock, {
          emitName: "__TP_A11Y_EMIT__",
          messagesName: "__TP_A11Y_MESSAGES__",
        });
        await page.goto(server.url, { waitUntil: "load" });
        await page.waitForFunction(
          () => globalThis.__TP_RENDERER_LISTENING__ === true,
        );
        // The same fixture `capture-desktop-host-ui.mjs` uses. An empty shell
        // passes trivially; the lists are where labelling and structure live.
        await page.evaluate(() => {
          const grid = document.getElementById("status-grid");
          if (grid) {
            grid.innerHTML =
              "<dt>Running</dt><dd>yes</dd><dt>Identity</dt><dd>17a5be8a…c4cc27b3</dd><dt>Transport</dt><dd>enabled</dd>";
          }
        });
        await page.evaluate(axeSource);
        const surfaces = {
          "desktop-host": await scanTwice(page, null, "desktop-host"),
        };
        await page.evaluate(() =>
          globalThis.__TP_A11Y_EMIT__({
            type: "install-review",
            token: "a11y-install",
            appId: "field-log",
            version: "1.2.3",
            trusted: false,
            publisherPublicKey: "publisher-0123456789abcdef",
            capabilities: [
              {
                id: "storage:kv",
                description: "Save observations",
                granted: true,
              },
              {
                id: "location",
                description: "Read current location",
                granted: false,
              },
            ],
          }),
        );
        surfaces["desktop-capability-review"] = await scanTwice(
          page,
          "#host-modal",
          "desktop-capability-review",
        );
        await page.locator("#host-modal button").first().click();
        await page.evaluate(() => {
          globalThis.__TP_A11Y_EMIT__({
            type: "installed",
            packages: [
              {
                appId: "field-log",
                version: "1.2.3",
                publisherPublicKey: "publisher-0123456789abcdef",
                capabilities: ["storage:kv", "location"],
              },
            ],
          });
          globalThis.__TP_A11Y_EMIT__({
            type: "grants",
            appId: "field-log",
            capabilities: [
              {
                id: "storage:kv",
                description: "Save observations",
                declared: true,
                granted: true,
              },
              {
                id: "location",
                description: "Read current location",
                declared: true,
                granted: true,
              },
            ],
          });
        });
        surfaces["desktop-grants"] = await scanTwice(
          page,
          "#grants-panel",
          "desktop-grants",
        );
        return surfaces;
      },
    );
  } finally {
    await server.close();
  }
}

function loadRatchet() {
  return JSON.parse(readFileSync(RATCHET_PATH, "utf8"));
}

/**
 * Compare a run against the recorded floors.
 *
 * A surface that vanished is a failure, not a pass: a gate whose scan silently
 * stopped covering the reader would otherwise report zero violations and green,
 * which is exactly what "no accessibility check anywhere" already looked like.
 */
function compare(surfaces, recorded) {
  const findings = Object.keys(recorded)
    .filter((surface) => !(surface in surfaces))
    .map((surface) => `${surface}: was scanned before and is not scanned now`);
  const stale = [];

  for (const [surface, rules] of Object.entries(surfaces)) {
    const allowed = recorded[surface];
    if (allowed === undefined) {
      findings.push(`${surface}: scanned but never recorded`);
      continue;
    }
    const compared = compareSurface(surface, rules, allowed);
    findings.push(...compared.findings);
    stale.push(...compared.stale);
  }

  return { findings, stale };
}

/**
 * One surface's rules against its floors.
 *
 * Split out of `compare` because the two nested loops crossed the cognitive
 * complexity floor, and the gate was right: "which surface vanished", "which
 * rule grew" and "which rule was fixed" are three questions, and reading them
 * as one function means holding all three at once.
 *
 * @param {string} surface
 * @param {Record<string, {impact: string, nodes: number, help: string}>} rules
 * @param {Record<string, number>} allowed
 */
function compareSurface(surface, rules, allowed) {
  const findings = [];
  const stale = [];

  for (const [rule, result] of Object.entries(rules)) {
    const limit = allowed[rule];
    if (limit === undefined) {
      findings.push(
        `${surface}: new ${result.impact} violation ${rule} on ${result.nodes} node(s) — ${result.help}`,
      );
    } else if (result.nodes > limit) {
      findings.push(
        `${surface}: ${rule} grew from ${limit} to ${result.nodes} node(s)`,
      );
    } else if (result.nodes < limit) {
      stale.push(`${surface}: ${rule} fell from ${limit} to ${result.nodes}`);
    }
  }

  for (const rule of Object.keys(allowed)) {
    if (!(rule in rules)) stale.push(`${surface}: ${rule} is fixed`);
  }

  return { findings, stale };
}

const browser = await chromium.launch({ headless: true });
let surfaces;
try {
  surfaces = {
    ...(await scanReaderScenes(browser)),
    ...(await scanDesktopHost(browser)),
  };
} finally {
  await browser.close();
}

const ratchet = loadRatchet();
const { findings, stale } = compare(surfaces, ratchet.surfaces ?? {});

mkdirSync(dirname(REPORT_PATH), { recursive: true });
writeFileSync(
  REPORT_PATH,
  `${JSON.stringify(
    {
      ok: findings.length === 0,
      axe: axeVersion,
      surfaces,
      findings,
      stale,
    },
    null,
    2,
  )}\n`,
);

for (const [surface, rules] of Object.entries(surfaces)) {
  const total = Object.values(rules).reduce((sum, rule) => sum + rule.nodes, 0);
  console.log(
    `${surface}: ${Object.keys(rules).length} rule(s), ${total} node(s)${
      Object.keys(rules).length === 0 ? " — clean" : ""
    }`,
  );
}

if (write) {
  // Tightening only. Establishing or loosening a floor is a deliberate act and
  // goes through `-- --allow-regressions`, like every other ratchet here.
  const loosened = findings.length > 0;
  if (loosened && !process.argv.includes("--allow-regressions")) {
    console.error(
      `\nRefusing to record ${findings.length} new or grown finding(s) without --allow-regressions:`,
    );
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(1);
  }
  writeFileSync(
    RATCHET_PATH,
    `${JSON.stringify(
      {
        ...ratchet,
        surfaces: Object.fromEntries(
          Object.entries(surfaces)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([surface, rules]) => [
              surface,
              Object.fromEntries(
                Object.entries(rules)
                  .sort(([left], [right]) => left.localeCompare(right))
                  .map(([rule, result]) => [rule, result.nodes]),
              ),
            ]),
        ),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`accessibility: wrote ${RATCHET_PATH}`);
  process.exit(0);
}

for (const entry of stale) console.log(`  (tightened) ${entry}`);

if (findings.length > 0) {
  console.error("");
  for (const finding of findings) console.error(`  + ${finding}`);
  console.error(
    `\naccessibility: FAIL; ${findings.length} new, ${stale.length} stale.`,
  );
  process.exit(1);
}

console.log(
  `accessibility: PASS; 0 new, ${stale.length} stale.${
    stale.length > 0 ? " Run `npm run a11y:baseline` to tighten." : ""
  }`,
);
