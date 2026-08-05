# Running diagnostics


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Each applet reports `{ appletId, status, details, timings }` with first-class
`unavailable` and `not-granted` outcomes — teaching moments, not hard errors.

## On this screen

From the Handbook **Contents**, open **Diagnostics** to:

- **Run all diagnostics** — runs every catalog applet inline on this host, grouped
  by area (crypto, interfaces, storage, distribution, runtime)
- **Export report** — packs host info + results into JSON, stores via `share.put`,
  shows a 256t id / QR
- **Compare report** — paste another device's report id to render a status matrix
  with expected platform differences marked

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
- OTA update — republish with bumped semver
- AI chat / embedding configuration — `ai:chat`, `ai:embed`
- Widget gallery — widget protocol

Device-gated probes (BLE peer, RNode, multicast, camera QR) live in
[Device-gated probes](chapter:device-gated-probes) — they report `unavailable` in CI
and simulators with guided procedures for real hardware.

Compare matrices use each applet’s expectation table to label platform differences
as expected (`≈`) or unexpected (`≠`). Exported reports also include the announce
ingress **drop census** (`observe/drop` reasons); compare renders those counts in
their own matrix section so rate-limited vs absent peers are distinguishable.
