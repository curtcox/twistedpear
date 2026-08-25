# Platform facilities the platform lacks — proposal register

<!-- tp-doc
lifecycle: planned
audited: 2026-08-24
register: software
-->

**This document describes planned work, not current behaviour.** What ships today is in
[STATUS-COMPLETE.md](../STATUS-COMPLETE.md); what is
open and gates the release is in [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md); what is
known-limited is in [LIMITATIONS.md](../LIMITATIONS.md). These facilities are now tracked
as ordinary backlog, but none is a release-qualification item.

A survey of facilities for **running** and **developing** mini-apps that the platform does
not currently offer, with the case for each. Items already acknowledged as missing in the
[author feature status](../authors/appendix-feature-status.md) and
[user feature status](../guide/appendix-feature-status.md) appendices — a published `tp`
binary, key rotation, a React binding, group messaging, device performance figures — are
deliberately excluded; those are tracked, not undiscovered.

One item, §7, is developed in full in
[the mini-app record and replay plan](miniapp-record-replay-plan.md).

## Tier 1 — facilities apps cannot work around

### 1. Replicated shared state

**Missing.** Hyperbee is strictly local: no cross-device sync, no shared topic, no
replication between peers. The Cookbook tells authors directly that merge is their problem.

**Why it matters here.** This is a local-first peer-to-peer platform whose defining app
shapes — shared boards, rosters, ledgers, swap shelves — are all replicated state. Every one
of them today hand-rolls replication over `lxmf:send`, on links where a wrong retry costs
real airtime. Hand-rolled convergence over a lossy radio link is the thing app authors will
get wrong quietly and permanently, and no amount of guide prose fixes a class of bug that
only appears with three peers and a partition.

**Shape.** A host-owned, CRDT-backed replicated log or map keyed `(appId, topic)`,
replicating over the app-scoped peer links and `EgressOffer` bindings that already exist,
behind a `storage:sync` capability. Merge semantics belong in a spec with a formal twin and
generated vectors — this is a textbook fit for the four-representation template that
[SPEC-CAP](../specs/spec-cap/spec.md) already demonstrates.

**Not to be confused with** the cross-_app_ shared storage that
[LIMITATIONS.md](../LIMITATIONS.md) §7 withholds by choice. This is same-app, cross-peer.

**Cost.** Large. A new spec unit, a formal model, a replication protocol, and airtime
policy. The largest item in this document.

### 2. Accessibility in the widget model

**Missing.** `WIDGET_PROP_KEYS` in `packages/miniapp-runtime/src/ui/schema.ts` gives `view`
an `accessibilityLabel` and `image` an `alt`. That is the entire accessibility surface.
There is no label association for `text-input`, `switch`, `slider`, or `select`; no heading
level on `text`; no live-region announcement when content changes; no focus order; no
accessibility hint distinct from a visible label.

**Why it matters here.** Host-rendered UI is the one architecture in which the _platform_
can guarantee accessibility rather than ask each app for it. The host draws every widget, so
the host can refuse to draw an unlabelled control — which no conventional app platform can
do. The mechanism is already built: `widget-renderer-headless` exists precisely so UI is a
checkable artifact, and the repository already runs an accessibility ratchet over its own
code. Only the schema is missing the data.

**Shape.** Extend `WIDGET_PROP_KEYS` with a bounded accessibility prop set; have the
headless renderer emit an accessibility tree alongside the widget-patch stream; ratchet it
across the Cookbook corpus so new apps cannot regress it.

**Cost.** Small, and self-contained. The best ratio in this document.

### 3. App data export, backup, and schema migration

**Missing.** Two related gaps. The author guide states there is no cloud, no backup, and no
sync: uninstall the app or lose the device and the data is gone. Separately, `AppManifest`
in `packages/app-registry/src/manifest.ts` carries a code `version` but no _data_ schema
version and no migration hook, so version two of an app meets version one's stored bytes
with nothing but hope.

**Why it matters here.** Every ingredient already ships — content-addressed storage, 256t
identifiers, signed archives, an identity export flow (`tp identity export`), and
linked-device work in flight. Nothing assembles them into "export this app's state, restore
it on the new phone." Meanwhile [linked-devices.md](linked-devices.md) confirms grants are
keyed per installation with no account dimension, so a user replacing a device today rebuilds
everything by hand.

**Shape.** Host chrome — not an app capability — for export to an encrypted archive
addressed by 256t, and restore on another installation. Plus a `dataVersion` manifest field
and an `onMigrate` hook the host runs before first launch of an upgraded app.

**Cost.** Moderate, and mostly assembly of existing parts. The cheapest Tier 1 item.

### 4. Launch triggers

**Missing.** No `onLaunch`, automatic launch, deep-link, or URL-scheme handling exists in
`packages/miniapp-runtime` or `packages/host-core`.

