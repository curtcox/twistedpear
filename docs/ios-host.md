# iOS Host Strategy


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

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

The simulator is useful for worklet boot, TCP/localhost flows, config-plugin output,
store-posture refusal tests (`conformance/ios-sim/store-posture.mjs`), the Phase 3/4 full
loop (`conformance/ios-sim/full-loop.mjs`), and lifecycle quiesce slices
(`conformance/ios-sim/lifecycle.mjs`). It does not validate BLE, real background timing, multicast
entitlement enforcement, or realistic LAN discovery. Those exits are tracked in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H13–H15).

![iOS handbook mobile validation capture](images/ios-handbook-mobile.png)

2026-07-10 capture: Handbook chapter view with prev/next (`npm run capture:handbook-mobile-ui`). Software-tier validation: `npm run test:handbook-mobile`. Optional simulator UI smoke: `npm run test:ios-sim-handbook-ui` (Maestro + shared `handbook-peer`; set `IOS_SIM_HANDBOOK_UI_BUILD=1` on first run).

### Measured simulator reconnect windows

The lifecycle slice (`conformance/scenarios/bare/lifecycle-slice.mjs`) records TCP
quiesce/reconnect timing against the docker `leaf-echo` peer. Results are written to
`conformance/ios-sim/measured-lifecycle.json` when the peer is reachable.

| Metric | Simulator tier (CI) | Device target (H13) |
|---|---|---|
| Quiesce/reconnect cycles | 10–100 per run | Same procedure on dev build |
| Reconnect p50 | recorded in measured JSON | compare vs simulator |
| Reconnect p95 | recorded in measured JSON | compare vs simulator |
| Background grace duration | not simulated | measured on iPhone |

Regenerate: `IOS_LIFECYCLE_CYCLES=10 node conformance/ios-sim/lifecycle.mjs --require-peer`
(with `docker compose ... leaf-echo` running).
