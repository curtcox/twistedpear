// SPEC-KERNEL conformance CLI: runs the freestanding runner against the
// reference SimKernel and the independent MiniKernel, then mutation-tests the
// runner by requiring each deliberately mis-ordered variant to fail the
// fixture for the rule it violates. Exits non-zero on any failure.
import { SimKernel } from "../../packages/effects/dist/adapters/sim/index.js";
import { runKernelConformance } from "./runner.mjs";
import { MiniKernel } from "./mini-kernel.mjs";
import { MISORDERINGS, TARGET_FIXTURE, misorderedKernelFactory } from "./misordered.mjs";

let failed = false;

function report(label, result) {
  if (result.failures.length === 0) {
    console.log(`PASS ${label} (${result.checks} checks)`);
  } else {
    failed = true;
    console.error(`FAIL ${label}`);
    for (const failure of result.failures) {
      console.error(`  ${failure.check}: ${failure.message}`);
    }
  }
}

report("SimKernel (reference)", runKernelConformance((config) => new SimKernel(config)));
report("MiniKernel (independent)", runKernelConformance((config) => new MiniKernel(config)));

for (const name of Object.keys(MISORDERINGS)) {
  const result = runKernelConformance(misorderedKernelFactory(name));
  const target = TARGET_FIXTURE[name];
  const caught = result.failures.some((failure) => failure.check === target);
  if (caught) {
    console.log(`PASS mutation ${name} (caught by ${target})`);
  } else {
    failed = true;
    console.error(`FAIL mutation ${name}: fixture ${target} did not catch it`);
    for (const failure of result.failures) {
      console.error(`  saw only: ${failure.check}: ${failure.message}`);
    }
  }
}

process.exit(failed ? 1 : 0);
