# Running diagnostics

Each applet reports `{ appletId, status, details, timings }` with first-class
`unavailable` and `not-granted` outcomes. Open an SDK chapter and tap
**Run applet**, or work through the probes listed here.

- App destination hash — `identity`
- Presence snapshot — `presence`
- KV round-trip — `storage:kv`
- Hyperbee round-trip — `storage:hyperbee`
- LXMF self-message — `identity`, `lxmf:*`
- Announce publish/subscribe — `announce:*`
- Resource fetch — `resource:fetch`
- Workspace read/write — `workspace`
- CAS share — `share:cas`
- Package + preview — `apps:package`, `apps:preview`
- Publish + install — `apps:publish`, `apps:install`
- AI chat — `ai:chat`
- Widget gallery — widget protocol

Full “run all + export report” lands in Phase D2 once `host.info()` is available.
