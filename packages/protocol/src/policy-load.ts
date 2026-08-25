/** Load and validate a user-policy document. I/O-free; rejects unknown vocabulary. */

import {
  isPolicyComparison,
  isPolicyCombinator,
  isPolicyEffect,
  isPolicyNullaryPredicate,
  isPolicyParameterizedPredicate,
  isPolicySubject,
  isPolicyTerm,
  isPolicyUnknownCollapse,
  POLICY_LANGUAGE_VERSION,
  POLICY_SUBJECTS,
  type PolicyEffect,
  type PolicyNullaryPredicate,
  type PolicySubject,
  type PolicyTerm,
  type PolicyUnknownCollapse,
} from "./policy-vocabulary.js";

export type PolicyLoadCode =
  | "unknown-version"
  | "unknown-subject"
  | "unknown-predicate"
  | "unknown-combinator"
  | "missing-collapse"
  | "invalid-shape";

export class PolicyLoadError extends Error {
  readonly code: PolicyLoadCode;

  constructor(code: PolicyLoadCode, message: string) {
    super(message);
    this.name = "PolicyLoadError";
    this.code = code;
  }
}

export type PolicyExpression =
  | boolean
  | PolicyNullaryPredicate
  | { readonly all: readonly PolicyExpression[] }
  | { readonly any: readonly PolicyExpression[] }
  | { readonly not: PolicyExpression }
  | { readonly known: PolicyExpression }
  | { readonly assume: readonly [PolicyExpression, boolean] }
  | { readonly "place.is": string }
  | { readonly "time.localHourIn": readonly [number, number] }
  | { readonly "approval.by": string }
  | { readonly "approval.byOrg": string }
  | { readonly "user.typedPhrase": string }
  | { readonly lt: readonly [PolicyTerm, number] }
  | { readonly lte: readonly [PolicyTerm, number] }
  | { readonly gt: readonly [PolicyTerm, number] }
  | { readonly gte: readonly [PolicyTerm, number] }
  | { readonly eq: readonly [PolicyTerm, string | number | boolean] }
  | { readonly in: readonly [PolicyTerm, readonly (string | number)[]] }
  | { readonly subsetOf: readonly [PolicyTerm, readonly string[]] };

export interface PolicyRule {
  readonly id: string;
  readonly subject: PolicySubject;
  readonly capability?: string;
  readonly effect: PolicyEffect;
  readonly when: PolicyExpression;
  readonly onUnknown: PolicyUnknownCollapse;
  readonly sealed?: boolean;
  readonly note?: string;
}

export type PolicyBase = { readonly [K in PolicySubject]: PolicyEffect };

export interface PolicyDocument {
  readonly version: typeof POLICY_LANGUAGE_VERSION;
  readonly base: PolicyBase;
  readonly rules: readonly PolicyRule[];
}

