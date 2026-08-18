# Hostile Author Plan — adversarial scenarios against user consent

<!-- tp-doc
lifecycle: planned
audited: 2026-08-18
register: software
counterpart: conformance/hostile-authors/README.md
-->

A plan to build executable scenarios in which a **malicious app author tries to talk a user
into running an app that acts against that user's interests**, and to decide from those
scenarios whether the platform's safety mechanisms are sufficient. Measured verdicts for
today live in [the hostile-author catalog](../conformance/hostile-authors/README.md).

Companions: [security-review.md](security-review.md) (sandbox threat model),
[capability-scoping-audit.md](capability-scoping-audit.md) and
[capability-scoping-plan.md](capability-scoping-plan.md) (least authority for I/O),
[SPEC-CHROME](../specs/spec-chrome/spec.md) (host chrome conduct),
[SPEC-CAP](../specs/spec-cap/spec.md) (taxonomy and grant lifecycle),
[abuse-resistance-loop.md](abuse-resistance-loop.md) (the difficulty ladder this feeds).

## 1. The gap this plan attacks

The existing hostile fixtures ([conformance/hostile-apps](../conformance/hostile-apps/))
attack the **machine**: sandbox escape, broker floods, capability substitution, widget-tree
DoS. Every one of them assumes the user is a bystander.

Nothing attacks the **user**. [security-review.md](security-review.md) F4 says so explicitly:

> A granted capability allows full use of that host service for the app namespace. Malicious
> but signed packages are a social/trust problem, not a sandbox bypass.

That sentence draws a boundary and then leaves the far side unexamined. Three things on the
far side are already known to be soft:

1. **CHROME-R1 (canonical descriptions)** and **CHROME-R3 (no draw-over)** — the two rules
   that exist specifically to stop deception — are _informative and untested_, "until a
   snapshot-based check exists." The rules against lying to the user are the ones with no
   fixtures.
2. **A grant names no destination.** Per the [capability scoping audit](capability-scoping-audit.md),
   a plausibly-justified `lxmf:send` grant is a general exfiltration channel. Social
   engineering only has to win the grant dialog once.
3. **The signature authenticates identity, not intent.** `name`, `icon`, and `capabilities`
   are attacker-chosen fields inside the signed manifest
   ([manifest.ts:22](../packages/app-registry/src/manifest.ts)). Signing a lie makes it a
   signed lie.

**Scope of this plan:** deception of the user by the app author. Out of scope: sandbox
escape (covered), package signature cryptography (covered), host OS hardening.

## 2. Threat model — the malicious author

### 2.1 What the author controls

| Surface             | Concretely                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Package metadata    | `name`, `version`, `icon`, declared `capabilities`, `minHostApi` — all signed, none verified against reality                         |
| Discovery           | Announces and the resulting `CatalogEntry` ([catalog.ts](../packages/app-registry/src/catalog.ts)); name, version, and availability  |
| App content         | The entire widget tree, all copy, all timing, all flow ordering inside its own drawing surface                                       |
| Behavior over time  | What the app does on install day vs. day thirty; what a `1.0.1` update adds                                                          |
| Its own destination | LXMF sends and announces from the app destination, once granted                                                                      |
| Out-of-band lure    | A web page, forum post, or LXMF message telling the user to paste an identity string or install a 256t id ("in-platform + sideload") |

### 2.2 What the author does not control

Host chrome rendering, the canonical capability descriptions
([capabilities.ts:152](../packages/miniapp-runtime/src/capabilities.ts)), confirmation
tokens ([confirm.ts](../packages/miniapp-runtime/src/confirm.ts)), broker enforcement, and
first-seen publisher-key pinning in the catalog. **Every scenario in this plan is a bet that
one of those five is enough, or a demonstration that it is not.**

### 2.3 Excluded from this round

Colluding second identities — fake reviewers, seeded reputation, peers that vouch through
[local moderation](local-moderation.md). These attack trust _signals_ rather than the consent
moment and belong to rung 4 (§7).

### 2.4 The victim model — the oracle's user

Scenarios are judged against one stated user, not an idealized one. **The modeled user
reads the app name, the publisher label, and the grant list; approves anything whose stated
purpose matches the app's advertised purpose; does not compare key fingerprints; does not
re-read a dialog they have seen five times.** A defense that works only for a user who
verifies fingerprints by hand does not count as a defense. Where a scenario's outcome
depends on the user model, the fixture says so in a comment.

## 3. The pass criterion

"Sufficient" needs a definition sharper than "we tried some attacks." Every scenario resolves
to exactly one of four outcomes:

