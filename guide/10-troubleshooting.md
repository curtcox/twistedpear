# 10. Troubleshooting

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Symptoms first. Each entry says what you would see, what it usually means, and what to do.

## Start here: the status panel

Almost every question is answered by one screen.

![The node status panel annotated](/guide/images/10-status-annotated.png)

**Screenshot 10.1 — Node status, annotated.** The _Node status_ panel with callout labels
pointing at each field: worklet state, link state, crypto provider, announces seen,
interfaces online, identity, persisted flag, and enabled roles. Each callout has a
one-line explanation of what "healthy" looks like for that field.

A healthy host shows the worklet ready, at least one interface online, and the announce
counter climbing over time.

## "The announce browser is empty"

**Almost always: no working interface.**

1. Open **Settings → Interfaces**. At least one row must show a green connected state.
2. If **Local network** is on and you are on Wi-Fi, wait a full minute — discovery is not
   instant.
3. If nothing appears, you probably have no peers to find. This is the normal state of a
   fresh install; see [Chapter 4](04-joining-a-network.md). Connect to a node someone runs,
   or start a second host on another device on the same Wi-Fi to prove the software works.

**On an iPhone:** automatic discovery of standard Reticulum peers does not work without an
Apple entitlement that has not been granted. Use a manually configured gateway.
See [Chapter 2](02-installing-a-host.md).

**Corporate, campus, or guest Wi-Fi** frequently blocks device-to-device traffic. Test on a
home network before concluding anything is broken.

## "The catalog is empty"

The catalog only contains what your peers have announced. If the announce browser is also
empty, fix that first — it is the same problem. If you have peers but no apps, none of them
publish any; install from an identifier someone sends you instead
([Chapter 5](05-finding-and-installing-apps.md)).

## "An identifier will not resolve"

Your host has not heard an announce telling it where those bytes live, and it cannot go
and ask. Stay connected to a peer that carries the app, or ask the sender to announce it
while you are online. This is a known gap; see
[Appendix: feature status](appendix-feature-status.md).

## "An install is stuck"

![A stalled transfer](/guide/images/10-stalled-transfer.png)

**Screenshot 10.2 — A stalled transfer.** An install card showing a progress bar frozen at
part-completion, a rate readout of "0 B/s", the interface name, and a **Cancel** button.

Check which interface it is using. Over Bluetooth or LoRa, slow is normal — check the rate
readout rather than the bar. Over LoRa specifically, anything above 64 KiB is refused
outright and will say so. If the rate is genuinely zero, cancel and check the link.

## "A message failed to send"

| Indicator                 | Meaning                                                   | Do                                                         |
| ------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| "no route"                | Your host does not know how to reach that address at all. | Confirm the address; confirm you have peers.               |
| "held for delivery"       | The peer is offline; a propagation server has it.         | Nothing — it arrives when they return.                     |
| "failed" after being held | No propagation server was reachable.                      | See [Chapter 7](07-messaging.md). Somebody has to run one. |

If messages to one specific person always fail while others work, the address is wrong or
that person's host is not running.

## "An app is frozen or eating the machine"

Open **Runtime controls** and press **Force quit**. It stops immediately without
restarting the host. If it happens repeatedly with the same app, revoke its capabilities in
**Grants** before launching it again, and consider whether you trust the publisher.

## "The app disappeared after an update"

Use **Rollback** on the app's card. The previous version and its data are kept.

## "My phone stopped receiving anything while the screen was off"

**On iOS this is expected.** The system suspends the app; the host shows "node suspended by
iOS" when you return. Messages sent meanwhile arrive if a propagation server held them.

**On Android**, check that the persistent notification is still present. If it is gone, the
system killed the service — usually a manufacturer battery manager. Exempt TwistedPear
from battery optimisation in the system settings.

## "The browser tab lost everything"

Browser storage is evictable. Clearing site data, private browsing, or aggressive storage
pressure destroys the identity and every installed app in that tab, unrecoverably. If this
matters, use a desktop or phone host as your primary. See
[Chapter 3](03-first-run-and-identity.md).

## Getting a diagnostic report

The Handbook's **Diagnostics** section runs every capability probe on your actual device
and produces a report you can share with someone helping you.

![The diagnostics report](/guide/images/10-diagnostics.png)

**Screenshot 10.3 — Handbook diagnostics.** The Handbook open at the diagnostics view: a
list of probe cards, most green with measured values, two grey and labelled "device-gated"
with an explanation, one amber labelled "not granted". An **Export report** button at the
top produces a shareable identifier.

Probes marked **device-gated** are not failures — they need hardware you do not have
attached, such as a second phone or a LoRa radio. Probes marked **not granted** mean you
withheld a capability; that is your setting working correctly.

## Reporting a problem

Open an issue at [github.com/curtcox/twistedpear](https://github.com/curtcox/twistedpear/issues).
Include your host type and version, the status panel contents, and an exported diagnostics
report if you can. Check
[Appendix: feature status](appendix-feature-status.md) first — it may already be a known
gap rather than a bug.

## Next

The full list of what is not finished:
[Appendix: feature status](appendix-feature-status.md).
