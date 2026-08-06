#!/usr/bin/env node
/**
 * Store-posture refusal checks for the iOS store variant (Phase 5 M5).
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const harnessRoot = join(repoRoot, "apps/harness-mobile");

function fail(message) {
  throw new Error(`[ios-sim/store-posture] ${message}`);
}

function buildWorklet(posture) {
  const result = spawnSync("npm", ["run", "build:worklet"], {
    cwd: harnessRoot,
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      TWISTEDPEAR_STORE_POSTURE: posture,
    },
  });

  if (result.status !== 0) {
    fail(
      `worklet build failed for ${posture} posture\n${result.stdout}\n${result.stderr}`,
    );
  }
}

function runPolicyProbe(posture) {
  const expectedVariant = posture === "store";
  const script = `
    import {
      refuseStorePosture,
      shouldRefuseDeveloperMode,
      STORE_VARIANT
    } from "./apps/harness-mobile/worklet/store-posture-policy.mjs";

    const outbound = [];
    const send = (message) => outbound.push(message);

    const refusedActions = ["Catalog install", "Dev side-load", "Dev channel"];
    const expectedVariant = ${expectedVariant};

    if (STORE_VARIANT !== expectedVariant) {
      throw new Error(\`STORE_VARIANT mismatch for ${posture}\`);
    }

    for (const action of refusedActions) {
      outbound.length = 0;
      const refused = refuseStorePosture(action, send);
      if (expectedVariant && !refused) {
        throw new Error(\`\${action} should be refused in ${posture} posture\`);
      }

      if (!expectedVariant && refused) {
        throw new Error(\`\${action} should not be refused in ${posture} posture\`);
      }
    }

    if (shouldRefuseDeveloperMode(true) !== expectedVariant) {
      throw new Error("developer mode enable refusal mismatch");
    }

    if (shouldRefuseDeveloperMode(false)) {
      throw new Error("developer mode disable should never be refused");
    }

    console.log("ok");
  `;

  const result = spawnSync("node", ["--input-type=module", "-e", script], {
    cwd: repoRoot,
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(
      `policy probe failed for ${posture} posture\n${result.stdout}\n${result.stderr}`,
    );
  }
}

export async function runStorePostureChecks() {
  try {
    buildWorklet("store");
    runPolicyProbe("store");

    buildWorklet("dev");
    runPolicyProbe("dev");

    console.log(
      "[ios-sim/store-posture] catalog install, dev side-load, dev channel, and developer mode refusal checks passed",
    );
  } finally {
    buildWorklet("dev");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStorePostureChecks().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
