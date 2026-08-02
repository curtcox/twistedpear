#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "twistedpear-gitleaks-"));

try {
  const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (listed.status !== 0) throw new Error(listed.stderr || "git ls-files failed");
  for (const relative of listed.stdout.split("\0").filter(Boolean)) {
    const source = path.join(ROOT, relative);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
    const destination = path.join(staging, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  const result = spawnSync(
    "gitleaks",
    [
      "dir",
      staging,
      "--config",
      path.join(ROOT, ".gitleaks.toml"),
      "--redact",
      "--exit-code",
      "1",
      "--no-banner",
      "--report-format",
      "json",
      "--report-path",
      path.join(ROOT, "gitleaks.json")
    ],
    { cwd: ROOT, stdio: "inherit" }
  );
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
