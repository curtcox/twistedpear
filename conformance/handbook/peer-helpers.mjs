/**
 * Shared helpers for Handbook publisher peer UI tests.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const handbookRoot = dirname(fileURLToPath(import.meta.url));

export const HANDBOOK_FIXTURE_META_PATH = join(handbookRoot, "handbook-fixture-meta.json");
export const HARNESS_BUNDLE_ID = "network.twistedpear.harness";

export function maestroAvailable() {
  const env = {
    ...process.env,
    PATH: `${process.env.HOME ?? ""}/.maestro/bin:${process.env.PATH ?? ""}`
  };
  const result = spawnSync("maestro", ["--version"], { encoding: "utf8", env });
  return result.status === 0;
}

export function maestro(args) {
  const env = {
    ...process.env,
    PATH: `${process.env.HOME ?? ""}/.maestro/bin:${process.env.PATH ?? ""}`
  };
  const result = spawnSync("maestro", args, { stdio: "inherit", env });
  if (result.status !== 0) {
    throw new Error(`maestro ${args.join(" ")} failed`);
  }
}

export function maestroHandbookSmoke() {
  maestro(["test", ".maestro/handbook-smoke.yaml"]);
}

export function waitForHandbookMeta(timeoutMs = 180_000, metaPath = HANDBOOK_FIXTURE_META_PATH) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      if (typeof meta.appId === "string" && meta.appId.length > 0) {
        return meta;
      }
    }

    spawnSync("sleep", ["1"]);
  }

  throw new Error(`Timed out waiting for ${metaPath} (handbook-peer still starting?)`);
}

export function dockerAvailable() {
  return spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
}
