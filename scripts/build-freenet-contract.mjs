import { copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetDir = resolve(root, ".tmp/freenet-contract-target");

const contracts = [
  {
    name: "locator",
    manifest: resolve(
      root,
      "packages/bridge-freenet/contract/locator/Cargo.toml",
    ),
    artifact: "twistedpear_freenet_locator_contract.wasm",
    destination: resolve(
      root,
      "packages/bridge-freenet/contract/locator/locator-contract.wasm",
    ),
  },
  {
    name: "propagation-set",
    manifest: resolve(
      root,
      "packages/bridge-freenet/contract/propagation-set/Cargo.toml",
    ),
    artifact: "twistedpear_freenet_propagation_set_contract.wasm",
    destination: resolve(
      root,
      "packages/bridge-freenet/contract/propagation-set/propagation-set-contract.wasm",
    ),
  },
  {
    name: "packet-log",
    manifest: resolve(
      root,
      "packages/bridge-freenet/contract/packet-log/Cargo.toml",
    ),
    artifact: "twistedpear_freenet_packet_log_contract.wasm",
    destination: resolve(
      root,
      "packages/bridge-freenet/contract/packet-log/packet-log-contract.wasm",
    ),
  },
];

const selected = process.argv
  .slice(2)
  .map((value) => value.trim())
  .filter(Boolean);
const toBuild =
  selected.length === 0
    ? contracts
    : contracts.filter((contract) => selected.includes(contract.name));
if (toBuild.length === 0) {
  console.error(
    `Unknown Freenet contract(s): ${selected.join(", ")}. Expected: ${contracts
      .map((contract) => contract.name)
      .join(", ")}`,
  );
  process.exitCode = 1;
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

/**
 * rustc bakes the absolute path of every compiled source into the wasm, so an
 * unremapped build is only byte-reproducible on the machine that made it: the
 * committed artifacts carried `/home/runner/.cargo/...` and no local rebuild
 * could ever match them. Remap the two roots that vary — the cargo home, which
 * covers both registry sources and git checkouts, and the workspace itself —
 * onto stable synthetic prefixes so the same toolchain yields the same bytes
 * on any machine.
 */
const cargoHome = process.env.CARGO_HOME ?? resolve(homedir(), ".cargo");
const remap = [
  `--remap-path-prefix=${cargoHome}=/cargo`,
  `--remap-path-prefix=${root}=/twistedpear`,
];
const rustflags = [process.env.RUSTFLAGS ?? "", ...remap]
  .filter(Boolean)
  .join(" ");

for (const contract of toBuild) {
  const result = spawnSync(
    "cargo",
    [
      "build",
      "--release",
      "--target",
      "wasm32-unknown-unknown",
      "--manifest-path",
      contract.manifest,
      "--target-dir",
      targetDir,
    ],
    {
      cwd: dirname(contract.manifest),
      stdio: "inherit",
      env: { ...process.env, RUSTFLAGS: rustflags },
    },
  );
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    process.exit(process.exitCode);
  }
  copyFileSync(
    resolve(targetDir, `wasm32-unknown-unknown/release/${contract.artifact}`),
    contract.destination,
  );
  console.log(
    `Freenet ${contract.name} contract written to ${contract.destination}`,
  );
}
