/** Sans-IO policy evaluator: deny-overrides over an unordered rule set. */

import {
  kleeneAll,
  kleeneAny,
  kleeneAssume,
  kleeneKnown,
  kleeneNot,
  tritFromBoolean,
  type Trit,
} from "./policy-kleene.js";
import type {
  PolicyDocument,
  PolicyExpression,
  PolicyRule,
} from "./policy-load.js";
import {
  parameterizedPredicateKey,
  termNeedKey,
  type PolicySubject,
  type PolicyTerm,
} from "./policy-vocabulary.js";

export type PolicyQuery = {
  readonly subject: PolicySubject;
  readonly capability?: string;
};

export type PolicyTermValue =
  string | number | boolean | readonly string[] | readonly number[];

export type PolicyEvidence = {
  readonly predicates?: Readonly<Record<string, Trit>>;
  readonly terms?: Readonly<Partial<Record<PolicyTerm, PolicyTermValue>>>;
};

export type PolicyDecision = {
  readonly kind: "allow" | "deny";
  readonly source: "base" | "rule";
  readonly ruleIds?: readonly string[];
};

export type PolicyAsk = {
  readonly kind: "ask";
  readonly ruleIds: readonly string[];
};

export type PolicyNeeds = {
  readonly kind: "needs";
  readonly predicates: readonly string[];
};

export type PolicyResult = PolicyDecision | PolicyAsk | PolicyNeeds;

function matchingRules(
  policy: PolicyDocument,
  query: PolicyQuery,
): PolicyRule[] {
  return policy.rules.filter((rule) => {
    if (rule.subject !== query.subject) return false;
    if (query.subject !== "grant:request" || rule.capability === undefined) {
      return true;
    }
    return rule.capability === query.capability;
  });
}

function needPredicate(
  needed: Set<string>,
  evidence: PolicyEvidence,
  key: string,
): void {
  if (evidence.predicates?.[key] === undefined) needed.add(key);
}

function collectListNeeds(
  items: readonly PolicyExpression[],
  evidence: PolicyEvidence,
  needed: Set<string>,
): void {
  for (const item of items) collectNeeds(item, evidence, needed);
}

function parameterizedNeed(
  needed: Set<string>,
  evidence: PolicyEvidence,
  name:
    | "place.is"
    | "time.localHourIn"
    | "approval.by"
    | "approval.byOrg"
    | "user.typedPhrase",
  argument: string | readonly [number, number],
): void {
  needPredicate(needed, evidence, parameterizedPredicateKey(name, argument));
}

function collectCombinatorNeeds(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
  needed: Set<string>,
): boolean {
  if (typeof expr === "boolean" || typeof expr === "string") return false;
  if ("all" in expr) {
    collectListNeeds(expr.all, evidence, needed);
    return true;
  }
  if ("any" in expr) {
    collectListNeeds(expr.any, evidence, needed);
    return true;
  }
  if ("not" in expr) {
    collectNeeds(expr.not, evidence, needed);
    return true;
  }
  if ("known" in expr) {
    collectNeeds(expr.known, evidence, needed);
    return true;
  }
  if ("assume" in expr) {
    collectNeeds(expr.assume[0], evidence, needed);
    return true;
  }
  return false;
}

function collectParameterizedNeeds(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
  needed: Set<string>,
): boolean {
  if (typeof expr === "boolean" || typeof expr === "string") return false;
  if ("place.is" in expr) {
    parameterizedNeed(needed, evidence, "place.is", expr["place.is"]);
    return true;
  }
  if ("time.localHourIn" in expr) {
    parameterizedNeed(
      needed,
      evidence,
      "time.localHourIn",
      expr["time.localHourIn"],
    );
    return true;
  }
  if ("approval.by" in expr) {
    parameterizedNeed(needed, evidence, "approval.by", expr["approval.by"]);
    return true;
  }
  if ("approval.byOrg" in expr) {
    parameterizedNeed(
      needed,
      evidence,
      "approval.byOrg",
      expr["approval.byOrg"],
    );
    return true;
  }
  if ("user.typedPhrase" in expr) {
    parameterizedNeed(
      needed,
      evidence,
      "user.typedPhrase",
      expr["user.typedPhrase"],
    );
    return true;
  }
  return false;
}

function collectNeeds(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
  needed: Set<string>,
): void {
  if (typeof expr === "boolean") return;
  if (typeof expr === "string") {
    needPredicate(needed, evidence, expr);
    return;
  }
  if (collectCombinatorNeeds(expr, evidence, needed)) return;
  if (collectParameterizedNeeds(expr, evidence, needed)) return;
  const term = comparisonTerm(expr);
  if (evidence.terms?.[term] === undefined) needed.add(termNeedKey(term));
}

function comparisonTerm(expr: PolicyExpression): PolicyTerm {
  if (typeof expr === "boolean" || typeof expr === "string") {
    throw new Error("comparisonTerm: not a comparison");
  }
  if ("lt" in expr) return expr.lt[0];
  if ("lte" in expr) return expr.lte[0];
  if ("gt" in expr) return expr.gt[0];
  if ("gte" in expr) return expr.gte[0];
  if ("eq" in expr) return expr.eq[0];
  if ("in" in expr) return expr.in[0];
  if ("subsetOf" in expr) return expr.subsetOf[0];
  throw new Error("comparisonTerm: not a comparison");
}

function predicateTrit(evidence: PolicyEvidence, key: string): Trit {
  return evidence.predicates?.[key] ?? "unknown";
}

