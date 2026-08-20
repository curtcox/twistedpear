import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { collectHelloFiles } from "./hello-files.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const tmpDir = join(repoRoot, ".tmp/guida-compiler-web");

function startServer(root) {
  const server = createServer((request, response) => {
    const url = request.url === "/" ? "/index.html" : (request.url ?? "/");
    const path = join(root, decodeURIComponent(url.replace(/^\//u, "")));
    try {
      const body = readFileSync(path);
      const type = path.endsWith(".js")
        ? "text/javascript"
        : path.endsWith(".json")
          ? "application/json"
          : "text/html; charset=utf-8";
      response.writeHead(200, { "content-type": type });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("web measure server has no port"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}/`,
        async stop() {
          await new Promise((done) => server.close(done));
        },
      });
    });
  });
}

function bundleGuida() {
  mkdirSync(tmpDir, { recursive: true });
  const outfile = join(tmpDir, "guida.js");
  const bundled = spawnSync(
    process.execPath,
    [
      join(repoRoot, "node_modules/esbuild/bin/esbuild"),
      join(repoRoot, "node_modules/guida/lib/index.js"),
      "--bundle",
      "--format=iife",
      "--global-name=GuidaLib",
      `--outfile=${outfile}`,
      "--platform=browser",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (bundled.status !== 0) {
    throw new Error(
      `esbuild guida failed: ${(bundled.stderr || bundled.stdout || "").slice(0, 800)}`,
    );
  }
  writeFileSync(join(tmpDir, "files.json"), JSON.stringify(collectHelloFiles()));
  writeFileSync(join(tmpDir, "engine-core.js"), readFileSync(join(here, "engine-core.js")));
  writeFileSync(join(tmpDir, "runner.js"), readFileSync(join(here, "web-runner.js")));
  writeFileSync(
    join(tmpDir, "index.html"),
    `<!doctype html>
<meta charset="utf-8" />
<title>Guida compiler measure</title>
<script src="./guida.js"></script>
<script type="module" src="./runner.js"></script>
`,
  );
  return tmpDir;
}

export async function measureWeb() {
  const root = bundleGuida();
  const server = await startServer(root);
    const browser = await chromium.launch({
      args: ["--enable-precise-memory-info"],
    });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(180_000);
    await page.goto(server.url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__done === true);
    return await page.evaluate(() => window.__result);
  } finally {
    await browser.close();
    await server.stop();
  }
}
