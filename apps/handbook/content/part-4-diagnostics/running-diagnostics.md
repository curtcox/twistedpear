# Running diagnostics

Each applet reports `{ appletId, status, details, timings }` with first-class
`unavailable` and `not-granted` outcomes. Open an SDK chapter and tap
**Run applet**, or work through the probes listed here.

| Applet | Exercises |
|---|---|
| App destination hash | `identity` |
| Presence snapshot | `presence` |
| KV round-trip | `storage:kv` |
| LXMF self-message | `identity`, `lxmf:*` |
| Announce publish/subscribe | `announce:*` |

Full “run all + export report” lands in Phase D2 once `host.info()` is available.
