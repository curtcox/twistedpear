# Replicated shared state for mini-apps — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/replicated-state-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[replicated shared state plan](replicated-state-plan.md). Where the two disagree, this
file wins.

Shipping storage is still per-app and per-device: `storage:kv` and `storage:hyperbee`.
On top of that, the host has a **local** topic log whose merge is specified and
checked, in-process loopback replication, and an offer-bound LXMF round that
exchanges version-vector digests and missing entries. Apps still cannot name a
peer or force a round.

## What ships

- [SPEC-SYNC](../specs/spec-sync/spec.md) defines the entry `(authorId, seq, at, payload)`,
  union-merge, version-vector digest, last-writer-wins view, and per-author cap.
- `replicaMachine` and `mergeReplicaLogs` in `@twistedpear/protocol` are the executable
  table. Four representations are cross-checked by `npm run formal:all`.
- `TopicLogStore` in `@twistedpear/miniapp-runtime` is an in-memory topic log: `open`,
  `append`, `set`, `tombstone`, `ingest`, `view`, `vector`. Author id and sequence are
  host-assigned.
- `LoopbackReplicaLink` exchanges version-vector diffs between two local logs.
  Tests prove convergence under drop, delay, reorder, duplicate, partition, and
  retry. The link is host-owned: apps still cannot name a peer or force a round.
- `LxmfReplicaLink` runs the same digest/missing-entry exchange as LXMF frames.
  Each frame calls `assertEgressAllowed` for `storage:sync` and the ledger
  meters every emitted byte. An un-offered or over-budget round is refused and
  the remote log is unchanged. Offers bind at `targetKind: "peer"` or `"group"`.
  `storage:sync` is listed in `EGRESS_OFFER_CAPABILITIES`; local
  open/append/view still do not require an offer.

## Not in this drop

SPEC-STREAM plane selection, hostile-peer retention, and Cookbook migration
remain in the [plan](replicated-state-plan.md).
