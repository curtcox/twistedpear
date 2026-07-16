import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FileHistoryRecorder } from "../../packages/effects/dist/adapters/sim/index.js";
import {
  cellId, containmentRegressions, coverageFrame, createProductionScenarioRegistry,
  estimateCompleteness, injectCanaries, runCampaign, serializeCampaignReport
} from "../../packages/sim-campaign/dist/index.js";

const seedFrom = integerEnv("SIM_CAMPAIGN_SEED_FROM", 1);
const seedTo = integerEnv("SIM_CAMPAIGN_SEED_TO", 10);
const output = resolve(process.env.SIM_CAMPAIGN_OUTPUT ?? "conformance/sim-campaign/artifacts");
const reproducers = resolve(output, "reproducers");
mkdirSync(reproducers, { recursive: true });

const cells = coverageFrame({
  capabilities: ["identity", "presence", "announce:publish", "lxmf:send", "storage:kv", "resource:fetch", "workspace", "share:cas"]
});
const canaryIds = injectCanaries(cells.map(cellId), 24, 0x545750);
const recorder = new FileHistoryRecorder(reproducers, (path, contents) => writeFileSync(path, `${contents}\n`));
const registry = createProductionScenarioRegistry({ cells, canaryIds: new Set(canaryIds), recorder });
if (registry.supportedCells.length !== cells.length) throw new Error("scenario registry does not cover every scheduled cell");

const options = { cells, seeds: { from: seedFrom, to: seedTo }, scenario: registry.create, parallelism: 8 };
const first = await runCampaign(options);
const second = await runCampaign(options);
if (serializeCampaignReport(first) !== serializeCampaignReport(second)) throw new Error("campaign rerun was not byte-identical");

const split = Math.floor((seedFrom + seedTo) / 2);
const captured = (minimum, maximum) => new Set(first.canaryFindings
  .filter((finding) => finding.seed >= minimum && finding.seed <= maximum)
  .map((finding) => finding.cell));
const completeness = estimateCompleteness({
  canaryIds, firstCapture: captured(seedFrom, split), secondCapture: captured(split + 1, seedTo)
});
const baseline = JSON.parse(readFileSync("conformance/sim-baselines/containment.json", "utf8"));
const regressions = [...containmentRegressions(first.containment, baseline.containment)];
if (completeness.floor < baseline.canaryFloorMin) regressions.push(`canary floor ${completeness.floor} is below ${baseline.canaryFloorMin}`);
if (first.findings.length > 0) regressions.push(`${first.findings.length} genuine oracle violation(s) found`);
const report = { ...first, completeness, baseline: { path: "conformance/sim-baselines/containment.json", regressions }, deterministicRerun: true };
writeFileSync(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`simulation campaign: ${first.scenariosRun} real scenarios, ${first.canaryFindings.length} canary findings, ${first.findings.length} genuine findings, floor ${completeness.floor.toFixed(3)}`);
if (regressions.length > 0) throw new Error(`simulation campaign regression:\n${regressions.join("\n")}`);

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}
