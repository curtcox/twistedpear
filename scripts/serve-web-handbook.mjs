#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "./open-browser.mjs";
import { startStaticServer } from "./static-server.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const handbookRoot = join(repoRoot, "conformance/web-handbook");
const port = Number(process.env.TP_HANDBOOK_PORT ?? "9482");

function runBuild() {
  const build = spawnSync("node", ["conformance/web-handbook/build.mjs"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

let server = null;

async function shutdown() {
  if (server !== null) {
    await server.close().catch(() => {});
    server = null;
  }
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

runBuild();
server = await startStaticServer(handbookRoot, { host: "127.0.0.1", port });
const pageUrl = server.url;

console.log(`Handbook (web) ready at ${pageUrl}`);
console.log("Press Ctrl+C to stop.");

openBrowser(pageUrl);

await new Promise(() => {});
