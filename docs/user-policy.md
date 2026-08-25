# User policy — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/user-policy-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[user policy plan](user-policy-plan.md). Where the two disagree, this file wins.

The host can load a user-authored policy document and decide a closed set of
subjects. It cannot yet amend, seal, gather evidence, or preview consequences.

## Evaluator

[`loadPolicy`](../packages/protocol/src/policy-load.ts) accepts the language-neutral
document in
[`specs/spec-policy/schema/policy-document.schema.json`](../specs/spec-policy/schema/policy-document.schema.json).
Unknown subjects, predicates, combinators, or language versions fail closed
(P-R1). A rule that omits `onUnknown` does not load (P-R2). Only language
version `1` loads.

[`evaluatePolicy`](../packages/protocol/src/policy-evaluate.ts) is Sans-IO:
`(policy, query, evidence) → allow | deny | ask | needs(predicates)`. The host
gathers predicates; the evaluator does not. A predicate absent from evidence is
`needs`, not unknown. Passing `"unknown"` is how the host says a sensor was asked
and did not resolve.

## Decision

Deny-overrides over the unordered matching rule set (P-R3):

1. Any matching rule that yields `deny` → **deny**.
2. Else any matching rule that yields `ask` → **ask**.
3. Else any matching rule that yields `allow` → **allow**.
4. Otherwise the subject's `base` posture.

A rule yields its `effect` when `when` is true, yields nothing when `when` is
false, and yields `onUnknown` when `when` is unknown. Combinators are strong
Kleene (`all`, `any`, `not`, `known`, `assume`). Rule order does not affect the
decision; cited rule ids are sorted.

`grant:request` rules may name a `capability`; a query without that capability
does not match that rule.

## Vectors

[`conformance/vectors/policy.json`](../conformance/vectors/policy.json) holds the
exhaustive Kleene tables and a few document-level decisions
(`npm run vectors:generate`).

## Not in this drop

Amendment, certified tightening, sealing, evidence adapters, consequence
preview, host chrome for `ask`, and the bypass catalogue remain in the
[plan](user-policy-plan.md) (§4 onward).
