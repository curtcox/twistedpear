#!/usr/bin/env node
/**
 * Realtime-media ladder campaign: admission and adaptation driven against the
 * adversarial link profiles the realtime plan names — mid-call bandwidth
 * collapse and recovery, a permanently asymmetric path, bufferbloat, and a
 * flapping path.
 *
 * Safety (one rung per step, headroom respected once the downshift window has
 * run, no upshift inside the hysteresis window) is enforced by the campaign
 * oracle. Recovery and settling are liveness, so they are asserted here from
 * the recorded rung history.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { SimKernel } from "../../packages/effects/dist/adapters/sim/index.js";
import {
  cellId,
  coverageFrame,
  createMediaLadderScenario,
  mediaLadderHistory,
  runCampaign
} from "../../packages/sim-campaign/dist/index.js";

const PROFILES = ["collapse-recover", "asymmetric", "bufferbloat", "flapping"];
const TRANSPORTS = ["lan", "internet", "ble", "lora"];
const cells = coverageFrame({ capabilities: ["device:stream"], positions: ["malicious-peer"], verbs: ["deny"] });
const [cell] = cells;

function fail(message) {
  throw new Error(`sim media ladder: ${message}`);
}

function historyFor(transport, profile) {
  const scenario = createMediaLadderScenario({ transport, profile });
  const kernel = new SimKernel(scenario.config);
  kernel.start();
  kernel.runUntilIdle(1_000_000);
  return mediaLadderHistory(kernel.getNodeState("caller"));
}

const runs = [];
for (const transport of TRANSPORTS) {
  for (const profile of PROFILES) {
    const report = await runCampaign({
      cells: [cell],
      seeds: { from: 1, to: 4 },
      scenario: () => createMediaLadderScenario({ transport, profile })
    });
    if (report.findings.length > 0) {
      fail(`${transport}/${profile}: ${report.findings.map((finding) => finding.violation.message).join("; ")}`);
    }

    const history = historyFor(transport, profile);
    if (history.length === 0) fail(`${transport}/${profile}: the call produced no ladder samples`);
    const first = history[0];
    const worst = history.reduce((left, right) => (right.rungIndex > left.rungIndex ? right : left));
    const last = history[history.length - 1];
    let upshifts = 0;
    let downshifts = 0;
    for (let index = 1; index < history.length; index += 1) {
      if (history[index].rungIndex < history[index - 1].rungIndex) upshifts += 1;
      if (history[index].rungIndex > history[index - 1].rungIndex) downshifts += 1;
    }

    if (downshifts === 0) fail(`${transport}/${profile}: the ladder never degraded`);
    if (profile === "collapse-recover" && last.rungIndex >= worst.rungIndex) {
      fail(`${transport}/${profile}: the call stayed at ${last.rung} after the link recovered`);
    }
    if (profile === "asymmetric") {
      const tail = history.slice(-8).map((sample) => sample.rungIndex);
      if (new Set(tail).size !== 1) fail(`${transport}/${profile}: the ladder hunted instead of settling`);
    }
    if (profile === "flapping" && upshifts > 0) {
      fail(`${transport}/${profile}: upshifted ${upshifts} time(s) inside the hysteresis window`);
    }

    runs.push({
      cell: cellId(cell),
      transport,
      profile,
      samples: history.length,
      startRung: first.rung,
      worstRung: worst.rung,
      endRung: last.rung,
      downshifts,
      upshifts,
      recovered: last.rungIndex < worst.rungIndex
    });
    console.log(
      `${transport}/${profile}: ${first.rung} → ${worst.rung} → ${last.rung} (${downshifts} down, ${upshifts} up)`
    );
  }
}

const destination = resolve(process.argv[2] ?? "conformance/sim-campaign/artifacts/media-ladder.json");
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(
  destination,
  `${JSON.stringify({ schema: "twistedpear.media-ladder-v1", generatedAt: new Date().toISOString(), runs }, null, 2)}\n`
);
console.log(`sim media ladder: ${runs.length} profile runs -> ${destination}`);
