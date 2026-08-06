# iOS multicast entitlement application (Phase 2 M8)

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Submit this with the harness app bundle ID before Phase 5 iOS interface work begins.
Apple review lead time is unpredictable; file early.

## Application metadata

| Field       | Value                                              |
| ----------- | -------------------------------------------------- |
| Bundle ID   | `network.twistedpear.harness`                      |
| Entitlement | `com.apple.developer.networking.multicast`         |
| Platform    | iOS (simulator build first; device after approval) |

## Use case summary (for Apple)

TwistedPear Harness is a developer tool for the Reticulum mesh networking stack.
Reticulum discovers peers on the local network using **IPv6 link-local multicast**
(AutoInterface), matching the open Reticulum reference implementation.

The harness hosts a JavaScript Reticulum node in a Bare worklet. On iOS, a native
bridge joins the derived multicast group on the active Wi‑Fi/Ethernet interface so
the TS AutoInterface can discover nearby peers without manual IP configuration.

Multicast is used only for **local peer discovery** on link-local addresses
(`fe80::/10`). Application data is sent over unicast UDP after peering completes.
No wide-area multicast, no cross-subnet discovery, and no tracking of non-peer
traffic.

## User-visible behavior

- User enables **AutoInterface** in the harness settings.
- The app requests local network permission (Bonjour/mDNS companion flow if needed).
- Discovered peers appear in the announce browser; the user can inspect mesh
  connectivity while developing Reticulum mini-apps.

## Fallback if entitlement is denied

Document outcome in [LIMITATIONS.md](../LIMITATIONS.md) §4 and implement in Phase 5:

- **Bonjour** (`_reticulum._udp`) for discovery
- Unicast UDP for data (same ports as AutoInterface data plane)
- No change to Reticulum wire format

## Simulator build check

```bash
cd apps/harness-mobile
npm run ios
```

The worklet TCP slice should boot on the iOS simulator (no multicast bridge required
for that smoke test). Multicast entitlement is only needed for on-device AutoInterface.

## App Store 3.3.2 posture (draft)

Phase 4 mini-apps are sandboxed JS bundles loaded by the host. For entitlement review,
position the harness as a **developer networking diagnostic tool**, not a general
code-download storefront. Full 3.3.2 language belongs in Phase 5 host submission.
