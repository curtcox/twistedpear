#!/usr/bin/env node
/**
 * The census gate: notice when the quality apparatus itself gets smaller.
 *
 * `census-collect.mjs` measures; this compares. Two comparisons run, for two
 * different failure modes:
 *
 * 1. **Against the base branch** (`census.json` at the merge base). This is the
 *    detector that needs no maintenance: anything this change removes or
 *    shrinks shows up as a delta against what was there before it. If the base
 *    has no census — a fresh repository, a shallow clone — the comparison is
 *    skipped rather than guessed at.
 * 2. **Against the recorded floor** (`census-ratchet.json`). This catches what
 *    a pairwise comparison cannot: erosion spread over many changes, each too
 *    small to look like anything, and any branch where the base ref is not
 *    available.
 *
 * Lowering the floor is deliberate and requires `--reason`, which is stored.
 * `git log -p census-ratchet.json` is therefore the log of every time this
 * repository's quality surface got smaller, and why.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson, writeJson } from "../ratchet/lib.mjs";
import { collect } from "./census-collect.mjs";
import { invariants, regressions } from "./census-compare.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const CENSUS = path.join(ROOT, "census.json");
const RATCHET = path.join(ROOT, "census-ratchet.json");
const RULES = readJson(path.join(ROOT, "census-rules.json"));
const write = process.argv.includes("--write");
const reason = process.argv
  .find((argument) => argument.startsWith("--reason="))
  ?.slice("--reason=".length)
  .trim();

const current = collect(ROOT);
const recorded = readJson(RATCHET, null);

if (write) {
  const lost = recorded
    ? regressions(
        { members: recorded.required, counts: recorded.floors },
        current,
        "the recorded floor",
      )
    : [];
  if (lost.length > 0 && !reason) {
    console.error(
      `\nRefusing to lower the census floor; ${lost.length} measurement(s) would regress:`,
    );
    for (const finding of lost) console.error(`  ${finding}`);
    console.error(
      '\nRe-run with --reason="..." to record why the quality surface is smaller.',
    );
    process.exit(1);
  }
  writeJson(RATCHET, {
    version: 1,
    description:
      "Floors for the quality apparatus itself: gates, CI jobs, conformance runners, and test counts that may not shrink. Written by `npm run census:baseline`; a write that lowers anything requires --reason and is recorded in `history`.",
    required: current.members,
    floors: current.counts,
    history: [
      ...(recorded?.history ?? []),
      ...(lost.length > 0
        ? [
            {
              recorded: new Date().toISOString().slice(0, 10),
              reason,
              regressions: lost,
            },
          ]
        : []),
    ],
  });
  const total = Object.values(current.members).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );
  console.log(
    `Census: recorded ${total} member(s) and ${Object.keys(current.counts).length} count(s)${lost.length > 0 ? `, ${lost.length} of them lowered` : ""}.`,
  );
  process.exit(0);
}

const ref = baseRef(ROOT, "CENSUS_BASE_REF");
const base = ref ? jsonAtRef(ROOT, ref, "census.json") : null;
const againstBase = base ? regressions(base, current, `${ref}`) : [];
const againstFloor = recorded
  ? regressions(
      { members: recorded.required, counts: recorded.floors },
      current,
      "the recorded floor",
    )
  : [];
const broken = invariants(current, RULES);

// Deduplicated: a gate deleted in this change regresses against both the base
// branch and the floor, and reporting it twice buries the second finding.
const findings = [...new Set([...broken, ...againstBase, ...againstFloor])];

writeJson(CENSUS, {
  version: 1,
  generatedAt: new Date().toISOString(),
  members: current.members,
  counts: current.counts,
  delta: { base: ref, comparedToBase: base !== null, findings },
});

if (findings.length > 0) {
  console.error(`\nCensus: ${findings.length} regression(s):`);
  for (const finding of findings) console.error(`  ${finding}`);
  console.error(
    "\nEach of these means the repository is checking less than it was. Restore what went missing, or record the loss with:\n" +
      '  npm run census:baseline -- --reason="why the surface is smaller"',
  );
}
if (!base)
  console.warn(
    `Census: no census.json at ${ref ?? "any base ref"}; compared against the recorded floor only.`,
  );
console.log(
  `Census: ${findings.length === 0 ? "PASS" : "FAIL"}; ${current.counts["tests:total"]} tests in ${current.counts["test-files:total"]} files, ${current.members.gates.length} gates, ${current.members.ciGating.length}/${current.members.ciJobs.length} CI jobs gating.`,
);
process.exit(findings.length > 0 ? 1 : 0);
