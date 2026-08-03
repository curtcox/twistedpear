#!/usr/bin/env node
// @ts-nocheck
/**
 * Playwright coverage for every cookbook sample's React Native Web page.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../../scripts/static-server.mjs";
import { PAGES_BASE } from "../../scripts/site/paths.mjs";

const conformanceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(conformanceRoot, "../..");
const cookbookRoot = join(repoRoot, "cookbook");
const appsRoot = join(cookbookRoot, "apps");
const pageRoot = join(repoRoot, "site/public/react-native-web");
const expectedStatus = "Running the real cookbook bundle in the web sandbox";

function appNames() {
  return readdirSync(appsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function headingSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function expectedCookbookHref(app) {
  const base = PAGES_BASE.endsWith("/") ? PAGES_BASE.slice(0, -1) : PAGES_BASE;
  for (const name of readdirSync(cookbookRoot)) {
    if (!/^\d{2}-.+\.md$/.test(name)) continue;
    const text = readFileSync(join(cookbookRoot, name), "utf8");
    for (const match of text.matchAll(/^## ([^\n]+)$/gm)) {
      if (headingSlug(match[1]) !== app) continue;
      if (!existsSync(join(appsRoot, app, "app.manifest.json"))) continue;
      return `${base}/cookbook/${name.replace(/\.md$/, "")}#${app}`;
    }
  }
  throw new Error(`no cookbook chapter section found for ${app}`);
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

    const recipeLink = page.locator('[data-testid="cookbook-sample-recipe-link"]');
    const href = await recipeLink.getAttribute("href");
    const expectedHref = expectedCookbookHref(app);
    if (href !== expectedHref) {
      throw new Error(`cookbook link href ${JSON.stringify(href)} instead of ${JSON.stringify(expectedHref)}`);
    }
    if (app === "unit-converter") {
      await page.locator('[data-testid="input"]').fill("1");
      await page.locator('[data-testid="unit-m-ft"]').click();
      await page.locator('[data-testid="result"]').getByText("3.281 ft", { exact: true }).waitFor({
        timeout: 10_000
      });
    }
    if (app === "link-weather") {
      await page.getByText("Peer connection mechanisms").waitFor({ timeout: 10_000 });
      const body = await page.locator('[data-testid="root"]').innerText();
      if (body.includes("This host did not register the mechanism")) {
        throw new Error("link-weather still shows unregistered peer-mechanism fallback");
      }
      if (!body.includes("Ordinary web pages cannot advertise as BLE peripherals")) {
        throw new Error("link-weather missing Bluetooth unsupported reason from the Pages peer registry");
      }
      if (!body.includes("This browser does not implement LP2PRequest/LP2PReceiver")) {
        throw new Error("link-weather missing Local peer-to-peer unsupported reason from the Pages peer registry");
      }
      if (!/Manual code[\s\S]*available/.test(body)) {
        throw new Error("link-weather missing available Manual code mechanism");
      }
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