**Why it matters here.** Combine "no background execution" with "no launch triggers" and an
LXMF message arriving for a stopped app reaches the host and stops there. `notify:post` only
helps an app already running to call it, which is the case where the user needs the least
help. This is not an OS constraint: the host process is awake, holding the message, and
choosing to do nothing with it. Per the principle in
[mobile-lifecycle.md](mobile-lifecycle.md), limits no mobile OS actually imposes get tracked
rather than accepted.

**Shape.** Manifest-declared triggers — incoming app-destination message, notification tap,
256t or deep link, peer invite — evaluated by the _host_, launching the app into a
foreground slot carrying the triggering event. This is the lifecycle-honest form of
background work: the OS still decides whether TwistedPear runs, but a running TwistedPear
stops discarding the reason a user would want an app open.

**Cost.** Moderate. The manifest change is small; the chrome and abuse surface are not.

## Tier 2 — distribution economics

### 5. Shared library packages

**Missing.** The manifest has `entry` and `files` but no dependency field, and DevStudio
JavaScript projects are single-file bundles with no in-host bundler.

**Why it matters here.** The entire platform is organised around airtime — 180 KiB Handbook
slices, a 64 KiB multipart default, a whole
[battery and bandwidth policy](battery-bandwidth-policy.md). Yet every app re-ships its own
copy of every helper over BLE and LoRa, and the platform has no way to notice. A signed,
content-addressed library package resolved through the _existing_ CAS and 256t path and
deduplicated host-side attacks the constraint the platform is built around. It also unblocks
the already-acknowledged React binding without every app paying for it separately.

**Cost.** Moderate. Manifest format change, resolution changes, and a new trust question:
a library is code, so whose signature covers it.

### 6. Contact and peer picker as host chrome

**Missing.** The `lxmf:send` capability describes itself as sending "to contacts you choose
in the host," and `peer:connect` routes through trusted chrome — but there is no general
picker service and no contacts read API. In practice apps ask users to paste destination
hashes.

**Why it matters here.** This is the file-picker pattern, and it _reduces_ app authority
rather than adding it: the host renders the list, the app receives only the chosen
destination, and no contacts capability is granted. It needs no new trust — it removes the
paste step that currently teaches users to move destination hashes around by hand, which is
the exact habit a confusable-identity attack needs.

**Cost.** Small to moderate; mostly chrome, governed by
[SPEC-CHROME](../specs/spec-chrome/spec.md).

## Tier 3 — developer facilities

### 7. Record and replay debugging

Developed in full in
[the mini-app record and replay plan](miniapp-record-replay-plan.md). In brief: the author
guide states there is no debugger, no breakpoint, and no devtools; meanwhile the repository
already owns a deterministic kernel, a recorder, a replayer, and a shrinker at the effects
layer, and already replays campaigns byte-identically through shipping code. The machinery
stops one layer below the mini-app. Highest leverage per unit of work in this document, and
cheap _here_ precisely because the determinism is already paid for.

### 8. Golden widget-tree snapshots for authors

**Missing.** `widget-renderer-headless` makes UI a checkable artifact for the platform's own
conformance suites, but app authors have no way to use it.

**Shape.** A `tp snapshot` verb that renders an app's widget tree headlessly and diffs it
against a checked-in golden. Pairs directly with §2 — snapshot the accessibility tree in the
same artifact and an author gets accessibility regressions for free.

**Cost.** Small. Mostly exposure of an existing package through the CLI.

### 9. A local multi-peer network for app authors

**Missing.** `npm run peers` and `npm run test:local-multipeer` exist but are
repository-internal, and `tp dev --link` throttles only the side-load path.

**Why it matters here.** The author guide is emphatic that the interesting failures —
resolution, seeding, slow links, partial grants — "live there and nowhere else," and then
offers authors no way to get there without cloning the monorepo. See
[local-multipeer.md](local-multipeer.md) for what already works internally.

**Shape.** `tp devnet up --peers 3 --link lora`, outside the repository.

**Cost.** Small to moderate; largely repackaging.

### 10. Capability minimiser at pack time

**Missing.** Nothing checks a declared capability against actual use.

**Why it matters here.** Least privilege is the load-bearing assumption of the whole trust
model, and [app-approval-risk.md](app-approval-risk.md) concedes that the four-class risk
assignment is argued rather than measured. A static report of which declared capabilities an
app's code actually calls, emitted at `tp pack` time, gives an author a reason to trim and a
reviewer something measured to look at.

**Cost.** Small, with a known ceiling: dynamic dispatch means the analysis advises, it
cannot prove.

### 11. Publisher-directed crash reports

**Missing.** Authors ship blind. `DiagnosticsRing` holds 200 entries on the user's device
and goes nowhere.

