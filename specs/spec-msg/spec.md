# SPEC-MSG — LXMF message layer (adopted)

**Group:** A (adopted) · **Status:** stub · **Migration phase:** 3

## Scope

LXMF message structure, delivery methods, propagation-node behavior, stamps/tickets.
Web analog: SMTP/HTTP.

## Adoption posture

Authored upstream by the LXMF project; compatibility with the Python reference is a
permanent constraint. This spec will be a **profile** over upstream, documenting the
subset used by the platform and the propagation-node behavior TwistedPear relies on
([docs/propagation-node.md](../../docs/propagation-node.md)).

## Normative artifacts

- LXMF golden vectors: [conformance/vectors/](../../conformance/vectors/)
- Python interop: `npm run test:interop`, propagation slice in
  [conformance/propagation-interop](../../conformance/propagation-interop/)

## Implementations

- [packages/lxmf-ts](../../packages/lxmf-ts/) (production TypeScript client + router)
- Python LXMF (upstream reference)
- Simulator message models

## To finish this spec

Write the profile page; enumerate which LXMF fields/flows the mini-app platform depends
on (the SPEC-SDK `lxmf.*` namespace binds to exactly this subset).
