#!/usr/bin/env node
/**
 * Canary check documentation helper.
 * Deliberately does not introduce a live Date.now into protocol sources.
 * Records which enforcement layers are configured to catch such a violation.
 *
 * Re-run whenever eslint/ratchet/tripwire/tsc config changes.
 * Manual canary procedure: temporarily add `void Date.now();` to
 * packages/protocol/src/echo.ts and confirm layers below fail.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const report = {
  generatedAt: new Date().toISOString(),
  canaryProcedure:
    "Add `void Date.now();` to packages/protocol/src/echo.ts on a scratch branch, then run npm run sansio.",
  layers: [
    {
      name: "tsc-protocol",
      command: "npm run build --workspace=@twistedpear/protocol",
      catches: "Type errors for DOM/Node APIs when lib excludes them; Date.now itself remains typed via ES2022 Date",
      expectedOnDateNow: "miss (Date.now is in ES lib) — rely on eslint/ratchet/tripwire"
    },
    {
      name: "eslint",
      command: "npm run sansio:eslint",
      catches: "no-restricted-syntax for Date.now / Math.random / setTimeout / console / process.env",
      expectedOnDateNow: "catch"
    },
    {
      name: "ratchet-inventory",
      command: "npm run sansio:ratchet",
      catches: "deny-list scan; fails if violating file is not excepted",
      expectedOnDateNow: "catch"
    },
    {
      name: "tripwire",
      command: "npm test -- packages/effects/test/tripwire.test.ts",
      catches: "runtime replacement of Date.now / Math.random / setTimeout / fetch",
      expectedOnDateNow: "catch (when test bootstrap installs tripwire before protocol import)"
    },
    {
      name: "determinism",
      command: "npm test -- packages/effects/test/determinism.test.ts packages/protocol/test/echo.test.ts",
      catches: "nondeterministic wall-clock reads that diverge double-runs",
      expectedOnDateNow: "catch if Date.now affects trace; may miss if value unused"
    },
    {
      name: "dependency-cruiser",
      command: "npm run sansio:depcruise",
      catches: "imports from protocol into adapters/ or node builtins",
      expectedOnDateNow: "miss (Date.now is not an import)"
    }
  ],
  lastVerified: {
    note: "Baseline recorded at foundation land. Re-verify with scratch-branch canary when enforcement config changes.",
    layersExpectedToCatchDateNow: ["eslint", "ratchet-inventory", "tripwire"],
    minimumIndependentLayers: 3
  }
};

const out = path.join(ROOT, "sansio-canary.json");
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${out}`);
console.log(
  `Canary layers expected to catch Date.now(): ${report.lastVerified.layersExpectedToCatchDateNow.join(", ")}`
);
