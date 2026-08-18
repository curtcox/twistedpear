# App approval risk — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: software
counterpart: docs/app-approval-risk-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[app approval risk plan](app-approval-risk-plan.md). Where the two disagree, this file
wins.

Capability risk class is data, not prose: every core and device capability has a row in
[`specs/spec-cap/registry/capability-risk.json`](../specs/spec-cap/registry/capability-risk.json)
that generates [`packages/protocol/src/capability-risk.gen.ts`](../packages/protocol/src/capability-risk.gen.ts)
(`npm run generate:capability-risk`). `CapabilityDefinition` carries `riskClass` beside
`id` and `description`. Revising an assignment is a registry edit plus regenerate.

Four classes, floors from the four questions answered on each row:

| Class       | Meaning in the current assignment                                                               |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `benign`    | Local or read-only observation; no dialog tax once Phase 1 UX lands                             |
| `elevated`  | Today's review dialog; includes identity, host-fixed AI/fetch, and `low` device consent classes |
| `sensitive` | App-chosen egress, irreversible publish/install, and `elevated`/`sensitive` device tiers        |
| `critical`  | `relay:configure` only — the one grant whose misuse harms people who never approved anything    |

`namesDestination` or `irreversibleOrThirdParty` floors at `sensitive`.
`readsSensorSecretOrForeignData` floors at `elevated`. `standing` is recorded but is not
a floor: storage and presence are standing and still `benign`. `critical` requires
`irreversibleOrThirdParty`. Device rows follow consent class (`low` → `elevated`,
`elevated`/`sensitive` → `sensitive`) except `device:share-policy:read`, which stays
`benign`.

This phase ships no new refusals. An update that adds a capability is named with
its risk class and does not inherit the previous grant set
(`capabilityUpdateDelta` / `grantsPreservedAcrossUpdate`). App risk tier is the
maximum requested class, promoted one step when a read authority and an egress
authority co-occur (`appRiskTier`). Offer-bound destination grants drop from
`sensitive` to `elevated` before the max is taken.

A first-seen ledger on `CatalogStore` records `(appId, publisherPublicKey,
packageHash) → firstSeenAt` at ingest. It is saved with the catalog and is not
subject to the seven-day catalog TTL, so "unchanged for a minimum period" is
measurable after an entry expires. A new package hash starts its own clock.

Publisher trust is a degree, not a boolean. `TrustStore` still records how a key
was acquired (`qr` / `manual` → `direct`, `paste` → `imported`, `introduced` →
`introduced`); `isTrusted(key, minimum?)` compares ranks so a pasted lure can
satisfy `imported` and cannot satisfy `direct`.

`evaluateApproval` is the Sans-IO decision: the host gathers evidence, the
function returns the tier, the evidence that tier requires, and which of it is
unmet. Empty `unmet` is ordinary approval. `overridable` is always true — an
unmet requirement is "could not verify", never a refusal. Chrome that presents
the unmet set is still plan work.

| Tier        | Evidence required                                      | Provenance met by                         | Review met by      |
| ----------- | ------------------------------------------------------ | ----------------------------------------- | ------------------ |
| `benign`    | none                                                   | —                                         | —                  |
| `elevated`  | none (today's capability dialog is host chrome)        | —                                         | —                  |
| `sensitive` | provenance, age (T₁), stability (T₂), review           | any trust degree, **or** ≥1 attestation   | ≥1 attestation     |
| `critical`  | provenance, age (T₃), stability (T₄), review           | `direct` trust                            | ≥ K attestations   |

T₁…T₄ and K are arguments (`ApprovalThresholds`), not defaults. They remain a
product call informed by the sim campaign. The executable table is
`APPROVAL_REQUIREMENTS_BY_TIER`; the Layer-3 covering set is
[`conformance/vectors/approval.json`](../conformance/vectors/approval.json)
(`npm run vectors:generate`). There is no TLA+ model — a model becomes
necessary only if the override path grows states.
