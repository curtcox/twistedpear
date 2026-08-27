# User policy plan — arbitrary, self-imposed, enforceable restrictions

<!-- tp-doc
lifecycle: planned
audited: 2026-08-25
register: software
counterpart: docs/user-policy.md
-->

**This is a plan, not a description of current behaviour.** The Sans-IO evaluator,
amendment machine, and seal commit now live in [user-policy.md](user-policy.md);
that live file wins against this one. What still does not ship is evidence
adapters, preview, chrome, and backup-envelope binding. The normative artifacts
this plan produces are specified in [SPEC-POLICY](../specs/spec-policy/spec.md).

A plan for letting the user state, in a form the host actually enforces, what may happen
on this installation — and to make some of those statements permanent. The design premise
is a ranking, not a balance:

> The user must be able to express and enforce an arbitrary restriction. Being protected
> from the inconvenience that restriction causes is strictly less important. An
> installation hardened into uselessness can be deleted and reinstalled; a compromised
> installation cannot be un-compromised.

So the platform **warns comprehensively and refuses nothing**. Every mechanism below is
built to make the consequences legible before the user commits, and none of them is built
to stop the user committing.

Companions: [hostile-author-plan.md](hostile-author-plan.md) (the author deceiving the
user), [app-approval-risk-plan.md](app-approval-risk-plan.md) (evidence proportionate to
requested authority), [linked-devices.md](linked-devices.md) (why a sibling installation's
decision is a proposal), [identity-backup.md](identity-backup.md) (what a reinstall
costs), [security-review.md](security-review.md) (sandbox threat model).

## 1. The invariants

**I-1 — Expressible.** Any condition the host can evaluate can gate any action the host
can take. There is no privileged list of "supported" restrictions and no ceiling on how
strict a policy may be.

**I-2 — Monotone unless gated.** Making the installation stricter is always available.
Making it less strict is itself an action governed by the policy. There is no path that
relaxes a restriction without satisfying whatever the policy says relaxation requires.

**I-3 — Permanence is real.** A restriction the user sealed cannot be lifted by anyone
holding the device, the disk, or a backup. The only exit is destroying the installation.
That is not a figure of speech: it must be true against an attacker with filesystem
access, and it must be true against the user.

**I-4 — Consequences are stated, never enforced by refusal.** Before a sealing decision
the host says what the policy will make impossible, who it makes load-bearing, and what a
reinstall would destroy. Then it does what the user asked.

## 2. What exists today, and what does not

Grounded in code reads; §12 says how to re-derive them.

Present and reusable:

| Mechanism                                                                                                                           | What it already gives this plan                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`grants.ts`](../packages/protocol/src/grants.ts), [`grant-machine.ts`](../packages/protocol/src/grant-machine.ts)                  | Per-(app, capability) grant lifecycle to hang a gate on         |
| [`approval-evaluate.ts`](../packages/protocol/src/approval-evaluate.ts)                                                             | The shape of a Sans-IO decision: evidence in, verdict out       |
| [`capability-risk.json`](../specs/spec-cap/registry/capability-risk.json)                                                           | Risk class as data, usable as a policy predicate                |
| [`sibling-decisions.ts`](../packages/host-core/src/sibling-decisions.ts)                                                            | Precedent that a remote decision is a proposal, never an effect |
| [`identity-backup.ts`](../packages/host-core/src/identity-backup.ts)                                                                | An AES-GCM vault under a passphrase-derived key                 |
| [`rns-hkdf.ts`](../packages/protocol/src/rns-hkdf.ts), [`app-scoped-identity.ts`](../packages/host-core/src/app-scoped-identity.ts) | The HKDF discipline the seal commit reuses                      |

Absent entirely:

- **No user-authored condition of any kind.** Every gate in the tree is authored by
  TwistedPear. `RelayPolicyMatrix` is a fixed allow-matrix over interface kinds;
  [`security-policies.ts`](../packages/miniapp-runtime/src/security-policies.ts) holds two
  standalone primitives with no ingress. Nothing accepts a user-supplied expression.
- **No environmental predicates.** Location, wakefulness, and attested time now have
  host adapters in [user-policy.md](user-policy.md)#evidence. Without sensors they
  stay `unknown`.
- **No third-party approval of a local action.** Single-use, bound approvals now exist
  in the same adapter. Chrome that _asks_ for one is still planned.
- **No monotonicity anywhere.** Nothing in the tree distinguishes a tightening change
  from a relaxing one. (Amendment classification now does; this bullet is historical
  for the pre-POL-2 tree.)

