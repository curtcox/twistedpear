#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const profile = mkdtempSync(join(tmpdir(), "tp-desktop-handbook-ui-"));
const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...electronEnv } = process.env;

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
  await page.getByText("Widget gallery", { exact: true }).waitFor();

  if (await page.locator("#host-modal-overlay:not([hidden])").count()) {
    throw new Error("desktop Handbook launch left a host review modal open");
  }

  console.log("desktop-handbook-ui: launcher target opened a searchable Handbook");
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
