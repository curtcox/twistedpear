#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = spawnSync("npm", ["sbom", "--sbom-format", "cyclonedx"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (result.status !== 0) {
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}
fs.writeFileSync(path.join(ROOT, "sbom.cdx.json"), result.stdout);
console.log("Wrote sbom.cdx.json");
