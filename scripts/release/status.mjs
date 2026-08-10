#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evidence,
  latestValidationDir,
  readJson,
  requiredHardware,
  rootFrom,
  soakItems,
} from "./common.mjs";
import { gateStatus } from "../checks/status.mjs";

const defaultRoot = rootFrom(import.meta.url);

function passed(records, id) {
  return records.some(
    (record) => record.id === id && record.status === "passed",
  );
}

function started(records, id) {
  return records.some(
    (record) =>
      record.id === id && ["started", "passed"].includes(record.status),
  );
}

/**
 * A suite counts as wired when CI runs it, whether the workflow names the
 * command directly or reaches it through the checks registry that `gate-plan`
 * expands into the static-analysis matrix. Grepping only the workflow YAML
 * reported registry-driven gates as missing.
 */
function ciWires(root, commands) {
  const files = [
    ".github/workflows/ci.yml",
    ".github/workflows/nightly.yml",
    "scripts/checks/registry.mjs",
  ]
    .map((path) => join(root, path))
    .filter(existsSync)
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  return commands.every((command) => files.includes(command));
}

export function calculate(root = defaultRoot) {
  const records = evidence(root);
  const softwareRegister = readFileSync(
    join(root, "STATUS-SOFTWARE.md"),
    "utf8",
  );
  const hardwareRegister = readFileSync(
    join(root, "STATUS-HARDWARE.md"),
    "utf8",
  );
  const openSoftware = soakItems
    .filter(([, label]) =>
      softwareRegister
        .split("\n")
        .some((line) => line.startsWith(`| ${label} |`)),
    )
    .map(([id]) => id);
  const openHardware = requiredHardware.filter((id) =>
    hardwareRegister.split("\n").some((line) => line.startsWith(`| ${id} |`)),
  );
  const campaign = readJson(
    join(root, "conformance/sim-campaign/artifacts/report.json"),
    {},
  );
  const validationDir = latestValidationDir(root);
  const soakState = validationDir
    ? readJson(join(validationDir, "soak-triage/status.json"), { results: [] })
    : { results: [] };
  const ciRecords = records.filter((record) => record.id.startsWith("ci:"));
  const latestCi =
    ciRecords.sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] ??
    null;
  const harnessFiles = [
    "scripts/release/status.mjs",
    "scripts/release/start-soaks.mjs",
    "scripts/release/watch-soaks.mjs",
    "scripts/release/h20.mjs",
    "scripts/release/record.mjs",
  ];
  const s0 =
    harnessFiles.every((path) => existsSync(join(root, path))) &&
    ciWires(root, [
      "test:release-harness",
      "test:hostile-apps",
      "test:sim-fixed-replay",
    ]);
  const s1 = passed(records, "baseline:S1") && passed(records, "ci:baseline");
  const soakRunnerStarted =
    started(records, "soaks:plan-duration") ||
    soakItems.every(([id]) => started(records, `soak:${id}`));
  const s2 =
    soakRunnerStarted &&
    ["account:H12", "hardware:ordered", "hardware:H20-run"].every((id) =>
      started(records, id),
    );
  const s3 = passed(records, "stage:S3");
  const s4 =
    campaign.difficulty?.heldRung === "L3" &&
    campaign.findings?.length === 0 &&
    campaign.baseline?.regressions?.length === 0;
  const g1 =
    openSoftware.length === 0 &&
    soakItems.every(([id]) => passed(records, `soak:${id}`)) &&
    passed(records, "release:reticulum-ts-0.1.0");
  const g2 =
    openHardware.length === 0 &&
    requiredHardware.every((id) => passed(records, `hardware:${id}`));
  const g3 = s4;
  const g4 = passed(records, "gate:G4");
  const g5 = passed(records, "gate:G5");
  const g6 = passed(records, "gate:G6");
  const g7 =
    s3 &&
    passed(records, "human:S6-round-1") &&
    passed(records, "human:S7-round-2");
  const stages = [
    s0,
    s1,
    s2,
    s3,
    s4,
    g2,
    passed(records, "stage:S6"),
    g5 && g6 && passed(records, "human:S7-round-2"),
    g1 && g2 && g3 && g4 && g5 && g6 && g7,
  ];
  const failedWait = records.find(
    (record) =>
      record.status === "failed" &&
      (record.id.startsWith("soak:") || record.id === "hardware:H20-run"),
  );
  const failedLog = soakState.results?.find(
    (result) => result.status === "failed",
  );
  // The green-gate rule, applied to the driver's single next action. A red gate
  // preempts the stage ladder outright: no stage's work is worth doing on a
  // tree that fails its own checks, and S2 in particular must not start a
  // multi-day soak against one. This sits above the recorded-CI check because
  // it reads live gate state, which goes red before any CI record exists.
  const gates = gateStatus(root);
  let next;
  if (gates.blocking.length > 0)
    next = `Fix the red gate(s) before anything else: ${gates.blocking
      .map((gate) => gate.id)
      .join(", ")} (npm run checks:red)`;
  else if (latestCi?.status === "failed")
    next = `Restore the standing CI invariant (${latestCi.id}) before continuing`;
  else if (failedWait)
    next = `Triage ${failedWait.id}, fix it, and restart the wait`;
  else if (failedLog)
    next = `Triage failed soak log ${failedLog.log}, fix it, and restart the wait`;
  else {
    const index = stages.findIndex((complete) => !complete);
    const s2Next = !soakRunnerStarted
      ? "On the dedicated Mac, run npm run release:start-soaks"
      : !started(records, "hardware:ordered")
        ? "Order the S2 Android phones and Linux box, then record hardware:ordered"
        : !started(records, "account:H12")
          ? "Enroll in the Apple Developer Program, then record account:H12"
          : "On the Linux box, run npm run release:h20 -- start";
    const actions = [
      "Finish and verify the S0 release automation harness",
      "Complete the full PR-tier baseline and record both baseline:S1 and ci:baseline",
      s2Next,
      "Implement and pass the four S3 G7 automated tiers",
      "Hold L3 using the abuse-resistance loop",
      `Collect the next required device row (${requiredHardware.find((id) => !passed(records, `hardware:${id}`)) ?? "G2"})`,
      "Run the S6 adversarial-UX review and comprehension round 1",
      "Build, sign, notarize, and test the S7 release candidate",
      "Complete all gates and execute S8 ship",
    ];
    next = actions[index] ?? "Release complete";
  }
  return {
    gates: [g1, g2, g3, g4, g5, g6, g7],
    stages,
    next,
    registers: { openSoftware, openHardware },
    ci: latestCi,
    checks: gates,
    soaks: soakState.results ?? [],
    records,
  };
}

