#!/usr/bin/env node
/**
 * Playwright coverage for every cookbook sample's React Native Web page.
 */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../../scripts/static-server.mjs";

const conformanceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(conformanceRoot, "../..");
const appsRoot = join(repoRoot, "cookbook/apps");
const pageRoot = join(repoRoot, "site/public/react-native-web");
const expectedStatus = "Running the real cookbook bundle in the web sandbox";

function appNames() {
  return readdirSync(appsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function runBuild() {
  const build = spawnSync("node", ["scripts/site/build-react-native-web-samples.mjs"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

async function testApp(browser, pageUrl, app) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(`${pageUrl}index.html?app=${encodeURIComponent(app)}`, {
      waitUntil: "load",
      timeout: 60_000
    });
    if (response === null || !response.ok()) {
      throw new Error(`page request failed with status ${response?.status() ?? "unknown"}`);
    }

    await page.locator('[data-testid="cookbook-sample-status"]').getByText(expectedStatus, { exact: true }).waitFor({
      timeout: 30_000
    });
    await page.locator('[data-testid="root"]').waitFor({ state: "visible", timeout: 30_000 });

    const selectedTitle = await page.locator('[data-testid="cookbook-sample-title"]').textContent();
    const expectedTitle = app.replace(/(^|-)([a-z])/g, (_match, separator, letter) =>
      `${separator ? " " : ""}${letter.toUpperCase()}`
    );
    if (selectedTitle !== expectedTitle) {
      throw new Error(`selected ${JSON.stringify(selectedTitle)} instead of ${JSON.stringify(expectedTitle)}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`uncaught browser error: ${pageErrors.join("; ")}`);
    }
  } finally {
    await page.close();
  }
}

runBuild();
const apps = appNames();
if (apps.length !== 25) throw new Error(`expected 25 cookbook apps, found ${apps.length}`);

const server = await startStaticServer(pageRoot);
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const app of apps) {
    try {
      await testApp(browser, server.url, app);
      console.log(`web-cookbook: ${app} passed`);
    } catch (error) {
      failures.push(`${app}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`web-cookbook: ${app} failed`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  throw new Error(`cookbook page failures:\n${failures.join("\n")}`);
}

console.log(`web-cookbook: all ${apps.length} sample pages passed`);
