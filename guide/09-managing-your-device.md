# 9. Managing your device

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Being a peer costs storage, bandwidth, and — on a phone — battery. All of it is visible
and all of it is adjustable.

## Where your storage goes

![The storage panel](/guide/images/09-storage.png)

**Screenshot 9.1 — Settings → Storage.** A panel with a stacked usage bar broken into
segments: "Installed apps", "App data", "Seeded packages", "Held messages", and "Free".
Beneath it, a table of the same figures in MiB, and a **Clear seeded packages** action
with an explanatory note that it only removes copies held for other people.

Three of those segments are yours and one is not:

- **Installed apps** and **app data** are what you use. Removing an app frees both.
- **Seeded packages** are copies your host keeps so *other people* can install apps
  quickly from you. Clearing them is always safe; they come back if you leave seeding on.
- **Held messages** are messages you are holding for people who are offline, if you turned
  the propagation server role on.

Default caps, changeable in settings:

| What | Default cap |
|---|---|
| Seeded packages | 2 GiB |
| Held messages | 256 MiB, or 10,000 messages |
| Bandwidth | 512 KiB/s |

The bandwidth cap is a hard, zero-burst ceiling in each direction. Reticulum interfaces,
forwarded packets, Hyperdrive replication, and gateway bulk fetches share the host's
allowance. Transfer budget rules can reject an unsuitable path before this rate limiter is
needed. Long-duration battery and quota soaks remain separate evidence work.

## Roles: what your host does for others

![The roles settings panel](/guide/images/09-roles.png)

**Screenshot 9.2 — Settings → Roles.** Three toggle rows, each with a one-line
explanation and a live counter: "Transport node — forward other people's traffic
(*on, 14 routes*)", "Seeder — serve app packages to nearby peers (*on, 6 packages*)",
"Propagation server — hold messages for offline peers (*off*)". A note explains that
phones default all three to off.

Desktops default to transport and seeding on, because that is what makes the network work
for everyone else. Phones default them all off, because they should not spend your battery
relaying strangers' traffic. Both defaults are changeable and neither is wrong.

## Phone battery

Being reachable in the background costs power. The controls that matter:

- **Turn off Bluetooth** when you are not using it. Continuous scanning is the largest
  single cost.
- **Leave transport and seeder roles off** on a phone unless you have a reason.
- **On Android, the persistent notification** is your on/off switch — stopping the node
  from the notification stops all background networking immediately.

![The Android foreground notification](/guide/images/09-android-notification.png)

**Screenshot 9.3 — The Android node notification.** The notification shade showing the
TwistedPear notification: title "TwistedPear node running", body "2 interfaces · 6 peers",
and a **Stop** action button.

> **⚠️ Works, with limits — battery figures are targets, not measurements.** The published
> battery budgets (under 15% per hour with Bluetooth active, under 5% idle) are design
> targets from [docs/battery-bandwidth-policy.md](../docs/battery-bandwidth-policy.md).
> No real device drain measurement has been taken, and aggressive manufacturer battery
> managers have not been tested against. Tracked as **H3**, **H11**, and **H13** in
> [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## Running an always-on peer

If you have a spare computer, a home server, or a small board, running a node on it is the
single most useful thing you can do for the people around you. It keeps a route open, it
serves app downloads, and it can hold messages for anyone who is offline.

```sh
tp node --data-dir ~/.local/share/twistedpear/host
```

Useful additions:

| Flag | Effect |
|---|---|
| `--propagation` | Hold messages for offline peers. |
| `--ws-listen 0.0.0.0:9474` | Let browsers connect through this node. |
| `--serve-web` | Also serve the web host itself from this machine. |
| `--status-endpoint` | Expose a local status page at `http://127.0.0.1:9473/status`. |

![The headless node status output](/guide/images/09-tp-node.png)

**Screenshot 9.4 — `tp node` running in a terminal.** A terminal window showing the
startup output: identity fingerprint, enabled roles, interfaces coming up, and a few
announce lines scrolling past. Next to it, a browser showing the JSON at
`127.0.0.1:9473/status`, pretty-printed.

The status endpoint binds to localhost only and is off unless you ask for it.

> **⚠️ Works, with limits — long unattended runs are unproven.** The longest continuous
> run that has been completed is measured in hours, not weeks. A two-week unattended run
> on a dedicated machine is a release requirement that has not yet been met, and the
> soak tests that would confirm memory and quota behaviour over days are still open.
> Tracked as **H20** and as the `RQ-` rows in
> [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md).

## Next

When something is wrong: [Chapter 10 — Troubleshooting](10-troubleshooting.md).
