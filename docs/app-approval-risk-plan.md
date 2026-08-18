# App Approval Risk Plan — proportionate evidence for proportionate authority

<!-- tp-doc
lifecycle: planned
audited: 2026-08-17
register: software
-->

A plan to make app approval a function of the authority an app asks for, rather than one
dialog that looks the same whether the app wants local key/value storage or the user's
microphone and an unbounded outbound channel. What ships today is described by
[SPEC-CAP](../specs/spec-cap/spec.md) (taxonomy and grant lifecycle) and
[miniapp-sdk.md](miniapp-sdk.md); when this plan disagrees with those, they win until the
work lands.

Companions: [capability-scoping-audit.md](capability-scoping-audit.md) and
[capability-scoping-plan.md](capability-scoping-plan.md) (least authority _within_ a grant),
[hostile-author-plan.md](hostile-author-plan.md) (deception of the user by the author),
[security-review.md](security-review.md) (sandbox threat model),
[local-moderation.md](local-moderation.md) (why there is no central authority to appeal to).

## 1. The two invariants this plan implements

**Floor.** _An app that requests no capability carries no risk._ If a zero-capability app
can do anything a user would care about, that is a defect in the permissions system, not a
tier of the approval system. Approving such an app must cost the user nothing — no dialog,
no evidence, no ceremony — and that must be _true_, not merely the current behaviour.

**Ceiling.** _The top of the risk range cannot be reached by consent alone._ A user
clicking "allow" is the weakest evidence the system can collect, and it is exactly the
evidence a hostile author optimizes against ([hostile-author-plan.md](hostile-author-plan.md)
§2.4). High-risk authority additionally requires evidence the author does not author:
provenance, elapsed time, stability of the artifact, and independent review.

Between the two, approval cost rises with requested authority. Today it is flat, which is
what "all-or-nothing" means here: the same single decision, backed by the same single kind
of evidence, for every app in the catalog.

## 2. What is flat today

Every claim below is a code read; §9 says how to re-derive them.

### A-1 — The floor is not held (high)

Three broker methods register with `null` capability and reach real host state
([layer-1-handlers-device.ts:189](../packages/miniapp-runtime/src/host/layer-1-handlers-device.ts)):

| Method               | Available to a zero-capability app                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `device.inventory`   | Every device class on the host, its tiers, availability, `maxRateHz`, streamability, remote eligibility                  |
| `device.diagnostics` | The same, plus `holder` — **the appId currently holding each device lock** and a human-readable reason                   |
| `ui.render`          | The whole drawing surface, which is the substrate for every Surface 3 attack in the hostile-author catalog (HA-20…HA-24) |

`DeviceManager.inventory()` and `.diagnostics()` take **no arguments**
([layer-1-base.ts:91](../packages/miniapp-runtime/src/device-manager/layer-1-base.ts)); the
handler passes `context.appId` and the implementation drops it, so the call site reads as if
it were app-scoped and is not. `holder` is `app:${appId}`
([layer-1-base.ts:179](../packages/miniapp-runtime/src/device-manager/layer-1-base.ts)), so
polling `device.diagnostics` is a zero-permission cross-app side channel: which app is using
the camera, and when.

This is the load-bearing finding. A risk model whose zero point is not zero is incoherent
before it starts, and HA-21 — the highest-severity scenario in the hostile-author catalog,
an app asking the user to type their recovery phrase — needs **no capabilities at all**.

### A-2 — Core capabilities carry no risk classification (high)

`CapabilityDefinition` is `{ id, description }`
([capabilities.ts:46](../packages/miniapp-runtime/src/capabilities.ts)). Device capabilities
do better: the generated registry gives each a `consentClass` of `low` / `elevated` /
`sensitive` plus per-class defaults
([device-registry.gen.ts:4](../packages/protocol/src/device-registry.gen.ts), from
[device-classes.json](../specs/spec-device/registry/device-classes.json)). The 24 core
capabilities have nothing. Nothing in the system can order `relay:configure` against
`storage:kv`, so nothing can present them differently, gate them differently, or expire them
differently.

