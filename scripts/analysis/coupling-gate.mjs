#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";
import { authoredPaths } from "./generated-paths.mjs";
import { cruiseResolved, normalizeTarget } from "./coupling-resolve.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");
const RULES = path.join(ROOT, "coupling-rules.json");
const rules = readJson(RULES);

const IN_SCOPE = new RegExp(`^(${rules.roots.join("|")})/`);
/**
 * Test files are consumers of the structure, not part of it.
 *
 * Every package's tests import the conformance helpers and each other's
 * fixtures, so leaving them in makes the graph say that `protocol` depends on
 * the test harness. Measuring the shape of the shipped system means measuring
 * what ships.
 */
const TEST_PATH = /(^|\/)(test|__tests__)\/|\.test\.(ts|tsx|js|mjs|cjs)$/;
const BARREL = new RegExp(rules.barrels.join("|"));

function cruise() {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/dependency-cruiser/bin/dependency-cruise.mjs",
      "--config",
      ".dependency-cruiser.cjs",
      "--output-type",
      "json",
      ...rules.roots,
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
  );
  if (!result.stdout?.trim()) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(
      `dependency-cruiser produced no output (exit ${result.status})`,
    );
  }
  return JSON.parse(result.stdout);
}

/** @param {string} source */
function componentOf(source) {
  const segments = source.split("/");
  return segments[0] === "packages" || segments[0] === "apps"
    ? `${segments[0]}/${segments[1]}`
    : segments[0];
}

const cruised = cruise();
const inScope = cruised.modules
  .map((module) => module.source)
  .filter((source) => IN_SCOPE.test(source));
const authored = new Set(authoredPaths(ROOT, inScope));
const nodes = new Set(
  inScope.filter((source) => authored.has(source) && !TEST_PATH.test(source)),
);

/** @type {Map<string, Set<string>>} */
const out = new Map([...nodes].map((source) => [source, new Set()]));
/** @type {Map<string, Set<string>>} */
const into = new Map([...nodes].map((source) => [source, new Set()]));
let unresolved = 0;
for (const module of cruised.modules) {
  if (!nodes.has(module.source)) continue;
  for (const dependency of module.dependencies) {
    const raw = cruiseResolved(module.source, dependency);
    if (!raw || (!IN_SCOPE.test(raw) && !raw.startsWith("@twistedpear/")))
      continue;
    const target = normalizeTarget(ROOT, raw);
    if (target === null) {
      unresolved += 1;
      continue;
    }
    if (!nodes.has(target) || target === module.source) continue;
    out.get(module.source).add(target);
    into.get(target).add(module.source);
  }
}

// --- module metrics -------------------------------------------------------

const fanOutFindings = [];
for (const [source, targets] of out) {
  const limit = BARREL.test(source) ? rules.maxFanOutBarrel : rules.maxFanOut;
  if (targets.size > limit)
    fanOutFindings.push({ key: source, value: targets.size, limit });
}
const fanInFindings = [];
for (const [source, sources] of into) {
  // A barrel's fan-in is its package's popularity, and every cross-package
  // import in the repository normalizes onto one. Capping that would make
  // `effects/src/index.ts` the worst module here for the crime of being used.
  // Fan-in is a god-module signal only when it bypasses the barrel.
  const limit = BARREL.test(source) ? rules.maxFanInBarrel : rules.maxFanIn;
  if (sources.size > limit)
    fanInFindings.push({ key: source, value: sources.size, limit });
}

// --- cycles ---------------------------------------------------------------

/**
 * Tarjan's strongly-connected components, iteratively.
 *
 * The recursive form overflows the stack here: the `reticulum-ts` channel
 * cycle alone is 30 modules deep and sits inside a much longer acyclic chain.
 * `frame[1]` is the index of the next successor to visit, so a frame is
 * re-entered rather than re-started.
 *
 * @returns {string[][]} each cycle's members, sorted
 */
