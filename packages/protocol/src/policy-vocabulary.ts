/** Closed vocabularies for SPEC-POLICY language version 1. Unknown members block load. */

export const POLICY_LANGUAGE_VERSION = 1;

export const POLICY_SUBJECTS = [
  "app:install",
  "app:launch",
  "grant:request",
  "interface:enable",
  "identity:link",
  "identity:export",
  "apps:publish",
  "policy:amend",
  "policy:seal",
] as const;

export type PolicySubject = (typeof POLICY_SUBJECTS)[number];

export const POLICY_EFFECTS = ["allow", "deny"] as const;
export type PolicyEffect = (typeof POLICY_EFFECTS)[number];

export const POLICY_UNKNOWNS = ["deny", "allow", "ask"] as const;
export type PolicyUnknownCollapse = (typeof POLICY_UNKNOWNS)[number];

export const POLICY_NULLARY_PREDICATES = [
  "user.awake",
  "user.voiceAuthorized",
  "user.passphrase",
  "power.charging",
  "network.offline",
  "clock.attested",
  "app.usesNetwork",
] as const;

export type PolicyNullaryPredicate = (typeof POLICY_NULLARY_PREDICATES)[number];

export const POLICY_PARAMETERIZED_PREDICATES = [
  "place.is",
  "time.localHourIn",
  "approval.by",
  "approval.byOrg",
  "user.typedPhrase",
] as const;

export type PolicyParameterizedPredicate =
  (typeof POLICY_PARAMETERIZED_PREDICATES)[number];

export const POLICY_TERMS = [
  "app.sourceBytes",
  "app.riskTier",
  "app.capabilities",
  "app.publisher",
  "app.firstSeenAt",
  "package.hash",
  "host.class",
  "sibling.count",
  "policy.sealedAt",
] as const;

export type PolicyTerm = (typeof POLICY_TERMS)[number];

export const POLICY_COMBINATORS = [
  "all",
  "any",
  "not",
  "known",
  "assume",
] as const;

export type PolicyCombinator = (typeof POLICY_COMBINATORS)[number];

export const POLICY_COMPARISONS = [
  "lt",
  "lte",
  "gt",
  "gte",
  "eq",
  "in",
  "subsetOf",
] as const;

export type PolicyComparison = (typeof POLICY_COMPARISONS)[number];

export function isPolicySubject(value: string): value is PolicySubject {
  return (POLICY_SUBJECTS as readonly string[]).includes(value);
}

export function isPolicyEffect(value: string): value is PolicyEffect {
  return (POLICY_EFFECTS as readonly string[]).includes(value);
}

export function isPolicyUnknownCollapse(
  value: string,
): value is PolicyUnknownCollapse {
  return (POLICY_UNKNOWNS as readonly string[]).includes(value);
}

export function isPolicyNullaryPredicate(
  value: string,
): value is PolicyNullaryPredicate {
  return (POLICY_NULLARY_PREDICATES as readonly string[]).includes(value);
}

export function isPolicyParameterizedPredicate(
  value: string,
): value is PolicyParameterizedPredicate {
  return (POLICY_PARAMETERIZED_PREDICATES as readonly string[]).includes(
    value,
  );
}

export function isPolicyTerm(value: string): value is PolicyTerm {
  return (POLICY_TERMS as readonly string[]).includes(value);
}

export function isPolicyCombinator(value: string): value is PolicyCombinator {
  return (POLICY_COMBINATORS as readonly string[]).includes(value);
}

export function isPolicyComparison(value: string): value is PolicyComparison {
  return (POLICY_COMPARISONS as readonly string[]).includes(value);
}

export function parameterizedPredicateKey(
  name: PolicyParameterizedPredicate,
  argument: string | readonly [number, number],
): string {
  if (typeof argument === "string") return `${name}:${argument}`;
  return `${name}:${argument[0]},${argument[1]}`;
}

export function termNeedKey(term: PolicyTerm): string {
  return `term:${term}`;
}
