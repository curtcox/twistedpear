# 11. Testing and debugging

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

You are writing code that runs inside a sandbox, on someone else's device, over a network you
cannot see. This chapter is about closing that gap.

## The four loops, fastest first

| Loop | Cost | Catches |
|---|---|---|
| Preview slot | Seconds | Logic, layout, capability denials |
| Dev side-load | Seconds | The same, in a real host with real host chrome |
| Install from a package | A minute | Manifest errors, signing, the actual grant screen |
| Install on a second device | Minutes | Announce, resolution, seeding, real link behaviour |

Do not skip the last one. Everything that is genuinely hard about this platform — resolution,
seeding, slow links, partial grants — lives there and nowhere else.

## Preview

The dev-preview slot is a **fully independent host** — its own broker, its own grant store —
so a capability you did not approve is genuinely denied. That makes it a rehearsal, not a
simulation, and the fastest way to test your degraded paths: approve a subset and watch what
your app does.

One slot only; previewing again replaces the previous preview.

## Dev side-load

```sh
tp dev my-app
```

Serves your app to a host running in developer mode, badged **DEV** in the UI. Localhost or
adb-forwarded only, off by default. Edit and it reloads.

Because the badge is always visible, a side-loaded app can never be mistaken for an installed
one — including by you, which matters more than it sounds when you are debugging why your
"installed" app has no grants.

## Reading a failure

**`CapabilityError`** — you called something you were not granted. Check the manifest declares
it *and* the user granted it; both are required. `host.info().grantedCapabilities` tells you
what you actually have.

**Widget validation error** — the tree was rejected whole and the previous tree is retained,
so your app does not go blank. The message names the offending node and the reason: unknown
component, unknown prop or style, duplicate id, too many nodes, too deep, too large.

**Rate limit** — you exceeded 60 broker messages per second. The usual cause is a render loop:
an event handler that renders, triggering an event, that renders.

**Quota exceeded** — a storage write over the limit. It fails; it does not evict
([Chapter 6](06-storage-and-files.md)).

**Watchdog kill** — an unresponsive sandbox is killed after a ping timeout, and the app
transitions to `crashed`. A busy loop is not survivable by design: force-quit terminates the
worker outright.

![The Runtime controls panel with lifecycle state and a force-quit control](/authors/images/11-runtime-controls.png)

**Screenshot 11.1 — Runtime controls.** The desktop host's per-app panel. Top: the app name,
version, and a lifecycle chip reading "running" (with the state machine shown beneath as
`installed → launching → running → suspended → stopped`, current state highlighted). Middle:
live counters — messages/sec against the limit, KV bytes used against quota, uptime. Bottom: a
red **Force quit** button and a note reading "Terminates the worker immediately. Safe against
a busy loop."

> **⚠️ Works, with limits — watchdog thresholds are untuned on low-end hardware.** The
> watchdog may stop an app that is merely slow rather than hung, and this has never been
> characterised on a physical low-end device. If your app does heavy synchronous work, break
> it up. See [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H11.

## The lifecycle you are living in

```
installed → launching → running → suspended → stopped
```

Crashes and watchdog kills go to `crashed`. There is no `onSuspend` hook — **persist as you
go**. Anything you were holding only in memory when the user backgrounded the app or the host
suspended it is gone.

Suspension is not exotic. On a phone it is the normal case.

## Conformance suites worth running

These exist for the platform, but they are the best available test rig for an app author too:

```sh
npm run test:examples          # the three reference apps through package/install/runtime
npm run test:hostile-apps      # what the sandbox does to badly behaved code
npm run test:dev-loop          # dev side-load path
npm run test:devstudio-loop    # the full two-instance author → publish → install loop
npm run test:miniapp-soak      # runtime under sustained load
npm run test:miniapp-benchmark # spawn, kill, and busy-loop timings on your machine
```

`test:examples` is the one to run when you suspect your toolchain rather than your code. See
[conformance/README.md](../conformance/README.md) for the full set grouped by platform.

## Testing across hosts

Your app renders natively on each target and they are not identical.

```sh
npm run run:desktop            # Electron desktop host
npm run run:web                # web host in a browser
```

Mobile needs a dev build — see [apps/harness-mobile](../apps/harness-mobile/README.md).

Test the browser separately from the rest. It is the most constrained target: leaf-only and
gateway-dependent, evictable storage, no hardware keystore, and mini-app isolation resting on
sandboxed iframes and CSP rather than OS processes. If your app must work there, prove it
there. See [docs/web-host.md](../docs/web-host.md) and [LIMITATIONS.md §8](../LIMITATIONS.md).

> **⚠️ Works, with limits — sandbox hardening is unproven on real phones.** The hostile-app
> suite passes on desktop and emulators; Bare Worker hostile parity on physical Android
> hardware has never been measured. Emulator spawn/kill/busy-loop numbers are recorded in
> `conformance/android-emulator/measured-worker.json`. See
> [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H11.

## Testing the network conditions you will actually meet

The interesting failures are not on your desk:

- **A peer who is offline.** Send to an address nobody is carrying. Your app should stay
  usable and say something honest.
- **A slow link.** Radio links move tens of kilobits (Bluetooth) to hundreds of bits (LoRa) per
  second. A transfer that is instant on your LAN is minutes there.
- **A partial grant.** Preview with capabilities switched off, one at a time.
- **A revoked grant mid-session.** Turn a capability off while the app runs; your next call
  throws, with no warning.
- **A tightened quota mid-session.** The Runtime controls panel does this live.

The Handbook mini-app ([docs/handbook.md](../docs/handbook.md)) is useful here: it runs inside
TwistedPear and probes the actual device, so it tells you what the host you are testing on can
really do rather than what the documentation says.

## The debugging tool you do not have

There is no debugger, no breakpoint, and no devtools attached to the sandbox. You have
`console` output surfaced by the host, and you have your own state rendered into a `text`
widget.

That sounds worse than it is, given how small a single-file mini-app has to be. But it is a
reason to keep your app small and your state explicit.
