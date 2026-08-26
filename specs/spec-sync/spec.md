# SPEC-SYNC — Replicated topic store

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: none
-->

**Group:** C (platform) · **Status:** normative · **Host API:** 0.21.0

## Scope

The entry format, merge relation, digest, and retention window of a
host-owned, topic-scoped store that the same mini-app may later replicate across
devices. This spec does **not** own capability strings ([SPEC-CAP](../spec-cap/spec.md)),
call names ([SPEC-SDK](../spec-sdk/spec.md)), or the transport used to move
entries. Host-local loopback exchange is an adapter, not a spec transport.
Offer-bound LXMF replication is a later amendment.

## Required properties

- An entry is `(authorId, seq, at, payload)` with optional `key` and `tombstone`.
  `authorId` and `seq` are host-authored. An app cannot set them.
- Merge of two logs is set union keyed by `(authorId, seq)`. It is commutative,
  associative, and idempotent. Conflicting payloads for the same id are invalid.
- The digest of a log is the version vector `authorId → max seq`.
- A last-writer-wins view is derived: for each `key`, the entry with the highest
  `(at, authorId)` wins. A winning `tombstone` hides the key; a lower-`at` live
  entry cannot resurrect it.
- Retention is per-author. A replica reports the window it still holds. Replicas
  converge on the intersection of retained windows, not on a global history.
- Local append is dense on the author's own log (`seq` increases by one).

## Representations

| Representation   | Artifact                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Formal relation  | [`model/replica.tla`](model/replica.tla)                                                  |
| Checked traces   | [`model/replica-conformance-traces.json`](model/replica-conformance-traces.json)          |
| Executable table | `replicaMachine` in [`packages/protocol`](../../packages/protocol/src/replica-machine.ts) |
| Layer-3 vector   | [`conformance/vectors/replica.json`](../../conformance/vectors/replica.json)              |
| Entry schema     | [`schema/entry.schema.json`](schema/entry.schema.json)                                    |

Merge and the LWW view are executable in `replica-merge.ts`. The four transition
representations are cross-checked with:

```sh
npm run formal:all
```

## Replica transition relation

`idle` is the start. `open` admits append, ingest, tombstone, and evict. `cap`
marks a replica that has hit its per-author bound; append is then illegal until
`evict` returns it to `open`. `closed` is terminal.

## Entry schema

See [schema/entry.schema.json](schema/entry.schema.json). `seq` is a positive
integer. `tombstone` is the constant `true` when present. `key` is required for
the LWW view and omitted for log-only entries.

## To finish this spec

Phase 1 is the local store and the four-representation merge machine. Offer-bound
LXMF replication and SPEC-STREAM plane selection with `bulk` reservation now
ship as host adapters. Hostile-peer bounds and Cookbook migration remain later
amendments tracked as `SYNC-5` and `SYNC-6`.
