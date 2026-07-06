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
docker compose -f conformance/docker/docker-compose.yml up --build link-echo
# or
docker compose -f conformance/docker/docker-compose.yml up --build lxmf-echo
# or (Phase 6 transport hub — leaves attach as TCP clients to host:4250)
docker compose -f conformance/docker/docker-compose.yml up --build transport-leaf-bob transport-leaf-alice
```

Run the matching TypeScript interop tests:

```sh
npm run test:interop
npm run test:bare-interop
npm run test:auto-interop
npm run test:i2p-interop
```

The tests connect to `127.0.0.1:4242` (leaf echo), `127.0.0.1:4244` (link echo), and
`127.0.0.1:4243` (LXMF echo) by default. Override with `LEAF_ECHO_PORT` / `LINK_ECHO_PORT` /
`LXMF_ECHO_PORT` if needed.

AutoInterface interop uses `docker compose ... up auto-interop` with `network_mode: host` so the
Python peer shares the runner's link-local IPv6 interfaces. The combined peer exercises echo,
link, and LXMF delivery over AutoInterface discovery.

I2P interop uses `docker compose ... up i2pd i2p-interop`. The Python peer writes its `.b32.i2p`
destination to `conformance/scenarios/state/i2p-b32.txt` once the I2P tunnel is online. The
TypeScript runner connects through the host-mapped SAM bridge on `127.0.0.1:7656`. Tunnel build
can take a few minutes on a cold start; override `I2P_READY_TIMEOUT_MS` if needed.

## Layout

| Path | Purpose |
|---|---|
| `config/` | Reticulum configs for Python peers |
| `python/` | Python scenario drivers (leaf echo, link echo, LXMF echo, transport hub leaves) |
| `ts/harness.mjs` | Shared docker/compose helpers for interop runners |

Python peers print `READY <destination_hash_hex>` once their inbound destination has announced.

## CI

Regular `npm test` skips interop scenarios. The dedicated CI `interop` job sets `INTEROP=1`
and runs `npm run test:interop`.
