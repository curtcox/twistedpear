# User policy — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/user-policy-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[user policy plan](user-policy-plan.md). Where the two disagree, this file wins.

The host can load a user-authored policy document, decide a closed set of
subjects, apply an amendment, seal rules into a commit chain that wraps the
catalog, grants, and app-data master key, and gather evidence for time, place,
wakefulness, and single-use approvals, and generate a consequence preview
before seal. Host chrome for `ask` is not yet wired.

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

## Amendment

[`applyAmendment`](../packages/protocol/src/policy-amend.ts) is Sans-IO and
atomic: `(current, proposed, evidence) → proposed | reject`. The proposed
document is accepted whole or not at all (A-2, P-R5). Authorization always
runs `evaluatePolicy(current, { subject: "policy:amend" }, evidence)` — the
new document never participates in its own authorization (A-1, P-R4).

Certified tightening applies without that gate (A-3): add only `deny` rules
(with `onUnknown: deny` and no `assume(x, true)`), remove only `allow` rules,
do not move any `base` from `deny` to `allow`, and do not touch a sealed rule.
Anything else is a **relaxation** and needs the pre-amendment `policy:amend`
gate.

An amendment that could starve `place.is` — by adding a `deny` on
`grant:request` for `device:location`, removing a matching `allow`, or moving
that subject's base to `deny` — while a surviving rule collapses that unknown to
something other than `deny` is classified as a relaxation, whatever its shape
(A-4, P-R6). Newly sealing a rule is not an amendment: [`applySeal`](../packages/protocol/src/policy-seal.ts)
does that after `policy:seal` allows. `applyAmendment` still refuses unsealing
or editing a sealed rule (P-R7).

[`seededUserPolicy`](../packages/protocol/src/policy-amend.ts) is deny-by-default
with `policy:amend` allowed iff `user.passphrase`. A policy whose amend gate
is unsatisfiable is a legal, tested outcome (B14); the machine does not refuse
self-lockout.

## Sealing

[`applySeal`](../packages/protocol/src/policy-seal.ts) is Sans-IO:
`(current, ruleIds, evidence, parentCommit) → policy + commit | reject`.
Authorization is `evaluatePolicy(current, { subject: "policy:seal" }, evidence)`.
The genesis commit hashes language version `1` and the closed subject set.
Each accepted seal or later rewrap advances
`commit_n = H(commit_{n-1} || H(policy_n))`. The wrap key is
`K_n = HKDF(rootSecret, commit_n)` via [`rnsHkdfSha256`](../packages/protocol/src/rns-hkdf.ts).

[`wrapSealedMaster`](../packages/host-core/src/policy-seal.ts) keeps the store
master key under `K_n`. Catalog, grants, and app-data blobs encrypt under that
master. Identity stays on its own passphrase vault. Tampering with the policy,
or rolling back to an earlier chain head after rewrap, fails closed as
unreadable (P-R8). An envelope whose language version or subject set this host
does not know is refused before unwrap (P-R9). Accepting a later amendment
calls [`rewrapSealedMaster`](../packages/host-core/src/policy-seal.ts) under the
new commit and forgets the previous wrap.

Typed confirmation is part of the previewed seal below. Binding the commit into
a backup envelope remains in the [plan](user-policy-plan.md).

## Evidence

[`gatherPolicyEvidence`](../packages/host-core/src/policy-evidence.ts) is the
host adapter. The evaluator stays Sans-IO: this module answers the world and
hands back trits.

- **Time (P-R13).** `time.localHourIn` is `unknown` unless `clock.attested` is
  true. Attestation is a monotonic reading plus a signed unix-time reference
  from a trusted signer. A settable device clock is never the source of hour.
- **Approvals (P-R12).** An attestation binds subject, package hash, installation
  id, nonce, and expiry, and is spent on first successful use. Role names map
  to keys in the host's role table; rebinding a name is an amendment, not a
  config tweak.
- **Place and wakefulness.** Absent a fix or sensor, the predicate is
  `unknown` and the rule's `onUnknown` collapse applies.
- **Siblings (P-R11).** A linked installation may carry an approval blob. It may
  never make a policy decision for this installation —
  [`SIBLING_DECISION_CLASSES`](../packages/host-core/src/sibling-decisions.ts)
  has no policy class, and a sibling "allow" payload is discarded.

## Preview

[`previewPolicy`](../packages/host-core/src/policy-preview.ts) enumerates the
finite predicate domain (host-unavailable predicates pinned to `unknown`) and
answers, per subject, whether any world this host can present yields `allow`.
A reachable subject carries a witness the evaluator accepts; an unreachable one
has none (P-R16). `policy:amend` unreachable means the policy is terminal. The
preview names load-bearing people and sources, lists `assume(..., true)` and
`onUnknown: allow` as weakenings, and states the reinstall cost (the sealed
catalog, grants, and app-data stores). [`sealWithPreview`](../packages/host-core/src/policy-preview.ts)
refuses to seal unless that generated text is accepted with the typed phrase
`I understand these consequences` (P-R15). A terminal policy is still sealeable
(P-R17).

## Vectors

[`conformance/vectors/policy.json`](../conformance/vectors/policy.json) holds the
exhaustive Kleene tables and a few document-level decisions
(`npm run vectors:generate`).

## Not in this drop

Host chrome for `ask`, backup-envelope binding, and the bypass catalogue remain
in the [plan](user-policy-plan.md) (§8–§9).
