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

| Question                                                                                    | Answer                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Which `device:*` capabilities exist, per host, with implementation/testing/validation state | [Platform capabilities status](platform-capabilities-status.md) — the per-capability matrix is generated against the registry and is the source of truth                                         |
| Which device classes exist and what tiers/consent class/ladder each declares                | [`specs/spec-device/registry/device-classes.json`](../specs/spec-device/registry/device-classes.json)                                                                                            |
| Normative behaviour                                                                         | [SPEC-DEVICE](../specs/spec-device/spec.md), with vectors under [`specs/spec-device/`](../specs/spec-device/) and recorded tapes under [`specs/spec-device/tapes/`](../specs/spec-device/tapes/) |
| How to add a class                                                                          | [Add a device class (runbook)](device-class-runbook.md)                                                                                                                                          |
| Per-class reference (role, tiers, data flow, bandwidth, ladder)                             | [Device class reference](device-classes/README.md)                                                                                                                                               |
| Realtime audio/video between peers, built on these classes                                  | [Realtime peer media](realtime-media.md)                                                                                                                                                         |

## Architecture

```
   mini-app (granted)                        host chrome / settings
        │ device.*  (control: open/close/configure — brokered RPC)
        │ device stream handle (data: samples — sidecar channel)
        ▼                                            ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                         Device Manager                            │
 │  • device-class registry + per-host inventory & availability      │
 │  • arbitration lock (shared with relay Interface Manager)         │
 │  • session lifecycle, tier enforcement, rate & duty-cycle caps    │
 │  • active-use indicators, attribution, audit log                  │
 └───┬──────────────────┬───────────────────┬───────────────────┬────┘
     │                  │                   │                   │
     ▼                  ▼                   ▼                   ▼
 ┌────────┐      ┌─────────────┐    ┌──────────────┐   ┌───────────────┐
 │ Drivers│      │ Processors  │    │ Stream        │   │ Remote        │
 │(effects│      │(host-side:  │    │ Admission     │   │ Acquisition   │
 │adapters│      │ STT, QR,    │    │ + Degradation │   │ (peer asks    │
 │ per    │      │ vision,     │    │ ladder        │   │  for a device │
 │ host)  │      │ geofence,   │    │               │   │  on this host)│
 └───┬────┘      │ TTS, VAD)   │    └───────┬───────┘   └───────┬───────┘
     │           └──────┬──────┘            │                   │
  hardware              │                   ▼                   ▼
                        │        ┌──────────────────────────────────┐
                        └───────►│ transport plane selection         │
                                 │ WebRTC/direct · Pears bulk ·      │
                                 │ Reticulum link · LXMF · CAS store │
                                 └──────────────────────────────────┘
```

The Device Manager is the single owner of which devices exist, who is using them, at what
tier, at what rate, and for how long. Plane binding for peer streams is completed in
[realtime peer media](realtime-media.md).

## Shipped shape

The registry is the only growth mechanism: a class is added by a registry entry plus a
driver, and generates its own capability ids. No new SDK method or broker namespace is
needed per class.

