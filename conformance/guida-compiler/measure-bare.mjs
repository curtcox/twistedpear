import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const bareBin = join(repoRoot, "node_modules/bare/bin/bare");
const tmpDir = join(repoRoot, ".tmp/guida-compiler-bare");
const helloDir = join(repoRoot, "packages/guida-twistedpear/templates/hello");

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
  const workletEntry = join(
    repoRoot,
    "packages/guida-twistedpear/dist/worklet.js",
  );
  if (!existsSync(workletEntry)) {
    return {
      runtime: "bare",
      available: false,
      error: "packages/guida-twistedpear/dist/worklet.js is missing; run npm run build",
    };
  }
  mkdirSync(tmpDir, { recursive: true });
  const files = [
    {
      path: "elm.json",
      content: readFileSync(join(helloDir, "elm.json"), "utf8"),
    },
    {
      path: "src/Main.elm",
      content: readFileSync(join(helloDir, "src/Main.elm"), "utf8"),
    },
  ];
  const entry = join(tmpDir, "entry.mjs");
  writeFileSync(
    entry,
    `import { compileGuidaWorkspace } from ${JSON.stringify(workletEntry)};
const files = ${JSON.stringify(files)};
const coldParseMs =
  typeof globalThis.__GUIDA_PARSE_START === "number"
    ? Date.now() - globalThis.__GUIDA_PARSE_START
    : 0;
const heap = () =>
  typeof process !== "undefined" && typeof process.memoryUsage === "function"
    ? process.memoryUsage().heapUsed
    : 0;
let peakHeapBytes = heap();
const compileStarted = Date.now();
const result = await compileGuidaWorkspace(files);
peakHeapBytes = Math.max(peakHeapBytes, heap());
console.log(JSON.stringify({
  runtime: "bare",
  available: true,
  coldParseMs,
  helloCompileMs: Date.now() - compileStarted,
  peakHeapBytes,
  minifiedBytes: result.minifiedBytes,
  compiler: result.compilerVersion,
}));
`,
  );
  const outfile = join(tmpDir, "bundle.js");
  const encoderShim =
    "if(typeof TextEncoder!=='function'){globalThis.TextEncoder=class{" +
    "encode(i=''){const s=String(i);const o=new Uint8Array(s.length);" +
    "for(let n=0;n<s.length;n++)o[n]=s.charCodeAt(n)&255;return o}};}";
  const decoderShim =
    "if(typeof TextDecoder!=='function'){globalThis.TextDecoder=class{" +
    "decode(i=new Uint8Array()){let o='';for(const b of i)o+=String.fromCharCode(b);return o}};}";
  const bundled = esbuild([
    entry,
    "--bundle",
    "--format=esm",
    "--platform=browser",
    `--banner:js=${encoderShim}${decoderShim}globalThis.__GUIDA_PARSE_START=Date.now();`,
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
    timeout: 60_000,
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
      error: "Bare hello compile timed out",
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
