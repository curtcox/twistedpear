# reticulum-ts

TypeScript implementation of the Reticulum Network Stack, targeting byte-exact
compatibility with Python RNS 0.9.4.

## Status (Phase 1)

- **M0–M3** — scaffolding, crypto/identity vectors, packets/destinations/announces,
  HDLC framing, Pipe/TCP/UDP interfaces, leaf transport
- **M4** — links with AES-256-CBC mode signalling, request/response,
  identification, keepalive, Channel + Buffer
- **M5** — Resource transfer (advertisement, requests, parts, proof) over links
- **M6** — transport-node announce rebroadcast, packet/link/proof relay, path requests/replies, announce rate limiting
- **M3 docker interop** — leaf node over TCP against pinned Python RNS peer (`npm run test:interop`)

Enable transport-node mode with `Reticulum.create({ transportEnabled: true, ... })`.

## Development

```sh
npm ci
npm test
npm run build
```

Golden vectors live in `conformance/vectors/`. Regenerate with
`npm run vectors:generate` (identity vectors require a local RNS install; see
`conformance/README.md`).

## Crypto providers

| Provider | Implementation |
|---|---|
| `node` | `node:crypto` (AES/HKDF/HMAC/SHA-256) + `sodium-native` (X25519/Ed25519) |
| `pure` | `@noble/curves`, `@noble/ciphers`, `@noble/hashes` |

Every crypto test runs against both providers and asserts identical output.

## Reference

Implementation mirrors Python RNS at pinned version 0.9.4 — see
`conformance/UPSTREAM.md`.