function evalCombinator(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
): Trit | undefined {
  if (typeof expr === "boolean" || typeof expr === "string") return undefined;
  if ("all" in expr) {
    return kleeneAll(expr.all.map((item) => evalExpression(item, evidence)));
  }
  if ("any" in expr) {
    return kleeneAny(expr.any.map((item) => evalExpression(item, evidence)));
  }
  if ("not" in expr) return kleeneNot(evalExpression(expr.not, evidence));
  if ("known" in expr) return kleeneKnown(evalExpression(expr.known, evidence));
  if ("assume" in expr) {
    return kleeneAssume(
      evalExpression(expr.assume[0], evidence),
      expr.assume[1],
    );
  }
  return undefined;
}

function evalParameterized(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
): Trit | undefined {
  if (typeof expr === "boolean" || typeof expr === "string") return undefined;
  if ("place.is" in expr) {
    return predicateTrit(
      evidence,
      parameterizedPredicateKey("place.is", expr["place.is"]),
    );
  }
  if ("time.localHourIn" in expr) {
    return predicateTrit(
      evidence,
      parameterizedPredicateKey("time.localHourIn", expr["time.localHourIn"]),
    );
  }
  if ("approval.by" in expr) {
    return predicateTrit(
      evidence,
      parameterizedPredicateKey("approval.by", expr["approval.by"]),
    );
  }
  if ("approval.byOrg" in expr) {
    return predicateTrit(
      evidence,
      parameterizedPredicateKey("approval.byOrg", expr["approval.byOrg"]),
    );
  }
  if ("user.typedPhrase" in expr) {
    return predicateTrit(
      evidence,
      parameterizedPredicateKey("user.typedPhrase", expr["user.typedPhrase"]),
    );
  }
  return undefined;
}

function evalExpression(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
): Trit {
  if (typeof expr === "boolean") return tritFromBoolean(expr);
  if (typeof expr === "string") return predicateTrit(evidence, expr);
  const combinator = evalCombinator(expr, evidence);
  if (combinator !== undefined) return combinator;
  const parameterized = evalParameterized(expr, evidence);
  if (parameterized !== undefined) return parameterized;
  return evalComparison(expr, evidence);
}

function evalMembership(left: PolicyTermValue, expr: PolicyExpression): Trit {
  if (typeof expr === "boolean" || typeof expr === "string") return "unknown";
  if ("in" in expr) {
    if (typeof left !== "string" && typeof left !== "number") return "false";
    return tritFromBoolean(expr.in[1].some((item) => Object.is(item, left)));
  }
  if ("subsetOf" in expr) {
    if (!Array.isArray(left) || left.some((item) => typeof item !== "string")) {
      return "false";
    }
    const allowed = new Set(expr.subsetOf[1]);
    return tritFromBoolean(left.every((item) => allowed.has(item)));
  }
  return "unknown";
}

function evalComparison(
  expr: PolicyExpression,
  evidence: PolicyEvidence,
): Trit {
  const term = comparisonTerm(expr);
  const left = evidence.terms?.[term];
  if (left === undefined) return "unknown";
  if (typeof expr === "boolean" || typeof expr === "string") return "unknown";
  if ("lt" in expr) return numericCompare(left, expr.lt[1], (a, b) => a < b);
  if ("lte" in expr) return numericCompare(left, expr.lte[1], (a, b) => a <= b);
  if ("gt" in expr) return numericCompare(left, expr.gt[1], (a, b) => a > b);
  if ("gte" in expr) return numericCompare(left, expr.gte[1], (a, b) => a >= b);
  if ("eq" in expr) return tritFromBoolean(Object.is(left, expr.eq[1]));
  return evalMembership(left, expr);
}

function numericCompare(
  left: PolicyTermValue,
  right: number,
  compare: (a: number, b: number) => boolean,
): Trit {
  if (typeof left !== "number") return "false";
  return tritFromBoolean(compare(left, right));
}

function ruleYield(
  rule: PolicyRule,
  evidence: PolicyEvidence,
): "allow" | "deny" | "ask" | null {
  const when = evalExpression(rule.when, evidence);
  if (when === "false") return null;
  if (when === "true") return rule.effect;
  return rule.onUnknown;
}

/**
 * Decide a subject under a loaded policy. Missing evidence returns `needs`
 * rather than collapsing to unknown — the host must pass `unknown` explicitly
 * once a sensor has been asked. Deny wins over ask; ask wins over allow;
 * otherwise the subject's base posture applies. Rule order does not matter.
 */
export function evaluatePolicy(
  policy: PolicyDocument,
  query: PolicyQuery,
  evidence: PolicyEvidence,
): PolicyResult {
  const matched = matchingRules(policy, query);
  const needed = new Set<string>();
  for (const rule of matched) collectNeeds(rule.when, evidence, needed);
  if (needed.size > 0) {
    return { kind: "needs", predicates: [...needed].sort() };
  }

  const denies: string[] = [];
  const asks: string[] = [];
  const allows: string[] = [];
  for (const rule of matched) {
    const yielded = ruleYield(rule, evidence);
    if (yielded === "deny") denies.push(rule.id);
    else if (yielded === "ask") asks.push(rule.id);
    else if (yielded === "allow") allows.push(rule.id);
  }
  denies.sort();
  asks.sort();
  allows.sort();
  if (denies.length > 0) {
    return { kind: "deny", source: "rule", ruleIds: denies };
  }
  if (asks.length > 0) return { kind: "ask", ruleIds: asks };
  if (allows.length > 0) {
    return { kind: "allow", source: "rule", ruleIds: allows };
  }
  return { kind: policy.base[query.subject], source: "base" };
}
