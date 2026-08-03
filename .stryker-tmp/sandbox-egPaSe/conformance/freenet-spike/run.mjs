// @ts-nocheck
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, runMain, section, spawnChecked, step } from "../lib/index.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");

await runMain(async () => {
  section("S1 — Freenet SDK under Bare");
  spawnChecked("node", [join(root, "build-bare.mjs")], { cwd: repoRoot });
  const bare = spawnChecked(
    join(repoRoot, "node_modules/bare/bin/bare"),
    [
      join(root, "bare-freenet.bundle"),
      ...(process.env.FREENET_NODE_URL === undefined
        ? []
        : [
            process.env.FREENET_NODE_URL,
            process.env.FREENET_CONTRACT_KEY ??
              "CJUR37WSMxV7C1yhrr3xSgjnrJT5yuvQGFNcgvSnsvg"
          ])
    ],
    { cwd: repoRoot }
  );
  step(bare.stdout.trim());
  const match = /FREENET_S1 (.+)/.exec(bare.stdout);
  assert(match !== null, "Bare probe did not return structured S1 output");
  const result = JSON.parse(match[1]);
  assert(result.sdkImports === true, "Freenet SDK failed to import under Bare");
  assert(result.webSocketGlobal === true, "Bare WebSocket shim was not installed");
  assert(
    result.shims?.join(",") === "bare-ws@2.0.4,bare-encoding@1.0.3",
    "Unexpected Bare shim inventory"
  );

  if (process.env.FREENET_NODE_URL === undefined) {
    step(
      "No FREENET_NODE_URL: live connection portion skipped (offline-by-default)"
    );
  } else {
    assert(
      result.liveGet?.key ===
        (process.env.FREENET_CONTRACT_KEY ??
          "CJUR37WSMxV7C1yhrr3xSgjnrJT5yuvQGFNcgvSnsvg"),
      "Bare live get returned a different contract key"
    );
    assert(result.liveGet.stateBytes > 0, "Bare live get returned empty state");
    step(`Read ${result.liveGet.stateBytes} Atlas bytes through Bare`);
  }
});