## 3. The policy document

Implemented by POL-1-EVAL. The live description of subjects, predicates, Kleene
combinators, unknown collapse, and deny-overrides is
[user-policy.md](user-policy.md). The schema remains
[policy-document.schema.json](../specs/spec-policy/schema/policy-document.schema.json).
Order is not semantics (§9, P5) — a rule cannot be shadowed by a later one, so
re-ordering is not an attack surface.

`policy:amend` and `policy:seal` are ordinary subjects so that policy governs the
setting of policy (§4). The amendment machine and seal commit now live in
[user-policy.md](user-policy.md).

The syntactic handle §4 needs: **adding a `deny` rule can never widen a decision,
and removing an `allow` rule can never widen a decision.** That is deny-overrides
as implemented. `"ask"` is an evaluator outcome; host chrome that prompts and
records the answer is still planned.

## 4. Amendment — policy governing policy

The amendment machine is in [user-policy.md](user-policy.md). A-1 through A-4,
bootstrap (`seededUserPolicy`), and self-lockout (B14) are implemented there.
What this section still owns is the surrounding work: the consequence preview
that must warn before a terminal policy is sealed (§6), and the bypass catalogue
that tries to talk the machine out of A-1 through A-4 (§9).

## 5. Sealing — remaining around the commit

The commit chain, wrap key, catalog / grants / app-data wrap, tamper and
rollback failure, and older-host refusal now live in
[user-policy.md](user-policy.md). Identity stays on the passphrase vault; a
tamper of a sealed policy does not by itself destroy the identity backup.

What this section still owns:

- **Consequence preview before first seal** — POL-5. The wrap exists; the host
  must still say which state dies if the user proceeds.
- **Backup-envelope binding** — POL-8. Restoring a pre-seal backup must not
  launder the policy away. The policy commit is bound into the backup envelope;
  restoring a backup restores its policy, and a backup older than the seal
  restores an installation that is _also_ older than the seal — with the data of
  that moment, not today's. B8 in §9.

## 6. Warning without prohibiting

Shipped. See [user-policy.md](user-policy.md)#preview. Host chrome that _shows_ the
preview is still planned; the generator, typed confirmation, and consent record are not.

| Preview section           | Question it answers                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reachability              | For each subject, does _any_ assignment of predicate values consistent with this host's capabilities yield `allow`? If not: "this permanently prevents X on this installation." |
| Amendment reachability    | Is the `policy:amend` gate itself satisfiable? If not, say the policy is terminal.                                                                                              |
| People made load-bearing  | Every external identity the policy depends on, named, with the consequence of that person losing their key or refusing.                                                         |
| Sources made load-bearing | Every sensor, clock, and interactive prompt the policy needs, and which of them this host cannot provide at all.                                                                |
| Unknown collapses         | Every `assume(x, true)` and every `onUnknown: "allow"`, listed as a weakening, in the author's own words.                                                                       |
| Reinstall cost            | Exactly what deleting and reinstalling destroys, from the same inventory [identity backup](identity-backup.md) uses.                                                            |

Reachability is decided by enumerating the finite predicate domain for the subject's rule
set, with host-unavailable predicates pinned to `unknown`. A preview that cannot decide
says so rather than guessing — and §9's P6 makes a preview that _lies_ a test failure.

## 7. Trusting the evidence

Shipped. See [user-policy.md](user-policy.md)#evidence. Mini-app isolation is
B10 in the suite; preview of load-bearing sensors remains planned.

## 8. The worked example

The motivating policy, compiled. It is committed as a golden vector so the platform is
tested against this exact document, not a paraphrase.

```json
{
  "version": 1,
  "base": {
    "app:install": "deny",
    "app:launch": "deny",
    "grant:request": "deny",
    "interface:enable": "deny",
    "identity:link": "deny",
    "identity:export": "deny",
    "apps:publish": "deny",
    "policy:amend": "allow",
    "policy:seal": "allow"
  },
  "rules": [
    {
      "id": "new-apps",
      "subject": "app:install",
      "effect": "allow",
      "onUnknown": "deny",
      "when": {
        "all": [
          { "known": { "place.is": "home" } },
          { "known": "user.awake" },
          { "known": { "time.localHourIn": [9, 20] } },
          { "known": "user.voiceAuthorized" },
          { "known": { "approval.by": "spouse" } },
          { "known": { "approval.by": "mother" } },
          { "known": { "approval.byOrg": "employer" } },
          { "not": "app.usesNetwork" },
          { "lt": ["app.sourceBytes", 5000] }
        ]
      },
      "sealed": true
    },
    {
      "id": "amend-gate",
      "subject": "policy:amend",
      "effect": "deny",
      "when": true,
      "onUnknown": "deny",
      "sealed": true
    }
  ]
}
```