const RULE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RULE_KEYS = new Set([
  "id",
  "subject",
  "capability",
  "effect",
  "when",
  "onUnknown",
  "sealed",
  "note",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: PolicyLoadCode, message: string): never {
  throw new PolicyLoadError(code, message);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail("invalid-shape", `${path} must be an object`);
  return value;
}

/**
 * Parse a policy document. Unknown subjects, predicates, combinators, or
 * language versions fail closed (P-R1). A missing onUnknown fails closed (P-R2).
 */
export function loadPolicy(input: unknown): PolicyDocument {
  const document = expectRecord(input, "document");
  for (const key of Object.keys(document)) {
    if (
      key !== "version" &&
      key !== "base" &&
      key !== "rules" &&
      key !== "$schema"
    ) {
      fail("invalid-shape", `document has unknown field ${key}`);
    }
  }
  if (document.version !== POLICY_LANGUAGE_VERSION) {
    fail(
      "unknown-version",
      `unsupported policy language version ${String(document.version)}`,
    );
  }
  return {
    version: POLICY_LANGUAGE_VERSION,
    base: parseBase(document.base),
    rules: parseRules(document.rules),
  };
}

function parseBase(value: unknown): PolicyBase {
  const base = expectRecord(value, "base");
  const parsed = {} as Record<PolicySubject, PolicyEffect>;
  for (const subject of POLICY_SUBJECTS) {
    const effect = base[subject];
    if (typeof effect !== "string") {
      fail("invalid-shape", `base.${subject} is required`);
    }
    if (!isPolicyEffect(effect)) {
      fail("invalid-shape", `base.${subject} must be allow or deny`);
    }
    parsed[subject] = effect;
  }
  for (const key of Object.keys(base)) {
    if (!isPolicySubject(key)) {
      fail("unknown-subject", `unknown base subject ${key}`);
    }
  }
  return parsed as PolicyBase;
}

function parseRules(value: unknown): PolicyRule[] {
  if (!Array.isArray(value)) fail("invalid-shape", "rules must be an array");
  const ids = new Set<string>();
  return value.map((entry, index) => {
    const rule = parseRule(entry, `rules[${index}]`);
    if (ids.has(rule.id)) fail("invalid-shape", `duplicate rule id ${rule.id}`);
    ids.add(rule.id);
    return rule;
  });
}

function parseRuleIdentity(
  rule: Record<string, unknown>,
  path: string,
): { id: string; subject: PolicySubject } {
  if (typeof rule.id !== "string" || !RULE_ID.test(rule.id)) {
    fail("invalid-shape", `${path}.id is not a valid rule id`);
  }
  if (typeof rule.subject !== "string") {
    fail("invalid-shape", `${path}.subject is required`);
  }
  if (!isPolicySubject(rule.subject)) {
    fail("unknown-subject", `${path}.subject is unknown: ${rule.subject}`);
  }
  return { id: rule.id, subject: rule.subject };
}

function parseRuleEffect(
  rule: Record<string, unknown>,
  path: string,
): { effect: PolicyEffect; onUnknown: PolicyUnknownCollapse } {
  if (typeof rule.effect !== "string" || !isPolicyEffect(rule.effect)) {
    fail("invalid-shape", `${path}.effect must be allow or deny`);
  }
  if (!Object.hasOwn(rule, "onUnknown")) {
    fail("missing-collapse", `${path}.onUnknown is required`);
  }
  if (
    typeof rule.onUnknown !== "string" ||
    !isPolicyUnknownCollapse(rule.onUnknown)
  ) {
    fail("invalid-shape", `${path}.onUnknown must be deny, allow, or ask`);
  }
  return { effect: rule.effect, onUnknown: rule.onUnknown };
}

function parseRuleOptionals(
  rule: Record<string, unknown>,
  path: string,
): Pick<PolicyRule, "capability" | "sealed" | "note"> {
  if (rule.capability !== undefined && typeof rule.capability !== "string") {
    fail("invalid-shape", `${path}.capability must be a string`);
  }
  if (rule.sealed !== undefined && typeof rule.sealed !== "boolean") {
    fail("invalid-shape", `${path}.sealed must be a boolean`);
  }
  if (rule.note !== undefined && typeof rule.note !== "string") {
    fail("invalid-shape", `${path}.note must be a string`);
  }
  return {
    ...(typeof rule.capability === "string"
      ? { capability: rule.capability }
      : {}),
    ...(rule.sealed !== undefined ? { sealed: rule.sealed } : {}),
    ...(typeof rule.note === "string" ? { note: rule.note } : {}),
  };
}

function parseRule(value: unknown, path: string): PolicyRule {
  const rule = expectRecord(value, path);
  for (const key of Object.keys(rule)) {
    if (!RULE_KEYS.has(key)) {
      fail("invalid-shape", `${path} has unknown field ${key}`);
    }
  }
  const identity = parseRuleIdentity(rule, path);
  const effect = parseRuleEffect(rule, path);
  return {
    ...identity,
    ...effect,
    when: parseExpression(rule.when, `${path}.when`),
    ...parseRuleOptionals(rule, path),
  };
}

function parseExpression(value: unknown, path: string): PolicyExpression {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (!isPolicyNullaryPredicate(value)) {
      fail("unknown-predicate", `${path} unknown predicate ${value}`);
    }
    return value;
  }
  const expr = expectRecord(value, path);
  const keys = Object.keys(expr);
  if (keys.length !== 1) {
    fail("invalid-shape", `${path} must contain exactly one operator`);
  }
  const key = keys[0];
  if (key === undefined) {
    fail("invalid-shape", `${path} must contain exactly one operator`);
  }
  if (isPolicyCombinator(key)) return parseCombinator(key, expr[key], path);
  if (isPolicyParameterizedPredicate(key)) {
    return parseParameterized(key, expr[key], path);
  }
  if (isPolicyComparison(key)) return parseComparison(key, expr[key], path);
  fail("unknown-combinator", `${path} unknown combinator ${key}`);
}

function parseAssume(value: unknown, path: string): PolicyExpression {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[1] !== "boolean"
  ) {
    fail("invalid-shape", `${path}.assume must be [expression, boolean]`);
  }
  return {
    assume: [parseExpression(value[0], `${path}.assume[0]`), value[1]],
  };
}

