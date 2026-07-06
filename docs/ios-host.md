# iOS Host Strategy

Status: Phase 5 simulator-first baseline.

## Capability Matrix

| Area | Foreground | Background grace | Suspended | Background task wake |
|---|---|---|---|---|
| TCP client | runs normally | quiesce and close cleanly | stopped | bounded reconnect for sync only |
| AutoInterface multicast | runs when entitlement/device permits | send final state, stop timers | stopped | not promised |
| Bonjour discovery | advertises/browses while foregrounded | best-effort quiesce | stopped | best-effort sync trigger |
| BLE phone pipe | central/peripheral active | existing links may survive briefly | OS-managed only | background modes only |
| RNode | BLE-only on iOS | existing BLE link may survive briefly | OS-managed only | not promised |
| LXMF | local send/receive | persist pending work | store-and-forward only | propagation sync budget |
| Mini-app runtime | one foreground app | suspend message sent | no execution | no mini-app execution |

iOS has no foreground-service equivalent. The host therefore treats backgrounding as a
state transition, not as a hidden daemon mode. On background, the native lifecycle module
enters a grace window and the worklet receives `suspend-node` IPC to quiesce interfaces;
on foreground, `resume-node` restarts them. The harness status screen shows the current
lifecycle state, including an explicit "node suspended by iOS" message.

## Permission Flows

- Local network: `NSLocalNetworkUsageDescription` explains nearby Reticulum discovery.
- Bonjour: `NSBonjourServices` declares `_reticulum._udp`.
- Bluetooth: `NSBluetoothAlwaysUsageDescription` explains peer and RNode byte pipes.
- Background modes: `bluetooth-central`, `bluetooth-peripheral`, `fetch`, and
  `processing` are declared by config plugins. The app does not claim audio/location
  background modes.
- Multicast entitlement: `com.apple.developer.networking.multicast` is present in
  generated entitlements with a default `false` value until H12 filing/signing is done.

## Store Posture

Development builds keep catalog install and `tp dev` parity with Android. Store-posture
builds set `TWISTEDPEAR_STORE_POSTURE=store` before worklet bundling; the worklet refuses
catalog installs, dev side-load, developer mode, and dev-channel connections.

## Simulator Notes

The simulator is useful for worklet boot, TCP/localhost flows, config-plugin output, and
store-posture refusal tests. It does not validate BLE, real background timing, multicast
entitlement enforcement, or realistic LAN discovery. Those exits are tracked in
`PHASE5-HARDWARE.md`.
