# Reticulum relay and configurable interfaces — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: software
counterpart: docs/relay-interfaces-plan.md
-->

**This document describes what is built today.** Remaining physical-device and live-service
evidence is tracked in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md). The paired
[relay plan](relay-interfaces-plan.md) retains those external validation gates; it does
not override current behaviour.

## Interface manager and configuration

[`InterfaceManager`](../packages/host-core/src/interface-manager.ts) owns the ten
configurable kinds: TCP, WebSocket, Auto/WiFi, I2P, RNode, Bluetooth, optical, acoustic,
ntfy, and Freenet. It validates configuration, starts/stops/replaces changed interfaces,
tracks server-spawned TCP/WS clients, persists successful hot changes, reports diagnostics
and counters, and accepts host-owned BLE/camera/audio effect factories.

Every entry has an independent `tx`, `rx`, or `both` direction and a relay-participation
flag. The packet-interface base enforces both direction gates and counts encoded bytes
accepted and written. Defaults leave relay mode `off` and physical/push interfaces
disabled.

| New kind | Live implementation | Reference |
|---|---|---|
| `optical` | HDLC plus sequenced systematic frames and one-frame XOR erasure recovery; host-owned display/camera channel | [Optical interface](optical-interface.md) |
| `acoustic` | HDLC plus TPA1 session/chunk parity and three-way bit-majority FEC; host-owned audio-modem channel | [Acoustic interface](acoustic-interface.md) |
| `ntfy` | XChaCha20-Poly1305 packet envelope over HTTP publish and NDJSON polling | [ntfy interface](ntfy-interface.md) |

Outbound priorities and conservative bitrate defaults are in
[`policy.ts`](../packages/reticulum-interfaces/src/policy.ts).

## Relay behavior

- `off` keeps interfaces available for the device's own traffic but uses leaf behavior.
- `transport-node` hot-enables the existing Reticulum transport node, including packet,
  announce, path, and link forwarding. Disabling it delegates back to leaf behavior without
  recreating Reticulum.
- `bridge` uses [`BridgeForwarder`](../packages/host-core/src/bridge-forwarder.ts) with an
  invariant packet-hash loop key, hop decrement, direction gates, an allow matrix, and an
  independent token bucket per source/destination kind pair. Interfaces added while bridge
  mode is active are attached immediately.

## Mini-app API and safety

The SDK exports `relay.list`, `status`, `diagnostics`, `setMode`, `enable`, `disable`,
`setDirection`, `configure`, and `setPolicy`. Reads require `relay:read`; mutations require
the high-impact `relay:configure` grant, whose install text names radios, camera,
microphone, speaker, internet push, and forwarding other people's traffic.

Mutation payloads and every nested policy cell are allow-list validated. Calls use the
broker's per-app rate limit and audit sink. Successful app mutations emit an attribution
notice; desktop and native Settings show a persistent dismissible notice naming the app
and operation. Unsupported host operations fail with `RELAY_UNSUPPORTED`, and a host that
does not inject a service fails with `RELAY_UNCONFIGURED`.

## Host surfaces

- `tp node` uses the full manager, persists `<dataDir>/config.json`, exposes the interface
  table at `/status`, and accepts repeated `--enable`/`--disable`, `--relay-mode`,
  `--direction`, ntfy, RNode, and I2P flags.
- Desktop and native worklets hot-toggle real transport/bridge behavior and supported TCP,
  Auto, BLE, and RNode directions. Settings mirrors app-driven changes and lists all ten
  kinds with online state, direction, bitrate, byte counters, or `unsupported`.
- Browser hosts remain leaf-only by invariant. Web Settings lists the ten kinds and directs
  relay configuration to the gateway; `relay:*` is intentionally `n/a` on web.

Desktop/Android/iOS capability cells remain `partial` because their shipping worklet
control plane does not instantiate every optional interface effect. Node is `done`.
The [capability matrix](platform-capabilities-status.md) is the authoritative per-host claim.

## Conformance

The normative direction, mode, policy, optical, acoustic, and ntfy profile is
[`SPEC-MEDIA relay`](../specs/spec-media/relay.md), with golden vectors in
[`relay-interfaces.json`](../specs/spec-media/vectors/relay-interfaces.json). Focused tests
cover adapter round-trips and corruption, direction gates, manager hot reload and
persistence, bridge forwarding/loops/policy/dynamic interfaces, broker authorization and
validation, CLI flags, and transport hot toggling.

Real camera/screen, speaker/microphone, BLE/LoRa, and ntfy-service trials are external
evidence gates in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md); they do not change the
software behavior described here.
