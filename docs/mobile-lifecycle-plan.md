# Mobile lifecycle — recovering withheld utility

<!-- tp-doc
lifecycle: planned
audited: 2026-08-17
register: none
counterpart: docs/mobile-lifecycle.md
-->

What it would take to clear the `self-imposed` rows of the ledger in
[mobile-lifecycle.md](mobile-lifecycle.md), which is the document describing what the
platform does today. Nothing here is built. Read the live document for current behaviour
and for the ledger itself; this file is only the argument for what to do about it.

The organising claim is the one the live document states: the mobile OS constrains the
host process, not the mini-apps inside it. Every candidate below is an attempt to stop a
mini-app paying for a restriction that was never placed on it.

Concurrent mini-apps have shipped (`MINIAPP-CONCURRENT`): `MiniappHost` holds a per-app
instance map, broker traffic and budgets are per app, and each shell has a switcher. A
brokered app-to-app channel has shipped (`MINIAPP-APP-TO-APP`): both sides grant a
destination-named `apps:channel`, and payloads copy through the host. Shared storage is
still withheld. The remaining rows are what those recoveries make worth attempting.

## Sequencing

1. `MLC-LIFECYCLE-EVENTS` — tell an app what the host already knows.
2. `MLC-BACKGROUND-ANDROID` and `MLC-SCHEDULED-WAKE` — budgeted execution when the user is
   elsewhere. Last, because both are rationing problems before they are API problems.

## Candidate 1 — lifecycle events for mini-apps

The host already receives `suspend-node` and `resume-node` and acts on them; the sandbox
is told nothing. Forwarding them as SDK events costs little and removes the "persist on
every write" tax that [the authoring guide](../authors/12-limits-and-budgets.md) currently
imposes on every app author.

The constraint that makes this non-trivial is the grace window. A suspend handler runs
inside the same short window the host uses to quiesce interfaces, so it needs a hard
budget, and an app that overruns it must be killed rather than delaying the host's own
quiesce. That argues for a strictly bounded synchronous checkpoint — a "write this blob
now" call — rather than a general `onSuspend` in which arbitrary app code runs.

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