| Outcome          | Meaning                                                                                                                                  | Evidence required                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **BLOCKED**      | A mechanism refuses the attack outright                                                                                                  | Fixture asserts the error code                                   |
| **INFORMED**     | The attack proceeds only if the user approves, and host chrome stated the true consequence, in canonical wording, at the decision moment | Fixture asserts the **consent transcript** (§5)                  |
| **CONTAINED**    | The attack succeeds but harm is bounded, attributable, and revocable                                                                     | Fixture asserts the bound; sim-campaign metric names the latency |
| **UNCONTROLLED** | None of the above                                                                                                                        | A finding. Fix, or accept it in writing with its cost            |

**The architecture is sufficient when no scenario in the catalog lands in UNCONTROLLED**, and
every INFORMED verdict is backed by a machine-checked transcript rather than a belief about
what the UI probably says. Publisher trust is not eliminable; the goal is that F4 stops being
one accepting sentence and becomes an enumerated, evidenced residual.

## 4. Where the scenarios live

A new suite, modeled on [conformance/chrome/run.mjs](../conformance/chrome/run.mjs) — every
fixture cites the requirement id it attacks and asserts one broker- or transcript-observable
property.

```
conformance/hostile-authors/
  README.md            # the catalog, one row per scenario, with current verdict
  run.mjs              # fixture driver, requirement-keyed PASS/FAIL lines
  fixtures/
    identity.mjs       # Surface 1
    consent.mjs        # Surface 2
    impersonation.mjs  # Surface 3 (needs the render oracle)
    egress.mjs         # Surface 4
    vector.mjs         # Surface 5
```

`package.json`: `"test:hostile-authors": "npm run build && node conformance/hostile-authors/run.mjs"`.

Scenarios that attack a rule with no id yet **propose the id** in the fixture comment; §8
turns accepted proposals into normative spec text. Scenarios written against the
[EgressOffer design](capability-scoping-plan.md) that has not shipped are marked
`EXPECTED-RED` and skipped by default under `HOSTILE_AUTHORS_PLANNED=1` gating, so the suite
stays green while carrying the future requirement.

## 5. The one piece of new infrastructure — the consent transcript

Most of these attacks do not end in a refusal. They end in a user who approved something.
Deciding whether that approval was _informed_ is what makes this suite hard, and it is the
reason CHROME-R1 has no fixture today.

Proposal: **host chrome emits a structured record for every consent moment**, and fixtures
assert against the record rather than against pixels.

```ts
interface ConsentRecord {
  readonly at: number;
  readonly kind: ConfirmationKind | "install-review" | "grant" | "trust-import";
  /** Host-derived, never app-supplied. */
  readonly subject: {
    readonly appName: string;
    readonly publisherFingerprint: string;
    readonly packageId: string | null;
    readonly confusableWith: ReadonlyArray<string>; // §6 HA-01
  };
  /** Every authority actually conferred, with the registry's own wording. */
  readonly authorities: ReadonlyArray<{
    readonly capability: MiniappCapability;
    readonly canonicalDescription: string;
    readonly scope: string | null; // EgressOffer target once §Phase 4 lands
    readonly isNewSinceLastApproval: boolean;
  }>;
  readonly token: string;
}
```

This buys three things at once: the fixture oracle for INFORMED, a user-visible audit log
("what did I approve, and when"), and a forcing function — anything conferring authority
without a record is, by construction, authority the user was never told about.

Assertion shapes the suite can then use:

1. **Refusal** — error code (`CAPABILITY_MISMATCH`, `CONFIRMATION_UNAVAILABLE`, …).
2. **Disclosure** — the transcript for this decision contains every authority the attack
   later exercises, each with the canonical description string, byte-identical to
   `describeCapability()`.
3. **Non-imitation** — the render oracle (§6, Surface 3).
4. **Containment** — a bound (rate, byte, TTL) plus a sim-campaign metric for revocation
   latency and egress attributability.

## 6. Scenario catalog

Twenty-seven scenarios across five surfaces. **Expected verdict** is what the plan asserts
_should_ happen; **today** is my reading of the current code and is unverified — confirming
each is the first phase's job, not a claim this document makes.

### Surface 1 — Who the user thinks wrote this

| Id    | Scenario                                                                                                      | Expected | Today (unverified)                                    |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| HA-01 | Publish "Handbook" — and a homoglyph variant — under a fresh publisher key; both appear in the catalog        | INFORMED | Likely finding: no confusable-name flagging           |
| HA-02 | Announce a higher semver for an existing appId under a different key (publisher swap)                         | BLOCKED  | First-seen pinning should refuse — verify             |
| HA-03 | Out-of-band page: "paste this identity string to unlock community apps" → `TrustStore` `source: "paste"`      | INFORMED | `trust-import` confirmation exists; wording unaudited |
| HA-04 | Sideload lure: "install 256t id X for the beta" — CHROME-R6 concedes capabilities are unknown at install time | INFORMED | Post-fetch review must be unskippable — verify        |
| HA-05 | An installed app holding `apps:install` chain-installs a second-stage app                                     | INFORMED | Double-gated; assert the second review is separate    |

