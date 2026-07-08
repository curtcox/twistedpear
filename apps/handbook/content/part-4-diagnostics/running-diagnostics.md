# Running diagnostics

Each applet reports `{ appletId, status, details, timings }` with first-class
`unavailable` and `not-granted` outcomes.

## On this screen

From the Handbook **Contents**, use:

- **Run all diagnostics** — runs every catalog applet inline on this host
- **Export report** — packs host info + results into JSON, stores via `share.put`,
  shows a 256t id / QR
- **Compare report** — paste another device's report id to render a status matrix

Open an SDK chapter and tap **Run applet** for a single probe.

## Software-tier probes

- Host info — `host.info` (`presence`)
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

Device-gated probes (BLE peer, RNode, multicast, camera QR) live in
[Device-gated probes](chapter:device-gated-probes) — they report `unavailable` in CI
and simulators with guided procedures for real hardware.
