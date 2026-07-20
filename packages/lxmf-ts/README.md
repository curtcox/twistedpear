# lxmf-ts


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

TypeScript LXMF client for Reticulum, targeting interoperability with Python LXMF 0.7.0
and clients such as Sideband, MeshChat, and `lxmd`.

## Status (Phase 1)

- **M7** — LXMessage encode/decode/sign/verify, opportunistic, direct, and propagated
  delivery via `LXMFRouter`, propagation-node client sync (list/download/delete),
  propagation-node ingress for tests; docker interop with Python LXMF echo peer

## Development

```sh
npm ci
npm test
npm run build
```

Golden vectors live in `conformance/vectors/lxmf.json`.

## Reference

Implementation mirrors Python LXMF at pinned version 0.7.0 — see
`conformance/UPSTREAM.md`.
