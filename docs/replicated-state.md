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
On top of that, the host now has a **local** topic log whose merge is specified and
checked. Nothing is sent on the radio yet.

## What ships

- [SPEC-SYNC](../specs/spec-sync/spec.md) defines the entry `(authorId, seq, at, payload)`,
  union-merge, version-vector digest, last-writer-wins view, and per-author cap.
- `replicaMachine` and `mergeReplicaLogs` in `@twistedpear/protocol` are the executable
  table. Four representations are cross-checked by `npm run formal:all`.
- `TopicLogStore` in `@twistedpear/miniapp-runtime` is an in-memory topic log: `open`,
  `append`, `set`, `tombstone`, `ingest`, `view`, `vector`. Author id and sequence are
  host-assigned. There is no peer exchange.

`storage:sync` is declared as a capability so a later phase can grant it. It is not
bound to egress and no broker method replicates.

## Not in this drop

Loopback replication, LXMF reconcile, SPEC-STREAM plane selection, hostile-peer
retention, and Cookbook migration remain in the [plan](replicated-state-plan.md).
