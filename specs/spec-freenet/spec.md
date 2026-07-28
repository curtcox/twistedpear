# SPEC-FREENET — Freenet contract-state binding

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

**Group:** A (adopted binding) · **Status:** stub · **Migration phase:** F1–F3 codecs

## Scope

This profile binds TwistedPear data to Freenet (the Rust network formerly named
Locutus), without making Freenet a protocol dependency or trust root. Freenet
contracts carry bytes; TwistedPear continues to authenticate packages with the
existing signed manifest, per-file hashes, signed 256t locator, and archive hash.

The implemented slices are the immutable locator/package state used by the
optional `freenet` package fetch path, the convergent packet-log state
encoding that F2 will carry over Freenet, and the LXMF propagation-set
encoding plus WASM contract for F3. Local S2 update→notify latency evidence is
recorded in
[measured-roundtrip.json](../../conformance/freenet-spike/measured-roundtrip.json);
a wired `FreenetInterface` is still gated and must not land as a stub.

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
  the F3 per-destination LXMF ciphertext set encoding and the generated
  propagation-set WASM identity. It is exercised by
  [propagation-set.test.ts](../../packages/bridge-freenet/test/propagation-set.test.ts).
- The signed locator nested inside the state is governed by
  [SPEC-NAME](../spec-name/spec.md); this spec does not redefine its signature.
- The pinned upstream SDK is `@freenetorg/freenet-stdlib` 0.3.0. The Rust
  contracts pin freenet-stdlib commit
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

Contract parameters are a big-endian retention limit (2 bytes) optionally
followed by a 32-byte peer-pair rendezvous so distinct tunnels do not share a
contract key. Merge unions by `(direction, index)`, keeps the
lexicographically smaller payload on conflict, and retains only the highest
`retention` indexes per direction.

Policy bitrate for `freenet` is **90_000 bps**, derived from the local S2
1 KiB p95 (~89 ms). `FreenetInterface` is wired through
`packages/reticulum-interfaces/src/freenet.ts` and host-core; it must not land
as a `return null` stub when enabled.

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
- Freenet WASM contract sources:
  [contract/locator](../../packages/bridge-freenet/contract/locator/),
  [contract/packet-log](../../packages/bridge-freenet/contract/packet-log/), and
  [contract/propagation-set](../../packages/bridge-freenet/contract/propagation-set/)
- Packet-log codec and backend:
  [packet-log.ts](../../packages/bridge-freenet/src/core/packet-log.ts),
  [freenet-packet-log-backend.ts](../../packages/bridge-freenet/src/client/freenet-packet-log-backend.ts)
- Packet interface:
  [freenet.ts](../../packages/reticulum-interfaces/src/freenet.ts)
- Propagation-set codec and store:
  [propagation-set.ts](../../packages/bridge-freenet/src/core/propagation-set.ts),
  [freenet-propagation-store.ts](../../packages/bridge-freenet/src/server/freenet-propagation-store.ts)
- Fetch path integration:
  [bridge-hyper fetch](../../packages/bridge-hyper/src/core/fetch.ts)

## Remaining gates

Live S2 confirmation, cross-node notify under locator reordering, S4, S5, S7,
and the two-host Freenet-only announce + LXMF conformance proof remain open
for calling F2 “exit complete”. The F3 WASM contract and isolated store proof
are recorded; operator-facing host mirror wiring remains gated. No live-network
bitrate, mobile support, bundled-binary support, or app execution claim is
normative until the corresponding evidence gate passes.
