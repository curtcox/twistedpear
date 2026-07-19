# SPEC-WIRE — Reticulum wire protocol (adopted)

**Group:** A (adopted) · **Status:** stub · **Migration phase:** 3

## Scope

Reticulum packet formats, announce mechanics, link establishment, and the cryptographic
constructions beneath them. Web analog: IP/TCP/TLS.

## Adoption posture

Authored upstream by the Reticulum project; byte-level compatibility with the Python
reference (RNS 0.9.4 pin, see [conformance/UPSTREAM.md](../../conformance/UPSTREAM.md))
is a permanent constraint. This spec will be a **profile**: the subset TwistedPear uses,
any extensions, and (ideally zero) deviations.

## Profile template (shared by all Group A specs)

A profile is one page with exactly five sections:

1. **Upstream pin** — the upstream project, version, and commit the profile is
   written against.
2. **Subset** — the upstream features/fields/flows TwistedPear uses, as a table with
   one row per item and a pointer to the vector or interop test that pins it.
3. **Extensions** — anything TwistedPear adds that upstream doesn't define (ideally
   with an upstream-publication plan, see
   [docs/upstream-publication.md](../../docs/upstream-publication.md)).
4. **Deviations** — anything TwistedPear does differently (target: an empty section;
   any entry is a bug report against either this repo or upstream).
5. **Evidence** — the conformance commands that hold the profile true in CI.

A profile is *done* when every subset row cites at least one pinned vector or interop
test.

## Normative artifacts

- Golden wire vectors: [conformance/vectors/](../../conformance/vectors/)
  (`npm run vectors:generate`)
- Python interop matrix: `npm run test:interop`
  ([conformance/docker](../../conformance/docker/))

## Implementations

- [packages/reticulum-ts](../../packages/reticulum-ts/) (production TypeScript)
- Python RNS (upstream reference, exercised in Docker interop)
- Simulator transport models
  ([packages/effects](../../packages/effects/) sim adapters)

## To finish this spec

Write the one-page profile using the template above and move or link the vector suite
manifest here. No new prose specification of the wire format itself — upstream owns
that.
