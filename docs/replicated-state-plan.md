# Replicated shared state for mini-apps — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-26
register: software
counterpart: docs/replicated-state.md
-->

**This document describes planned work, not current behaviour.** The local topic log,
union-merge, SPEC-SYNC entry format, and in-process loopback replication now ship —
see [replicated shared state](replicated-state.md). That live file wins against this
one. What still does not exist is radio replication. What already shipped for local storage is
`storage:kv` and `storage:hyperbee`, described in
[the mini-app SDK reference](miniapp-sdk.md) and bounded by
[capability scoping](capability-scoping.md). The survey entry this develops is §1 of
[platform facilities proposals](platform-facilities-plan.md); its argument is not
repeated here.

The proposal: a host-owned, topic-scoped store whose merge is defined by the platform and
whose replication is metered by authority the user already granted, so that "three peers and
a partition" stops being every app author's private problem.

**Not to be confused with cross-_app_ shared storage.** [LIMITATIONS.md](../LIMITATIONS.md) §7
withholds that by choice — "a channel copies messages through the broker; apps still do not
share a store" ([miniapp-sdk.md](miniapp-sdk.md):274-276). This is **same-app, cross-peer**:
app `A` on two devices, never app `A` reading app `B`. The isolation verified as F5 in
[the security review](security-review.md) is preserved, not relaxed; §9 enforces it.

## 1. The gap

The storage stack is local by construction, not by omission. Paths below are
repository-relative, with `packages/miniapp-runtime/src/` elided from `services/` and `host/`.

| Claim                                                           | Evidence                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The descriptor handed to apps is stamped local                  | `storageBeeDescriptor` returns `localOnly: true` — `services/storage-bee.ts:38` |
| Every Hyperbee handler is keyed by `appId` alone, with no topic | `host/layer-1-handlers-core.ts:146-200`                                         |
| The author guide says so outright                               | `authors/06-storage-and-files.md:72-75`                                         |
| The Cookbook tells authors merge is theirs                      | `cookbook/03-apps-that-remember.md:302`                                         |
| The roster recipe hand-rolls gossip                             | `cookbook/04-apps-that-talk-to-one-peer.md:194`                                 |

Five Cookbook apps are replicated state wearing different hats, each solving it differently.
Per their `app.manifest.json` files under `cookbook/apps/`, `neighborhood-board` and
`swap-shelf` fan out over `announce:publish`/`announce:subscribe` — a path that does not yet
cross devices ("no host adapter carries those SDK announces over Reticulum yet",
[LIMITATIONS.md](../LIMITATIONS.md) §7). `roll-call` and `net-ledger` carry state on
`lxmf:send`, where `packages/sim-adversaries/src/social.ts:15-22` prices a LoRa byte at 2,000×
a LAN byte. `split-the-bill` declares only `storage:hyperbee` and does not replicate at all.

## 2. Why this is tractable here — and one place it is not

Four things a conventional platform would have to invent already exist: the call chokepoint
`MiniappBroker.dispatch` (`broker.ts:140`); host-authored destination authority (`EgressOffer`,
`packages/protocol/src/egress-offer.ts`); a per-destination rolling 24-hour byte budget
(`EgressBudgetLedger`, `egress-enforcement.ts:39-60`); and a four-representation template with
a runner registry (`formal/check-machine-conformance.mjs:23-58`), exemplified by
[SPEC-CAP](../specs/spec-cap/spec.md) and replayed against shipping code by the
[abuse simulation](simulation.md).

Not tractable in the obvious way: **Hyperbee's upstream replication is not reachable.**
`CorestoreBeeBackend` — the only backend with a real Hypercore under it — is constructed nowhere
outside `packages/miniapp-runtime/test/services.test.ts:171`. Every shipping host builds
`KvStorageBeeBackend` (`packages/worklet-core/src/miniapp-host.mjs:220`,
`packages/worklet-core/src/web-miniapp-host.mjs:201`), which emulates a Hyperbee over key/value
pairs with a hand-maintained per-key counter (`services/storage-bee-kv.ts:41-49`). There is no
append-only core in a shipping host to replicate, and on the web host there could not be one:
Hyperswarm does not run in the tab ([LIMITATIONS.md](../LIMITATIONS.md) §8). Reasoning rather
than reporting: that argues for a transport-neutral reconcile protocol the platform owns, with
Corestore replication as a possible desktop-only fast path later, never as the mechanism.