### Surface 2 — What the user thinks they are approving

| Id    | Scenario                                                                                                                     | Expected              | Today (unverified)                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| HA-10 | A notes app declares `lxmf:send` + `resource:fetch` with a plausible sync story                                              | INFORMED              | Grant text must say the app picks the destination                         |
| HA-11 | Capability creep: `1.0.0` asks for storage; `1.0.1` adds `lxmf:send`                                                         | BLOCKED then INFORMED | Must not auto-activate; delta must be named                               |
| HA-12 | Injection into `ConfirmationRequest.summary` via app-controlled strings (newlines, "Verified by TwistedPear", RTL overrides) | BLOCKED               | Likely finding: summary values not host-derived                           |
| HA-13 | Consent fatigue: raise `device-session` confirmations on a loop; time one to land under the user's tap                       | BLOCKED               | Likely finding: `confirm.ts` has a timeout, no rate limit or tap debounce |
| HA-14 | DevStudio preview asks for grants exceeding the previewed manifest                                                           | BLOCKED               | Tested today — carried as a regression                                    |
| HA-15 | Manifest declares a capability the app never uses, harvested for a later update                                              | INFORMED              | Transcript must mark unused authorities                                   |

### Surface 3 — The app pretending to be the host

| Id    | Scenario                                                                                                   | Expected | Today (unverified)                  |
| ----- | ---------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| HA-20 | App renders a widget tree imitating the grant screen, harvesting a tap                                     | BLOCKED  | CHROME-R3, unchecked                |
| HA-21 | App UI asks the user to type their [identity backup](identity-backup.md) recovery phrase, then egresses it | BLOCKED  | **Highest severity in the catalog** |
| HA-22 | App draws its own softened "permissions" screen before the real one (CHROME-R1)                            | BLOCKED  | Unchecked                           |
| HA-23 | App renders a fake "host update required — approve to continue" banner driving the user to a real dialog   | BLOCKED  | Unchecked                           |
| HA-24 | App claims host authority it lacks ("TwistedPear has verified this publisher")                             | BLOCKED  | Needs the reserved-lexicon oracle   |

**The render oracle, in two layers.** Because the host renders data-only widget trees, most
of this is decidable _structurally_, without pixels:

- **Layer A (deterministic, CI):** a validator pass over the submitted tree that rejects
  reserved chrome vocabulary in app text (platform name as an authority claim, capability
  registry strings, "approve"/"deny" pairs styled as a system prompt), chrome-imitating
  layout signatures, and secret-solicitation patterns (recovery phrase, seed words, identity
  string). Proposed ids **CHROME-R7** (reserved lexicon) and **CHROME-R8** (no
  secret solicitation). Runs in `ui/validate.ts` alongside the existing depth/node limits.
- **Layer B (snapshot, web + desktop host):** geometry assertions that confirmations render
  outside the app surface and cannot be occluded — the missing "snapshot-based check" that
  SPEC-CHROME's own text is waiting on. This is what promotes R1 and R3 from informative to
  normative.

Layer A is where the value is; Layer B is what closes the spec.

### Surface 4 — Egress after consent

| Id    | Scenario                                                                                     | Expected                   | Today (unverified)                                 |
| ----- | -------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------- |
| HA-30 | Granted `lxmf:send` used to ship the user's contact list to an author-controlled destination | BLOCKED (post-EgressOffer) | UNCONTROLLED by design — this is F4                |
| HA-31 | `ai:chat` prompt smuggling: user data encoded into prompts to the host-fixed endpoint        | INFORMED + CONTAINED       | Budgets bound it; grant wording must admit it      |
| HA-32 | `announce:publish` as a covert beacon signaling user presence/behavior                       | CONTAINED                  | Assert own-namespace + rate/size limits            |
| HA-33 | `announce:subscribe` to another app's namespace (audit finding F-2)                          | BLOCKED                    | Namespace validation — verify                      |
| HA-34 | `resource:fetch` path/query as an exfiltration channel under host budget rules               | CONTAINED                  | Assert destination really is host-fixed            |
| HA-35 | User revokes on suspicion — next call, in-flight stream, and queued sends                    | BLOCKED                    | Assert revocation latency bound                    |
| HA-36 | Bait-and-switch: benign until a remote flag arrives via `resource:fetch`, then hostile       | CONTAINED                  | Not preventable — the case that _requires_ scoping |

HA-30 and HA-36 are the plan's load-bearing scenarios: they cannot be resolved by better
dialogs, only by [EgressOffer](capability-scoping-plan.md). They are written now, red now,
and become the acceptance test for that work.

### Surface 5 — The app as a vector against other users

