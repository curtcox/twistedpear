#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const profile = mkdtempSync(join(tmpdir(), "tp-desktop-handbook-ui-"));
const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...electronEnv } = process.env;

// Keep the human-facing launcher wired to the same desktop route exercised below.
// This catches regressions where the app works via a hand-written Playwright command,
// but the Launcher card silently points at the generic host or the web handbook.
const launcherConfig = readFileSync(join(root, "launcher.txt"), "utf8");
const handbookEntry = launcherConfig
  .split(/\r?\n\s*\r?\n/)
  .find((entry) => /^name:\s*Handbook \(Desktop\)\s*$/m.test(entry));
assert.ok(handbookEntry, "launcher.txt must include a Handbook (Desktop) entry");
assert.match(
  handbookEntry,
  /^command:\s*npm run run:desktop:handbook\s*$/m,
  "the desktop Handbook launcher must use the dedicated desktop Handbook script"
);

const rootPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.match(
  rootPackage.scripts?.["run:desktop:handbook"] ?? "",
  /--app=handbook(?:\s|$)/,
  "run:desktop:handbook must pass the Handbook deep-link to Electron"
);

let electronApp;
let page;
try {
  electronApp = await electron.launch({
    args: [join(root, "apps/host-desktop"), "--app=handbook"],
    cwd: root,
    env: {
      ...electronEnv,
      HOME: profile
    },
    timeout: 30_000
  });

  page = await electronApp.firstWindow();
  await page.waitForSelector("body.miniapp-running", { timeout: 45_000 });
  await page.getByRole("heading", { name: "handbook", exact: true }).waitFor();

  const intro = page.getByRole("button", { name: "Continue to Handbook" });
  await page.waitForFunction(
    () =>
      document.body.textContent?.includes("Continue to Handbook") === true ||
      document.body.textContent?.includes("Contents") === true,
    undefined,
    { timeout: 15_000 }
  );
  if (await intro.isVisible()) {
    await intro.click();
  }

  await page.getByText("Contents", { exact: true }).waitFor({ timeout: 15_000 });
  await page.getByPlaceholder("Search chapters").fill("widget gallery");
  const gallery = page.getByRole("button", { name: "Widget gallery", exact: true });
  await gallery.waitFor();
  await page.getByText(/^\d+ chapter\(s\) match\.$/).waitFor();
  await gallery.click();
  await page.getByText("← Contents", { exact: true }).waitFor();

  // A usable reader must render real chapter content and navigate back to its TOC,
  // not merely boot into an empty mini-app shell.
  const chapterText = (await page.locator("#widget-root").innerText()).trim();
  assert.ok(chapterText.length > 200, "Widget gallery chapter should contain substantial content");
  await page.getByText("← Contents", { exact: true }).click();
  await page.getByText("Diagnostics · run all / export / compare", { exact: true }).waitFor();

  if (await page.locator("#host-modal-overlay:not([hidden])").count()) {
    throw new Error("desktop Handbook launch left a host review modal open");
  }

  console.log("desktop-handbook-ui: launcher target opened a searchable, navigable Handbook");
} catch (error) {
  if (page !== undefined) {
    const diagnostic = await page.evaluate(() => ({
      url: window.location.href,
      bodyClass: document.body.className,
      installed: document.querySelector("#installed-list")?.textContent?.trim() ?? "",
      log: document.querySelector("#log")?.textContent?.trim() ?? ""
    }));
    console.error(`desktop-handbook-ui diagnostics: ${JSON.stringify(diagnostic, null, 2)}`);
  }
  throw error;
} finally {
  await electronApp?.close();
  rmSync(profile, { recursive: true, force: true });
}
