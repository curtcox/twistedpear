/** Diffs, sealed-rule checks, and A-4 evidence-starvation detection. */

import type {
  PolicyDocument,
  PolicyExpression,
  PolicyRule,
} from "./policy-load.js";
import type { PolicySubject } from "./policy-vocabulary.js";

const GRANT_REQUEST = "grant:request" as const;
const LOCATION = "device:location";

export type RuleDiff = {
  readonly added: readonly PolicyRule[];
  readonly removed: readonly PolicyRule[];
  readonly modified: readonly PolicyRule[];
};

export function ruleFingerprint(rule: PolicyRule): string {
  return JSON.stringify({
    id: rule.id,
    subject: rule.subject,
    capability: rule.capability ?? null,
    effect: rule.effect,
    when: rule.when,
    onUnknown: rule.onUnknown,
    sealed: rule.sealed === true,
  });
}

export function diffRules(
  current: PolicyDocument,
  proposed: PolicyDocument,
): RuleDiff {
  const currentById = new Map(current.rules.map((rule) => [rule.id, rule]));
  const proposedById = new Map(proposed.rules.map((rule) => [rule.id, rule]));
  const added: PolicyRule[] = [];
  const removed: PolicyRule[] = [];
  const modified: PolicyRule[] = [];
  for (const rule of proposed.rules) {
    const before = currentById.get(rule.id);
    if (before === undefined) added.push(rule);
    else if (ruleFingerprint(before) !== ruleFingerprint(rule)) {
      modified.push(rule);
    }
  }
  for (const rule of current.rules) {
    if (!proposedById.has(rule.id)) removed.push(rule);
  }
  return { added, removed, modified };
}

export function sealedConflict(
  current: PolicyDocument,
  proposed: PolicyDocument,
): boolean {
  const proposedById = new Map(proposed.rules.map((rule) => [rule.id, rule]));
  for (const rule of current.rules) {
    if (rule.sealed !== true) continue;
    const next = proposedById.get(rule.id);
    if (next === undefined) return true;
    if (ruleFingerprint(rule) !== ruleFingerprint(next)) return true;
  }
  for (const rule of proposed.rules) {
    if (rule.sealed !== true) continue;
    const before = current.rules.find((candidate) => candidate.id === rule.id);
    if (before === undefined || before.sealed !== true) return true;
  }
  return false;
}

function childExpressions(expr: PolicyExpression): readonly PolicyExpression[] {
  if (typeof expr !== "object") return [];
  if ("all" in expr) return expr.all;
  if ("any" in expr) return expr.any;
  if ("not" in expr) return [expr.not];
  if ("known" in expr) return [expr.known];
  if ("assume" in expr) return [expr.assume[0]];
  return [];
}

export function assumesTrue(expr: PolicyExpression): boolean {
  if (typeof expr === "object" && "assume" in expr && expr.assume[1] === true) {
    return true;
  }
  return childExpressions(expr).some(assumesTrue);
}

function usesPlaceIs(expr: PolicyExpression): boolean {
  if (typeof expr === "object" && "place.is" in expr) return true;
  return childExpressions(expr).some(usesPlaceIs);
}

function isLocationGrant(rule: PolicyRule): boolean {
  if (rule.subject !== GRANT_REQUEST) return false;
  if (rule.capability === undefined) return true;
  return (
    rule.capability === LOCATION || rule.capability.startsWith(`${LOCATION}:`)
  );
}

export function couldStarvePlaceIs(
  current: PolicyDocument,
  proposed: PolicyDocument,
  diff: RuleDiff,
): boolean {
  const vulnerable = proposed.rules.some(
    (rule) => rule.onUnknown !== "deny" && usesPlaceIs(rule.when),
  );
  if (!vulnerable) return false;
  if (
    diff.added.some((rule) => rule.effect === "deny" && isLocationGrant(rule))
  ) {
    return true;
  }
  if (
    diff.removed.some(
      (rule) => rule.effect === "allow" && isLocationGrant(rule),
    )
  ) {
    return true;
  }
  return (
    current.base[GRANT_REQUEST] === "allow" &&
    proposed.base[GRANT_REQUEST] === "deny"
  );
}

export function baseWidens(
  current: PolicyDocument,
  proposed: PolicyDocument,
): boolean {
  for (const subject of Object.keys(current.base) as PolicySubject[]) {
    if (
      current.base[subject] === "deny" &&
      proposed.base[subject] === "allow"
    ) {
      return true;
    }
  }
  return false;
}

export function isSyntacticTightening(
  current: PolicyDocument,
  proposed: PolicyDocument,
  diff: RuleDiff,
): boolean {
  if (diff.modified.length > 0) return false;
  if (baseWidens(current, proposed)) return false;
  const addedOk = diff.added.every(
    (rule) =>
      rule.effect === "deny" &&
      rule.onUnknown === "deny" &&
      rule.sealed !== true &&
      !assumesTrue(rule.when),
  );
  const removedOk = diff.removed.every(
    (rule) => rule.effect === "allow" && rule.sealed !== true,
  );
  return addedOk && removedOk;
}
