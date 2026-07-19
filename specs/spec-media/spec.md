# SPEC-MEDIA — Physical/link media profiles (adopted per medium)

**Group:** A (adopted) · **Status:** stub · **Migration phase:** 3

## Scope

One profile per transmission medium carrying Reticulum traffic. Web analog:
Ethernet/Wi-Fi beneath IP. Each profile states framing, discovery, MTU and pacing
constraints, and the interop evidence that pins it.

## Profiles

| Medium | Upstream definition | TwistedPear assets | Profile |
|---|---|---|---|
| AutoInterface | RNS AutoInterface (link-local IPv6 + multicast discovery) | [conformance/auto-interop](../../conformance/auto-interop/) | todo |
| WebSocket | TwistedPear-defined framing | [docs/websocket-interface.md](../../docs/websocket-interface.md) | todo |
| BLE | TwistedPear-defined | [docs/ble-interface.md](../../docs/ble-interface.md) | todo |
| RNode / LoRa | RNode KISS-style framing | [conformance/link-benchmark](../../conformance/link-benchmark/), [conformance/serialport-load](../../conformance/serialport-load/) | todo |
| Serial | RNS serial framing | [conformance/serialport-load](../../conformance/serialport-load/) | todo |

## Implementations

- [packages/reticulum-interfaces](../../packages/reticulum-interfaces/) (production)
- Simulator transport-class models (latency/loss/partition per medium)
- Python RNS interfaces (upstream reference, where the medium is upstream-defined)

## To finish this spec

One profile file per medium in this directory, using the shared template in
[SPEC-WIRE](../spec-wire/spec.md). Media that TwistedPear defines (WebSocket, BLE) get
full framing specs with vectors; adopted media get subset/deviation profiles. BLE/LoRa
physical-layer claims remain gated on hardware evidence
([STATUS-HARDWARE.md](../../STATUS-HARDWARE.md)).
