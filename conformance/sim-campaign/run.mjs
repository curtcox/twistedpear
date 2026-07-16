import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FileHistoryRecorder } from "../../packages/effects/dist/adapters/sim/index.js";
import {
  ContainmentTracker, cellId, containmentRegressions, coverageFrame,
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
const canaries = new Set(canaryIds);
const transports = ["lan", "internet", "ble", "lora"];
const latency = { lan: [5, 4], internet: [120, 100], ble: [40, 30], lora: [1500, 1200] };
const recorder = new FileHistoryRecorder(reproducers, (path, contents) => writeFileSync(path, `${contents}\n`));

function hash(value) {
  let out = 2166136261;
  for (const character of value) out = Math.imul(out ^ character.charCodeAt(0), 16777619);
  return out >>> 0;
}

function scenario(cell, seed) {
  const id = cellId(cell);
  const transport = transports[hash(`${id}|${seed}`) % transports.length];
  const tracker = new ContainmentTracker(transport);
  const [revocationMs, killMs] = latency[transport];
  const jitter = seed % 3;
  const revocation = tracker.revoked(0, ["host"]);
  tracker.nodeStoppedUsingGrant(revocation, "host", revocationMs + jitter);
  tracker.exfiltration({ appId: "campaign-app", grantId: id, peerId: cell.position });
  const kill = tracker.killRequested(0);
  tracker.damage(kill, transport === "lora" ? 3 : 1);
  tracker.severed(kill, killMs + jitter);
  const isCanary = canaries.has(id);
  return {
    config: {
      seed,
      nodes: [{ id: "host", machine: "campaign-canary", initial: { tripped: false }, step: (state, event) =>
        event.kind === "start" ? { state: { tripped: isCanary }, intents: [] } : { state, intents: [] } }],
      oracles: [{ name: `campaign-canary-${hash(id)}`, check: (world) =>
        [...world.nodes.values()].some((state) => state.tripped)
          ? { oracle: `campaign-canary-${hash(id)}`, message: `seeded canary recaptured in ${id}` } : null }],
      recorder
    },
    containment: tracker
  };
}

const options = { cells, seeds: { from: seedFrom, to: seedTo }, scenario, parallelism: 8 };
const first = await runCampaign(options);
const second = await runCampaign(options);
if (serializeCampaignReport(first) !== serializeCampaignReport(second)) throw new Error("campaign rerun was not byte-identical");

const split = Math.floor((seedFrom + seedTo) / 2);
const captured = (minimum, maximum) => new Set(first.findings
  .filter((finding) => finding.seed >= minimum && finding.seed <= maximum)
  .map((finding) => finding.cell));
const completeness = estimateCompleteness({
  canaryIds, firstCapture: captured(seedFrom, split), secondCapture: captured(split + 1, seedTo)
});
const baseline = JSON.parse(readFileSync("conformance/sim-baselines/containment.json", "utf8"));
const regressions = [...containmentRegressions(first.containment, baseline.containment)];
if (completeness.floor < baseline.canaryFloorMin) regressions.push(`canary floor ${completeness.floor} is below ${baseline.canaryFloorMin}`);
const report = { ...first, completeness, baseline: { path: "conformance/sim-baselines/containment.json", regressions }, deterministicRerun: true };
writeFileSync(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`simulation campaign: ${first.scenariosRun} scenarios, ${first.findings.length} canary findings, floor ${completeness.floor.toFixed(3)}`);
if (regressions.length > 0) throw new Error(`simulation campaign regression:\n${regressions.join("\n")}`);

function integerEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be an integer`);
  return value;
}
