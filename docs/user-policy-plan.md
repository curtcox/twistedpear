# User policy plan — arbitrary, self-imposed, enforceable restrictions

<!-- tp-doc
lifecycle: planned
audited: 2026-08-23
register: software
-->

**This is a plan, not a description of current behaviour.** Nothing described here is
implemented. What ships today is
[app approval risk](app-approval-risk.md) and
[capability scoping](capability-scoping.md); those live documents win against this one
until the work lands. The normative artifacts this plan produces are specified in
[SPEC-POLICY](../specs/spec-policy/spec.md).

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

Grounded in code reads; §11 says how to re-derive them.

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
- **No environmental predicates.** Location, wakefulness, and attested time have no
  representation. Time is read as a host clock wherever it is read at all.
- **No third-party approval of a local action.** Attestations exist for publishers, not
  for "my spouse approved this install on this device".
- **No irreversibility.** Every setting in the tree can be set back. No mechanism ties a
  decision to key material such that reversing it destroys data.
- **No monotonicity anywhere.** Nothing in the tree distinguishes a tightening change
  from a relaxing one.

## 3. The policy document

A policy is an unordered set of **rules** plus a **base posture** per subject. Order is
not semantics (§9, P5) — a rule cannot be shadowed by a later one, so re-ordering is not
an attack surface.

### 3.1 Subjects

The action classes a rule can gate. The set is closed and versioned; an unknown subject
in a policy document blocks load rather than being ignored (a policy the host does not
fully understand must never be treated as satisfied).

`app:install` · `app:launch` · `grant:request` (keyed by capability and risk class) ·
`interface:enable` · `identity:link` · `identity:export` · `apps:publish` ·
**`policy:amend`** · **`policy:seal`**

The last two are the point of §4: policy governs the setting of policy.

### 3.2 Predicates

Every predicate evaluates to `true`, `false`, or `unknown`. Three-valued is not a
convenience — "my mother is unreachable" is a distinct state from "my mother said no",
and collapsing them silently is how a policy comes to mean something the user did not
write.

| Family        | Examples                                                                                                                              | Resolvability                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Artifact      | `app.capabilities ⊆ S`, `app.usesNetwork`, `app.sourceBytes < 5000`, `app.riskTier ≤ t`, `package.hash ∈ H`, `app.firstSeenBefore(d)` | Always decidable from the package; never `unknown`                     |
| Environmental | `time.localHourIn(9, 20)`, `place.is("home")`, `user.awake`, `power.charging`                                                         | `unknown` whenever the evidence source is absent, stale, or unattested |
| Interactive   | `user.voiceAuthorized`, `user.passphrase`, `user.typedPhrase(p)`                                                                      | `unknown` on timeout; `false` on an explicit refusal                   |
| Third-party   | `approval.by("spouse")`, `approval.by("mother")`, `approval.byOrg("employer")`                                                        | `unknown` until an attestation arrives; `false` on a signed denial     |
| Installation  | `host.class`, `policy.sealedSince(d)`, `sibling.count`                                                                                | Always decidable locally                                               |

Predicate resolution is **evidence gathering, not evaluation**: the Sans-IO evaluator
returns the set of predicates it needs, the host adapter obtains them, and the evaluator
is re-entered with the answers. This keeps `packages/protocol` free of I/O and makes every
predicate independently substitutable in tests.

### 3.3 Combinators and the unknown collapse

Strong Kleene logic, with the collapse always written by the policy author:

- `all` — `false` if any operand is `false`; else `unknown` if any is `unknown`; else `true`.
- `any` — `true` if any operand is `true`; else `unknown` if any is `unknown`; else `false`.
- `not` — maps `unknown` to `unknown`.
- `known(x)` — `true` only if `x` is `true`; `unknown` becomes `false`. The "must be
  demonstrated" combinator.
- `assume(x, v)` — collapses `unknown` to the literal `v`. Writing `assume(x, true)` is
  the only way to say "treat unverifiable as satisfied", and it is visible in the
  document, in the preview, and in the seal commit.

Every rule carries a mandatory `onUnknown: "deny" | "allow" | "ask"` terminal collapse.
There is no default: a policy that does not say what an unresolved condition means does
not load. `"ask"` escalates to a host-chrome prompt and records the answer as the
predicate value for that decision only.

### 3.4 Decision

Deny-overrides, evaluated over all rules matching the subject:

1. Any rule yielding `deny` → **deny**.
2. Otherwise any rule yielding `allow` → **allow**.
3. Otherwise the subject's base posture.

The consequence worth stating: **adding a `deny` rule can never widen a decision, and
removing an `allow` rule can never widen a decision.** That is the syntactic handle §4
needs.

## 4. Amendment — policy governing policy

Changing the policy is the subject `policy:amend`, and it is gated by the policy like
anything else. This is what makes "the ability to set policy is guarded by policy" real,
and it is also where every interesting bypass lives.

### 4.1 The four rules that make meta-circularity safe

**A-1 — An amendment is evaluated against the pre-amendment policy.** Always. Otherwise
the universal bypass is one transaction that removes the gate, after which the gate no
longer applies to its own removal. The evaluator is handed the old document and the
proposed diff; the new document never participates in its own authorization.

**A-2 — An amendment is one atomic transaction.** A diff is accepted or rejected whole.
No partially applied amendment, and no observable intermediate document another amendment
could be evaluated against.

**A-3 — Certified tightening needs no gate; everything else does.** An amendment is
_certified tightening_ iff, syntactically: it only adds `deny` rules, only removes `allow`
rules, does not move any base posture from `deny` to `allow`, does not weaken any
`onUnknown` from `deny` toward `allow`, introduces no `assume(x, true)`, and touches no
sealed rule. Anything else is a **relaxation** and must satisfy the pre-amendment
`policy:amend` gate.

