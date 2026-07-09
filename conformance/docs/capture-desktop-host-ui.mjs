#!/usr/bin/env node
/**
 * Capture a deterministic desktop-host UI PNG from the renderer shell.
 * Used when Electron window capture is unavailable (headless agent, no Screen Recording).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rendererHtml = join(repoRoot, "apps/host-desktop/src/renderer/index.html");
const output = join(repoRoot, "docs/images/desktop-host.png");

mkdirSync(dirname(output), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
await page.goto(`file://${rendererHtml}`);
await page.evaluate(() => {
  const grid = document.getElementById("status-grid");
  if (grid) {
    grid.innerHTML = `
      <dt>Running</dt><dd>yes</dd>
      <dt>Identity</dt><dd>17a5be8a…c4cc27b3</dd>
      <dt>Transport</dt><dd>enabled</dd>
      <dt>Catalog entries</dt><dd>3</dd>
      <dt>Installed</dt><dd>3</dd>`;
  }
  const catalog = document.getElementById("catalog-list");
  if (catalog) {
    catalog.innerHTML = `
      <li><strong>handbook</strong> v0.1.0 — TwistedPear</li>
      <li><strong>devstudio</strong> v0.1.0 — TwistedPear</li>
      <li><strong>chat</strong> v0.1.0 — TwistedPear</li>`;
  }
});
await page.screenshot({ path: output, fullPage: true });
await browser.close();
console.log(`desktop-host UI capture written to ${output}`);
