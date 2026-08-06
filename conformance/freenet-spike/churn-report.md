# S6 — Freenet client API churn

<!-- tp-doc
lifecycle: reference
audited: 2026-07-28
register: none
-->

## Sample

Ten consecutive `freenet-core` tags were inspected:

| Tag      | Tag date   |
| -------- | ---------- |
| v0.2.103 | 2026-07-21 |
| v0.2.104 | 2026-07-21 |
| v0.2.105 | 2026-07-22 |
| v0.2.106 | 2026-07-25 |
| v0.2.107 | 2026-07-26 |
| v0.2.108 | 2026-07-26 |
| v0.2.109 | 2026-07-26 |
| v0.2.110 | 2026-07-26 |
| v0.2.111 | 2026-07-27 |
| v0.2.112 | 2026-07-27 |

Repositories were fetched directly from `freenet/freenet-core` and
`freenet/freenet-stdlib`; tag objects and diffs, rather than release prose, are
the evidence.

## Findings

- Release cadence is high: ten releases in six days. TwistedPear must pin exact
  versions and cannot float on `latest`.
- The FlatBuffers contract-operation schema and the v1 contract command handler
  did not change across the ten core tags. The only `client_events.rs` API
  addition handled a delegate-registration variant; it did not change
  `put`/`get`/`update`/`subscribe`.
- `crates/core/src/server/client_api.rs` changed to add a notification service
  worker for hosted web apps. It did not change `/v1/contract/command`.
- The Rust stdlib moved from 0.8.3 to 0.8.4 at core v0.2.105. The contract-key
  derivation files and FlatBuffers schemas have no diff between those tags.
- The published TypeScript SDK has only two relevant releases, 0.2.0 and 0.3.0.
  Their contract request/key schema is unchanged; 0.3.0 removes orphaned
  delegate secret/random types. TwistedPear pins 0.3.0.

Contract identity remains `BLAKE3(BLAKE3(wasm) || parameters)` in both Rust
stdlib revisions. SPEC-FREENET pins this with the local derivation vector:

```text
wasm hex:       0061736d
parameters:     ASCII "x" × 94
code hash:      003e6ee85b30b92152036efd974c9a3907c65635ec190c05a089b180a57dc03a
instance id:    3dffa695a3838a96b66677adc571f8f30246ad699886bee63ba903c13104a0c4
```

## Gate decision

**Pass with exact pins.** The release train is too fast for a range dependency,
but the contract operations and key derivation were stable across the sample.
A core or SDK bump requires rerunning this diff and the locator/key vectors.
This decision does not assert that arbitrary Freenet app contracts survive all
future upgrades.
