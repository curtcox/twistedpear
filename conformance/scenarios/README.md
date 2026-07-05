# Interop Scenarios

Live interop tests exercise `reticulum-ts` and `lxmf-ts` against pinned Python RNS/LXMF
peers in Docker.

## Prerequisites

- Docker with Compose v2
- Node.js 22+ (for the TypeScript side)

## Run locally

Start a Python peer:

```sh
docker compose -f conformance/docker/docker-compose.yml up --build leaf-echo
# or
docker compose -f conformance/docker/docker-compose.yml up --build lxmf-echo
```

Run the matching TypeScript interop tests:

```sh
npm run test:interop
```

The tests connect to `127.0.0.1:4242` (leaf echo) and `127.0.0.1:4243` (LXMF echo) by default.
Override with `LEAF_ECHO_PORT` / `LXMF_ECHO_PORT` if needed.

## Layout

| Path | Purpose |
|---|---|
| `config/` | Reticulum configs for Python peers |
| `python/` | Python scenario drivers (leaf echo, LXMF echo) |
| `ts/harness.ts` | Shared docker/compose helpers for Vitest |

Python peers print `READY <destination_hash_hex>` once their inbound destination has announced.

## CI

Regular `npm test` skips interop scenarios. The dedicated CI `interop` job sets `INTEROP=1`
and runs `npm run test:interop`.