function stronglyConnectedComponents() {
  const index = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let counter = 0;

  for (const root of nodes) {
    if (index.has(root)) continue;
    const work = [[root, 0]];
    while (work.length > 0) {
      const frame = work.at(-1);
      const [node, next] = frame;
      if (next === 0) {
        index.set(node, counter);
        lowlink.set(node, counter);
        counter += 1;
        stack.push(node);
        onStack.add(node);
      }
      const successors = [...out.get(node)];
      if (next < successors.length) {
        frame[1] += 1;
        const successor = successors[next];
        if (!index.has(successor)) work.push([successor, 0]);
        else if (onStack.has(successor))
          lowlink.set(node, Math.min(lowlink.get(node), index.get(successor)));
        continue;
      }
      if (lowlink.get(node) === index.get(node)) {
        const members = [];
        let popped;
        do {
          popped = stack.pop();
          onStack.delete(popped);
          members.push(popped);
        } while (popped !== node);
        if (members.length > 1) cycles.push(members.sort());
      }
      work.pop();
      const parent = work.at(-1)?.[0];
      if (parent !== undefined)
        lowlink.set(parent, Math.min(lowlink.get(parent), lowlink.get(node)));
    }
  }
  return cycles;
}

const cycles = stronglyConnectedComponents().sort(
  (a, b) => b.length - a.length || a[0].localeCompare(b[0]),
);
// A cycle is keyed by its lexicographically first member. The full member list
// would be a hundred characters of key that changes whenever the cycle does,
// and a line number would go stale on every edit above it.
const cycleFindings = cycles.map((members) => ({
  key: members[0],
  value: members.length,
  members,
}));

// --- component metrics ----------------------------------------------------

/**
 * `Ca` and `Ce` are counted in *components*, not modules.
 *
 * Martin counts classes, and counting modules here would be the obvious
 * translation, but it is not measurable on this graph. Every cross-package
 * import resolves to the target package's barrel, so an outside dependency
 * lands on one module while an inside dependency spreads over hundreds. That
 * asymmetry reports `protocol` — the package everything depends on — at
 * instability 0.97, the least stable thing in the repository, purely because
 * its 200 modules each import `effects` while its 12 consumers all arrive
 * through `index.ts`. Counting whole components is symmetric, immune to how
 * the target package arranges its files, and is the granularity the Stable
 * Dependencies Principle is stated at.
 */
const components = new Map();
const componentOf_ = (source) => {
  const id = componentOf(source);
  if (!components.has(id))
    components.set(id, {
      id,
      modules: 0,
      efferent: new Set(),
      afferent: new Set(),
      dependsOn: new Set(),
    });
  return components.get(id);
};
for (const source of nodes) componentOf_(source).modules += 1;
for (const [source, targets] of out) {
  const from = componentOf_(source);
  for (const target of targets) {
    const to = componentOf_(target);
    if (from.id === to.id) continue;
    from.efferent.add(to.id);
    from.dependsOn.add(to.id);
    to.afferent.add(from.id);
  }
}
const summary = [...components.values()]
  .map((component) => {
    const ca = component.afferent.size;
    const ce = component.efferent.size;
    return {
      id: component.id,
      modules: component.modules,
      ca,
      ce,
      instability: ca + ce === 0 ? 0 : Math.round((ce / (ca + ce)) * 100) / 100,
      dependsOn: [...component.dependsOn].sort(),
    };
  })
  .sort((a, b) => b.modules - a.modules || a.id.localeCompare(b.id));
const instabilityOf = new Map(
  summary.map((component) => [component.id, component.instability]),
);

