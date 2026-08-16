#!/usr/bin/env node
/**
 * Verify that every installed dependency carries a valid npm registry
 * signature.
 *
 * The repository already answers "does this dependency have a known
 * vulnerability" (`audit`, `advisories`) and "is its licence acceptable"
 * (`licenses`), and it generates a CycloneDX SBOM. None of those answer "is
 * this tarball the one the registry published" — an SBOM records what was
 * installed, it does not attest to it. `npm audit signatures` checks each
 * resolved package against the registry's signing key, which is what catches a
 * tampered mirror or a cache-poisoned tarball.
 *
 * Attestation counts are reported but not gated. Provenance attestations are
 * opt-in per publisher, so the fraction is a property of the ecosystem rather
 * than of this repository, and gating it would mean failing whenever an
 * upstream maintainer has not adopted them yet. It is recorded so the trend is
 * visible.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const result = spawnSync(
  "npm",
  ["audit", "signatures", "--json", "--include-attestations"],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
);

if (!result.stdout?.trim()) {
  process.stderr.write(result.stderr ?? "");
  console.error(
    `provenance: npm audit signatures produced no output (exit ${result.status})`,
  );
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  process.stderr.write(result.stdout);
  console.error("provenance: could not parse npm audit signatures output");
  process.exit(1);
}

/**
 * With `--include-attestations`, `verified` is the set of packages carrying a
 * provenance attestation — not the set with a valid signature, which npm
 * reports only in its human-readable output. So the counts below are named for
 * what they actually are. `invalid` and `missing` mean the same thing either
 * way, and they are the two the gate turns on.
 */
const invalid = report.invalid ?? [];
const missing = report.missing ?? [];
const attested = report.verified ?? [];

/**
 * An unsigned package is reported, not failed.
 *
 * Packages published before the registry began signing have no signature to
 * check, and there is no action a consumer can take about that beyond dropping
 * the dependency. An *invalid* signature is different in kind: it means the
 * tarball does not match what the registry signed, and there is no benign
 * reading of that.
 */
for (const entry of invalid) {
  console.error(
    `  invalid signature: ${entry.name}@${entry.version} from ${entry.registry ?? "the registry"}`,
  );
}
if (missing.length > 0) {
  console.warn(
    `provenance: ${missing.length} package(s) have no registry signature (published before signing; not gated).`,
  );
}

const identify = (entry) => `${entry.name}@${entry.version}`;

writeJson(path.join(ROOT, "artifacts", "security", "provenance.json"), {
  version: 1,
  generatedAt: new Date().toISOString(),
  attested: attested.length,
  invalid: invalid.map(identify).sort(),
  missing: missing.map(identify).sort(),
});

console.log(
  `provenance: ${invalid.length === 0 ? "PASS" : "FAIL"}; ${invalid.length} invalid signature(s), ${missing.length} unsigned, ${attested.length} with a provenance attestation.`,
);
process.exit(invalid.length === 0 ? 0 : 1);
