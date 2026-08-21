#!/usr/bin/env node
/**
 * Build the harness-mobile Bare worklet bundle for react-native-bare-kit.
 * Requires `npm run build` at the repo root first.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const harnessRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(harnessRoot, "../..");
const assemble = spawnSync(
  process.execPath,
  [join(harnessRoot, "scripts/assemble-worklet-entries.mjs")],
  { cwd: repoRoot, stdio: "inherit" },
);
if (assemble.status !== 0) {
  process.exit(assemble.status ?? 1);
}
const guidaBuild = spawnSync(
  "npm",
  ["run", "build", "--workspace=@twistedpear/guida-twistedpear"],
  { cwd: repoRoot, stdio: "inherit" },
);
if (guidaBuild.status !== 0) {
  process.exit(guidaBuild.status ?? 1);
}
const entry = join(harnessRoot, "worklet/prelude.mjs");
const output = join(harnessRoot, "worklet/worklet.bundle.mjs");
const nobleCrypto = join(repoRoot, "conformance/bare-interop/noble-crypto.mjs");
const importsPath = join(harnessRoot, "worklet/imports.generated.json");
const posturePath = join(harnessRoot, "worklet/store-posture.generated.mjs");
const packetLogWasmModule = join(
  harnessRoot,
  "worklet/packet-log-wasm.generated.mjs",
);
const propagationSetWasmModule = join(
  harnessRoot,
  "worklet/propagation-set-wasm.generated.mjs",
);

function writeWasmBase64Module(wasmRelativePath, modulePath, exportName) {
  const base64 = readFileSync(join(repoRoot, wasmRelativePath)).toString(
    "base64",
  );
  writeFileSync(
    modulePath,
    `export const ${exportName} = ${JSON.stringify(base64)};\n`,
  );
}

writeWasmBase64Module(
  "packages/bridge-freenet/contract/packet-log/packet-log-contract.wasm",
  packetLogWasmModule,
  "PACKET_LOG_WASM_BASE64",
);
writeWasmBase64Module(
  "packages/bridge-freenet/contract/propagation-set/propagation-set-contract.wasm",
  propagationSetWasmModule,
  "PROPAGATION_SET_WASM_BASE64",
);

const freenetStdlibEsm = join(
  repoRoot,
  "conformance/freenet-spike/freenet-stdlib-esm.mjs",
);
const freenetStdlibCommonEsm = join(
  repoRoot,
  "conformance/freenet-spike/freenet-stdlib-common-esm.mjs",
);
const freenetStdlibClientRequestEsm = join(
  repoRoot,
  "conformance/freenet-spike/freenet-stdlib-client-request-esm.mjs",
);

writeFileSync(
  importsPath,
  `${JSON.stringify(
    {
      "@noble/hashes/crypto": nobleCrypto,
      "@noble/ciphers/crypto": nobleCrypto,
      "@noble/curves/crypto": nobleCrypto,
      ws: join(repoRoot, "conformance/freenet-spike/bare-websocket-shim.mjs"),
      "@freenetorg/freenet-stdlib": freenetStdlibEsm,
      "@freenetorg/freenet-stdlib/common": freenetStdlibCommonEsm,
      "@freenetorg/freenet-stdlib/client-request":
        freenetStdlibClientRequestEsm,
      "@twistedpear/reticulum-ts": join(
        repoRoot,
        "packages/reticulum-ts/dist/worklet.js",
      ),
      "@twistedpear/bridge-hyper": join(
        repoRoot,
        "packages/bridge-hyper/dist/worklet.js",
      ),
      "@twistedpear/miniapp-runtime": join(
        repoRoot,
        "packages/miniapp-runtime/dist/worklet.js",
      ),
      "node:os": join(repoRoot, "conformance/bare-interop/node-os-stub.mjs"),
      os: join(repoRoot, "conformance/bare-interop/node-os-stub.mjs"),
    },
    null,
    2,
  )}\n`,
);

const storePosture =
  process.env.TWISTEDPEAR_STORE_POSTURE === "store" ? "store" : "dev";
writeFileSync(
  posturePath,
  `export const STORE_POSTURE = ${JSON.stringify(storePosture)};\nexport const STORE_VARIANT = ${JSON.stringify(storePosture === "store")};\n`,
);

const result = spawnSync(
  "npx",
  [
    "bare-pack",
    "--linked",
    "--defer",
    "node:crypto",
    "--defer",
    "node:net",
    "--defer",
    "node:dgram",
    "--defer",
    "node:fs",
    "--defer",
    "node:path",
    // opusscript's Emscripten glue optionally `require("fs")` / `require("path")`
    // (bare ids, not node:); defer so bare-pack can include the WASM Opus path.
    "--defer",
    "fs",
    "--defer",
    "path",
    "--defer",
    "node:os",
    "--defer",
    "node:worker_threads",
    "--imports",
    importsPath,
    "--host",
    "android",
    "--host",
    "ios",
    "--out",
    output,
    entry,
  ],
  { stdio: "inherit", cwd: harnessRoot },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// Bare/JSC rejects TextDecoder("utf-16le"). Emscripten's asm.js Opus glue
// constructs that decoder at module load; when it is missing it already falls
// back to a manual UTF-16 loop. Neutralize the constructor in the packed
// string so Bare never throws INVALID_LABEL while loading opusscript.
{
  const packed = readFileSync(output, "utf8");
  const neutralized = packed
    .replaceAll('new TextDecoder(\\"utf-16le\\")', "void 0")
    .replaceAll('new TextDecoder("utf-16le")', "void 0")
    .replaceAll("new TextDecoder('utf-16le')", "void 0");
  if (neutralized === packed) {
    console.warn("worklet: no utf-16le TextDecoder sites found to neutralize");
  } else {
    writeFileSync(output, neutralized);
    console.log(
      "worklet: neutralized Emscripten utf-16le TextDecoder sites for Bare",
    );
  }
}

{
  const packed = readFileSync(output, "utf8");
  if (packed.includes("reticulum-interfaces/dist/auto.js")) {
    throw new Error(
      "worklet bundle includes reticulum-interfaces/dist/auto.js (node:os); import AutoInterfaceBridge/policy instead",
    );
  }
}

console.log(`worklet bundle written to ${output}`);
console.log(`store posture: ${storePosture}`);
