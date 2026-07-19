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

Write the one-page profile (subset, extensions, deviations) and move or link the vector
suite manifest here. No new prose specification of the wire format itself — upstream owns
that.