## 3. Merge semantics, priced by airtime

The question is not which CRDT is most expressive but what a peer must say to learn it is
already in sync.

| Candidate               | Sync digest    | Metadata per entry | Verdict                                         |
| ----------------------- | -------------- | ------------------ | ----------------------------------------------- |
| Last-writer-wins map    | O(keys)        | one timestamp      | Digest grows with data; drops concurrent writes |
| Add-only set of records | O(set) unaided | none               | Cheap to merge, expensive to diff               |
| Ordered/total log       | O(1)           | none               | Needs agreement on order — no                   |
| General CRDT map        | O(1)           | large, per-field   | Metadata dominates the payload                  |

**Recommendation: a per-author grow-only log, with a last-writer-wins register view derived on
top.** A topic is the union of one append-only log per author; an entry is
`(authorId, seq, at, payload)` signed by its author; merge is set union — commutative,
associative, idempotent by construction. Mutable keys are a derived view: for key `k` the entry
with the highest `(at, authorId)` wins, so `swap-shelf`'s status flag and `net-ledger`'s append
are one structure read two ways.

The reason to prefer it is the digest. Because each log is dense and per-author, "what do you
have" is a version vector, `authorId → highest seq`. Eight authors, an 8-byte prefix, a 2-byte
counter: 80 bytes, one LXMF message on a link the
[battery and bandwidth policy](battery-bandwidth-policy.md) rates at hundreds of bits per
second. The cost of _being_ in sync is O(authors), independent of topic size — the property
that makes reconciling over LoRa defensible. A general CRDT map gets the same digest but pays
per-field metadata forever; an unaided add-only set must exchange the set to learn it matches.

## 4. What an app sees

A `storage:sync` capability and a `sync` namespace — sketch, not specification (§6 says where
the normative artifact lives).

```js
const topic = await sync.open({ topic: "board" });
await sync.append(topic, { kind: "post", text }); // an entry in my own log
await sync.set(topic, "item/42", { claimed: true }); // the derived LWW register
sync.onChange(topic, (delta) => render(delta));
await sync.state(topic); // peers, version vector, retained window
```

Three deliberate absences: an app cannot name a peer (the set comes from host-authored offers);
it cannot force a reconcile round, only ask; and `authorId` is host-supplied, never app-set.

## 5. Transport: an offer-bound, host-owned emitter

Replication must not become an unmetered egress channel, and need not be: a mini-app has no
byte pipe to a peer today and this plan adds none. The `peers` namespace registers exactly
`request`, `listen`, `diagnostics`, `info`, and `close`
(`host/layer-1-handlers-services.ts:331-374`) — no `send` — and `PeerBrokerService` refuses a
service name that is not the calling `appId` (`services/peers.ts:70-77`). The binding:

1. Add `storage:sync` to `EGRESS_OFFER_CAPABILITIES` (`egress-enforcement.ts:14-18`), so every
   round runs `assertEgressAllowed` after the capability check, as `lxmf:send` does.
2. Bind offers at `targetKind: "group"` for a topic's peer set and `"peer"` for one device.
   Both are already in the type (`packages/protocol/src/egress-offer.ts:6-7`,
   `packages/app-registry/src/capability-declaration.ts:13`); `"group"` has no other consumer.
3. Meter with `maxBytesPerDay`, already enforced per offer id (`egress-enforcement.ts:39-60`),
   so replication inherits an airtime governor with no new mechanism and an exhausted budget
   degrades a topic to "not yet converged" rather than to silent overspend.
4. Reserve as `bulk` or `control`, never `realtime`.
   [SPEC-STREAM](../specs/spec-stream/spec.md) fixes plane preference and reservation classes
   on the shared limiter; a round is the shape of a probe (`services/links.ts:29-30`).

Risk class follows [SPEC-CAP](../specs/spec-cap/spec.md)'s rules: third-party effect floors
the capability at `sensitive`, dropping to `elevated` when offer-bound, as `lxmf:send` does.

## 6. Spec home: a new Group C unit

