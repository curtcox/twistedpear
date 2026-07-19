// SPEC-MACHINE conformance CLI.
//
//   node conformance/machine/run.mjs                # reference + canary self-test
//   node conformance/machine/run.mjs <module.mjs>   # gate an external machines module
//
// An external module exports `machines` in the shape documented in gate.mjs.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { runMachineGate } from "./gate.mjs";

let failed = false;

function report(label, result, expectPass = true) {
  if (expectPass && result.failures.length === 0) {
    console.log(`PASS ${label} (${result.checks} checks)`);
  } else if (expectPass) {
    failed = true;
    console.error(`FAIL ${label}`);
    for (const failure of result.failures) {
      console.error(`  ${failure.machine} [${failure.check}]: ${failure.message}`);
    }
  }
  return result;
}

const externalPath = process.argv[2];
if (externalPath !== undefined) {
  const module = await import(pathToFileURL(resolve(externalPath)).href);
  if (module.machines === undefined) {
    console.error(`module ${externalPath} does not export 'machines'`);
    process.exit(2);
  }
  report(`external module ${externalPath}`, runMachineGate(module.machines));
  process.exit(failed ? 1 : 0);
}

const reference = await import("./reference-machines.mjs");
report("reference machines (protocol echo)", runMachineGate(reference.machines));

const canaries = await import("./canary-machines.mjs");
for (const [name, machine] of Object.entries(canaries.machines)) {
  const result = runMachineGate({ [name]: machine });
  const expected = canaries.EXPECTED_FAILURE[name];
  const caught = result.failures.some((failure) => failure.check === expected);
  if (caught) {
    console.log(`PASS canary ${name} (caught by ${expected})`);
  } else {
    failed = true;
    console.error(`FAIL canary ${name}: expected a ${expected} failure, saw ${JSON.stringify(result.failures)}`);
  }
}

process.exit(failed ? 1 : 0);
