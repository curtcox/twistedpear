import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseHistory,
  rerunHistory,
} from "../../packages/effects/dist/adapters/sim/index.js";
import {
  authoredConfig,
  compileAttackProposal,
} from "../../packages/sim-adversaries/dist/index.js";

const requestedPath = process.argv[2];
const path = resolve(
  requestedPath ??
    "conformance/sim-author/fixtures/model-authored-duplicate.json",
);
const body = readFileSync(path, "utf8");
const encodedBundle = JSON.parse(body);
const bundle = JSON.parse(body, reviveBytes);
if (bundle.schema !== "twistedpear.model-authored-regression-v1")
  throw new Error("invalid model-authored fixture schema");
if (requestedPath === undefined) {
  const provenance = JSON.parse(
    readFileSync(
      resolve("conformance/sim-author/model-authored-provenance.json"),
      "utf8",
    ),
  );
  const retained = provenance.accepted?.some(
    (entry) =>
      JSON.stringify(entry.proposal) === JSON.stringify(bundle.proposal),
  );
  const execution = provenance.executions?.find(
    (entry) =>
      JSON.stringify(entry.proposal) === JSON.stringify(bundle.proposal),
  );
  if (
    !retained ||
    execution?.finding?.oracle !== bundle.expectedOracle ||
    execution?.minimizedTraceLength !== bundle.history?.trace?.length
  ) {
    throw new Error("model-authored provenance does not match retained replay");
  }
}
const compiled = compileAttackProposal(bundle.proposal, [
  "drop",
  "delay",
  "reorder",
  "duplicate",
  "inject",
]);
if (bundle.history === null) {
  const config = authoredConfig(compiled, 44);
  const { SimKernel } =
    await import("../../packages/effects/dist/adapters/sim/index.js");
  const kernel = new SimKernel(config);
  kernel.start();
  kernel.runUntilIdle(10_000);
} else {
  // Keep the recorder's {$bytes: ...} representation intact for parseHistory;
  // JSON-stringifying the revived Uint8Array would turn it into an object map.
  const history = parseHistory(JSON.stringify(encodedBundle.history));
  const config = authoredConfig(compiled, history.config.seed);
  const endpoint = config.nodes.find(
    (node) => node.machine === "authored/endpoint",
  )?.step;
  const adversary = config.nodes.find(
    (node) => node.machine === "authored/adversary",
  )?.step;
  if (endpoint === undefined || adversary === undefined)
    throw new Error("authored replay machines unavailable");
  const replay = rerunHistory(history, {
    resolveMachine: (machine) =>
      machine === "authored/adversary" ? adversary : endpoint,
    oracles: config.oracles ?? [],
  });
  if (replay.violation.violation.oracle !== bundle.expectedOracle)
    throw new Error("model-authored oracle mismatch");
}
console.log(`model-free authored replay passed: ${path}`);

function reviveBytes(_key, value) {
  if (value && typeof value === "object" && typeof value.$bytes === "string") {
    return Uint8Array.from(
      value.$bytes.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
    );
  }
  return value;
}
