import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  coverageFrame,
  createProductionScenarioRegistry,
  runCampaign,
  serializeCampaignReport,
} from "../../packages/sim-campaign/dist/index.js";

const capabilities = [
  "identity",
  "presence",
  "announce:publish",
  "lxmf:send",
  "storage:kv",
  "resource:fetch",
  "workspace",
  "share:cas",
];
const cells = coverageFrame({ capabilities });
const registry = createProductionScenarioRegistry({ cells });
const report = await runCampaign({
  cells,
  seeds: { from: 1, to: 2 },
  scenario: registry.create,
  parallelism: 8,
});
const body = serializeCampaignReport(report);
const destination = resolve(
  process.argv[2] ?? "conformance/sim-campaign/artifacts/fixed-replay.json",
);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, body);
console.log(
  `fixed production-backed replay: ${report.scenariosRun} scenarios -> ${destination}`,
);
