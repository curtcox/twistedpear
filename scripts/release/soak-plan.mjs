/**
 * The plan-duration Stage 8 soaks, in execution order, joined to the work
 * registry ids they close. Kept in one place so `release:soak-status` and
 * `release:record-soaks` cannot drift from each other or from the stage
 * definition in conformance/mac-validation/run.mjs.
 *
 * `plannedMs` mirrors the env values that stage sets; RQ-DESKTOP is cycle-based
 * (864 cycles x 300 s) but occupies the same 72 h of wall clock.
 */
export const SOAK_ITEMS = [
  { id: "RQ-LINK", script: "test:link-soak", plannedMs: 3_600_000 },
  {
    id: "RQ-INTEGRATION",
    script: "test:integration-soak",
    plannedMs: 86_400_000,
  },
  { id: "RQ-DIST", script: "test:dist-soak", plannedMs: 86_400_000 },
  { id: "RQ-MIXED", script: "test:mixed-network-soak", plannedMs: 86_400_000 },
  { id: "RQ-MINIAPP", script: "test:miniapp-soak", plannedMs: 86_400_000 },
  { id: "RQ-IOS", script: "test:ios-soak:required", plannedMs: 86_400_000 },
  {
    id: "RQ-TRANSPORT",
    script: "test:transport-node-soak",
    plannedMs: 259_200_000,
  },
  { id: "RQ-DESKTOP", script: "test:desktop-soak", plannedMs: 259_200_000 },
];

/** Total wall clock the plan asks for, ignoring build time between soaks. */
export const TOTAL_PLAN_MS = SOAK_ITEMS.reduce(
  (total, item) => total + item.plannedMs,
  0,
);

/**
 * @param {{ id: string; status: string; percent?: number }[]} rows
 * @returns {number}
 */
export function remainingPlanMs(rows) {
  let remaining = 0;
  for (const item of SOAK_ITEMS) {
    const row = rows.find((candidate) => candidate.id === item.id);
    if (row?.status === "passed") continue;
    if (row?.status === "running" && typeof row.percent === "number") {
      remaining += item.plannedMs * Math.max(1 - row.percent / 100, 0);
      continue;
    }
    remaining += item.plannedMs;
  }
  return remaining;
}
