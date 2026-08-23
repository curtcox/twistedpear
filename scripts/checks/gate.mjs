/**
 * The gate record shape and the policy that decides where a gate runs.
 *
 * Split out of `registry.mjs` when four new gates pushed that file past the
 * script size threshold: this is the machinery, and `registry.mjs` beside it is
 * the declaration. Keeping them apart also means a change to how gates are
 * scheduled reviews separately from a change to which gates exist.
 */

/**
 * PR gates whose command needs compiled workspace packages.
 *
 * CI runs `npm run build` only for these. Every other PR gate must produce the
 * same result on a clean checkout as on a tree that has already been built —
 * a gate whose answer depends on `dist/` existing is not a gate.
 */
export const prebuildPrGates = [
  "unit-tests",
  "coverage",
  "structure",
  "properties",
  "harness-mobile-typecheck",
  "census",
];

// Gates too slow to sit on the Pages publish path. The Pages workflow neither
// runs nor imports these; it records them as deferred and publishes without
// them, so a ~70 minute gate cannot hold the site hostage. They still run on
// the nightly schedule, and mutation-policy keeps reporting the committed
// ratchet floor in the meantime.
export const deferredOnPages = new Set(["mutation"]);

/** JVM-backed gates. GitHub downloads every `uses:` at job start, `if:` or
 * not, so these must not share a matrix template with setup-java. */
export function gateRequiresJvm(gate) {
  return gate.requires.includes("jvm");
}

/** Nightly, non-Linux, and JVM gates publish evidence in parallel rather than
 * running inside the Linux Pages build, which must not list setup-java. */
export function isOffPagesBuild(gate) {
  return (
    gate.tier === "nightly" ||
    gate.os !== "ubuntu-latest" ||
    gateRequiresJvm(gate)
  );
}

export function gate(
  id,
  title,
  script,
  tier,
  requires,
  artifacts = [],
  summary = "generic",
  os = "ubuntu-latest",
) {
  return {
    id,
    title,
    command: ["npm", "run", script],
    tier,
    requires,
    artifacts: [
      `artifacts/checks/${id}.json`,
      `artifacts/logs/${id}.log`,
      ...artifacts,
    ],
    summary,
    os,
  };
}