| Layer                                                             | Where                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device-class registry and generated capability ids                | [`device-classes.json`](../specs/spec-device/registry/device-classes.json) → [`device-registry.gen.ts`](../packages/protocol/src/device-registry.gen.ts), [`device-capabilities.gen.ts`](../packages/miniapp-runtime/src/device-capabilities.gen.ts) (`npm run generate:device-registry`) |
| Session lifecycle, admission, and adaptation (Sans-IO)            | [`device-session.ts`](../packages/protocol/src/device-session.ts), [`device-admission.ts`](../packages/protocol/src/device-admission.ts)                                                                                                                                                  |
| Host-side derived processing and quantization                     | [`device-processors.ts`](../packages/protocol/src/device-processors.ts), [`device-quantize.ts`](../packages/protocol/src/device-quantize.ts)                                                                                                                                              |
| Sidecar frame codec (`TPD1`/`TPD2`), never the broker             | [`device-stream-framing.ts`](../packages/protocol/src/device-stream-framing.ts)                                                                                                                                                                                                           |
| Remote acquisition and outbound sharing grants                    | [`device-remote.ts`](../packages/protocol/src/device-remote.ts), [`device-share.ts`](../packages/protocol/src/device-share.ts)                                                                                                                                                            |
| Actuator safety caps, NFC APDU policy, fingerprinting mitigations | [`device-actuator-safety.ts`](../packages/protocol/src/device-actuator-safety.ts), [`device-nfc-apdu.ts`](../packages/protocol/src/device-nfc-apdu.ts), [`device-fingerprint.ts`](../packages/protocol/src/device-fingerprint.ts)                                                         |
| Broker service and SDK namespace                                  | [`services/device.ts`](../packages/miniapp-runtime/src/services/device.ts), [`sdk/device.ts`](../packages/miniapp-sdk/src/device.ts)                                                                                                                                                      |
| Preview surfaces the app cannot read from                         | `camera-preview`, `audio-meter`, `waveform`, `remote-video` in [`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts)                                                                                                                                                             |

## Session API

One shape for every class, present and future:

```ts
device.inventory(): Promise<ReadonlyArray<DeviceDescriptor>>;
device.diagnostics(): Promise<ReadonlyArray<DeviceDiagnostic>>;

device.open(request: DeviceOpenRequest): Promise<DeviceSession>;
device.close(session: DeviceSession): Promise<void>;
device.configure(session: DeviceSession, patch: DeviceOptionsPatch): Promise<void>;

device.read(session: DeviceSession): Promise<DeviceSample>;
device.subscribe(session: DeviceSession): AsyncIterable<DeviceSample>;
device.stream(session: DeviceSession, to: PeerHandle,
              constraints?: StreamConstraints): Promise<StreamHandle>;

device.write(session: DeviceSession, command: DeviceCommand): Promise<void>;
```

`DeviceSession` is an opaque host-issued handle — no OS handle, path, or device id crosses
into the sandbox. Sessions are app-scoped, TTL-bounded, and revoked on app suspend, grant
revocation, or host policy change. Preview surfaces (`camera-preview`, `audio-meter`,
`waveform`, `map-preview`, `remote-video`) let an app lay out live device output the host
draws but the sandbox cannot read back.

Capability ids are generated as `device:<class>` for the default tier and
`device:<class>:<tier>` for elevated tiers. Two cross-cutting capabilities ship:
`device:stream` (stream any held device to a peer — never implied by a device grant alone)
and `device:remote` (request a device on a peer's host; serving side is host-owned policy).

## Data path

Control (`open`, `close`, `configure`, `read`, low-rate `subscribe`) stays on the existing
broker — capability-checked, audited, rate-limited. Sample data uses a **device stream
sidecar** established only after the broker authorizes a session: compact binary framing
(`TPD1`/`TPD2`), transferable buffers where available, bounded queues with explicit
drop-oldest backpressure. The sidecar exists only for one authorized session, carries no
control messages, and is closed unilaterally by the host.

## Remote acquisition

A peer opening a device on this host is off by default until the user enables it. Grants are
per-peer, per-class, per-tier, TTL-bounded, revocable, and do not survive restart.
`sensitive` classes require confirmation every session with the peer's verified label; the
requesting app's `device:remote` capability governs only its side. Rate, duration, and
concurrency caps are enforced by the serving host; acquired devices cannot be re-streamed to
a third peer.

## Actuator safety

Driver-level caps the app cannot reach: torch/screen strobe rate below photosensitive-epilepsy
thresholds; speaker volume ceiling and no ultrasonic emission from the `play` tier;
haptics duty-cycle cap; TTS bounded text length and rate; NFC write confirmed with payload
shown; all actuators stop on session end, app suspend, and host focus loss.

## Honest limits

Capability taxonomy, broker path, session machine, and simulated drivers are broad;
**real OS drivers and host Devices chrome are not uniformly present**, and most classes
read `partial` in the capability matrix rather than `full`. Do not read the existence of
a capability id as evidence that a host can drive the hardware behind it — read the
[matrix](platform-capabilities-status.md) row, and [LIMITATIONS.md](../LIMITATIONS.md)
for what is deliberately not offered.
