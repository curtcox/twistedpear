# Appendix: feature status

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Every feature this guide marks as incomplete, in one place. This appendix is a reading
aid; the authoritative registers are [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md),
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md), and [LIMITATIONS.md](../LIMITATIONS.md).
Where those disagree with this page, they win.

Last reviewed against the registers: **2026-07-21**.

## ⏳ Not yet available

You cannot use these today.

| Feature | Where it appears | Blocker | Tracked as |
|---|---|---|---|
| Signed, downloadable installers | [2](02-installing-a-host.md) | Nothing is published, notarized, or verified on Windows; every install is built from source. | H17, [release plan](../RELEASE-PLAN.md) |
| Google Play listing | [2](02-installing-a-host.md) | Not submitted. Play policy on downloaded code makes direct APK and F-Droid the planned channels. | [LIMITATIONS §5](../LIMITATIONS.md) |
| App Store listing | [2](02-installing-a-host.md) | No submission attempted; App Review 3.3.2 exposure is unresolved. | [docs/ios-submission.md](../docs/ios-submission.md) |
| iPhone local-network discovery | [2](02-installing-a-host.md), [4](04-joining-a-network.md) | Apple multicast entitlement not filed; needs a paid developer account. | H12, [docs/ios-multicast-entitlement.md](../docs/ios-multicast-entitlement.md) |
| A public network to join | [4](04-joining-a-network.md) | No bundled peer list, no bootstrap node, no public network exists. | — |
| Bluetooth verified between real phones | [4](04-joining-a-network.md) | Never run on two physical handsets; throughput and background behaviour unmeasured. | H2, H7, H9, H14 |
| LoRa verified on real radios | [4](04-joining-a-network.md) | Implemented against simulated serial only. | H4, H8, H16, H19 |
| Guided identity backup | [3](03-first-run-and-identity.md) | No export flow, no recovery phrase, no passphrase; the key file is unencrypted. | [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) |
| Linked devices / multi-device identity | [3](03-first-run-and-identity.md) | No design shipped for sharing one identity across hosts. | — |
| App search and discovery | [5](05-finding-and-installing-apps.md) | No central registry by design; your catalog is only what peers announce. | [LIMITATIONS §7](../LIMITATIONS.md) |
| Multiple apps at once; background apps | [6](06-using-apps.md) | v1 runs one foreground mini-app, by design. | [LIMITATIONS §7](../LIMITATIONS.md) |
| Large messages via propagation | [7](07-messaging.md) | Multi-part propagated transfer is not implemented. | [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) |
| Blocking, muting, reporting | [7](07-messaging.md) | Protocol mechanisms exist; no UI. | — |
| Group chat, attachments, history sync | [7](07-messaging.md) | Not in v1 scope. | — |
| Screenshots in this guide | everywhere | Supplied in a separate pass. | [images/README.md](images/README.md) |

## ⚠️ Works, with limits

You can use these, but not the way the surrounding text might suggest.

| Feature | Limit | Where it appears | Tracked as |
|---|---|---|---|
| Windows desktop host | Built in CI, never installed or exercised on Windows. | [2](02-installing-a-host.md) | H17 |
| Android host | It is the `harness-mobile` developer build, not a consumer app. | [2](02-installing-a-host.md) | — |
| Local network discovery | Verified in containers and emulators; never on a real multi-machine LAN. | [4](04-joining-a-network.md) | H15, H18 |
| QR scanning | Mobile only; desktop displays codes but accepts pasted strings. | [3](03-first-run-and-identity.md) | [LIMITATIONS §7](../LIMITATIONS.md) |
| Installing from an identifier | Resolves only if an announce for those bytes was already received. | [5](05-finding-and-installing-apps.md) | [LIMITATIONS §7](../LIMITATIONS.md) |
| Runaway-app watchdog | Untuned on low-end hardware; may stop merely slow apps. | [6](06-using-apps.md) | H11 |
| Propagation servers | Sync with clients, but do not peer with each other. Use `lxmd` for meshed stores. | [7](07-messaging.md) | [docs/propagation-node.md](../docs/propagation-node.md) |
| Sandbox hardening on phones | Hostile-app suite passes on desktop and emulators, not on real Android hardware. | [8](08-trust-privacy-safety.md) | H11 |
| Browser sandbox | Rests on browser isolation rather than OS processes — a weaker boundary. | [8](08-trust-privacy-safety.md) | [LIMITATIONS §8](../LIMITATIONS.md) |
| Browser identity and storage | IndexedDB, no hardware keystore, evictable by the browser. | [3](03-first-run-and-identity.md), [8](08-trust-privacy-safety.md) | [LIMITATIONS §8](../LIMITATIONS.md) |
| Bandwidth cap | Reported and used by transfer budgets; not a hard ceiling everywhere. | [9](09-managing-your-device.md) | [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) |
| Battery figures | Design targets, not device measurements. | [9](09-managing-your-device.md) | H3, H11, H13 |
| Long unattended runs | Full-duration soaks are open; the longest proven run is hours, not weeks. | [9](09-managing-your-device.md) | H20, `RQ-*` rows |

## Permanent trade-offs

These are not going to change; they follow from the design. They are documented in full in
[LIMITATIONS.md](../LIMITATIONS.md).

- **No anonymity.** Contents are encrypted; your local radio presence is observable.
- **No moderation.** No review, no takedown, no central authority. Capability grants and
  publisher trust are the defence.
- **Radio links are slow.** Bluetooth is tens of kilobits per second; LoRa is hundreds of
  bits. Messages fit; large downloads do not.
- **Browsers can never be full peers.** No inbound connections means no relaying, no
  seeding, no holding messages for others — ever, on that target.
- **Mini-apps are not native apps.** No native modules, no arbitrary hardware, no
  background autonomy.
