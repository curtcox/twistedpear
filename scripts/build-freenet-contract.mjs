import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = resolve(
  root,
  "packages/bridge-freenet/contract/locator/Cargo.toml"
);
const targetDir = resolve(root, ".tmp/freenet-contract-target");
const destination = resolve(
  root,
  "packages/bridge-freenet/contract/locator/locator-contract.wasm"
);

mkdirSync(targetDir, { recursive: true });
const result = spawnSync(
  "cargo",
  [
    "build",
    "--release",
    "--target",
    "wasm32-unknown-unknown",
    "--manifest-path",
    manifest,
    "--target-dir",
    targetDir
  ],
  { cwd: root, stdio: "inherit" }
);
if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
} else {
  copyFileSync(
    resolve(
      targetDir,
      "wasm32-unknown-unknown/release/twistedpear_freenet_locator_contract.wasm"
    ),
    destination
  );
  console.log(`Freenet locator contract written to ${destination}`);
}