Not an extension. [SPEC-SDK](../specs/spec-sdk/spec.md) owns call semantics — namespaces, error
taxonomy, quotas — and its normative artifact is a call/response vector suite with no state
machine in it. [SPEC-CAP](../specs/spec-cap/spec.md) owns the capability string, its risk row,
and the offer lifecycle. Neither owns a convergence relation, which has its own state space and
invariants. The precedent is [SPEC-STREAM](../specs/spec-stream/spec.md): it owns
`streamMachine` while `device:stream` lives in SPEC-CAP's registry and `device.*` calls in
SPEC-SDK. So **SPEC-SYNC** owns the entry format, merge relation, digest, and retention rules;
SPEC-SDK gains a `sync` namespace row plus vectors in `specs/spec-sdk/vectors/calls.json`; and
SPEC-CAP gains one row in `specs/spec-cap/registry/capability-risk.json` plus one membership in
`EGRESS_OFFER_CAPABILITIES`.

## 7. Where it plugs in

| Seam                                             | Change                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `services/storage-bee.ts`                        | `localOnly: true` describes _that_ store; sync is a sibling, not a flag |
| `services/storage-sync.ts` (new)                 | Author-partitioned log, version vector, derived LWW view                |
| `host/layer-1-handlers-core.ts`                  | Register `sync` beside `storage.kv` and `storage.bee`                   |
| `egress-enforcement.ts:14-18`                    | `storage:sync` joins the offer-bound capability list                    |
| `capabilities.ts:86-90`                          | One new `CAPABILITY_DEFINITIONS` row                                    |
| `packages/protocol/src/replica-machine.ts` (new) | The executable table: `step(state, event)`                              |
| `services/media-stream-planes.ts`                | Plane selection exists; reconcile is a second consumer                  |
| `packages/sim-adversaries`                       | Convergence campaign and byzantine-peer strategy (§9)                   |
| `packages/miniapp-test/src/harness.ts`           | Multi-replica fixture, so authors test merge without a radio            |

## 8. The hard problem: retention divergence

Strong eventual consistency says replicas that have delivered the same updates agree. A device
that has _chosen not to keep_ some updates has not delivered them, and the guarantee does not
reach it. That is unavoidable here: storage is bounded — 1 MiB per app for both existing stores
(`services/storage-kv.ts:19`, `services/storage-bee-corestore.ts:20`) — the web host's storage
is evictable ([LIMITATIONS.md](../LIMITATIONS.md) §8), and §9 requires per-author caps.

The honest contract is therefore weaker than SEC and belongs in the spec, not softened in
prose: **replicas converge on the intersection of their retained windows, and a replica reports
its own window.** `sync.state()` returning that range is what lets an app tell "nobody posted"
from "I dropped it." Two consequences are better decided than discovered: an app rendering a
total (`net-ledger`, `split-the-bill`) must render it over a stated window, and a tombstone
must outlive the entry it buries, or a longer-retaining peer resurrects a deleted record.

## 9. Quota and abuse

A replicated topic is storage someone else can grow.

- **Per-author caps, not per-topic.** A hostile peer can exhaust only its own slice — the
  structural reason to prefer per-author logs over one shared set.
- **Admission is offer-bound.** An entry attributed to an author with no live offer is
  refused, not stored, before storage is reached.
- **App isolation preserved.** Topic keys stay prefixed by `appId`, keeping the property the
  security review verified as F5 — which needs a hostile-app case, not a claim.
- **Broker limits already apply.** `sync.*` crosses the same chokepoint under the per-app rate
  limit and message ceiling recorded as F7 ([security-review.md](security-review.md)).

Against the modelled adversary there is a real gap. `DolevYaoPower` is
`drop | delay | reorder | duplicate | inject` (`packages/effects/src/types.gen.ts:56`), all
transport-level; `duplicate` and `reorder` are exactly what union-merge is immune to, a genuine
result worth checking. But the adversary this feature invites is a **byzantine authorised
peer** — one holding a live offer, emitting well-formed, correctly signed entries as fast as
the link allows. That is not one of the five powers, and `compileAttackProposal` refuses a
proposal needing an out-of-model power (`packages/sim-adversaries/src/adversary.ts:41-46`).
Adding it is part of this work; `spamEconomics` already prices airtime finely enough to score
whether the attack pays.

## 10. The formal obligation

One transition relation, four cross-checked representations, one command
(`npm run formal:replica`), registered beside the others at
`formal/check-machine-conformance.mjs:23-58`:

| Representation   | Artifact                                                |
| ---------------- | ------------------------------------------------------- |
| Executable table | `replicaMachine` in `packages/protocol`                 |
| Formal twin      | `specs/spec-sync/model/replica.tla`                     |
| Checked traces   | `specs/spec-sync/model/replica-conformance-traces.json` |
| Generated vector | `conformance/vectors/replica.json`                      |