**Why it matters here.** There is no server, but there _is_ signed messaging. An opt-in,
user-visible crash report sent over LXMF to a publisher destination named in the manifest is
the peer-to-peer-native form of telemetry, and it composes with the sealed traces proposed
in §7. Consent and redaction questions are the same ones §7 must answer, so the two should
be designed together or not at all.

**Cost.** Small once §7's privacy model exists; unwise before it does.

## Reconsidered refusals

### 12. App-rendered UI behind a hard-to-obtain capability

**Missing, and deliberately so today.** No row in
[`specs/spec-cap/registry/capability-risk.json`](../specs/spec-cap/registry/capability-risk.json)
grants an app a drawing surface. `ui.render` accepts a validated widget tree and nothing else;
the closed component and style allowlists in
[`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts) are the enforcement, and
[SPEC-CHROME](../specs/spec-chrome/spec.md) R7–R9 are written against a tree the host can read.

**Why this is a reconsidered refusal rather than a missing facility.** Every other authority
the platform withholds is withheld _by degree_ — declared in a manifest, granted by the user,
scoped, revocable, priced by risk class. Drawing is the one thing an app cannot ask for at any
price. That is defensible as a v1 simplification and weak as a permanent rule: it is why there
is no React binding, no visualisation the allowlist did not anticipate, and no place for an app
category that genuinely needs pixels. The claim worth testing is not "apps should draw" but
"the platform should be able to _price_ drawing the way it prices everything else."

**Shape, at proposal strength only.** A capability — `ui:surface` is the natural spelling —
floored at `critical` in the risk registry, so "not easily obtained" is a property of the
approval gate that already exists rather than a new mechanism: `direct` publisher trust, age,
artifact stability, and ≥ _K_ review attestations ([app-approval-risk.md](app-approval-risk.md)).

**"Not easily obtained" means expensive, not forbidden, and that is correct.** `evaluateApproval`
returns `overridable: true` unconditionally
([approval-evaluate.ts:142](../packages/protocol/src/approval-evaluate.ts)); an unmet
requirement is "could not verify", never a refusal; and
[user-policy-plan.md](user-policy-plan.md) states the principle as _warn comprehensively,
refuse nothing_. A platform-level refusal here would put the decision somewhere other than
the user, which is the arrangement this project exists to avoid. There is a final authority
and it is the user. So the gate's job is to make a surface grant costly, legible, and
deliberate — and a user who wants the grant unobtainable on their installation has the
stronger instrument anyway: seal it in policy ([user-policy-plan.md](user-policy-plan.md) §5),
which binds a later self in a way no platform rule can.

**The precondition is source in the package.** §12 is only reviewable if the thing to review
travels with the app. That is [app-approval-risk-plan.md](app-approval-risk-plan.md) §5.4, and
it should land first: a drawing surface makes _runtime_ behaviour opaque, and the answer to
that is static review of source that is bound to the same `packageHash` — not a better
runtime oracle. With source shipped, "an app that draws pixels cannot be audited" is false, and
most of the intuitive objection to this item goes with it.

**What survives all of that, and is the one genuinely open problem.** Review binds source, not
behaviour. HA-36 — benign until a remote flag arrives, marked **"Not preventable"** and one of
two load-bearing scenarios in [hostile-author-plan.md](hostile-author-plan.md) §6 — has a
containment story that is egress scoping, and drawing is not egress. It is local deception. So
a surface grant plus a bait-and-switch yields a fake grant screen that an informed user, fully
shipped source, a diligent reviewer, and a sealed policy all fail to prevent, because the
source was honest when it was read. Nothing in the current defence survives this: CHROME-R8's
reserved lexicon and the R8 layout oracle both work by reading the tree, and against pixels
there is nothing to read.

That makes the requirement precise rather than vague. **The host indicator that distinguishes
chrome from app surface must be unforgeable by construction, not by inspection.** Candidates —
an out-of-process chrome layer the sandbox cannot address, a persistent host-owned region
outside the app's compositing tree, a render oracle over rasterised output
([hostile-author-plan.md](hostile-author-plan.md) §5) — are each a plan of their own, and none
is written. This is the piece to write before anything else in §12 is worth scheduling.

**Cost.** Large, and concentrated in the part the platform is most careful about. This item is
listed to make the refusal explicit and revisable, not because it is ready to schedule.

**What must be re-derived before this could land.** Each of these currently states the refusal
as settled. None is merely a wording change: the first two rows are the ones that decide
whether the rest are true.

| Document                                                                                                                                             | What it asserts today                                                   | What landing this requires                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [app-approval-risk-plan.md](app-approval-risk-plan.md) §5.4                                                                                          | Source in the package is proposed, not required                         | Landed first; without it a drawn surface genuinely cannot be reviewed                                    |
| [SPEC-CHROME](../specs/spec-chrome/spec.md)                                                                                                          | R7–R9 read app widget text                                              | Rules that hold against pixels, or an explicit statement that they do not apply to a surface-holding app |
| [hostile-author-plan.md](hostile-author-plan.md) §6                                                                                                  | HA-20…HA-24 BLOCKED                                                     | Re-derived verdicts; the BLOCKED column is conditioned on data-only trees                                |
| [architecture.md](architecture.md) §7                                                                                                                | "a mini-app cannot draw a fake grant screen over a real one"            | Restate as a property of the default, not of the platform                                                |
| [miniapp-runtime.md](miniapp-runtime.md)                                                                                                             | "Data-only widget trees (host renders; no arbitrary UI code)"           | Name the capability-gated exception in the guarantees list                                               |
| [authors/01](../authors/01-what-you-are-building.md)                                                                                                 | "You do not render"; "You cannot ship CSS, fonts, or arbitrary drawing" | Qualify both, and say what the grant costs an author                                                     |
| [devstudio.md](devstudio.md)                                                                                                                         | "Mini-apps cannot draw over or acknowledge these dialogs"               | Hold or restate under a surface grant                                                                    |
| [web-host.md](web-host.md)                                                                                                                           | Mini-app UI is "validated data, never code"                             | Restate per host; the browser case is the hardest                                                        |
| [device-io-plan.md](device-io-plan.md)                                                                                                               | "Indicators must be unforgeable. Host chrome only"                      | Unchanged in intent, but its mechanism must survive                                                      |
| [glossary.md](glossary.md)                                                                                                                           | "the host renders it, which is why apps cannot fake system prompts"     | Rewrite the _Widget / widget tree_ entry                                                                 |
| [freenet.md](freenet.md)                                                                                                                             | DOM UIs "directly conflict with host-rendered widgets"                  | Re-evaluate; this proposal narrows that conflict                                                         |
| [LIMITATIONS.md](../LIMITATIONS.md) §7                                                                                                               | Mini-apps are not native apps                                           | Add or remove the drawing limit as the outcome dictates                                                  |
| [FAQ.md](FAQ.md)                                                                                                                                     | Carries the ⏳ note that points here                                    | Drop the note; state the shipped rule                                                                    |
| [authors/appendix-feature-status.md](../authors/appendix-feature-status.md), [guide/appendix-feature-status.md](../guide/appendix-feature-status.md) | Silent                                                                  | Add a row, in whichever status the outcome earns                                                         |

**Unregistered by design.** There is no `FAC-` row for this and there should not be one until
open question 4 is answered; filing it would assert a decision that has not been taken.

## Registration

The detailed plans carry phase-sized rows: `SYNC-1-SPEC` through `SYNC-6-COOKBOOK` (§1),
`AX-1-RENDERERS` through `AX-6-FOCUS` (§2), `DATA-1-ARCHIVE` through
`DATA-5-RECOVERY` (§3), and `TRACE-1-FORMAT` through `TRACE-6-CHROME` (§7).

The remaining proposals are tracked as `FAC-LAUNCH-TRIGGERS`, `FAC-SHARED-LIBS`,
`FAC-PEER-PICKER`, `FAC-GOLDEN-SNAPSHOTS`, `FAC-DEVNET`, `FAC-CAP-MINIMIZER`, and
`FAC-CRASH-REPORTS`. Golden snapshots wait for the accessibility-tree artifact, and crash
reports wait for the sealed-trace privacy model. All rows live in the
[software backlog](../STATUS-SOFTWARE.md) and do not gate v1.

## Deliberately not proposed

- **Payments or value transfer.** Absent from the platform, and correctly so. It would
  import a trust and regulatory surface that the capability model is not shaped to hold.
- **A central app directory or search.** Structurally rejected, and the rejection is
  coherent: no central registry means no central moderation, and the catalog being exactly
  what your peers announced is the honest consequence.

## Open questions

1. Which of Tier 1 is actually wanted? §1 and §4 both expand what apps can do, and both
   enlarge the abuse surface that [security-review.md](security-review.md) currently bounds.
2. Is §2 a v1 concern? It is small enough to land inside the existing gates, and an
   accessibility gap is harder to fix once a Cookbook's worth of apps have set the pattern.
3. Do §5 and §1 conflict? Both add manifest surface and both change what a host must fetch
   and verify; sequencing them independently may cost a second format migration.
4. Is §12 wanted at all? It is the only item here that trades away a security property rather
   than adding a capability, and the honest answer may be "no". Deciding it either way is
   worth more than leaving it implicit: today the refusal is stated as settled in a dozen
   documents and argued for in none of them. The decidable sub-question, and the one to answer
   first, is narrower: can a host indicator be made unforgeable by construction beside an
   app-drawn surface? If not, §12 fails on its own terms and the refusal should be restated as
   a conclusion rather than left as an assumption.
