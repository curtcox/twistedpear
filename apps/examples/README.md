# Example mini-apps

Phase 4 reference apps. Each exercises a different SDK surface through the real Phase 3
pack/verify/install pipeline and the Phase 4 sandbox runtime.

| App | Capabilities | SDK surface |
|---|---|---|
| [chat](chat/) | `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv` | App-scoped identity, LXMF send/receive, KV for last peer |
| [file-drop](file-drop/) | `resource:fetch`, `storage:kv` | Host-budgeted Resource fetch, KV persistence |
| [board](board/) | `announce:publish`, `announce:subscribe`, `storage:hyperbee` | Announce + local Hyperbee store |

## Build and exercise

```sh
npm run build
npm run test:examples
```

Each example ships as a pre-built `bundle.js` plus `app.manifest.json`. To repack locally:

```sh
cd apps/examples/chat
tp init
tp pack .
```

All three examples are under the 180 KiB BLE install budget (see
[conformance/budgets/measured.json](../../conformance/budgets/measured.json)).

Peer-to-peer exercise (two hosts over docker/BLE) is device-gated; see
[STATUS-HARDWARE.md](../../STATUS-HARDWARE.md) (H9–H10).
