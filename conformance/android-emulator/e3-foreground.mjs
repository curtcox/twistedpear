#!/usr/bin/env node
/**
 * E3 foreground-service survival check (Phase 2 M2 emulator tier).
 * Requires harness running with an active interface; verifies notification + service after Home.
 */

import {
  hasForegroundNotification,
  isForegroundServiceRunning,
  launchHarness,
  maestro,
  maestroAvailable,
  pressHome,
  requireDevice,
  waitForBootComplete,
} from "./helpers.mjs";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function runMaestroSetup() {
  if (!maestroAvailable()) {
    throw new Error(
      "maestro CLI not found (install from https://maestro.mobile.dev)",
    );
  }

  maestro(["test", ".maestro/e3-foreground-setup.yaml"]);
}

async function main() {
  requireDevice();
  waitForBootComplete();
  launchHarness();
  await sleep(2_000);

  await runMaestroSetup();
  await sleep(2_000);

  pressHome();
  await sleep(2_000);

  if (!isForegroundServiceRunning()) {
    throw new Error("NodeForegroundService not running after Home");
  }

  if (!hasForegroundNotification()) {
    throw new Error("foreground-service notification not visible after Home");
  }

  console.log(
    "android-emulator/e3-foreground: service + notification survived background",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