**A-4 — Evidence-dependency is part of tightening.** A-3 is unsound on its own. Adding a
`deny` rule for `grant:request` on the location capability starves `place.is("home")`,
turning it `unknown`; a rule collapsing `unknown` to `allow` then flips from deny to
allow, so a purely-additive `deny` amendment has widened a decision. Therefore each rule
carries its computed predicate-dependency set, and an amendment that could change the
resolvability of any predicate used by a rule whose collapse is not `deny` is classified
as a relaxation regardless of its shape. This is bypass B3 in §9 and the single most
important property to test.

### 4.2 Bootstrap

Before any policy exists, the only authority that exists is control of the installation
identity, so the seeded default is: `policy:amend` base posture `allow`, gated on
`user.passphrase` (the identity vault passphrase, already required to open the
installation). The first amendment may relax that gate to nothing — expressiveness wins —
but the shipped default is not "whoever picks up the unlocked phone".

### 4.3 Self-lockout is a supported outcome

A policy whose `policy:amend` gate is unsatisfiable is terminal: the installation's rules
are now fixed for its lifetime. This is a legal, warned, tested outcome (§9, B14), not an
error. The preview says so in those words; the platform does not decline.

## 5. Sealing — what "no takesie backsies" compiles to

An unsealed policy is enforced by an honest host: correct against software, useless
against someone editing the file. Sealing makes it true against the disk.

**Mechanism.** Sealed rules are committed into a hash chain,
`commit₀ = H(genesis)`, `commitₙ = H(commitₙ₋₁ ‖ H(amendmentₙ))`. The installation's vault
key is `Kₙ = HKDF(rootSecret, commitₙ)` using the existing
[`rns-hkdf`](../packages/protocol/src/rns-hkdf.ts) discipline, and the store master key is
kept wrapped under `Kₙ`. Accepting an amendment is the only code path that rewraps, and it
rewraps only after the amendment passes §4. Previous wraps are erased on rewrap.

What that buys:

- **Edit the policy file** → `commit` no longer matches → `K` no longer unwraps → the
  store does not open. Tampering is indistinguishable from destroying the installation,
  which is the intended cost.
- **Roll back to an earlier policy** → the wrap for that chain head no longer exists →
  same outcome.
- **Tighten legitimately** → the accepted amendment rewraps → the store opens normally.
- **Restore a pre-seal backup** → must not launder the policy away. The policy commit is
  bound into the backup envelope; restoring a backup restores its policy, and a backup
  older than the seal restores an installation that is _also_ older than the seal — with
  the data of that moment, not today's. B8 in §9.

**Prerequisite work.** Today only the identity vault is under a passphrase-derived key;
the catalog, grants, and app data are not uniformly beneath it. Either they come under the
sealed key or the preview must say plainly which state survives a tamper. Deciding that,
and making it true, is `POL-3-SEAL`.

**Version pinning.** The commit includes the policy language version and the subject set.
An older host that cannot evaluate a sealed policy must fail closed — refuse to run the
installation — rather than open a store whose rules it does not understand. B11.

## 6. Warning without prohibiting

Before any sealing amendment, the host runs a **consequence preview** and requires the
user to type a confirmation phrase. The preview is generated from the policy, not written
by hand, and it is recorded verbatim in the consent record so "I was not warned" is later
checkable.

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

A predicate is only as good as the thing answering it, and a policy is a claim about the
world made by a device the user may not fully control.

- **Time.** `time.*` resolves `unknown` unless the clock is attested: monotonic since
  boot, plus a signed time reference from a peer or approver where the rule demands it. A
  settable device clock otherwise turns "between 9am and 8pm" into "whenever I like" (B4).
- **Approvals.** An attestation is bound to `(subject, package hash, installation id,
nonce, expiry)` and is single-use. Rebinding a role name like `"mother"` to a different
  key is itself a `policy:amend` — approver identity is policy, not configuration (B5, B6).
- **Place and wakefulness.** Both are inferences, both are sensor-dependent, and both are
  privacy-sensitive. A policy that uses them makes those sensors load-bearing, which the
  preview states. Absent sensor → permanently `unknown` → the rule's declared collapse.
- **Siblings.** A linked installation may _carry_ an approval; it may never _make_ a
  policy decision for this one. This extends the existing rule that no sibling class
  carries capability grants ([`sibling-decisions.ts`](../packages/host-core/src/sibling-decisions.ts)) to policy (B7).
- **Mini-apps.** No capability reaches policy. There is no broker namespace, no grant, and
  no chrome path by which app code proposes, reads, or amends a rule. Asserted as a closed
  set, not as an absence (B10).

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

Each is a named, executable test asserting the bypass **fails**.

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

- Which stores come under the sealed key (`POL-3-SEAL`), and what the preview must say
  about anything that stays outside it.
- Whether the predicate domain is small enough for exhaustive reachability on realistic
  policies, or whether the preview needs a solver.
- The transport for approval requests and attestations — LXMF direct, or a dedicated
  approver flow.
- Whether `place` and `awake` ship at all in the first cut, or whether the first cut ships
  only always-resolvable artifact predicates plus approvals, with sensor predicates
  expressible but permanently `unknown` on every current host.

## 11. Re-deriving §2

```sh
rg -n "RelayPolicyMatrix|security-policies" packages/ --type ts
rg -n "SIBLING_DECISION_CLASSES" packages/host-core/src
rg -n "encryptIdentityBackup|deriveKey" packages/host-core/src/identity-backup.ts
rg -n "export function evaluateApproval" packages/protocol/src
```

None of them returns a user-supplied expression, an irreversible setting, or a
tightening/relaxing distinction; that absence is what §3 through §5 fill.
