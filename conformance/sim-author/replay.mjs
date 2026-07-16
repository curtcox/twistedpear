import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseHistory, rerunHistory } from "../../packages/effects/dist/adapters/sim/index.js";
import { authoredConfig, compileAttackProposal } from "../../packages/sim-adversaries/dist/index.js";

const path = resolve(process.argv[2] ?? "conformance/sim-author/fixtures/model-authored-duplicate.json");
const bundle = JSON.parse(readFileSync(path, "utf8"), reviveBytes);
if (bundle.schema !== "twistedpear.model-authored-regression-v1") throw new Error("invalid model-authored fixture schema");
const compiled = compileAttackProposal(bundle.proposal, ["drop", "delay", "reorder", "duplicate", "inject"]);
if (bundle.history === null) {
  const config = authoredConfig(compiled, 44);
  const { SimKernel } = await import("../../packages/effects/dist/adapters/sim/index.js");
  const kernel = new SimKernel(config); kernel.start(); kernel.runUntilIdle(10_000);
} else {
  const history = parseHistory(JSON.stringify(bundle.history));
  const config = authoredConfig(compiled, history.config.seed);
  const endpoint = config.nodes.find((node) => node.machine === "authored/endpoint")?.step;
  const adversary = config.nodes.find((node) => node.machine === "authored/adversary")?.step;
  if (endpoint === undefined || adversary === undefined) throw new Error("authored replay machines unavailable");
  const replay = rerunHistory(history, {
    resolveMachine: (machine) => machine === "authored/adversary" ? adversary : endpoint,
    oracles: config.oracles ?? []
  });
  if (replay.violation.violation.oracle !== bundle.expectedOracle) throw new Error("model-authored oracle mismatch");
}
console.log(`model-free authored replay passed: ${path}`);

function reviveBytes(_key, value) {
  if (value && typeof value === "object" && typeof value.$bytes === "string") {
    return Uint8Array.from(value.$bytes.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);
  }
  return value;
}