Convergence is what TLA+ earns its keep on: the failure needs three peers and a partition, so
it is what testing misses. The model should assert:

1. **Merge is a join** — commutative, associative, idempotent over entry sets, which is what
   makes `duplicate` and `reorder` harmless. Assert it, then check under those powers.
2. **Convergence over retained windows** — given eventual delivery, two replicas agree on the
   intersection of their windows (§8's weakened SEC, stated formally).
3. **No resurrection** — a tombstoned entry never reappears under any interleaving, including
   for a replica that lost its store and re-synced.
4. **Authority** — no replica accepts an entry attributed to an author who did not sign it,
   and no author tombstones another author's entry.
5. **Bounded growth** — retained entries never exceed `authors × per-author cap`.
6. **No amplification** — bytes emitted per round are a function of the digest difference, not
   of topic size. This and the previous property are cost invariants over accounting variables
   rather than safety properties, and are what make the model check §3's airtime argument.

## 11. Sequencing

| Phase | Deliverable                                                          | Gate                                                                                                                               |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 3     | Version-vector digest and reconcile over the LXMF plane, offer-bound | `assertEgressAllowed` refuses an un-offered round; the ledger meters bytes — now in [replicated shared state](replicated-state.md) |
| 4     | Plane selection and `bulk` reservation across the SPEC-STREAM ladder | Two-host convergence in the multipeer harness — now in [replicated shared state](replicated-state.md)                         |
| 5     | Retention, tombstones, per-author caps, byzantine-peer adversary     | No hostile-peer scenario lands UNCONTROLLED — now in [replicated shared state](replicated-state.md)                             |
| 6     | Cookbook migration; delete "merge is your problem"                   | `roll-call` and `neighborhood-board` rebuilt on `storage:sync`                                                                     |

Phase 2 (in-process loopback under drop/delay/reorder/duplicate/partition),
Phase 3 (offer-bound LXMF reconcile), Phase 4 (SPEC-STREAM plane selection
with `bulk` reservation), and Phase 5 (hostile-peer admission, retention, and
the authorised-flood adversary) now live in
[replicated shared state](replicated-state.md).

The phases are tracked as `SYNC-2-LOOPBACK`, `SYNC-3-LXMF`,
`SYNC-4-PLANES`, `SYNC-5-HOSTILE`, and `SYNC-6-COOKBOOK` in the
[software backlog](../STATUS-SOFTWARE.md), chained in delivery order. The LXMF phase also
depends on the already-complete scoped-egress enforcement rather than inventing a second
authorization path.

## 12. Open questions

1. **Who mints a group?** `targetKind: "group"` exists in the type with no producer. Peer
   offers authorise devices one at a time; a topic wants a set. Host chrome, a founding peer's
   key, or no groups in the first version?
2. **How long does a tombstone live, and is a topic encrypted end to end?** §8 shows a
   tombstone must outlive its entry and §9 that it cannot live forever, so the bound is a
   measurement. Separately, a round over the `reticulum` or `lxmf` plane crosses relays and
   propagation nodes, and per-topic keys interact with key rotation, itself open.
3. **Uninstall and restore.** Deleting the app must not delete other peers' copies, and a
   backup re-introduces a replica with a stale vector — settle jointly with
   [the app data portability plan](app-data-portability-plan.md).
4. **Does the web host replicate fully, and when does a round run?** Evictable storage and no
   Hyperswarm ([LIMITATIONS.md](../LIMITATIONS.md) §8) argue for a read-mostly web replica; and
   principle 3 of the [battery and bandwidth policy](battery-bandwidth-policy.md) keeps
   mini-apps foreground, so reconciling only while an app is open is a semantic limit.

## 13. What this deliberately does not do

- **Not cross-app storage.** Same app, different devices.
  [LIMITATIONS.md](../LIMITATIONS.md) §7's choice stands, and §9 keeps what enforces it.
- **Not consensus.** No total order, no transactions, no atomic multi-key write. Union merge
  is chosen precisely because it needs no agreement between peers.
- **Not discovery, and not background sync.** A topic id is not a resolvable name; membership
  comes from offers the user authorised. No host runs mini-apps in the background, and this
  asks for none.
- **Not app-level conflict resolution, and not moderation.** The platform merges entries;
  whether two entries mean the same expense is the app's judgement. Refusing to keep a peer's
  entries is a local retention decision that removes nothing from anyone else's replica.