### A-3 — Approval evidence is constant (high)

`launchWithCapabilityReview`
([miniapp-host-shared-backends.mjs:337](../packages/worklet-core/src/miniapp-host-shared-backends.mjs))
is the whole gate: render the declared list with descriptions, take a set of checkboxes,
refuse to launch on an empty set. It consults no property of the publisher, the package's
age, its stability, or anyone else's opinion of it — because none of those are recorded
anywhere.

### A-4 — Time is not in the system (high)

- The manifest has no publication timestamp. `MANIFEST_SIGNING_FIELDS`
  ([manifest.ts:4](../packages/app-registry/src/manifest.ts)) is closed, and nothing in it
  is temporal.
- The only timestamp is `CatalogEntry.receivedAt` — local first-seen — and catalog entries
  expire after seven days
  ([catalog.ts:10](../packages/app-registry/src/catalog.ts)), so the host forgets.
- `InstalledPackageRecord.installedAt` records when _this user_ installed, which is after
  the decision this plan is about.

"Released for a minimum period" and "unchanged for a minimum period" are therefore not
merely ungated — they are currently inexpressible.

### A-5 — Trust is a boolean, and it is not a gate (medium)

`TrustStore.isTrusted` returns a bare boolean, and its own doc comment says it "gates
acceptance UX only" ([trust.ts:30](../packages/app-registry/src/trust.ts)). It already
records `source: "qr" | "paste" | "manual"` ([trust.ts:8](../packages/app-registry/src/trust.ts))
— a real distinction in how much a trust edge is worth — and no code reads it. First-seen
key pinning in `CatalogStore` ([catalog.ts:142](../packages/app-registry/src/catalog.ts)) is
the only publisher property that actually blocks anything, and it answers "same key as last
time," not "how much should this key be trusted."

### A-6 — There is no reviewer concept (medium)

Nothing in the repository represents a third party's assessment of a package. There is no
attestation type, no reviewer key list, no distribution path for a verdict, and no way for a
user to benefit from the fact that someone competent already read this app's code.

### A-7 — The app-level decision is still binary (medium)

The manifest cannot say which capabilities are _essential_ and which are _optional_. A user
who wants to decline the risky one has no way to know whether the app still works, so the
rational move is to approve everything — and `launchWithCapabilityReview` rejects an empty
set, which teaches that declining is how you fail to launch. Per-capability checkboxes exist;
per-capability _meaning_ does not.

## 3. The risk model

Two levels, both derived rather than authored by the app.

### 3.1 Capability risk class

Extend the device registry's idea to the whole taxonomy: one generated registry file,
`specs/spec-cap/registry/capability-risk.json` → `capability-risk.gen.ts`, the same shape
and generator discipline as `device-classes.json`. Four classes, assigned by four questions
answered in the registry rather than in prose:

| Question                                                   | If yes                            |
| ---------------------------------------------------------- | --------------------------------- |
| Can the app name the destination bytes go to?              | at least `sensitive`              |
| Is the effect irreversible or visible to third parties?    | at least `sensitive`              |
| Does it read a sensor, a secret, or another party's data?  | at least `elevated`               |
| Is the authority standing (no per-operation confirmation)? | one class higher than it would be |

The resulting assignment, to be reviewed as part of Phase 1 rather than taken as settled:

| Class       | Capabilities                                                                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `benign`    | `storage:kv`, `storage:hyperbee`, `workspace`, `presence`, `link:observe`, `relay:read`, `device:share-policy:read`                                                                                                           |
| `elevated`  | `identity`, `announce:subscribe`, `announce:publish`, `share:cas`, `ai:chat`, `ai:embed`, `resource:fetch`, `peer:connect`, `link:probe`, `apps:preview`, device classes at `low`                                             |
| `sensitive` | `lxmf:send`, `lxmf:receive`, `freenet:contract`, `device:stream`, `apps:package`, `apps:publish`, `apps:install`, device tiers at `elevated`/`sensitive` (`:frames`, `:pcm`, `:precise`, `:samples`, `screen-capture`, `nfc`) |
| `critical`  | `relay:configure`                                                                                                                                                                                                             |

