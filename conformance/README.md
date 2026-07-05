# Conformance Harness

Phase 1 starts with the harness, then grows protocol coverage behind it.

## Golden vectors

The committed M0 corpus lives in `conformance/vectors/crypto.json` and is consumed by the
`reticulum-ts` Vitest suite. LXMF message vectors live in `conformance/vectors/lxmf.json`
and are consumed by the `lxmf-ts` Vitest suite.

Regenerate it with:

```sh
npm run vectors:generate
```

Run the pure-provider smoke subset (built `dist/`, no Vitest or `node:crypto`):

```sh
npm run test:bare-smoke
```

Identity and token vectors require Python RNS 0.9.4 (for example
`.venv-rns/bin/pip install rns==0.9.4` then
`.venv-rns/bin/python3 conformance/vectors/generate.py`). The committed
`identity.json` keeps CI independent of Python.

## Python reference peer

Build the pinned reference image:

```sh
docker compose -f conformance/docker/docker-compose.yml build
```

Run the placeholder reference peer:

```sh
docker compose -f conformance/docker/docker-compose.yml up reference
```

Live interop scenarios are added per milestone under `conformance/scenarios`.

M3 (leaf node over TCP/UDP/Pipe) is exercised locally via `packages/reticulum-ts/test/transport.test.ts`
(pipe + TCP loopback). Dockerized Python peer scenarios live in `conformance/scenarios/` — run
with `npm run test:interop` (requires Docker).
