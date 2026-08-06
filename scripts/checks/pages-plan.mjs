#!/usr/bin/env node
import { gates, deferredOnPages } from "./registry.mjs";

// The Pages build runs the complete Linux PR toolchain itself. Gates that are
// nightly-tier or require another runner publish evidence in parallel and are
// imported before the registry-driven report is rendered. Deferred gates are
// left off the publish path entirely and reported as deferred.
const offBuildRunner = gates.filter(
  (gate) => gate.tier === "nightly" || gate.os !== "ubuntu-latest",
);
const deferred = gates.filter((gate) => deferredOnPages.has(gate.id));
const imported = offBuildRunner.filter((gate) => !deferredOnPages.has(gate.id));
const matrix = imported.map(({ id, tier, os: runner }) => ({
  id,
  tier,
  runner,
}));

globalThis.process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`);
globalThis.process.stdout.write(
  `imports=${imported.map((gate) => gate.id).join(",")}\n`,
);
globalThis.process.stdout.write(
  `deferred=${deferred.map((gate) => gate.id).join(",")}\n`,
);
