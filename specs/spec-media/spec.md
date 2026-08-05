# SPEC-MEDIA — Physical/link media profiles (adopted per medium)


<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** A (adopted) · **Status:** normative (per-medium profiles) · **Migration phase:** 3

## Scope

One profile per transmission medium carrying Reticulum traffic. Web analog:
Ethernet/Wi-Fi beneath IP. Each profile states framing, discovery, MTU and pacing
constraints, and the interop evidence that pins it, using the five-section template in
[SPEC-WIRE](../spec-wire/spec.md).

## Profiles

| Medium | Upstream definition | Profile | Framing status |
|---|---|---|---|
| AutoInterface | RNS AutoInterface (link-local IPv6 + multicast discovery) | [autointerface.md](autointerface.md) | normative |
| WebSocket | TwistedPear-defined framing | [websocket.md](websocket.md) | normative |
| BLE | TwistedPear-defined | [ble.md](ble.md) | normative (framing); physical gated on hardware |
| RNode / LoRa | RNode KISS-style framing | [rnode-lora.md](rnode-lora.md) | normative (framing); LoRa on-air gated on hardware |
| Serial | RNS serial (HDLC) framing | [serial.md](serial.md) | normative (framing); serial line gated on hardware |
| Relay/media policy | TwistedPear-defined | [relay.md](relay.md) | normative; physical media gated on hardware |

Framing and discovery are machine-checked for every medium (each profile's subset rows
cite a pinned vector or interop test). Radio/physical-layer claims for BLE, LoRa, and
the serial line remain gated on hardware evidence
([STATUS-HARDWARE.md](../../STATUS-HARDWARE.md)) and are marked as such in each profile.

## Implementations

- [packages/reticulum-interfaces](../../packages/reticulum-interfaces/) (production)
- Simulator transport-class models (latency/loss/partition per medium)
- Python RNS interfaces (upstream reference, where the medium is upstream-defined)
