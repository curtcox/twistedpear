#!/usr/bin/env node
/**
 * W2 Playwright: chat, file-drop, and board examples install + launch + exercise in browser.
 */

import { spawnSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const examplesRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(examplesRoot, "../..");

/** The examples this gate asserts still install, launch, and render. */
const EXPECTED_EXAMPLES = ["chat", "file-drop", "board"];

/**
 * Publish the result as an artifact, not just as an exit code.
 *
 * `/results/` renders this: without it the gate is a bare green dot, which is
 * how a browser surface that had been failing for 40+ runs could have gone on
 * looking indistinguishable from one that works. Written on the failure path
 * too, so a red run publishes which examples got through and why the rest did
 * not.
 */
function writeReport(report) {
  const directory = join(repoRoot, "artifacts/web-examples");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "web-examples.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

function runBuild() {
  const build = spawnSync("node", ["conformance/web-examples/build.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

function startStaticServer(root) {
  const server = createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }

    serveStatic(root, request.url ?? "/", request.method === "HEAD", response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to determine static server port"));
        return;
      }

      resolve({
        port: address.port,
        async close() {
          await new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error === undefined) {
                closeResolve();
              } else {
                closeReject(error);
              }
            });
          });
        },
      });
    });
  });
}

function serveStatic(staticRoot, requestPath, headOnly, response) {
  const pathname = new URL(requestPath, "http://localhost").pathname;
  const relativePath =
    pathname === "/" ? "page.html" : pathname.replace(/^\/+/, "");
  const resolvedRoot = normalize(staticRoot);
  const resolvedPath = normalize(join(resolvedRoot, relativePath));

  if (
    !resolvedPath.startsWith(resolvedRoot + sep) &&
    resolvedPath !== resolvedRoot
  ) {
    response.writeHead(403);
    response.end();
    return;
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.writeHead(200, {
    "content-type": staticContentType(extname(resolvedPath)),
  });
  if (headOnly) {
    response.end();
    return;
  }

  createReadStream(resolvedPath).pipe(response);
}

function staticContentType(extension) {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

/** Last in-page state observed, so the failure path can report partial progress. */
let lastSnapshot = null;

async function runPlaywright(pageUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on("console", (message) => {
      console.log(`browser:${message.type()}: ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      console.error(`browser:pageerror: ${error.message}`);
    });
    page.on("worker", (worker) => {
      console.log(`browser:worker started: ${worker.url()}`);
      worker.on("close", () => {
        console.log(`browser:worker closed: ${worker.url()}`);
      });
    });

    await page.goto(pageUrl, { waitUntil: "load", timeout: 60_000 });
    try {
      // "error" is a terminal status too: main() has a .catch that sets it.
      // Waiting only for "done" turned every in-page failure into an opaque
      // 60s Playwright timeout that discarded the diagnosis entry.mjs produced.
      await page.waitForFunction(
        () =>
          globalThis.__WEB_EXAMPLES__?.status === "done" ||
          globalThis.__WEB_EXAMPLES__?.status === "error",
        undefined,
        {
          timeout: 60_000,
        },
      );
    } catch (error) {
      const snapshot = await page.evaluate(() => globalThis.__WEB_EXAMPLES__);
      lastSnapshot = snapshot;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${message} — last in-page state: ${JSON.stringify(snapshot)}`,
      );
    }

    const result = await page.evaluate(() => globalThis.__WEB_EXAMPLES__);
    lastSnapshot = result;
    if (result?.status !== "done") {
      throw new Error(
        `web examples spike incomplete: ${JSON.stringify(result)}`,
      );
    }

    const passed = Array.isArray(result.passed) ? result.passed : [];
    const missing = EXPECTED_EXAMPLES.filter((name) => !passed.includes(name));
    if (missing.length > 0) {
      throw new Error(
        `expected ${EXPECTED_EXAMPLES.join(", ")} to pass; missing ${missing.join(", ")} (passed: ${JSON.stringify(passed)})`,
      );
    }

    return result;
  } finally {
    await browser.close();
  }
}

let staticServer = null;

try {
  runBuild();
  staticServer = await startStaticServer(examplesRoot);
  const pageUrl = `http://127.0.0.1:${staticServer.port}/`;
  const result = await runPlaywright(pageUrl);
  writeReport({
    ok: true,
    expected: EXPECTED_EXAMPLES,
    passed: result.passed,
    failed: [],
  });
  console.log(`web-examples: ${JSON.stringify({ passed: result.passed })}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const passed = Array.isArray(lastSnapshot?.passed) ? lastSnapshot.passed : [];
  writeReport({
    ok: false,
    expected: EXPECTED_EXAMPLES,
    passed,
    failed: EXPECTED_EXAMPLES.filter((name) => !passed.includes(name)),
    message,
  });
  console.error(`web-examples: failed — ${message}`);
  process.exit(1);
} finally {
  if (staticServer !== null) {
    await staticServer.close();
  }
}

console.log("web-examples: passed");