Every `known(...)` is the user saying "unverifiable is not good enough". The `amend-gate`
rule is "no takesie backsies": relaxation is denied unconditionally and the rule is
sealed, so no amendment can remove it and no disk edit can survive it. The preview for
this document reports a terminal policy, seven load-bearing sources including three other
people, and the full reinstall cost — and then, on a typed confirmation, seals it.

## 9. Testing

The requirement is not "policy works". It is that **policy cannot be talked out of**, so
the bulk of the effort is adversarial and property-based rather than example-based.

### 9.1 Layers

| Layer            | Artifact                                                                                             | Command                      |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| Executable table | Sans-IO evaluator and amendment machine in `packages/protocol`                                       | `npm test`                   |
| Truth tables     | Exhaustive `{true, false, unknown}` cases for every combinator and collapse                          | `npm test`                   |
| Formal twin      | TLA+ amendment machine in `specs/spec-policy/model/`                                                 | `npm run formal:policy`      |
| Generated vector | `(policy, subject, evidence) → decision` in `conformance/vectors/policy.json`, including §8 verbatim | `npm run vectors:generate`   |
| Adversarial      | The bypass catalogue below, one executable test each                                                 | `npm run test:policy-bypass` |
| Simulation       | Policy-aware adversaries in `packages/sim-adversaries`                                               | `npm run test:sim-campaign`  |

The evaluator is small and pure, so it carries a raised mutation-score floor in
`mutation-ratchet.json`: deny-overrides must not be silently weakenable by a surviving
mutant. It must also pass `npm run sansio`.

### 9.2 Properties

Property tests over generated policies and worlds, using `fast-check`.

- **P1 Monotonicity.** Adding a `deny` rule or removing an `allow` rule never turns a
  `deny` into an `allow`, for any subject and any world.
- **P2 Certified-tightening soundness.** An amendment classified as certified tightening
  never increases permission — _including_ worlds where the amendment changed which
  predicates are resolvable. This is the executable form of A-4.
- **P3 Seal permanence.** No sequence of amendments, from any starting policy, removes or
  alters a sealed rule.
- **P4 Pre-amendment evaluation.** For every relaxing amendment, the decision is a function
  of the pre-amendment document only; injecting the post-amendment document into the
  authorization input changes no verdict.
- **P5 Order independence.** Permuting the rule set never changes a decision.
- **P6 Preview fidelity.** If the preview says a subject is reachable, a world exists in
  which the evaluator allows it; if it says unreachable, no such world exists. A warning
  that lies is a test failure.
- **P7 Total collapse.** Every reachable evaluation terminates in `allow` or `deny`; no
  decision path returns `unknown` to a caller.

### 9.3 Bypass catalogue

Each is a named, executable test asserting the bypass **fails**. Shipped as
[`conformance/policy-bypass/`](../conformance/policy-bypass/README.md); the
table below is what `catalogue.test.ts` holds the suite to, so it stays here.

| ID  | Attack                                                                                            |
| --- | ------------------------------------------------------------------------------------------------- |
| B1  | Gate self-removal — one amendment that deletes the `policy:amend` rule authorizing it             |
| B2  | Ladder — a sequence of individually-permitted amendments that net to a relaxation                 |
| B3  | Evidence starvation — deny a sensor so its predicate goes `unknown` and an `allow` collapse fires |
| B4  | Clock attack — set the device clock or timezone to enter a time window                            |
| B5  | Approval replay — reuse an approval for a second install, a different package, or another host    |
| B6  | Approver substitution — rebind a role name to an attacker key without passing the amend gate      |
| B7  | Sibling laundering — decide on an unsealed linked installation and sync the result in             |
| B8  | Backup laundering — restore a pre-seal backup to shed a sealed policy                             |
| B9  | Disk tamper and rollback — edit the policy file, or revert to an earlier chain head               |
| B10 | App-initiated amendment — any broker, grant, or chrome path from app code to policy               |
| B11 | Host downgrade — an older host opening a store whose sealed policy it cannot evaluate             |
| B12 | Adapter substitution — a predicate provider that answers `true` unconditionally                   |
| B13 | Collapse laddering — `assume(x, true)` or an `onUnknown` weakening slipped in as "tightening"     |
| B14 | Self-lockout — asserted to **succeed**, warned and recorded: the platform does not nanny          |