`relay:configure` is alone at the top on its own description: it turns radios, camera,
microphone, and speaker relaying on or off, forwards other people's traffic, and "permits
changes without another prompt"
([capabilities.ts:137](../packages/miniapp-runtime/src/capabilities.ts)). It is the only
capability whose misuse harms people who never approved anything.

### 3.2 App risk tier

**Tier is the maximum class requested, promoted one step when a read authority and an egress
authority co-occur.** Not a sum: ten `benign` capabilities are not one `sensitive` one, and a
model that says otherwise trains users to ignore it. The promotion rule captures the
composition that pure per-capability review misses — `device:microphone:pcm` alone is a
recorder, `lxmf:send` alone is a messenger, and together they are a wiretap.

**Scope lowers class.** This is the hinge between this plan and the scoping plan: an
`lxmf:send` bound to a host-authored `EgressOffer` for a user-picked contact
([capability-scoping-plan.md](capability-scoping-plan.md) §3) is a materially smaller
authority than an unscoped one, and the registry should say so — `sensitive` unscoped,
`elevated` when every grant is offer-bound. Publishers who accept scoping get a cheaper
approval. That is the only incentive in the design that pushes in the right direction
without a central authority to push it.

## 4. Evidence requirements per tier

Each requirement must be **locally evaluable with no central authority** — that is the
constraint that makes this a TwistedPear design rather than an app store.

