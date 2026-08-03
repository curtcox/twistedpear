// @ts-nocheck
// Deliberately mis-ordered kernel variants, one per SPEC-KERNEL dequeue rule.
// They mutation-test the conformance runner: each variant must fail the
// fixture for the rule it violates, proving the fixtures actually bite.
import { MiniKernel } from "./mini-kernel.mjs";

export const MISORDERINGS = {
  "rule1-transport-before-timers": { timersFirst: false },
  "rule2-descending-node-order": { nodeOrder: "desc" },
  "rule2-descending-timer-id-order": { timerIdOrder: "desc" },
  "rule3-descending-pair-order": { transportPairOrder: "desc" },
  "rule4-lifo-ties": { ties: "lifo" }
};

/** Which ordering fixture each misordering must fail. */
export const TARGET_FIXTURE = {
  "rule1-transport-before-timers": "rule1-timers-before-transport",
  "rule2-descending-node-order": "rule2-timers-by-node-then-timer-id",
  "rule2-descending-timer-id-order": "rule2-timers-by-node-then-timer-id",
  "rule3-descending-pair-order": "rule3-transport-by-source-then-destination",
  "rule4-lifo-ties": "rule4-ties-in-send-order"
};

export function misorderedKernelFactory(name) {
  const order = MISORDERINGS[name];
  if (order === undefined) throw new Error(`unknown misordering: ${name}`);
  return (config) => new MiniKernel(config, order);
}
