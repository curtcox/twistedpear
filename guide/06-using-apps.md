# 6. Using apps

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

## Launching

Press **Launch** on any installed app. The app takes over the mini-app surface — a
dedicated area of the host window — with a **Back to host** control always visible.

![An app running in the mini-app surface](/guide/images/06-app-running.png)

**Screenshot 6.1 — Chat running inside the host.** The host window with the mini-app
surface filling most of the frame: a message list, a peer selector, and a compose box.
The host chrome remains visible around it — a header strip naming the running app, a
**Back to host** button, and a **Stop mini-app** button. The distinction between host
chrome and app content should be visually obvious.

**One app runs at a time.** Launching a second one stops the first. Apps do not run in the
background, do not run when you close the host, and cannot wake up on their own. This is
a v1 design decision, not an oversight — see [LIMITATIONS.md §7](../LIMITATIONS.md).

> **⏳ Not yet available — multiple apps at once and background execution.** There is no
> multitasking between mini-apps and no way for an app to do work while you are not
> looking at it. An app that wants to notify you of a message cannot, unless you have it
> open.

## What the apps you start with do

Three reference apps ship with the platform, plus the Handbook.

| App           | What it does                                                       |
| ------------- | ------------------------------------------------------------------ |
| **Chat**      | Direct messages between two addresses. The simplest useful app.    |
| **File drop** | Sends a file to a peer, using your host's bandwidth budget rules.  |
| **Board**     | A shared noticeboard: everyone who subscribes sees the same posts. |
| **Handbook**  | Interactive documentation that probes your actual device.          |

![The three example apps](/guide/images/06-example-apps.png)

**Screenshot 6.2 — Chat, File drop, and Board.** A three-panel composite, one screenshot
each, all captured at the same size. Chat shows a short conversation; File drop shows a
transfer in progress with a progress bar and a rate readout; Board shows four posts from
three different addresses.

The Handbook is worth opening early. It is the only documentation that can tell you what
_your_ device can actually do, because it runs on it and asks the host directly.

![The Handbook running with a live probe](/guide/images/06-handbook-probe.png)

**Screenshot 6.3 — The Handbook's live capability probe.** The Handbook open at the
"Live difference matrix" chapter, showing a probe card that has been run: platform,
host version, enabled roles, interface list, and quota snapshot, all real values read from
the running host.

## Changing your mind about permissions

**Grants** shows every capability every installed app holds, and lets you revoke any of
them without uninstalling.

![The grants panel](/guide/images/06-grants.png)

**Screenshot 6.4 — Grants.** A panel headed "Grants for Chat" listing each capability the
app requested, with a toggle and current state. One is toggled off and annotated
"revoked — the app will see this as unavailable". A note at the bottom explains that some
capabilities ask for confirmation every time regardless of the grant.

Revoking is safe. An app that loses a capability is told it is unavailable; it does not
crash, and it does not get a fake answer. Some apps will visibly do less.

A few capabilities are **ask-every-time** and never become standing permissions: packaging
an app, publishing an app, and asking the host to install something. You will see a
confirmation from the host — not from the app — each time.

![A host confirmation prompt](/guide/images/06-host-confirmation.png)

**Screenshot 6.5 — A host confirmation.** A modal that is clearly host chrome, outside
the app's surface, reading "Board wants to install an app" with the app's name and
identifier, and **Allow once** / **Deny** buttons. The visual separation from the mini-app
area is the point of the shot.

## Updating

When a publisher releases a new version, it appears on the app's card. Updates are not
automatic and never silent: the new version is signed by the same pinned key, and if
it requests capabilities the old one did not, you get the capability review again.

![An available update on an app card](/guide/images/06-update-available.png)

**Screenshot 6.6 — An update is available.** An installed app card showing "1.2.0
installed · 1.3.0 available" and an **Update** button, with a small note listing one newly
requested capability so the reader can see that new asks are surfaced up front.

If an update goes badly, **Rollback** returns you to the previous version, with its data
intact.

## Removing

**Delete** removes the app and its data. The data is not recoverable, and it is not
synchronised anywhere, so deleting Chat deletes your message history with it.

## Controlling a misbehaving app

The host does not trust apps to be well behaved. **Runtime controls** lets you cap what a
running app may consume, and stop it if it will not stop itself.

![Runtime controls for a running app](/guide/images/06-runtime-controls.png)

**Screenshot 6.7 — Runtime controls.** A panel with sliders or numeric fields for memory
limit, message rate limit, and storage quota, an **Apply limits** button, and a red
**Force quit** button. A note reads "Rate and storage changes apply immediately. Memory
changes apply the next time the app launches."

**Force quit** kills the app immediately, even if it is stuck in a loop. The host does not
need to be restarted and other functions keep running.

> **⚠️ Works, with limits — watchdog tuning on low-end devices.** The automatic watchdog
> that detects a runaway app has not been tuned on slow hardware and may occasionally stop
> an app that was merely being slow. Tracked as **H11** in
> [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## Next

Talk to people: [Chapter 7 — Messaging](07-messaging.md).
