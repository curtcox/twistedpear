# LXMF Propagation Node


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

`@twistedpear/lxmf-ts` ships `PropagationServer` — a client-facing propagation node compatible with the reference `lxmd` sync protocol.

## Operations

### Enable on desktop host

```bash
tp node --propagation
```

Or set `"propagation": true` in host config roles.

### Store limits

| Limit | Default |
|-------|---------|
| Total bytes | 256 MiB |
| Message count | 10,000 |
| Per-message size | 1 MiB |
| Per-client requests | 120 / minute |

Oldest messages are evicted when byte or count quotas are exceeded.

### Protocol

- Destination aspect: `lxmf.propagation`
- Client sync path: `message_get` (list / download / delete semantics per reference)
- Node-to-node propagation peering: **stretch goal** — if not meshed, run `lxmd` for multi-node stores

## Interop

CI runs bidirectional sync against dockerized `lxmd` and Python LXMF clients when `INTEROP=1`.

Hostile tests cover oversize frames, quota exhaustion, and malformed msgpack.

## Monitoring

When `--status-endpoint` is enabled, propagation stats appear in `/status`:

- `propagationStoreBytes`
- `propagationMessageCount`
