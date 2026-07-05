# Conformance Harness

Phase 1 starts with the harness, then grows protocol coverage behind it.

## Golden vectors

The committed M0 corpus lives in `conformance/vectors/crypto.json` and is consumed by the
`reticulum-ts` Vitest suite.

Regenerate it with:

```sh
npm run vectors:generate
```

M1 and M2 should extend `conformance/vectors/generate.py` to run inside the pinned Python
RNS container and emit identity, destination, packet, announce, and link transcript
vectors. Committed vectors keep normal CI independent of Docker.

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
