# SPEC-FREENET — Freenet contract-state binding

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

**Group:** A (adopted binding) · **Status:** stub · **Migration phase:** F1–F2 codecs

## Scope

This profile binds TwistedPear data to Freenet (the Rust network formerly named
Locutus), without making Freenet a protocol dependency or trust root. Freenet
contracts carry bytes; TwistedPear continues to authenticate packages with the
existing signed manifest, per-file hashes, signed 256t locator, and archive hash.

The implemented slices are the immutable locator/package state used by the
optional `freenet` package fetch path, the convergent packet-log state
encoding that F2 will carry over Freenet, and the LXMF propagation-set
encoding for F3. Local S2 update→notify latency evidence is recorded in
[measured-roundtrip.json](../../conformance/freenet-spike/measured-roundtrip.json);
a wired `FreenetInterface` and Freenet-backed propagation adapter are still
gated and must not land as stubs.

The S3 ordered-log spike and measurements under
[conformance/freenet-spike](../../conformance/freenet-spike/s3-report.md)
match the adopted packet-log codec below.

## Normative artifacts

- [vectors/locator-state.json](vectors/locator-state.json) pins the F1 state
  encoding and generated WASM identity. It is exercised by
  [locator-contract.test.ts](../../packages/bridge-freenet/test/locator-contract.test.ts).
- [vectors/packet-log-state.json](vectors/packet-log-state.json) pins the F2
  packet-log encoding and merge behavior. It is exercised by
  [packet-log.test.ts](../../packages/bridge-freenet/test/packet-log.test.ts).
- [vectors/propagation-set-state.json](vectors/propagation-set-state.json) pins
  the F3 per-destination LXMF ciphertext set encoding. It is exercised by
  [propagation-set.test.ts](../../packages/bridge-freenet/test/propagation-set.test.ts).
- The signed locator nested inside the state is governed by
  [SPEC-NAME](../spec-name/spec.md); this spec does not redefine its signature.
- The pinned upstream SDK is `@freenetorg/freenet-stdlib` 0.3.0. The Rust
  contract pins freenet-stdlib commit
  `f4636e502876b0e11f2f6d59032348cfd6518bbc`.

## Locator state encoding

All integers are unsigned big-endian:

| Field | Bytes | Meaning |
|---|---:|---|
| magic | 5 | ASCII `TPFL` followed by version `0x01` |
| locator length | 2 | encoded signed 256t locator length |
| archive length | 4 | `.tpkg` byte length |
| locator | variable | unchanged SPEC-NAME signed locator bytes |
| archive | variable | untrusted `.tpkg` bytes |

Contract parameters are the 94-byte ASCII 256t id. Conflicting valid puts
converge on the lexicographically smaller complete state. Consumers must reject a
bad locator signature, a returned locator for a different 256t id, a 256t content
mismatch, a package hash mismatch, or a bad package/manifest signature.

## Packet-log state encoding

All integers are unsigned big-endian. Entries are sorted by
`(direction, index)` and must be stored in that order.

| Field | Bytes | Meaning |
|---|---:|---|
| magic | 5 | ASCII `TPLG` followed by version `0x01` |
| entry count | 4 | number of following entries |
| entry… | variable | direction (1) + index (8) + payload length (2) + payload |

Contract parameters are a 2-byte retention limit per direction. Merge unions by
`(direction, index)`, keeps the lexicographically smaller payload on conflict,
and retains only the highest `retention` indexes per direction.

This encoding is the F2 wire format foundation. Shipping a Reticulum
`FreenetInterface` still requires a complete host wiring (no stub) plus policy
numbers derived from S2 measurements.

## Propagation-set state encoding

All integers are unsigned big-endian. Entries are sorted by `transientId` and
must be stored in that order.

| Field | Bytes | Meaning |
|---|---:|---|
| magic | 5 | ASCII `TPPS` followed by version `0x01` |
| entry count | 4 | number of following entries |
| entry… | variable | transient id (32) + storedAt ms (8) + lxmf length (4) + ciphertext |

Contract parameters are the 16-byte LXMF destination hash (`PROPAGATION_DESTINATION_HASH_SIZE`). Merge unions by
`transientId`, keeps the earlier `storedAt` on conflict, and breaks remaining
ties with the lexicographically smaller ciphertext. Local quotas still apply
before publish; this encoding does not replace `PropagationServer` quotas.

## Implementations

- TypeScript client, encoder, publisher, and fetcher:
  [packages/bridge-freenet](../../packages/bridge-freenet/)
- Freenet WASM contract source:
  [contract/locator](../../packages/bridge-freenet/contract/locator/)
- Packet-log codec:
  [packet-log.ts](../../packages/bridge-freenet/src/core/packet-log.ts)
- Propagation-set codec:
  [propagation-set.ts](../../packages/bridge-freenet/src/core/propagation-set.ts)
- Fetch path integration:
  [bridge-hyper fetch](../../packages/bridge-hyper/src/core/fetch.ts)

## Remaining gates

Live S2 confirmation, cross-node notify under locator reordering, S4, S5, S7,
a wired (non-stub) F2 interface, and a Freenet-backed propagation adapter with
the node-A-offline/node-B retrieval proof remain open; S1, S3, S6, S8, and
local S2 are recorded as complete or partial-complete. No bitrate, latency,
mobile support, bundled-binary support, or app execution claim is normative
until the corresponding evidence gate passes.
