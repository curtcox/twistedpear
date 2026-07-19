# SPEC-NAME — 256t identifiers and resolution

**Group:** C (platform) · **Status:** stub · **Migration phase:** 3

## Scope

The 256t identifier format, content-addressed storage semantics, and the resolution
path from identifier to verified bytes. Web analog: URL/DNS plus subresource integrity.

## Normative artifacts (current locations)

- Canonical description: [docs/256t-distribution.md](../../docs/256t-distribution.md)
- Implementation-pinned behavior: [packages/cas-256t](../../packages/cas-256t/) tests

## Implementations

- [packages/cas-256t](../../packages/cas-256t/) (production)
- [packages/bridge-hyper](../../packages/bridge-hyper/) (Hyper-backed distribution)
- Simulator CAS model

## To finish this spec

Vector suite in `vectors/`: identifier → expected parse/resolution outcome, including
malformed identifiers and integrity-failure rejects. Prose in 256t-distribution.md
becomes informative once the vectors land.
