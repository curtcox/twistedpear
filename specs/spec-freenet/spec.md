# SPEC-FREENET — Freenet contract-state binding

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
register: none
-->

**Group:** A (adopted binding) · **Status:** stub · **Migration phase:** F1

## Scope

This profile binds TwistedPear data to Freenet (the Rust network formerly named
Locutus), without making Freenet a protocol dependency or trust root. Freenet
contracts carry bytes; TwistedPear continues to authenticate packages with the
existing signed manifest, per-file hashes, signed 256t locator, and archive hash.

The implemented slice is the immutable locator/package state used by the optional
`freenet` package fetch path. Packet-log and LXMF propagation encodings remain
informative and gated on the F0 latency and merge measurements in the
[integration plan](../../docs/freenet-integration-plan.md).

The informative S3 ordered-log spike and measurements live under
[conformance/freenet-spike](../../conformance/freenet-spike/s3-report.md).
They establish a viable convergent encoding but are not an adopted F2 wire
format.

## Normative artifacts

- [vectors/locator-state.json](vectors/locator-state.json) pins the F1 state
  encoding and generated WASM identity. It is exercised by
  [locator-contract.test.ts](../../packages/bridge-freenet/test/locator-contract.test.ts).
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

## Implementations

- TypeScript client, encoder, publisher, and fetcher:
  [packages/bridge-freenet](../../packages/bridge-freenet/)
- Freenet WASM contract source:
  [contract/locator](../../packages/bridge-freenet/contract/locator/)
- Fetch path integration:
  [bridge-hyper fetch](../../packages/bridge-hyper/src/core/fetch.ts)

## Remaining gates

F0 S1, S2, S4, S5, and S7, F2 packet-log vectors, and F3 propagation-store
vectors remain open; S3, S6, and S8 are recorded as complete. No bitrate,
latency, mobile support, bundled-binary support, or app execution claim is
normative until the corresponding evidence gate passes.
