# SPEC-MSG — LXMF message layer (adopted)

**Group:** A (adopted) · **Status:** normative (profile) · **Migration phase:** 3

## Scope

LXMF message structure, delivery methods, propagation-node behavior, stamps/tickets.
Web analog: SMTP/HTTP.

## Adoption posture

Authored upstream by the LXMF project; byte-level compatibility with the Python
reference is a permanent constraint. This document is a **profile** over upstream
using the five-section template in [SPEC-WIRE](../spec-wire/spec.md); it documents the
subset the mini-app platform depends on. The SPEC-SDK `lxmf.*` namespace binds to
exactly this subset. Propagation-node behavior is described informatively in
[docs/propagation-node.md](../../docs/propagation-node.md).

---

## 1. Upstream pin

| Upstream | Version | Role |
|---|---|---|
| LXMF | 0.7.0 | Golden vector generation ([conformance/vectors/lxmf.json](../../conformance/vectors/lxmf.json)) and interop |
| Python RNS (transport) | 0.9.5 | Live LXMF interop peer ([conformance/docker](../../conformance/docker/)) |

## 2. Subset

Every row cites a pinned vector in
[conformance/vectors/lxmf.json](../../conformance/vectors/lxmf.json), the golden-vector
replay, or an interop/router test.

| Upstream feature | TwistedPear use | Pinned by |
|---|---|---|
| Message wire encoding (timestamp, title, content, signature, hash) | LXMF message codec | `lxmf.json` → `hello-world`; `packages/lxmf-ts` `golden-vectors.test.ts` ("LXMF golden vectors") |
| Empty-fields message | Minimal message round-trip | `lxmf.json` → `empty-fields` |
| Message fields map (typed field 0x8 = thread-id) | Field-carrying messages | `lxmf.json` → `with-fields` |
| Opportunistic delivery (single-packet) | `lxmf.send` fast path | `packages/lxmf-ts` `router.test.ts` ("delivers opportunistic messages over PipeInterface"); `npm run test:interop` ("exchanges opportunistic LXMF messages with Python LXMF echo peer") |
| Direct-link delivery | `lxmf.send` over an established link | `router.test.ts` ("delivers direct link messages over PipeInterface") |
| Propagated delivery via propagation node | Store-and-forward `lxmf.send`/`receive` | `router.test.ts` ("delivers propagated messages via a propagation node over PipeInterface") |
| Propagation-node discovery (`lxmf.propagation` announces) | Node discovery | `router.test.ts` ("discovers propagation nodes from lxmf.propagation announces") |
| Propagation sync (client download) | `lxmf.receive` from a node | `router.test.ts` ("downloads queued messages from a propagation node over PipeInterface"); `npm run test:propagation-interop` (TS↔Python sync slices) |
| Propagation-node quotas (count/size eviction, persistence) | Node resource limits | `propagation-server.test.ts` ("PropagationServer quotas") |

## 3. Extensions

None to the LXMF wire format. TwistedPear's broker `lxmf.*` namespace (SPEC-SDK) is a
host-side API binding over this subset, not a wire extension; its call semantics are
pinned by the SPEC-SDK vectors, not here.

## 4. Deviations

None. Byte-level divergence from LXMF 0.7.0 fails either the golden vectors
(`lxmf.json`, regenerated from Python LXMF) or the interop matrix.

## 5. Evidence

- Golden-vector replay: `golden-vectors.test.ts` in
  [packages/lxmf-ts/test](../../packages/lxmf-ts/test/) (default `vitest` run).
- `npm run test:interop` — opportunistic LXMF against Python LXMF (needs
  Docker/Python; skip if unavailable).
- `npm run test:propagation-interop` — propagation-node sync in-process and against
  Python `lxmd` (Docker slice optional).

## Implementations

- [packages/lxmf-ts](../../packages/lxmf-ts/) (production TypeScript client + router)
- Python LXMF (upstream reference)
- Simulator message models
