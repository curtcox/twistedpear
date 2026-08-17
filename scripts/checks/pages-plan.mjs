#!/usr/bin/env node
import {
  gates,
  deferredOnPages,
  gateRequiresJvm,
  isOffPagesBuild,
} from "./registry.mjs";

// The Pages build runs the Linux PR toolchain that does not need a JVM.
// Nightly, non-Linux, and JVM gates publish evidence in parallel and are
// imported before the registry-driven report is rendered. Deferred gates are
// left off the publish path entirely and reported as deferred.
const offBuildRunner = gates.filter(isOffPagesBuild);
const deferred = gates.filter((gate) => deferredOnPages.has(gate.id));
const imported = offBuildRunner.filter((gate) => !deferredOnPages.has(gate.id));
const javaImported = imported.filter(gateRequiresJvm);
const otherImported = imported.filter((gate) => !gateRequiresJvm(gate));
const toMatrix = (list) =>
  list.map(({ id, tier, os: runner }) => ({ id, tier, runner }));

globalThis.process.stdout.write(
  `matrix=${JSON.stringify(toMatrix(otherImported))}\n`,
);
globalThis.process.stdout.write(
  `java-matrix=${JSON.stringify(toMatrix(javaImported))}\n`,
);
globalThis.process.stdout.write(
  `imports=${imported.map((gate) => gate.id).join(",")}\n`,
);
globalThis.process.stdout.write(
  `deferred=${deferred.map((gate) => gate.id).join(",")}\n`,
);