| Tier        | Consent                          | Provenance                               | Age                     | Stability                        | Review                                     |
| ----------- | -------------------------------- | ---------------------------------------- | ----------------------- | -------------------------------- | ------------------------------------------ |
| `benign`    | Install with no dialog           | —                                        | —                       | —                                | —                                          |
| `elevated`  | Capability review (today's gate) | —                                        | —                       | Capability delta named on update | —                                          |
| `sensitive` | Capability review, per-grant TTL | Publisher trusted, **or** ≥1 attestation | Package observed ≥ _T_₁ | Same `packageHash` ≥ _T_₂        | ≥1 attestation from a trusted reviewer key |
| `critical`  | Capability review, short TTL     | Publisher trusted at `direct` (§5.3)     | Package observed ≥ _T_₃ | Same `packageHash` ≥ _T_₄        | ≥ _K_ attestations, independent per §5.2   |

_T_ᵢ and _K_ are deliberately unnamed here: they are a product call informed by adversarial
simulation (§8, open question 3), not a number to invent in a design document.

**The user is always the final authority, and the override is designed, not accidental.** A
local-first platform that hard-blocks its owner is dishonest — the user will sideload, and
they will do it with less information than the dialog had. So an unmet requirement is not a
refusal; it is a statement of what could not be verified:

> This app wants to forward other people's traffic. I could not verify: you have never met
> this publisher · nobody you trust has reviewed this version · this version is 2 days old.

Proceeding from that state requires an explicit, distinctly-worded action — never the same
affirmative control as an ordinary approval — and writes the unmet set into the
`ConsentRecord` ([hostile-author-plan.md](hostile-author-plan.md) §5). That is what keeps
the gate from being theatre in both directions: a requirement nobody can override becomes a
central gatekeeper by the back door, and one that a single identical tap clears is a
formality wearing a control's clothes.

## 5. Making the evidence real

### 5.1 Time the author does not control

A publisher-signed `publishedAt` is attacker-chosen, so it may only ever be used to make an
app look **newer** than observation suggests, never older. Age must come from observers:

- **A first-seen ledger** — `(appId, publisherKey, packageHash) → firstSeenAt`, persistent,
  written on catalog ingest, and **not** subject to the seven-day catalog TTL (A-4). This is
  the cheapest item in the plan and it is what makes "unchanged for a minimum period"
  measurable at all: a changed package is a new hash, and a new hash resets its own clock.
- **Countersigned observation** — an attestation (§5.2) carries the reviewer's own
  first-seen for that hash. _N_ independent observers give a lower bound on age that no
  single author can inflate.

Honest limitation, stated in the UI rather than papered over: a fresh device with no peers
has no evidence and cannot acquire it. Its answer is "I cannot verify this," not "this is
safe" and not "this is malicious."

### 5.2 Review attestations

A signed, freestanding object distributed over the existing app-announce path
([announce.ts](../packages/app-registry/src/announce.ts)) — reviews travel like apps do:

```ts
interface ReviewAttestation {
  readonly formatVersion: 1;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly packageHash: string; // a review is of an artifact, never of a publisher
  readonly reviewerPublicKey: string;
  readonly verdict: "endorse" | "concern";
  /** What the reviewer claims to have done — read the source, ran it, diffed it. */
  readonly basis: ReadonlyArray<"source-read" | "executed" | "diff-from-prior">;
  readonly capabilities: ReadonlyArray<MiniappCapability>; // what was reviewed against
  readonly firstSeenAt: number; // the reviewer's own observation (§5.1)
  readonly reviewedAt: number;
  readonly expiresAt: number;
  readonly signature: string;
}
```

Three rules keep this from becoming a reputation system with the failure modes of one:

1. **An attestation counts only if the reviewer key is in the user's reviewer list.** There
   is no global score, no aggregate, and no ranking. An attestation from a stranger is data
   to display, never evidence to count.
2. **"Skilled" is not verifiable and the platform will not pretend otherwise.** No
   credential, no badge. Reviewer trust is user-assigned and **scoped**: a reviewer trusted
   for `sensitive` device capabilities is not thereby trusted for `critical`.
3. **Independence is a property of acquisition, not of cryptography.** _K_ distinct keys are
   trivially Sybil-able. The implementable rule: the host records how each reviewer key
   entered the trust store and refuses to count toward _K_ any two keys that arrived in the
   same import, or any key that arrived from the app's own publisher. Beyond that, the host
   displays each attestation's provenance and lets the user judge. Claiming to have solved
   Sybil resistance here would be the dishonest move.

`verdict: "concern"` matters as much as `endorse`: one concern from a trusted reviewer should
be able to _raise_ the evidence bar for an app that otherwise clears its tier.

### 5.3 Trust with degrees

Promote the existing, unread `source` field ([trust.ts:8](../packages/app-registry/src/trust.ts))
into the gate:

| Degree       | How acquired                                      | Satisfies              |
| ------------ | ------------------------------------------------- | ---------------------- |
| `direct`     | QR scanned in person, or manual entry from a card | `critical` provenance  |
| `imported`   | Pasted identity string from out of band           | `sensitive` provenance |
| `introduced` | Vouched for by a `direct` publisher               | `sensitive` provenance |
| _(none)_     | First seen in the catalog                         | `elevated` and below   |

This is where HA-03 (the "paste this identity string" lure) stops being a coin flip: a lure
can reach `imported`, and cannot reach `direct`.

## 6. Where the decision lives

One pure function, sans-IO, in `packages/protocol` per
[sansio.md](sansio.md) — the host gathers evidence, the function decides:

```ts
function evaluateApproval(
  request: ApprovalRequest,
  evidence: ApprovalEvidence,
): {
  readonly tier: RiskTier;
  readonly required: ReadonlyArray<Requirement>;
  readonly unmet: ReadonlyArray<Requirement>; // empty ⇒ ordinary approval
  readonly overridable: boolean;
};
```

**Formal cost, stated up front rather than discovered in review.** This is a decision
function, not a state machine: it earns an executable table plus Layer-3 vectors
(`conformance/vectors/approval.json`), cross-checked the way SPEC-CAP's are, but **not** a
TLA+ model. A model becomes necessary only if the override path grows states — a design
smell worth resisting. `evaluateApproval` returns requirements; nothing in it performs I/O,
renders, or decides for the user.

## 7. Sequencing

Phase 0 is not optional and does not wait on anything: the model is incoherent while the
floor leaks.

### Phase 0 — restore the risk floor (host API 0.13.0)

| ID                    | Type    | Work                                                                                                                                           |
| --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPR-DEVICE-AMBIENT` | bug     | A-1. `device.inventory`/`device.diagnostics` require a capability, or return only host-neutral facts; drop `holder` from the unprivileged path |
| `APPR-FLOOR-PROBE`    | quality | A hostile fixture asserting a `capabilities: []` app can observe nothing about the host or other apps — the floor as a regression test         |

Write `APPR-FLOOR-PROBE` first; it is the statement of the invariant, and its absence is why
A-1 survived a security review.

### Phase 1 — classify and display (host API 0.13.0)

| ID                | Type    | Requires          | Work                                                                                                                |
| ----------------- | ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `APPR-RISK-CLASS` | feature | —                 | A-2. `capability-risk.json` + generator + `capability-risk.gen.ts`; risk class beside every capability definition   |
| `APPR-TIER`       | feature | `APPR-RISK-CLASS` | §3.2 tier derivation, including the co-occurrence promotion; unit-tested against a table of app shapes              |
| `APPR-REVIEW-UX`  | feature | `APPR-TIER`       | Review dialog orders by risk, states the tier, and separates `benign` from the rest. **No new gates in this phase** |

Phase 1 ships no refusals. It makes the existing dialog honest, which is most of the
user-visible benefit at a fraction of the risk of getting the thresholds wrong.

### Phase 2 — evidence that already exists (host API 0.14.0)

| ID                   | Type    | Requires          | Work                                                                                          |
| -------------------- | ------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `APPR-FIRST-SEEN`    | feature | —                 | A-4. Persistent first-seen ledger keyed by `(appId, publisherKey, packageHash)`, TTL-immune   |
| `APPR-TRUST-DEGREE`  | feature | —                 | A-5. `source` becomes a degree (§5.3) and is surfaced; `isTrusted` gains a degree argument    |
| `APPR-UPDATE-DELTA`  | bug     | `APPR-RISK-CLASS` | A-7/HA-11. An update adding a capability re-reviews, naming the delta and its risk            |
| `APPR-OPTIONAL-CAPS` | feature | `APPR-RISK-CLASS` | A-7. Manifest v2 marks capabilities essential or optional; declining an optional one launches |

`APPR-OPTIONAL-CAPS` rides the same `formatVersion: 2` change as the scoping plan's
`CAP-MANIFEST-V2` and should land with it, not as a second format bump.

### Phase 3 — the evaluator and the gates

| ID                 | Type    | Requires                                            | Work                                                                                     |
| ------------------ | ------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `APPR-EVALUATE`    | feature | `APPR-TIER`, `APPR-FIRST-SEEN`, `APPR-TRUST-DEGREE` | §6 `evaluateApproval` + executable table + Layer-3 vectors                               |
| `APPR-OVERRIDE-UX` | feature | `APPR-EVALUATE`                                     | §4 unmet-requirement presentation and the distinctly-worded override; unmet set recorded |

### Phase 4 — attestations

| ID                  | Type    | Requires           | Work                                                                                              |
| ------------------- | ------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `APPR-ATTESTATION`  | feature | `APPR-EVALUATE`    | §5.2 signed attestation type, announce-path distribution, verification                            |
| `APPR-REVIEWER-SET` | feature | `APPR-ATTESTATION` | Scoped reviewer trust list, acquisition-provenance recording, and the independence rule (§5.2 #3) |

Deliberately last. It is the largest piece, the most speculative, and the only one that
cannot be validated without other people — everything in Phases 0–3 improves the decision on
a single device with no network.

### Phase 5 — the normative record

| ID               | Type | Requires            | Work                                                                                                                           |
| ---------------- | ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `APPR-SPEC-RISK` | docs | `APPR-REVIEWER-SET` | SPEC-CAP grows the risk dimension; risk class in the `miniapp-sdk.md` table; LIMITATIONS §7 records the residual; F4 cross-ref |

## 8. Risks

| Risk                                                                                          | Mitigation                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gates become theatre** — users learn one extra tap and stop reading                         | §4: the override is worded differently from approval, names the specific unmet requirement, and is recorded. Phase 1 ships no gates at all |
| **Evidence requirements recreate a gatekeeper** — a de facto store, with the host as reviewer | Every requirement is locally evaluated against the user's own trust; no signing authority; the user can always proceed                     |
| Sybil reviewers manufacture _K_ endorsements                                                  | §5.2 #3 acquisition-based independence, and an explicit statement that this is bounded, not solved                                         |
| Age and review gates freeze the ecosystem and punish honest new publishers                    | Age applies only at `sensitive`+; scoping lowers class (§3.2), so the cheap path stays open to newcomers who ask for less                  |
| A fresh device has no evidence and gates everything                                           | Unmet ⇒ "cannot verify" + override, never "unsafe"; §5.1 states the limitation in the UI                                                   |
| Risk classes drift from what the code enforces                                                | One generated registry, cross-checked in CI, exactly as `device-classes.json` is today                                                     |
| Four consent surfaces (grant, egress offer, confirmation, approval) overwhelm the user        | This plan adds **no** new dialog: it re-tiers the one that exists. Offers stay a byproduct of natural use per the scoping plan §3          |

## 9. Verification of the claims in §2

Every finding is a code read; none required a new test.

```sh
npm run build
npm test -- packages/miniapp-runtime/test/capabilities.test.ts
npm run test:hostile-apps
```

`test:hostile-apps` does **not** probe ambient authority for a zero-capability app (A-1);
that gap is `APPR-FLOOR-PROBE`.

## 10. Registering this work

All fourteen IDs above are filed as rows in the **Backlog** table of
`STATUS-SOFTWARE.md`, with the types and `--requires` chains the Phase tables state
(`APPR-OPTIONAL-CAPS` additionally requires `CAP-MANIFEST-V2`, since both ride the same
`formatVersion: 2` change). `npm run work:next` walks them in that order; close each with
`npm run work:done` ([work tracking](work-tracking.md)). Rows land via `work:add`, never by
hand.

Verify commands name the test that will prove the item, whether or not that test exists
yet. The Phase 0 and Phase 2 `bug` rows outrank every open `quality` item, so filing them
changed what the queue proposes; that ordering is the intent, not a side effect.

## 11. What this plan will not settle

- **Whether the risk classes are right.** §3.1 is an argued assignment, not a measured one.
  The adversarial simulation ([abuse-resistance-loop.md](abuse-resistance-loop.md)) is where
  it gets tested, and the registry exists so that revising it is a data change.
- **Bootstrapping a reviewer set.** A user with no trusted reviewers gets no benefit from
  Phase 4, and the obvious fixes — a shipped default list, a well-known key — are precisely
  the central authority this platform does not have. Open.
- **Whether a real human reads any of this.** As in the hostile-author plan, every oracle
  here asks whether the system disclosed, not whether the person understood.
- **Thresholds.** _T_ᵢ and _K_ are product decisions; this plan states where they plug in.

## 12. Open questions

1. **Is `max` + co-occurrence promotion the right tier function?** It is defensible and
   simple; it is not measured. Validate against generated hostile app shapes before Phase 3
   hardens it into `evaluateApproval`.
2. **Should `apps:install` be `critical` rather than `sensitive`?** It is the chain-install
   capability (HA-05) and confers second-stage authority the user reviews separately. The
   argument for `sensitive` is that the second review is a real gate; the argument for
   `critical` is that it is authority over the approval system itself.
3. **What are \_T_₁…\_T_₄ and _K_?** Needs the sim campaign, then a product call.
4. **Does a `concern` attestation raise the bar, or only inform?** Raising it gives a trusted
   reviewer a unilateral brake — desirable against a hostile author, and a denial-of-service
   surface if that reviewer is compromised.
5. **Do already-approved apps get re-evaluated when their tier changes** (a capability is
   reclassified, or a scoped grant lapses to unscoped), or does the tier bind at approval?
