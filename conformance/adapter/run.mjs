// SPEC-ADAPTER conformance CLI: run the six family pair suites with the
// reference real adapters against the simulated references, then mutation-test
// each suite with its canary adapter. Exits non-zero on any failure.
import { families, runAdapterPair } from "./suite.mjs";
import { realAdapters, simAdapters } from "./adapters.mjs";
import { canaryAdapters } from "./canaries.mjs";

let failed = false;

for (const family of Object.keys(families)) {
  const result = await runAdapterPair(family, realAdapters[family], simAdapters[family]);
  if (result.failures.length === 0) {
    console.log(`PASS ${family} (real ≡ sim, hash ${result.candidateHash})`);
  } else {
    failed = true;
    console.error(`FAIL ${family}`);
    for (const failure of result.failures) console.error(`  ${failure.message}`);
  }
}

for (const [name, canary] of Object.entries(canaryAdapters)) {
  const result = await runAdapterPair(canary.family, canary.factory, simAdapters[canary.family]);
  if (result.failures.length > 0) {
    console.log(`PASS canary ${name} (caught by ${canary.family} suite)`);
  } else {
    failed = true;
    console.error(`FAIL canary ${name}: the ${canary.family} suite did not catch it`);
  }
}

process.exit(failed ? 1 : 0);
