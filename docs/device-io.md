# Device I/O — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-02
register: software
counterpart: docs/device-io-plan.md
-->

**This document describes what is built today.** The design intent, the phase
breakdown, and the questions still open are in the
[Device I/O plan](device-io-plan.md); that document does not describe current
behaviour and does not override this one.

## Where the authoritative status lives

| Question | Answer |
|---|---|
| Which `device:*` capabilities exist, per host, with implementation/testing/validation state | [Platform capabilities status](platform-capabilities-status.md) — the per-capability matrix is generated against the registry and is the source of truth |
| Which device classes exist and what tiers/consent class/ladder each declares | [`specs/spec-device/registry/device-classes.json`](../specs/spec-device/registry/device-classes.json) |
| Normative behaviour | [SPEC-DEVICE](../specs/spec-device/spec.md), with vectors under [`specs/spec-device/`](../specs/spec-device/) and recorded tapes under [`specs/spec-device/tapes/`](../specs/spec-device/tapes/) |
| How to add a class | [Add a device class (runbook)](device-class-runbook.md) |
| Realtime audio/video between peers, built on these classes | [Realtime peer media](realtime-media.md) |

## Shipped shape

The registry is the only growth mechanism: a class is added by a registry entry plus a
driver, and generates its own capability ids. No new SDK method or broker namespace is
needed per class.

| Layer | Where |
|---|---|
| Device-class registry and generated capability ids | [`device-classes.json`](../specs/spec-device/registry/device-classes.json) → [`device-registry.gen.ts`](../packages/protocol/src/device-registry.gen.ts), [`device-capabilities.gen.ts`](../packages/miniapp-runtime/src/device-capabilities.gen.ts) (`npm run generate:device-registry`) |
| Session lifecycle, admission, and adaptation (Sans-IO) | [`device-session.ts`](../packages/protocol/src/device-session.ts), [`device-admission.ts`](../packages/protocol/src/device-admission.ts) |
| Host-side derived processing and quantization | [`device-processors.ts`](../packages/protocol/src/device-processors.ts), [`device-quantize.ts`](../packages/protocol/src/device-quantize.ts) |
| Sidecar frame codec (`TPD1`/`TPD2`), never the broker | [`device-stream-framing.ts`](../packages/protocol/src/device-stream-framing.ts) |
| Remote acquisition and outbound sharing grants | [`device-remote.ts`](../packages/protocol/src/device-remote.ts), [`device-share.ts`](../packages/protocol/src/device-share.ts) |
| Actuator safety caps, NFC APDU policy, fingerprinting mitigations | [`device-actuator-safety.ts`](../packages/protocol/src/device-actuator-safety.ts), [`device-nfc-apdu.ts`](../packages/protocol/src/device-nfc-apdu.ts), [`device-fingerprint.ts`](../packages/protocol/src/device-fingerprint.ts) |
| Broker service and SDK namespace | [`services/device.ts`](../packages/miniapp-runtime/src/services/device.ts), [`sdk/device.ts`](../packages/miniapp-sdk/src/device.ts) |
| Preview surfaces the app cannot read from | `camera-preview`, `audio-meter`, `waveform`, `remote-video` in [`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts) |

## Honest limits

Capability taxonomy, broker path, session machine, and simulated drivers are broad;
**real OS drivers and host Devices chrome are not uniformly present**, and most classes
read `partial` in the capability matrix rather than `full`. Do not read the existence of
a capability id as evidence that a host can drive the hardware behind it — read the
[matrix](platform-capabilities-status.md) row, and [LIMITATIONS.md](../LIMITATIONS.md)
for what is deliberately not offered.
