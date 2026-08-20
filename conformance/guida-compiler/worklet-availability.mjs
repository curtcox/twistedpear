import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");

const MARKERS = ["compileGuidaWorkspace", "guida-twistedpear", "JsModuleGuidaCompiler"];

function bundleContainsCompiler(relativePath) {
  const path = join(repoRoot, relativePath);
  if (!existsSync(path)) {
    return { present: false, path: relativePath, reason: "bundle file is missing" };
  }
  const text = readFileSync(path, "utf8");
  const hit = MARKERS.find((marker) => text.includes(marker));
  if (hit === undefined) {
    return {
      present: false,
      path: relativePath,
      reason: "compiler module is not in the packed worklet",
    };
  }
  return { present: true, path: relativePath, marker: hit };
}

export function shippingCompilerAvailability() {
  const desktop = bundleContainsCompiler("apps/host-desktop/worklet/worklet.bundle");
  const android = bundleContainsCompiler(
    "apps/harness-mobile/worklet/worklet.bundle.mjs",
  );
  return {
    "desktop-worklet": {
      runtime: "desktop-worklet",
      available: desktop.present,
      error: desktop.present ? undefined : desktop.reason,
      evidence: desktop,
    },
    "android-worklet": {
      runtime: "android-worklet",
      available: android.present,
      error: android.present ? undefined : android.reason,
      evidence: android,
    },
    "ios-worklet": {
      runtime: "ios-worklet",
      available: android.present,
      error: android.present
        ? undefined
        : "iOS BareKit shares the mobile worklet bundle; compiler module is not packed",
      evidence: android,
    },
    "ios-rn": {
      runtime: "ios-rn",
      available: false,
      error:
        "production compile runs in the BareKit worklet, not on the React Native / Hermes thread",
    },
  };
}