| Id    | Scenario                                                                                                      | Expected  | Today (unverified)                           |
| ----- | ------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------- |
| HA-40 | The app sends "try this app" invites to the user's contacts, borrowing the user's credibility                 | CONTAINED | Recipients must see app provenance           |
| HA-41 | Recipient blocks the sender — but [local moderation](local-moderation.md) keys on the source destination hash | BLOCKED   | Likely finding: no per-app block granularity |
| HA-42 | Announce flood from a granted app degrading peers                                                             | CONTAINED | Assert announce rate limits                  |
| HA-43 | The lure arrives as an LXMF message carrying a 256t id, from a contact the user trusts                        | INFORMED  | Ties Surface 5 back to HA-04                 |

## 7. Difficulty ladder

Rungs mirror [abuse-resistance-loop.md](abuse-resistance-loop.md) §3 — climb only when the
rung below is green and its findings are regression-locked.

1. **Single decision point.** One surface, static, one dialog. HA-01…HA-24.
2. **Multi-step lures.** Trust import → install → grant, chained. HA-03+HA-04+HA-05.
3. **Time-shifted.** Update creep, post-review behavior change, revocation races. HA-11, HA-35, HA-36.
4. **Generated and colluding.** Deceptive manifests and copy authored by
   `packages/sim-adversaries` (`npm run sim:author`), colluding identities, seeded
   reputation, campaign conditions. Findings must replay from `(seed, config)` without their
   author — including when the author is an LLM.

## 8. Phasing

The five phases are tracked as `HA-P0-BASELINE`, `HA-P1-TRANSCRIPT`,
`HA-P2-RENDER-ORACLE`, `HA-P3-FINDINGS`, and `HA-P4-SCOPED-EGRESS` in the **Backlog**
table of [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md), chained in the order below, with
`HA-P4-SCOPED-EGRESS` additionally waiting on `CAP-EGRESS-WIRING`.

| Phase  | Work                                                                                                                                                                    | Exit criterion                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **P0** | Verify every "today" column above against the running code. No new mechanisms. Produce the findings list with real verdicts.                                            | [conformance/hostile-authors/README.md](../conformance/hostile-authors/README.md) catalog with each row's verdict measured, not guessed |
| **P1** | `ConsentRecord` transcript (§5) + fixture driver + all Surface 1/2/4/5 scenarios that are broker- or transcript-observable. Wire `test:hostile-authors` into CI.        | Suite runs green or red on purpose; no scenario is "untestable"                                                                         |
| **P2** | Render oracle Layer A (CHROME-R7/R8 in `ui/validate.ts`) → Surface 3 scenarios; Layer B snapshot geometry → promote CHROME-R1 and R3 to normative.                      | SPEC-CHROME has no informative-only rules left                                                                                          |
| **P3** | Fix P0/P1/P2 findings: confirmation rate limiting, host-derived summaries, confusable-name flagging, capability-delta review on update, per-app moderation granularity. | Every finding BLOCKED, INFORMED-with-transcript, or CONTAINED-with-a-metric                                                             |
| **P4** | Scoped-egress scenarios against manifest v2 / `EgressOffer`; flip HA-30/HA-36 green as scoping Phase 2 lands. Hook rung 4 to the sim campaign.                          | F4 rewritten from acceptance into enumerated residual; LIMITATIONS §7 updated                                                           |

P0 is deliberately separate. Writing fixtures before measuring the baseline produces
fixtures that encode assumptions; several of my "likely finding" guesses above will be wrong
in both directions.

## 9. Registration chores

The suite is not done when it runs. It is done when the repo knows about it:

- `package.json` — `test:hostile-authors`; nightly or PR tier per [ci-policy.md](ci-policy.md).
- [conformance/README.md](../conformance/README.md) — suite table row.
- [docs/README.md](README.md) — index row under "Security, quality, and validation".
- [SPEC-CHROME](../specs/spec-chrome/spec.md) — R7/R8 text; R1/R3 promoted; normative-artifact links.
- [SPEC-CAP](../specs/spec-cap/spec.md) — the consent transcript as a grant-lifecycle artifact.
- [security-review.md](security-review.md) — F4 rewritten (per the scoping plan, **not**
  silently edited before the work lands) and a new finding class for author deception.
- [LIMITATIONS.md](../LIMITATIONS.md) §7 — residuals that survive P3.
- `checks.json` / ratchets — whatever `conformance/doc-audit` demands of a new suite.

## 10. What this plan will not settle

- **Whether a real human is deceived.** Every oracle here asks whether the _system disclosed_,
  not whether the _person understood_. A human-subject or LLM-judge protocol is the honest
  next step and is out of scope by choice.
- **Reputation and social proof.** Deferred to rung 4.
- **A user who approves everything.** Against blanket approval, only §3's CONTAINED column
  helps — which is why the scoping plan's warning bears repeating here: a consent control that
  becomes a rubber stamp is worse than no control, because it looks like protection while
  functioning as a formality.
