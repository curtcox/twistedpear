# Reticulum optical interface

<!-- tp-doc
lifecycle: reference
audited: 2026-08-05
register: none
-->

The optical `PacketInterface` carries encrypted Reticulum packets from a screen to a
camera. The host owns QR/color-code rendering, camera permission, and decoding; decoded
frames never enter a mini-app.

## Framing

`OpticalInterface` HDLC-frames a packet, then `sliceForDisplay` emits systematic source
frames followed by one XOR repair frame. Every optical frame contains the `TO` marker,
source or repair index, source count, encoded length, a content-derived transfer id, and
up to 192 payload bytes. Frames may arrive out of order. The repair frame reconstructs
any one missing source frame without a back-channel.

This deliberately small erasure code is the v1 resolution of the plan's fountain-code
question: it is deterministic, dependency-free, and sufficient for the conservative
250-byte MTU. A later code can add more repair symbols under a new framing version.

## Host boundary and policy

- `OpticalChannel.display()` renders encoded frames; `setReceiver()` supplies frames
  already decoded from camera images.
- `tx`, `rx`, and `both` map to the interface's `outgoing` and `incoming` gates.
- Default MTU is 250 bytes and default policy bitrate is 1,000 bps.
- Camera/screen drivers are injected through `InterfaceEffectFactories`; a host without
  one reports `unsupported`. The interface is disabled by default.

## Verification

`packages/reticulum-interfaces/test/optical-interface.test.ts` covers HDLC packet
round-trip, out-of-order delivery, one-frame erasure recovery, direction gates, and
lifecycle. Golden framing is pinned in `specs/spec-media/vectors/relay-interfaces.json`.

Physical camera-to-screen evidence remains hardware-gated in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md).
