#!/usr/bin/env node
/**
 * USB serial capability probe for iOS (Phase 5 M1).
 */

import { pathToFileURL } from "node:url";
import { resolveUsbSerialCapability } from "../../apps/harness-mobile/modules/usb-serial/src/capability.mjs";

function fail(message) {
  throw new Error(`[ios-sim/usb-probe] ${message}`);
}

export function runUsbSerialProbe() {
  const ios = resolveUsbSerialCapability("ios");
  if (ios.supported || ios.reason !== "unsupported-on-ios") {
    fail(`expected unsupported-on-ios, got ${JSON.stringify(ios)}`);
  }

  const android = resolveUsbSerialCapability("android");
  if (!android.supported || android.reason !== null) {
    fail(`expected android supported, got ${JSON.stringify(android)}`);
  }

  const desktop = resolveUsbSerialCapability("web");
  if (desktop.supported || desktop.reason !== "native-module-unavailable") {
    fail(
      `expected native-module-unavailable on web, got ${JSON.stringify(desktop)}`,
    );
  }

  console.log(
    "[ios-sim/usb-probe] iOS reports unsupported-on-ios; Android path remains available",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runUsbSerialProbe();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
