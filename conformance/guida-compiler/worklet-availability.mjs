import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");

const MARKERS = [
  "compileGuidaWorkspace",
  "guida-twistedpear/dist/worklet",
  "offline Guida compile cannot fetch",
];

function bundleContainsCompiler(relativePath) {
  const path = join(repoRoot, relativePath);
  if (!existsSync(path)) {
    return {
      present: false,
      path: relativePath,
      reason: "bundle file is missing",
    };
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

function packedSample(runtime, evidence, missingReason, bare) {
  if (!evidence.present) {
    return {
      runtime,
      available: false,
      error: missingReason,
      evidence,
    };
  }
  if (bare?.available !== true) {
    return {
      runtime,
      available: true,
      evidence,
      proxyRuntime: "bare",
      error:
        bare?.error ??
        "compiler is packed but Bare hello compile was not measured",
    };
  }
  return {
    runtime,
    available: true,
    evidence,
    proxyRuntime: "bare",
    coldParseMs: bare.coldParseMs,
    helloCompileMs: bare.helloCompileMs,
    peakHeapBytes: bare.peakHeapBytes,
  };
}

export function shippingCompilerAvailability(bare) {
  const desktop = bundleContainsCompiler(
    "apps/host-desktop/worklet/worklet.bundle",
  );
  const android = bundleContainsCompiler(
    "apps/harness-mobile/worklet/worklet.bundle.mjs",
  );
  return {
    "desktop-worklet": packedSample(
      "desktop-worklet",
      desktop,
      desktop.reason,
      bare,
    ),
    "android-worklet": packedSample(
      "android-worklet",
      android,
      android.reason,
      bare,
    ),
    "ios-worklet": packedSample(
      "ios-worklet",
      android,
      "iOS BareKit shares the mobile worklet bundle; compiler module is not packed",
      bare,
    ),
    "ios-rn": {
      runtime: "ios-rn",
      available: false,
      error:
        "production compile runs in the BareKit worklet, not on the React Native / Hermes thread",
    },
  };
}
