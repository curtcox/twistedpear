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

## Phase 3 distribution

| Suite | Command | Milestone |
|---|---|---|
| Package format | `npm test -- packages/app-registry/test/package.test.ts` | M0 |
| Bare Hyperdrive | `npm run test:bare-hyperdrive` | M1 |
| Dist interop | `npm run test:dist-interop` | M2/M3 |
| Fetch strategy | `npm test -- packages/bridge-hyper/test/fetch.test.ts` | M4 |
| Seeder | `npm run test:seeder` | M6 |
| Updates / rollback | `npm run test:updates` | M8 |
| Size budgets | `npm run test:budgets` | M9 |
| End-to-end demo | `npm run demo:phase3` | M9 |

### Device lab runbook (Phase 3 §7)

Hardware-deferred exits; run when equipment is available:

1. **H6 (LAN seeder install):** Desktop runs `tp seed` on LAN; phone harness enables AutoInterface;
   publish with `tp publish`; confirm catalog entry and Hyperswarm install completes with verified badge.
2. **H7 (BLE-only install):** Two phones, BLE enabled, foreground service on; publish a `tiny` fixture
   package; install on peer phone via Resource path only (`forcePath: "resource"` in worklet IPC).
3. **H8 (RNode budget):** RNode pair from Phase 2 H4; confirm bulk fetch blocked over LoRa for
   packages &gt; 64 KiB; tiny package Resource fetch succeeds.

Record results in the phase exit checklist before closing Phase 3.
