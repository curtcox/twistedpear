// @ts-nocheck
export const VARIANTS = ["desktop", "ios", "android", "web"];
export const ROLES = ["developer", "source", "target", "runner"];

export function emptyCoverage() {
  return {
    cells: Object.fromEntries(
      VARIANTS.map((variant) => [variant, Object.fromEntries(ROLES.map((role) => [role, []]))])
    ),
    empty: VARIANTS.flatMap((variant) => ROLES.map((role) => `${variant}.${role}`))
  };
}

export function coverageFromProof(proof) {
  const coverage = emptyCoverage();
  for (const scenario of proof.scenarios ?? []) {
    if (scenario.status !== "passed" || scenario.nonScoring === true) continue;
    coverage.cells[scenario.developer].developer.push(scenario.id);
    coverage.cells[scenario.runner].runner.push(scenario.id);
    for (const hop of scenario.hops) {
      if (hop.status !== "passed") continue;
      coverage.cells[hop.from].source.push(scenario.id);
      coverage.cells[hop.to].target.push(scenario.id);
    }
  }
  coverage.empty = VARIANTS.flatMap((variant) =>
    ROLES.filter((role) => coverage.cells[variant][role].length === 0).map((role) => `${variant}.${role}`)
  );
  return coverage;
}