function parseCombinator(
  key: "all" | "any" | "not" | "known" | "assume",
  value: unknown,
  path: string,
): PolicyExpression {
  if (key === "all" || key === "any") {
    if (!Array.isArray(value) || value.length < 1) {
      fail("invalid-shape", `${path}.${key} must be a non-empty array`);
    }
    const items = value.map((item, index) =>
      parseExpression(item, `${path}.${key}[${index}]`),
    );
    return key === "all" ? { all: items } : { any: items };
  }
  if (key === "not") return { not: parseExpression(value, `${path}.not`) };
  if (key === "known") {
    return { known: parseExpression(value, `${path}.known`) };
  }
  return parseAssume(value, path);
}

function parseLocalHourIn(value: unknown, path: string): PolicyExpression {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !Number.isInteger(value[0]) ||
    !Number.isInteger(value[1]) ||
    Number(value[0]) < 0 ||
    Number(value[0]) > 24 ||
    Number(value[1]) < 0 ||
    Number(value[1]) > 24
  ) {
    fail(
      "invalid-shape",
      `${path}.time.localHourIn must be [hour, hour] in 0..24`,
    );
  }
  return { "time.localHourIn": [value[0], value[1]] };
}

function parseParameterized(
  key:
    | "place.is"
    | "time.localHourIn"
    | "approval.by"
    | "approval.byOrg"
    | "user.typedPhrase",
  value: unknown,
  path: string,
): PolicyExpression {
  if (key === "time.localHourIn") return parseLocalHourIn(value, path);
  if (typeof value !== "string") {
    fail("invalid-shape", `${path}.${key} must be a string`);
  }
  if (key === "place.is") return { "place.is": value };
  if (key === "approval.by") return { "approval.by": value };
  if (key === "approval.byOrg") return { "approval.byOrg": value };
  return { "user.typedPhrase": value };
}

function parseNumericComparison(
  key: "lt" | "lte" | "gt" | "gte",
  term: PolicyTerm,
  right: unknown,
  path: string,
): PolicyExpression {
  if (typeof right !== "number") {
    fail("invalid-shape", `${path}.${key}[1] must be a number`);
  }
  if (key === "lt") return { lt: [term, right] };
  if (key === "lte") return { lte: [term, right] };
  if (key === "gt") return { gt: [term, right] };
  return { gte: [term, right] };
}

function parseEq(
  term: PolicyTerm,
  right: unknown,
  path: string,
): PolicyExpression {
  if (
    typeof right !== "string" &&
    typeof right !== "number" &&
    typeof right !== "boolean"
  ) {
    fail("invalid-shape", `${path}.eq[1] must be a string, number, or boolean`);
  }
  return { eq: [term, right] };
}

function parseIn(
  term: PolicyTerm,
  right: unknown,
  path: string,
): PolicyExpression {
  if (
    !Array.isArray(right) ||
    right.some((item) => typeof item !== "string" && typeof item !== "number")
  ) {
    fail(
      "invalid-shape",
      `${path}.in[1] must be an array of strings or numbers`,
    );
  }
  return { in: [term, right] };
}

function comparisonOperands(
  key: string,
  value: unknown,
  path: string,
): [PolicyTerm, unknown] {
  if (!Array.isArray(value) || value.length !== 2) {
    fail("invalid-shape", `${path}.${key} must be a two-element tuple`);
  }
  const [term, right] = value;
  if (typeof term !== "string") {
    fail("invalid-shape", `${path}.${key}[0] must be a term`);
  }
  if (!isPolicyTerm(term)) {
    fail("unknown-predicate", `${path}.${key} unknown term ${term}`);
  }
  return [term, right];
}

function parseSubsetOf(
  term: PolicyTerm,
  right: unknown,
  path: string,
): PolicyExpression {
  if (!Array.isArray(right) || right.some((item) => typeof item !== "string")) {
    fail("invalid-shape", `${path}.subsetOf[1] must be an array of strings`);
  }
  return { subsetOf: [term, right] };
}

function parseComparison(
  key: "lt" | "lte" | "gt" | "gte" | "eq" | "in" | "subsetOf",
  value: unknown,
  path: string,
): PolicyExpression {
  const [term, right] = comparisonOperands(key, value, path);
  switch (key) {
    case "lt":
    case "lte":
    case "gt":
    case "gte":
      return parseNumericComparison(key, term, right, path);
    case "eq":
      return parseEq(term, right, path);
    case "in":
      return parseIn(term, right, path);
    default:
      return parseSubsetOf(term, right, path);
  }
}
