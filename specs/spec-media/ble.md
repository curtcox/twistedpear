# SPEC-MEDIA / BLE profile (TwistedPear-defined)


<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** A directory, but **TwistedPear-authored** framing · **Status:** normative
(profile) for the framing layer; **physical layer gated on hardware evidence** ·
Medium: Bluetooth Low Energy

BLE is not an upstream RNS interface; TwistedPear defines the fragmentation/reassembly
framing ([docs/ble-interface.md](../../docs/ble-interface.md)). The framing is
machine-checked over simulated pipes; the radio/physical layer remains gated on
hardware evidence ([STATUS-HARDWARE.md](../../STATUS-HARDWARE.md)).

## 1. Upstream pin

| Source | Version | Role |
|---|---|---|
| [docs/ble-interface.md](../../docs/ble-interface.md) | this tree | Framing definition (TwistedPear-authored) |

## 2. Subset

Framing and link behavior are pinned over simulated pipes; physical transport is not.

| Feature | TwistedPear use | Pinned by |
|---|---|---|
| Single-frame message round-trip | Small-payload carriage | `packages/reticulum-interfaces` `ble-framing.test.ts` ("round-trips a single-frame message") |
| Fragmentation + reassembly | MTU-bounded payloads | `ble-framing.test.ts` ("reassembles fragmented messages") |
| Sequence-gap recovery | Loss resilience | `ble-framing.test.ts` ("recovers after a sequence gap") |
| Link establishment + packet echo | End-to-end over simulated BLE pipe | `ble-interop.test.ts` ("establishes a link and echoes packets") |
| Resource transfer | Bulk carriage | `ble-interop.test.ts` ("transfers a resource over a link") |
| LXMF exchange | Message carriage | `ble-interop.test.ts` ("exchanges LXMF messages between two peers") |
| Mid-transfer disconnect/reconnect | Reconnection | `ble-interop.test.ts` ("recovers after a mid-transfer disconnect and reconnect") |

## 3. Extensions

The entire BLE framing is a TwistedPear-defined carrier (GATT fragmentation +
reassembly + sequencing). Publication plan in
[docs/upstream-publication.md](../../docs/upstream-publication.md).

## 4. Deviations

Not applicable — no upstream RNS BLE interface.

## 5. Evidence

- `ble-framing.test.ts`, `ble-interop.test.ts` in
  [packages/reticulum-interfaces/test](../../packages/reticulum-interfaces/test/)
  (default `vitest` run, over simulated pipes).
- **Physical-layer claims** (real radios, real MTU/pacing on hardware) remain gated on
  [STATUS-HARDWARE.md](../../STATUS-HARDWARE.md) — the simulated-pipe evidence above
  does not certify on-air behavior.