export function render(state) {
  const lines = [
    "TwistedPear v1 release status",
    "",
    "Gate  Status",
    "----  ------",
  ];
  state.gates.forEach((green, index) =>
    lines.push(`G${index + 1}    ${green ? "GREEN" : "BLOCKED"}`),
  );
  const checks = state.checks ?? { red: [], waived: [], expiring: [] };
  if (checks.red.length > 0) {
    lines.push("", "Static-analysis gates");
    for (const gate of checks.red) {
      const mark =
        gate.waiver === "active"
          ? `waived until ${gate.waiverRecord?.expires}`
          : gate.waiver === "expired"
            ? `RED — waiver expired ${gate.waiverRecord?.expires}`
            : "RED";
      lines.push(
        `  ${gate.id.padEnd(20)} ${mark}${gate.since ? ` (since ${gate.since})` : ""}`,
      );
    }
  }
  for (const waiver of checks.expiring ?? [])
    lines.push(`  waiver for ${waiver.gate} expires ${waiver.expires}`);
  lines.push(
    "",
    `Active stage: S${Math.max(
      0,
      state.stages.findIndex((complete) => !complete),
    )}`,
    `Next action: ${state.next}`,
  );
  return lines.join("\n");
}

export function main(argv = process.argv.slice(2)) {
  const json = argv.includes("--json");
  const rootIndex = argv.indexOf("--root");
  const root = rootIndex >= 0 ? argv[rootIndex + 1] : defaultRoot;
  const state = calculate(root);
  console.log(json ? JSON.stringify(state, null, 2) : render(state));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
