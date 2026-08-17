# Mobile lifecycle — recovering withheld utility

<!-- tp-doc
lifecycle: planned
audited: 2026-08-16
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

## Sequencing

Concurrency comes first, and not only because it is the largest single recovery. It is the
prerequisite that makes three other rows worth attempting: app-to-app messaging is
pointless while only one app runs, lifecycle events are far more valuable to an app that
keeps running while the user looks at another one, and per-app background budgets are
unanswerable until "per app" means something.

1. `MLC-CONCURRENT-APPS` — several mini-apps at once.
2. `MLC-LIFECYCLE-EVENTS` — tell an app what the host already knows.
3. `MLC-APP-TO-APP` — a brokered channel between two running apps.
4. `MLC-BACKGROUND-ANDROID` and `MLC-SCHEDULED-WAKE` — budgeted execution when the user is
   elsewhere. Last, because both are rationing problems before they are API problems.

## Candidate 1 — several mini-apps at once (`MINIAPP-CONCURRENT`)

`MiniappHost` holds `active: ActiveApp | null`
([layer-1-base.ts](../packages/miniapp-runtime/src/host/layer-1-base.ts)), and `launch()`
stops whatever was there. The dev-preview slot works around this by constructing a whole
second `MiniappHost` with its own broker and an in-memory grant store
([miniapp-host-shared-core.mjs](../packages/worklet-core/src/miniapp-host-shared-core.mjs)),
and the worklet IPC already carries a `slot` discriminator for it. Two apps therefore
already run concurrently on device today — through a mechanism built for previewing, with
a private grant store, which is exactly why it is not the answer.

The work is to make the slot general:

- Replace the single `active` field with a per-app instance map, keyed the way grants are
  keyed (`appId + publisherPublicKey`).
- Route broker traffic per app. The chokepoint stays single; what becomes per-app is the
  rate limit, the message accounting, and the widget-tree destination.
- Decide what budgets mean under concurrency. Message rate and KV quota are already
  per-app. Memory ceilings and the AI in-flight slot are not obviously per-app when four
  apps run on a phone, and the aggregate is what the OS will judge.
- Give each shell a switcher, and decide what the renderer shows when an app is running
  but not on screen. Host-rendered UI makes this safe to do — a backgrounded mini-app has
  no drawing surface to abuse — but [SPEC-CHROME](../specs/spec-chrome/spec.md) should say
  so explicitly rather than leaving it implied.
- Keep the watchdog per app. One wedged app must not cost the others their session.

Open question: whether a concurrently running app that is not on screen keeps its
capability grants live, or drops to a reduced set until the user returns to it. The
conservative answer — grants stay, but anything user-visible (confirmations, media
capture) requires the app to be foregrounded — is probably right, and belongs in
[SPEC-CAP](../specs/spec-cap/spec.md) rather than in host code.

## Candidate 2 — lifecycle events for mini-apps

The host already receives `suspend-node` and `resume-node` and acts on them; the sandbox
is told nothing. Forwarding them as SDK events costs little and removes the "persist on
every write" tax that [the authoring guide](../authors/12-limits-and-budgets.md) currently
imposes on every app author.

The constraint that makes this non-trivial is the grace window. A suspend handler runs
inside the same short window the host uses to quiesce interfaces, so it needs a hard
budget, and an app that overruns it must be killed rather than delaying the host's own
quiesce. That argues for a strictly bounded synchronous checkpoint — a "write this blob
now" call — rather than a general `onSuspend` in which arbitrary app code runs.

## Candidate 3 — a channel between two running apps

Only worth building once two apps run. When it is: a brokered channel, separately granted
on both sides, with the destination app named on the grant screen. Shared storage is the
harder half and probably should not follow — a channel keeps each app's data its own,
while a shared store makes one app's compromise the other's.

## Candidates 4 and 5 — background and scheduled execution

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