const limitFor = (map, id) => map[id] ?? map["*"];
const componentFailures = [];
for (const component of summary) {
  const dependsCap = limitFor(rules.maxDependsOn, component.id);
  if (component.dependsOn.length > dependsCap)
    componentFailures.push(
      `${component.id}: depends on ${component.dependsOn.length} components, limit ${dependsCap} (${component.dependsOn.join(", ")}) — raise maxDependsOn in coupling-rules.json in this PR if the new edge is intended`,
    );
  const instabilityCap = limitFor(rules.maxInstability, component.id);
  if (component.instability > instabilityCap)
    componentFailures.push(
      `${component.id}: instability ${component.instability.toFixed(2)} exceeds ${instabilityCap}`,
    );
}

/**
 * Stable Dependencies Principle: depend in the direction of stability. A
 * violation is a component reaching for something more likely to change than
 * itself, which is the edge that will keep breaking it.
 */
const sdpFindings = [];
for (const component of summary) {
  for (const target of component.dependsOn) {
    const delta =
      Math.round((instabilityOf.get(target) - component.instability) * 100) /
      100;
    if (delta > rules.sdpTolerance)
      sdpFindings.push({ key: `${component.id} -> ${target}`, value: delta });
  }
}

// --- drain-semantics comparison ------------------------------------------

const DIMENSIONS = [
  ["fanOutExemptions", "fan-out", fanOutFindings],
  ["fanInExemptions", "fan-in", fanInFindings],
  ["cycleExemptions", "cycle", cycleFindings],
  ["sdpExemptions", "SDP", sdpFindings],
];

if (write) {
  const pinned = {};
  for (const [field, , findings] of DIMENSIONS) {
    pinned[field] = Object.fromEntries(
      [...findings]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((finding) => [finding.key, finding.value]),
    );
  }
  writeJson(RULES, { ...rules, ...pinned });
  console.log(
    `Coupling: pinned ${DIMENSIONS.map(([field, label]) => `${Object.keys(pinned[field]).length} ${label}`).join(", ")} exemption(s) across ${nodes.size} modules.`,
  );
  process.exit(0);
}

const violations = [];
const stale = [];
for (const [field, label, findings] of DIMENSIONS) {
  const pins = rules[field] ?? {};
  const current = new Map(
    findings.map((finding) => [finding.key, finding.value]),
  );
  for (const finding of findings) {
    const allowed = pins[finding.key];
    if (allowed === undefined)
      violations.push(
        `${label}: ${finding.key} = ${finding.value}${finding.limit === undefined ? "" : ` exceeds limit ${finding.limit}`}`,
      );
    else if (finding.value > allowed)
      violations.push(
        `${label}: ${finding.key} grew from a pinned ${allowed} to ${finding.value}`,
      );
  }
  for (const key of Object.keys(pins).sort())
    if (!current.has(key))
      stale.push(
        `${label}: ${key} is clean — delete it from "${field}" in coupling-rules.json`,
      );
}
violations.push(...componentFailures);

writeJson(path.join(ROOT, "coupling.json"), {
  version: 1,
  modules: nodes.size,
  components: summary.length,
  cycles: cycleFindings.length,
  unresolvedDependencies: unresolved,
  violations: violations.length,
  stale: stale.length,
  summary,
  findings: {
    fanOut: fanOutFindings.sort((a, b) => b.value - a.value),
    fanIn: fanInFindings.sort((a, b) => b.value - a.value),
    cycles: cycleFindings,
    sdp: sdpFindings,
  },
});

for (const [label, entries] of [
  ["violation", violations],
  ["stale exemption", stale],
]) {
  if (entries.length === 0) continue;
  console.error(`\nCoupling: ${entries.length} ${label}(s):`);
  for (const entry of entries.slice(0, 50)) console.error(`  ${entry}`);
  if (entries.length > 50)
    console.error(`  … and ${entries.length - 50} more.`);
}
if (violations.length > 0 || stale.length > 0) process.exit(1);
const pinnedCycles = Object.keys(rules.cycleExemptions ?? {}).length;
console.log(
  `Coupling: ${nodes.size} modules, ${summary.length} components, ${cycleFindings.length - pinnedCycles} new cycles (${pinnedCycles} pinned), all limits met.`,
);
