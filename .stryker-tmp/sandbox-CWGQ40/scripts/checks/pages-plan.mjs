#!/usr/bin/env node
// @ts-nocheck
import { gates } from "./registry.mjs";

// The Pages build runs the complete Linux PR toolchain itself. Gates that are
// nightly-tier or require another runner publish evidence in parallel and are
// imported before the registry-driven report is rendered.
const imported = gates.filter(
  (gate) => gate.tier === "nightly" || gate.os !== "ubuntu-latest",
);
const matrix = imported.map(({ id, tier, os: runner }) => ({
  id,
  tier,
  runner,
}));

globalThis.process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`);
globalThis.process.stdout.write(
  `imports=${imported.map((gate) => gate.id).join(",")}\n`,
);
