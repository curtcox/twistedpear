# Reticulum relay and configurable interfaces — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-02
register: software
counterpart: docs/relay-interfaces-plan.md
-->

**This document describes what is built today.** The design intent, the new interface
adapters still to be written, and the open questions are in the
[relay and configurable interfaces plan](relay-interfaces-plan.md); that document does
not describe current behaviour and does not override this one.

## Where the authoritative status lives

| Question | Answer |
|---|---|
| `relay:configure` / `relay:read` per host, with implementation/testing/validation state | [Platform capabilities status](platform-capabilities-status.md) |
| Which interface kinds a host can actually wire | [Desktop host](desktop-host.md), [web host](web-host.md), [iOS host](ios-host.md) |
| Interface-specific framing and conformance | [BLE interface](ble-interface.md), [WebSocket interface](websocket-interface.md), [Freenet](freenet.md) |

## Interface adapters that exist

Packet interfaces live in [`reticulum-ts/src/interfaces/`](../packages/reticulum-ts/src/interfaces/)
and [`reticulum-interfaces/src/`](../packages/reticulum-interfaces/src/). Implemented
today: TCP, UDP, BLE, RNode/LoRa, I2P, Auto (multicast/mDNS over WiFi LAN), WebSocket,
serial, pipe, Freenet, plus `optical/` and `acoustic/` adapter directories.

Outbound ranking, bitrate, and priority for every kind are in
[`policy.ts`](../packages/reticulum-interfaces/src/policy.ts). Config-driven wiring from a
typed `HostInterfaceConfig` is in [`node-host.ts`](../packages/host-core/src/node-host.ts)
and [`types.ts`](../packages/host-core/src/types.ts).

## Relay capability surface

- Transport-node relay (`transportEnabled` → `TransportNode`, packet and link forwarding)
  in [`reticulum.ts`](../packages/reticulum-ts/src/reticulum.ts).
- Brokered `relay` namespace: [`services/relay.ts`](../packages/miniapp-runtime/src/services/relay.ts)
  and [`sdk/relay.ts`](../packages/miniapp-sdk/src/relay.ts), with a worklet flag plane in
  [`worklet-flag-relay.ts`](../packages/miniapp-runtime/src/services/worklet-flag-relay.ts).
- Verification commands are listed in the capability-status page: `relay.test.ts`,
  `worklet-flag-relay.test.ts`, and `host-relay-device-wiring.test.ts`.

## Honest limits

`relay:*` reads `partial` on desktop, Android, and iOS and `n/a` on web — browser leaves
do not relay. A host may expose the taxonomy and broker path without the service being
injected; that state surfaces as `RELAY_UNCONFIGURED` rather than as a working relay. The
[capability matrix](platform-capabilities-status.md) row is the claim, not this page.
