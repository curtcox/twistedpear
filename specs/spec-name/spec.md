# SPEC-NAME — 256t identifiers and resolution

**Group:** C (platform) · **Status:** stub · **Migration phase:** 3

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

- Canonical description: [docs/256t-distribution.md](../../docs/256t-distribution.md)
- Implementation-pinned behavior: [packages/cas-256t](../../packages/cas-256t/) tests

## Implementations

- [packages/cas-256t](../../packages/cas-256t/) (production)
- [packages/bridge-hyper](../../packages/bridge-hyper/) (Hyper-backed distribution)
- Simulator CAS model

## To finish this spec

Vector suite in `vectors/`: identifier → expected parse/resolution outcome. Each
vector is `{ id, expect }` where `expect` is one of `inline` (with decoded bytes),
`hash` (with length and hex hash), or `reject` (with one of the reject reasons
above). Include: a maximal inline id, a zero-length id, a hash id, each reject
class, and an integrity-failure resolution case. Seed the suite from the existing
[packages/cas-256t](../../packages/cas-256t/) tests; prose in 256t-distribution.md
becomes informative once the vectors land.
