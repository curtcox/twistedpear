# iOS Submission Dossier


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Status: Phase 5 deliverable; App Store/TestFlight submission is out of scope.

## App Review 3.3.2 Argument

TwistedPear mini-apps are data packages rendered by the host. The installed package
contains declarative widget trees and messages to a deny-by-default broker; the host owns
native UI, native APIs, permissions, networking pipes, storage mediation, and lifecycle.
The store-posture variant compiles out open catalog install and dev side-loading, shipping
only curated bundled mini-app packages that still pass the normal verifier.

## Privacy Manifest Baseline

`apps/harness-mobile/app.config.js` generates `PrivacyInfo.xcprivacy` at prebuild with:

- no tracking,
- no collected data types declared at this phase,
- required-reason API declarations for file timestamps and user defaults.

This must be re-audited before a real submission against the final Expo SDK and native
dependency graph.

## Permission Rationale

| Permission / key | Rationale |
|---|---|
| `NSLocalNetworkUsageDescription` | Discover nearby Reticulum peers and desktop seeders |
| `NSBonjourServices` `_reticulum._udp` | Entitlement-exempt LAN discovery fallback |
| `NSBluetoothAlwaysUsageDescription` | BLE peer transport and BLE RNode connection |
| Bluetooth background modes | Maintain established BLE peer/RNode links when iOS permits |
| Background fetch/processing | Opportunistic LXMF propagation sync, not always-on routing |
| Multicast entitlement | Reticulum AutoInterface compatibility with Python RNS peers |

## Export Compliance

The app uses standard cryptographic algorithms for authentication, key exchange, and
encrypted Reticulum payloads. The baseline Info.plist posture is
`ITSAppUsesNonExemptEncryption=false`; confirm before submission if distribution scope or
cryptographic use changes.

## Review Notes Draft

The iOS store variant is a peer-to-peer messaging and mini-app host. Mini-app packages are
verified, declarative, capability-gated content; they cannot load native modules or bypass
the host renderer. Open developer distribution features are disabled in this variant.
