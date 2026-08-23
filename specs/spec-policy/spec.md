# SPEC-POLICY — User policy: conditions, amendment, and sealing

<!-- tp-doc
lifecycle: live
audited: 2026-08-23
register: none
-->

**Group:** C (platform) · **Status:** stub (informative) · **Migration phase:** 4

Nothing in this spec is implemented. Everything below is informative until its first
machine-checkable artifact lands; the design rationale and delivery sequence are in
[docs/user-policy-plan.md](../../docs/user-policy-plan.md).

## Scope

Three things, together because each is unsound without the others:

1. **The policy document** — a user-authored set of rules, each gating one action class
   on a three-valued condition, with the decision procedure over them.
2. **Amendment** — how a policy changes, including the case that matters most: a policy
   that governs its own amendment.
3. **Sealing** — how a rule is made irreversible against the disk, and what reversing one
   therefore costs.

Web analog: none. The nearest relatives are MDM configuration profiles (external
authority, revocable by that authority) and `chattr +i` (irreversible, but unconditional
and not user-expressible). This is neither: the authority is the user, the conditions are
arbitrary, and permanence is available.

Out of scope: the capability taxonomy a rule refers to
([SPEC-CAP](../spec-cap/spec.md)); how a preview or confirmation is rendered
([SPEC-CHROME](../spec-chrome/spec.md)); how approvals travel
([SPEC-MSG](../spec-msg/spec.md)); escrow and recovery quorums
([SPEC-AUTHORITY](../spec-authority/spec.md)), which answer a different question —
several parties reconstituting an authority, rather than one party constraining
themselves.

## Definitions

- **Subject** — a closed, versioned action class a rule may gate. `policy:amend` and
  `policy:seal` are subjects, which is what makes policy self-governing.
- **Predicate** — a named question about the world evaluating to `true`, `false`, or
  `unknown`. `unknown` means the evidence was not obtainable, and is distinct from `false`.
- **Collapse** — the point at which `unknown` becomes a decision. Always written by the
  policy author, never defaulted.
- **Certified tightening** — an amendment syntactically incapable of widening any
  decision, including through changed predicate resolvability. It needs no authorization.
- **Relaxation** — every other amendment. It must satisfy the `policy:amend` gate of the
  **pre-amendment** document.
- **Seal** — inclusion of a rule in the commit chain that derives the installation's vault
  key, making the rule unremovable without rendering the store unreadable.

## Normative artifacts (target)

- **Schema.** [schema/policy-document.schema.json](schema/policy-document.schema.json) —
  the language-neutral policy document. Present and non-normative until an implementation
  validates against it.
- **Executable table.** The Sans-IO evaluator and amendment machine in
  `packages/protocol`: `(policy, subject, evidence) → decision | needs(predicates)` and
  `(policy, amendment, evidence) → accept | reject`.
- **Formal twin.** `model/amendment.tla` — the amendment machine over an abstraction of
  the document (permission set plus seal set), with TLC checking that sealed rules are
  never removed and that certified tightening never widens a permission set.
- **Generated vector.** `conformance/vectors/policy.json` — `(policy, subject, evidence)
→ decision` cases, including the exhaustive three-valued truth tables and the worked
  example from the plan, byte for byte.
- **Bypass suite.** `conformance/policy-bypass/` — B1…B14 in the plan, each asserting a
  named attack fails, plus B14 asserting that self-lockout succeeds.

## Requirements

Requirement keys, in the style [SPEC-CHROME](../spec-chrome/spec.md) uses, so conformance
cases cite the rule they exercise.

| Key   | Requirement                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-R1  | An unknown subject, predicate, combinator, or language version in a policy document blocks load. It is never ignored or treated as satisfied.              |
| P-R2  | Every rule declares its `unknown` collapse. A document that omits it does not load.                                                                        |
| P-R3  | The decision procedure is deny-overrides over an unordered rule set. Rule order never affects a decision.                                                  |
| P-R4  | An amendment is authorized against the pre-amendment document only.                                                                                        |
| P-R5  | An amendment is atomic: applied whole or not at all, with no observable intermediate document.                                                             |
| P-R6  | An amendment that could change the resolvability of a predicate used by a rule whose collapse is not `deny` is a relaxation, whatever its syntactic shape. |
| P-R7  | No amendment removes or alters a sealed rule.                                                                                                              |
| P-R8  | Editing, replacing, or rolling back a sealed policy on disk renders the installation's store unreadable.                                                   |
| P-R9  | A host that cannot evaluate a sealed policy refuses the installation rather than opening it.                                                               |
| P-R10 | No mini-app capability, broker namespace, or chrome path reads or writes policy.                                                                           |
| P-R11 | A sibling installation may carry an approval; it may never make a policy decision for this installation.                                                   |
| P-R12 | An approval attestation binds subject, package hash, installation id, nonce, and expiry, and is single-use.                                                |
| P-R13 | Time predicates resolve `unknown` unless the clock is attested.                                                                                            |
| P-R14 | Restoring a backup restores the policy committed in it. A backup never sheds a seal.                                                                       |
| P-R15 | A sealing amendment requires a generated consequence preview and a typed confirmation, both recorded verbatim in the consent record.                       |
| P-R16 | The preview is sound and complete with respect to the evaluator: reachable iff a satisfying world exists.                                                  |
| P-R17 | The platform never refuses a policy for being too strict, including a policy that makes itself terminal.                                                   |

## Existing assets

None. This spec has no current implementation, no vectors, and no model; the mechanisms
it is built from do exist —
[`grants.ts`](../../packages/protocol/src/grants.ts),
[`approval-evaluate.ts`](../../packages/protocol/src/approval-evaluate.ts),
[`sibling-decisions.ts`](../../packages/host-core/src/sibling-decisions.ts),
[`rns-hkdf.ts`](../../packages/protocol/src/rns-hkdf.ts), and the AES-GCM vault in
[`identity-backup.ts`](../../packages/host-core/src/identity-backup.ts) — and are
inventoried in the plan.

## To finish this spec

The schema is the first artifact and is already here; it becomes normative when the
evaluator validates against it. The spec goes **normative** when the executable table, the
TLA+ twin, and the generated vectors are cross-checked edge-for-edge by
`npm run formal:policy`, in the shape [SPEC-CAP](../spec-cap/spec.md) sets, and when every
requirement key above is cited by at least one conformance case. The bypass suite is a
release gate for this spec rather than an optional extra: a policy language nobody has
tried to break is not evidence of anything.
