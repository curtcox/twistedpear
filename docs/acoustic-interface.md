# Reticulum acoustic interface

<!-- tp-doc
lifecycle: reference
audited: 2026-08-05
register: none
-->

The acoustic `PacketInterface` carries encrypted Reticulum packets between a speaker and
microphone. Audio capture, modulation, playback, and OS permission prompts remain in a
host-owned `AcousticChannel`; PCM never crosses into a mini-app.

## Framing and error correction

`AcousticInterface` first HDLC-frames the packet. It then uses the protocol `TPA1`
session/chunk/parity framing (`framePeerAudioPayload` and `stepPeerAudioAssembly`) and a
three-way per-bit majority repetition code. One corrupted repetition in each encoded byte
is corrected. Session ids prevent late parity frames from contaminating the next packet.

The channel effect modulates the protected frames as FSK/AFSK in the selected audible or
ultrasonic band and returns demodulated frames from microphone capture. The adapter is
independent of platform audio APIs.

## Host boundary and policy

- Default MTU is 128 bytes and default policy bitrate is 500 bps.
- `tx`, `rx`, and `both` independently gate speaker output and microphone input.
- Drivers are injected through `InterfaceEffectFactories`; missing drivers report
  `unsupported`. The interface is disabled by default.

## Verification

`packages/reticulum-interfaces/test/acoustic-interface.test.ts` covers consecutive HDLC
packet round-trips, frame loss, majority correction under simulated corruption,
direction gates, metering, and lifecycle. Golden FEC vectors are in
`specs/spec-media/vectors/relay-interfaces.json`.

Physical speaker-to-microphone and audible/ultrasonic measurements remain hardware-gated
in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).
