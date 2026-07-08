#!/usr/bin/env node
/**
 * Single-Mac validation toolchain doctor (docs/mac-validation.md Stage 0).
 * Verifies every tool the local validation stages need and prints a fix
 * hint for anything missing. Exits non-zero if any required check fails.
 *
 *   npm run doctor:mac            # all checks except live API calls
 *   npm run doctor:mac -- --ai    # also verify Anthropic/OpenAI keys against
 *                                 # the (free) GET /v1/models endpoints
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const liveAi = process.argv.includes("--ai");
const results = [];

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: opts.timeout ?? 30000,
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env }
  }).trim();
}

function check(name, required, fn, fix) {
  try {
    const detail = fn();
    results.push({ name, status: "ok", detail: detail || "" });
  } catch (err) {
    results.push({
      name,
      status: required ? "fail" : "warn",
      detail: String(err.message ?? err).split("\n")[0].slice(0, 120),
      fix
    });
  }
}

const setupHint = "run conformance/mac-validation/setup.sh";

check("macOS", true, () => {
  if (process.platform !== "darwin") throw new Error(`platform is ${process.platform}`);
  return process.platform;
});

check("node >= 22", true, () => {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) throw new Error(`node ${process.version} is too old`);
  return process.version;
}, "install Node 22+");

check("workspace deps (npm ci)", true, () => {
  for (const bin of ["vitest", "playwright", "bare", "tsc"]) {
    if (!existsSync(join(repoRoot, "node_modules/.bin", bin))) {
      throw new Error(`node_modules/.bin/${bin} missing`);
    }
  }
  return "vitest, playwright, bare, tsc present";
}, "npm ci");

check("playwright chromium browser", true, () => {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  const hit = existsSync(cache) && readdirSync(cache).some((d) => d.startsWith("chromium"));
  if (!hit) throw new Error("no chromium in ms-playwright cache");
  run("node", ["--input-type=module", "-e", "import { chromium } from 'playwright'; const browser = await chromium.launch({ headless: true }); await browser.close();"], {
    cwd: repoRoot,
    timeout: 60000
  });
  return "chromium launches headless";
}, "npx playwright install chromium");

check("docker daemon", true, () => {
  run("docker", ["info"], { timeout: 20000 });
  return run("docker", ["--version"]);
}, "start Docker Desktop (or install docker)");

check("docker compose", true, () => run("docker", ["compose", "version"]),
  "install Docker Desktop / compose plugin");

check("conformance docker image", false, () => {
  const out = run("docker", ["compose", "-f", join(repoRoot, "conformance/docker/docker-compose.yml"), "images", "--quiet"], { timeout: 20000 });
  if (!out) throw new Error("compose image not built");
  return "built";
}, "docker compose -f conformance/docker/docker-compose.yml build");

check("Xcode", true, () => run("xcodebuild", ["-version"]).split("\n")[0],
  "install Xcode from the App Store");

check("iOS simulator runtime", true, () => {
  const out = run("xcrun", ["simctl", "list", "runtimes"]);
  const line = out.split("\n").find((l) => l.includes("iOS"));
  if (!line) throw new Error("no iOS runtime installed");
  return line.trim();
}, "Xcode > Settings > Components: install an iOS simulator runtime");

check("CocoaPods", true, () => `pod ${run("pod", ["--version"])}`,
  "brew install cocoapods");

check("JDK 17 (Android Gradle)", true, () => {
  // java_home -v treats the version as a minimum; assert the match really is 17
  const home = run("/usr/libexec/java_home", ["-v", "17"]);
  const version = run(join(home, "bin/java"), ["--version"], { timeout: 15000 });
  if (!/\b17\./.test(version)) throw new Error(`java_home -v 17 resolved to ${home} (${version.split("\n")[0]})`);
  return home;
}, "brew install --cask temurin@17");

const androidHome = process.env.ANDROID_HOME || join(homedir(), "Library/Android/sdk");

check("Android platform-tools (adb)", true, () => {
  const adb = join(androidHome, "platform-tools/adb");
  if (!existsSync(adb)) throw new Error(`${adb} missing`);
  return run(adb, ["version"]).split("\n")[0];
}, setupHint);

check("Android emulator", true, () => {
  const emulator = join(androidHome, "emulator/emulator");
  if (!existsSync(emulator)) throw new Error(`${emulator} missing`);
  return "emulator binary present";
}, setupHint);

check("AVD Pixel_8_API_34", true, () => {
  const emulator = join(androidHome, "emulator/emulator");
  const avds = run(emulator, ["-list-avds"]).split("\n").filter(Boolean);
  if (!avds.includes("Pixel_8_API_34")) throw new Error(`AVDs: ${avds.join(", ") || "none"}`);
  return "Pixel_8_API_34";
}, setupHint);

check("maestro", true, () => {
  return `maestro ${run("maestro", ["--version"], { timeout: 60000 })}`;
}, "curl -fsSL https://get.maestro.mobile.dev | bash");

check("python3", true, () => run("python3", ["--version"]), "brew install python3");

check("rns vector venv (.venv-rns)", false, () => {
  run(join(repoRoot, ".venv-rns/bin/python3"), ["-c", "import RNS"]);
  return "rns importable";
}, "setup.sh --with-vectors (only needed to regenerate committed vectors)");

check("gh CLI auth", false, () => {
  run("gh", ["auth", "status"], { timeout: 20000 });
  return "authenticated";
}, "gh auth login (needed only to dispatch CI soaks)");

check("ANTHROPIC_API_KEY", false, () => {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("not set");
  return "set";
}, "export ANTHROPIC_API_KEY=... (Stage 9 AI layers)");

check("OPENAI_API_KEY", false, () => {
  if (!process.env.OPENAI_API_KEY) throw new Error("not set");
  return "set";
}, "export OPENAI_API_KEY=... (Stage 9 OpenAI fallback/judge layers)");

async function httpCheck(name, url, headers, fix) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    results.push({ name, status: "ok", detail: "models endpoint reachable" });
  } catch (err) {
    results.push({ name, status: "warn", detail: String(err.message ?? err), fix });
  }
}

if (liveAi) {
  if (process.env.ANTHROPIC_API_KEY) {
    await httpCheck("Anthropic API key (live)", "https://api.anthropic.com/v1/models", {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    }, "check the key in the Anthropic Console");
  }
  if (process.env.OPENAI_API_KEY) {
    await httpCheck("OpenAI API key (live)", "https://api.openai.com/v1/models", {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }, "check the key in the OpenAI dashboard");
  }
}

const pad = Math.max(...results.map((r) => r.name.length));
let failed = 0;
for (const r of results) {
  const mark = r.status === "ok" ? "✅" : r.status === "warn" ? "⚠️ " : "❌";
  if (r.status === "fail") failed += 1;
  let line = `${mark} ${r.name.padEnd(pad)}  ${r.detail}`;
  if (r.status !== "ok" && r.fix) line += `\n     fix: ${r.fix}`;
  console.log(line);
}

console.log(failed === 0
  ? "\n[doctor] all required checks passed"
  : `\n[doctor] ${failed} required check(s) failing — see fixes above`);
process.exit(failed === 0 ? 0 : 1);