### 9.4 Recovery

Two integration tests keep the escape hatch honest, because the whole design rests on it:

- **Hardened to uselessness.** Seal §8's policy, confirm no app can be installed or
  launched and no amendment is possible, delete the installation, reinstall, confirm the
  new installation is fully usable.
- **Cost is what we said.** After that reinstall, assert the previous identity, message
  history, and app data are gone — the preview's reinstall-cost section is checked against
  reality, not against its own prose.

## 10. Decisions taken, and what stays open

Taken:

- Three-valued predicates with the collapse always written by the policy author, rather
  than a fixed fail-closed rule. A permanently unavailable sensor must not become an
  inexpressible permanent lockout, and the weakening must be visible where it is written.
- Key-bound sealing rather than an append-only ledger. A ledger is honest-host
  enforcement; I-3 requires enforcement against the disk.
- Deny-overrides with unordered rules, so ordering is never an attack surface and
  tightening has a syntactic handle.
- Policy governs `policy:amend` and `policy:seal`, with A-1 (pre-amendment evaluation) as
  the rule that makes the self-reference safe.

Open, and deliberately not decided here:

- What the preview must say about identity remaining outside the sealed wrap
  (`POL-5-PREVIEW`), now that catalog, grants, and app-data are under it.
- Whether the predicate domain is small enough for exhaustive reachability on realistic
  policies, or whether the preview needs a solver.
- The transport for approval requests and attestations — LXMF direct, or a dedicated
  approver flow.
- Place and wakefulness ship as adapters that return `unknown` without a sensor. Whether
  any current host _has_ those sensors is still open; the language and collapse already
  treat absence as unknown.

## 11. Documents to update when policy ships

A policy the user can state and seal changes what several current statements mean, so
landing the mechanism is not the end of the item. `SPEC-POLICY` is the normative record;
these are the documents that describe the platform to a person.

| Document                                                                                                                                             | What changes                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [user-policy.md](user-policy.md)                                                                                                                     | Live half of this pair. Evaluator, amendment, and seal commit are there; preview and chrome are not                                                                                                                                          |
| [FAQ.md](FAQ.md)                                                                                                                                     | "If no one reviews apps, how is that safe?" tells the reader they can set the bar as high as they want, under a ⏳ note pointing here and at [app-approval-risk-plan.md](app-approval-risk-plan.md). Drop the note when both halves are true |
| [guide/08](../guide/08-trust-privacy-safety.md)                                                                                                      | Where a user learns that a self-imposed restriction is available, and what sealing costs them                                                                                                                                                |
| [guide/appendix-feature-status.md](../guide/appendix-feature-status.md), [authors/appendix-feature-status.md](../authors/appendix-feature-status.md) | A row each; an author needs to know an app can be refused by a policy rather than by a grant                                                                                                                                                 |
| [guide/glossary.md](../guide/glossary.md), [glossary.md](glossary.md)                                                                                | _Policy_, _Amendment_, _Sealing_                                                                                                                                                                                                             |
| [app-approval-risk.md](app-approval-risk.md)                                                                                                         | Thresholds stop being host-supplied constants once a policy can name them                                                                                                                                                                    |
| [LIMITATIONS.md](../LIMITATIONS.md)                                                                                                                  | I-1's honest edge: an installation hardened into uselessness is a supported outcome, and the document that catalogues costs should say so                                                                                                    |
| [identity-backup.md](identity-backup.md)                                                                                                             | §5 sealing is key-bound, so what a reinstall costs is now also what escaping a seal costs                                                                                                                                                    |

The two claims most at risk of drifting apart are §10's open items and any user-facing
copy written before they close: nothing here should read as "you are protected" when the
mechanism only guarantees "you were warned".

## 12. Re-deriving §2

```sh
rg -n "RelayPolicyMatrix|security-policies" packages/ --type ts
rg -n "SIBLING_DECISION_CLASSES" packages/host-core/src
rg -n "encryptIdentityBackup|deriveKey" packages/host-core/src/identity-backup.ts
rg -n "export function evaluateApproval" packages/protocol/src
```

None of them returns a user-supplied expression, an irreversible setting, or a
tightening/relaxing distinction; that absence is what §3 through §5 fill.
