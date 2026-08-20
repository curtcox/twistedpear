import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const bareBin = join(repoRoot, "node_modules/bare/bin/bare");
const tmpDir = join(repoRoot, ".tmp/guida-compiler-bare");

function esbuild(args) {
  return spawnSync(
    process.execPath,
    [join(repoRoot, "node_modules/esbuild/bin/esbuild"), ...args],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

export function measureBare() {
  if (!existsSync(bareBin)) {
    return {
      runtime: "bare",
      available: false,
      error: "bare binary is not installed",
    };
  }
  mkdirSync(tmpDir, { recursive: true });
  const entry = join(tmpDir, "entry.mjs");
  writeFileSync(
    entry,
    `import * as guidaNs from ${JSON.stringify(join(repoRoot, "node_modules/guida/lib/index.js"))};
const loaded = guidaNs.default ?? guidaNs;
const coldParseMs =
  typeof globalThis.__GUIDA_PARSE_START === "number"
    ? Date.now() - globalThis.__GUIDA_PARSE_START
    : 0;
const ok = loaded !== undefined && typeof loaded.make === "function";
console.log(JSON.stringify({
  runtime: "bare",
  available: false,
  coldParseMs,
  compilerLoaded: ok,
  error: "hello compile is not runnable under Bare without a Node fs/XHR host; shipping worklets do not pack the compiler",
}));
`,
  );
  const outfile = join(tmpDir, "bundle.js");
  const bundled = esbuild([
    entry,
    "--bundle",
    "--format=iife",
    "--platform=browser",
    "--banner:js=var __GUIDA_PARSE_START=Date.now();",
    `--outfile=${outfile}`,
  ]);
  if (bundled.status !== 0) {
    return {
      runtime: "bare",
      available: false,
      error: `esbuild bare bundle failed: ${(bundled.stderr || bundled.stdout || "").slice(0, 800)}`,
    };
  }
  const result = spawnSync(bareBin, [outfile], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15_000,
    killSignal: "SIGKILL",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (
    result.error?.code === "ETIMEDOUT" ||
    result.signal === "SIGKILL" ||
    result.signal === "SIGTERM"
  ) {
    return {
      runtime: "bare",
      available: false,
      error:
        "compiler image loaded but hello compile is not runnable under Bare without a Node fs/XHR host",
    };
  }
  const line = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .split("\n")
    .map((row) => row.trim())
    .find((row) => row.startsWith("{") && row.includes("runtime"));
  if (line === undefined) {
    return {
      runtime: "bare",
      available: false,
      error: `bare exited ${result.status}: ${(result.stderr || result.stdout || "").slice(0, 800)}`,
    };
  }
  return JSON.parse(line);
}
