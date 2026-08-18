# Mobile lifecycle — recovering withheld utility

<!-- tp-doc
lifecycle: planned
audited: 2026-08-18
register: software
counterpart: docs/mobile-lifecycle.md
-->

What it would take to clear the remaining `self-imposed` rows of the ledger in
[mobile-lifecycle.md](mobile-lifecycle.md), which is the document describing what the
platform does today. Read the live document for current behaviour and for the ledger
itself; this file is only the argument for what remains.

The organising claim is the one the live document states: the mobile OS constrains the
host process, not the mini-apps inside it. Every candidate below is an attempt to stop a
mini-app paying for a restriction that was never placed on it.

Concurrent mini-apps have shipped (`MINIAPP-CONCURRENT`): `MiniappHost` holds a per-app
instance map, broker traffic and budgets are per app, and each shell has a switcher. A
brokered app-to-app channel has shipped (`MINIAPP-APP-TO-APP`): both sides grant a
destination-named `apps:channel`, and payloads copy through the host. Shared storage is
still withheld. `MLC-LIFECYCLE-EVENTS`, `MLC-BACKGROUND-ANDROID`, and
`MLC-SCHEDULED-WAKE` have shipped. The remaining rows are `os`.

## Sequencing

`MLC-LIFECYCLE-EVENTS` shipped as `MINIAPP-LIFECYCLE-EVENTS`: `host.setCheckpoint` /
`host.onResume`, with a 50 ms will-suspend budget that kills on overrun.
`MLC-BACKGROUND-ANDROID` shipped as `MINIAPP-BACKGROUND-ANDROID`: a rationed
`runtime:background` grant that keeps the sandbox running inside the Android
foreground service. `MLC-SCHEDULED-WAKE` shipped as `MINIAPP-SCHEDULED-WAKE`:
`runtime:wake` / `host.requestWake` with a per-host slot limit. Current
behaviour is in [mobile-lifecycle.md](mobile-lifecycle.md).

1. ~~`MLC-LIFECYCLE-EVENTS`~~ — shipped.
2. ~~`MLC-BACKGROUND-ANDROID`~~ — shipped.
3. ~~`MLC-SCHEDULED-WAKE`~~ — shipped.

## Candidates 2 and 3 — background and scheduled execution

Android already runs a foreground service for mesh participation; nothing prevents mini-app
execution inside it. iOS wake budgets (`fetch`, `processing`) already exist and are spent on
propagation sync. In both cases the scarce resource is per-host, not per-app, so the API is
the easy part and the rationing is the design:

- What does a background grant cost, in terms a grant screen can state honestly? "This app
  may run while you are using other apps" is comprehensible; "this app may consume 4% of
  your battery per day" is what it means.
- Who loses when budgets are oversubscribed? A phone with six installed apps cannot give
  each one periodic wake-ups.
- Android-only capability, or a capability that simply does less on iOS? A capability whose
  behaviour differs that sharply between hosts is a documentation problem in
  [platform capabilities status](platform-capabilities-status.md) either way, but the
  honest option is to expose it and record the asymmetry rather than level down to iOS.

The iOS rows (`MLC-BACKGROUND-IOS`, `MLC-ALWAYS-ON-ROLES`) stay `os` until Apple changes
background execution policy. They carry dates rather than work items for that reason, and
the audit will surface them for re-examination rather than letting them lapse into
assumptions.
