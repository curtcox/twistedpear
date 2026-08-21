/**
 * Capture the static-site DevStudio editor for the authoring guide.
 */
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../../scripts/static-server.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const pageRoot = join(repoRoot, "site/public/editor");
const output = join(repoRoot, "authors/images/02-web-editor.png");

const build = spawnSync("node", ["scripts/site/build-editor.mjs"], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

mkdirSync(dirname(output), { recursive: true });
const server = await startStaticServer(pageRoot);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${server.url}index.html`, { waitUntil: "load", timeout: 60_000 });
  await page
    .locator('[data-testid="editor-status"]')
    .getByText("DevStudio is running in the browser sandbox", { exact: true })
    .waitFor({ timeout: 60_000 });
  await page.locator('[data-testid="proj-hello-app"]').click();
  await page.locator('[data-testid="open-hello-app/bundle.js"]').click();
  await page.locator('[data-testid="editor"]').waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({ path: output, fullPage: false });
  console.log(`wrote ${output}`);
} finally {
  await browser.close();
  await server.close();
}
