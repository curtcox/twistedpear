#!/usr/bin/env node
// @ts-nocheck

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "./open-browser.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const wsPort = Number(process.env.TP_WEB_HOST_WS_PORT ?? "9480");
const webHostDir = join(repoRoot, "dist/web-host");
const tpBin = join(repoRoot, "packages/cli/dist/bin/tp.js");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureBuilt() {
  if (!existsSync(tpBin)) {
    console.log("Building workspace…");
    run("npm", ["run", "build"]);
  }

  if (!existsSync(webHostDir)) {
    console.log("Building web-host static bundle…");
    run("npm", ["run", "build:web-host"]);
  }
}

ensureBuilt();

const nodeProcess = spawn(
  process.execPath,
  [tpBin, "node", "--ws-listen", String(wsPort), "--serve-web", webHostDir],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env }
  }
);

const pageUrl = `http://127.0.0.1:${wsPort}/`;

console.log(`Web host ready at ${pageUrl}`);
console.log("Press Ctrl+C to stop.");

setTimeout(() => openBrowser(pageUrl), 1500);

nodeProcess.on("exit", (code, signal) => {
  if (signal !== null) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  nodeProcess.kill("SIGINT");
});
process.on("SIGTERM", () => {
  nodeProcess.kill("SIGTERM");
});
