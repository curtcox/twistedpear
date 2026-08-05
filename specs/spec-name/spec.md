# SPEC-NAME — 256t identifiers and resolution

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 3

## Scope

The 256t identifier format, content-addressed storage semantics, and the resolution
path from identifier to verified bytes. Web analog: URL/DNS plus subresource integrity.

## Identifier rules

A 256t id is 94 base64url characters (RFC 4648 §5 alphabet, no padding) encoding
70 bytes:

- Bytes 0–5: content length, 48-bit big-endian (up to 256 TB).
- Bytes 6–69: content field — for length > 64, the SHA-512 hash of the content;
  for length ≤ 64, the content itself zero-padded to 64 bytes ("inline").

Decoders reject: wrong length, non-alphabet characters, non-canonical tail bits,
and non-zero padding on inline content. Resolution of a hash id must verify the
fetched bytes against both the declared length and the SHA-512 hash before
returning them ("integrity-failure reject").

## Normative artifacts (current locations)

- Vector suite: [vectors/identifiers.json](vectors/identifiers.json) — decode
  vectors (`{ id, expect }` with `inline`/`hash`/`reject` outcomes covering a
  zero-length id, a maximal inline id, hash ids, and every reject class) plus
  resolution vectors (`{ id, content, ok }` including the integrity-failure
  case). Executed by
  [packages/cas-256t/test/spec-name-vectors.test.ts](../../packages/cas-256t/test/spec-name-vectors.test.ts)
  in the default `vitest` suite.
- Informative description: [docs/256t-distribution.md](../../docs/256t-distribution.md)
- Implementation-pinned behavior: [packages/cas-256t](../../packages/cas-256t/) tests

## Implementations

- [packages/cas-256t](../../packages/cas-256t/) (production)
- [packages/bridge-hyper](../../packages/bridge-hyper/) (Hyper-backed distribution)
- Simulator CAS model

## To finish this spec

Done — the vector suite landed in `vectors/identifiers.json` with all the
required cases (maximal inline, zero-length, hash, each reject class, and the
integrity-failure resolution case), seeded from the `cas-256t` implementation.
The prose in 256t-distribution.md is informative; the vectors are normative.
