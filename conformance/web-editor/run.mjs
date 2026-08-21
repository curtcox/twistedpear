#!/usr/bin/env node
/**
 * Playwright coverage for the static-site DevStudio editor.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { chromium } from "playwright";
import { startStaticServer } from "../../scripts/static-server.mjs";
import { assert, section, step } from "../lib/index.mjs";

const conformanceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(conformanceRoot, "../..");
const pageRoot = join(repoRoot, "site/public/editor");
const running = "DevStudio is running in the browser sandbox";

function runBuild() {
  const build = spawnSync("node", ["scripts/site/build-editor.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

function encodeShare(files) {
  return deflateRawSync(Buffer.from(JSON.stringify(files))).toString(
    "base64url",
  );
}

async function waitRunning(page) {
  await page
    .locator('[data-testid="editor-status"]')
    .getByText(running, { exact: true })
    .waitFor({ timeout: 60_000 });
}

async function approveIfShown(page, timeout = 8_000) {
  const dialog = page.locator('[data-testid="host-confirm-dialog"]');
  try {
    await dialog.waitFor({ state: "visible", timeout });
  } catch {
    return;
  }
  await page.locator('[data-testid="host-confirm-approve"]').click();
  await dialog.waitFor({ state: "hidden", timeout: 10_000 });
}

async function clickTestId(page, id) {
  await page.locator(`[data-testid="${id}"]`).click();
}

async function testJsPreview(page, pageUrl) {
  section("javascript project");
  await page.goto(`${pageUrl}index.html`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  await waitRunning(page);
  step("open seeded hello-app and edit");
  await clickTestId(page, "proj-hello-app");
  await clickTestId(page, "open-hello-app/bundle.js");
  const editor = page.locator('[data-testid="editor"]');
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  const current = await editor.inputValue();
  await editor.fill(
    current.replace("Hello from DevStudio", "Hello from the browser editor"),
  );
  await editor.blur();
  step("preview");
  await clickTestId(page, "preview");
  await approveIfShown(page);
  await page
    .locator('[data-testid="editor-preview"]')
    .getByText("Hello from the browser editor", { exact: true })
    .waitFor({ timeout: 30_000 });
}

async function testGuidaLoop(page, pageUrl) {
  section("guida project");
  await page.goto(`${pageUrl}index.html`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  await waitRunning(page);
  step("create Guida project");
  await clickTestId(page, "new-guida");
  await page
    .getByText("Created Guida project hello-guida.")
    .waitFor({ timeout: 15_000 });
  await clickTestId(page, "open-hello-guida/src/Main.elm");
  const editor = page.locator('[data-testid="editor"]');
  await editor.waitFor({ state: "visible", timeout: 15_000 });
  const valid = await editor.inputValue();
  step("check diagnostic");
  await editor.fill(valid.replace("module Main", "modul Main"));
  await editor.blur();
  await clickTestId(page, "check");
  await page
    .locator('[data-testid="status"]')
    .getByText("1 compiler problem.", { exact: true })
    .waitFor({ timeout: 120_000 });
  step("restore, format, preview");
  await editor.fill(valid.replace("main =", "main="));
  await editor.blur();
  await clickTestId(page, "format");
  await page
    .locator('[data-testid="status"]')
    .getByText("Formatted hello-guida/src/Main.elm.", { exact: true })
    .waitFor({ timeout: 120_000 });
  await clickTestId(page, "preview");
  await approveIfShown(page, 15_000);
  await approveIfShown(page, 120_000);
  await page
    .locator('[data-testid="editor-preview"]')
    .getByText("Tap me", { exact: true })
    .waitFor({ timeout: 120_000 });
}

async function testDeepLink(page, pageUrl) {
  section("deep link");
  await page.goto(`${pageUrl}index.html?app=unit-converter`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  await waitRunning(page);
  await clickTestId(page, "proj-unit-converter");
  await page
    .getByText("Opened project unit-converter.")
    .waitFor({ timeout: 15_000 });
}

async function testShareLink(page, pageUrl) {
  section("share link");
  const encoded = encodeShare({
    "shared-app/app.json": `${JSON.stringify({ name: "shared-app", version: "0.1.0", entry: "bundle.js", capabilities: [] }, null, 2)}\n`,
    "shared-app/bundle.js": `import { ui } from "@twistedpear/miniapp-sdk";\nawait ui.render({ root: { id: "root", type: "text", props: { value: "Shared workspace" } } });\n`,
  });
  await page.goto(`${pageUrl}index.html#w=${encoded}`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  await waitRunning(page);
  await clickTestId(page, "proj-shared-app");
  await page
    .getByText("Opened project shared-app.")
    .waitFor({ timeout: 15_000 });
}

runBuild();
const server = await startStaticServer(pageRoot);
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const [name, run] of [
    ["js-preview", testJsPreview],
    ["guida-loop", testGuidaLoop],
    ["deep-link", testDeepLink],
    ["share-link", testShareLink],
  ]) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      await run(page, server.url);
      assert(
        pageErrors.length === 0,
        `uncaught browser error: ${pageErrors.join("; ")}`,
      );
      console.log(`web-editor: ${name} passed`);
    } catch (error) {
      failures.push(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error(`web-editor: ${name} failed`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  throw new Error(`editor page failures:\n${failures.join("\n")}`);
}

console.log("web-editor: all scenarios passed");
