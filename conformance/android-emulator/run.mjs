#!/usr/bin/env node
/**
 * Local Android emulator lab runner (E1–E4 UI + E3 foreground adb check).
 * Skips when no adb device or maestro CLI is available unless ANDROID_EMULATOR_REQUIRED=1.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import {
  maestro,
  maestroAvailable,
  maestroHandbookSmoke,
  maestroWithFixtureEnv,
  requireDevice,
  waitForBootComplete,
  waitForFixtureMeta,
  waitForHandbookMeta,
} from "./helpers.mjs";
import { runAndroidHandbookSlice } from "./handbook.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const required = process.env.ANDROID_EMULATOR_REQUIRED === "1";

function dockerAvailable() {
  return spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function startHostPeer() {
  const child = spawn("node", ["conformance/android-emulator/host-peer.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      LEAF_ECHO_HOST: "127.0.0.1",
      LEAF_ECHO_PORT: "4242",
    },
  });

  await sleep(5_000);
  return child;
}

async function main() {
  await runAndroidHandbookSlice();

  let deviceSerial;
  try {
    deviceSerial = requireDevice();
  } catch (error) {
    if (required) {
      throw error;
    }

    console.log(
      `android-emulator: skipped (${error instanceof Error ? error.message : String(error)})`,
    );
    return;
  }

  if (!maestroAvailable()) {
    if (required) {
      throw new Error("maestro CLI not found");
    }

    console.log("android-emulator: skipped (maestro CLI not installed)");
    return;
  }

  if (!dockerAvailable()) {
    if (required) {
      throw new Error("docker not available");
    }

    console.log("android-emulator: skipped (docker not available)");
    return;
  }

  spawnSync(
    "docker",
    [
      "compose",
      "-f",
      "conformance/docker/docker-compose.yml",
      "up",
      "-d",
      "--build",
      "leaf-echo",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  const hostPeer = await startHostPeer();
  const handbookPeer = spawn(
    "node",
    ["conformance/handbook/handbook-peer.mjs"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        LEAF_ECHO_HOST: "127.0.0.1",
        LEAF_ECHO_PORT: "4242",
        HANDBOOK_PEER_LOG_PREFIX: "android-emulator/handbook-peer",
      },
    },
  );
  waitForBootComplete();

  try {
    waitForFixtureMeta();
    waitForHandbookMeta();

    maestro(["test", ".maestro/e1-tcp-install.yaml"]);
    maestro(["test", ".maestro/e2-resource-install.yaml"]);
    maestroWithFixtureEnv(".maestro/e4-ota-rollback.yaml");
    maestroHandbookSmoke();

    const e3 = spawnSync(
      "node",
      ["conformance/android-emulator/e3-foreground.mjs"],
      {
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env, ANDROID_SERIAL: deviceSerial },
      },
    );
    if (e3.status !== 0) {
      throw new Error("e3-foreground failed");
    }

    const e5 = spawnSync(
      "node",
      ["conformance/android-emulator/e5-worker.mjs"],
      {
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env, ANDROID_SERIAL: deviceSerial },
      },
    );
    if (e5.status !== 0) {
      throw new Error("e5-worker failed");
    }

    const freenetGrant = spawnSync(
      "node",
      ["conformance/android-emulator/freenet-grant.mjs"],
      {
        cwd: repoRoot,
        stdio: "inherit",
        env: {
          ...process.env,
          ANDROID_SERIAL: deviceSerial,
          FREENET_GRANT_REQUIRED: "1",
        },
      },
    );
    if (freenetGrant.status !== 0) {
      throw new Error("freenet-grant failed");
    }

    console.log(
      "android-emulator: E1–E5 UI flows + Freenet grant + handbook smoke passed",
    );
  } finally {
    hostPeer.kill("SIGTERM");
    handbookPeer.kill("SIGTERM");
    spawnSync(
      "docker",
      ["compose", "-f", "conformance/docker/docker-compose.yml", "down"],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
