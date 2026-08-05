# SPEC-MEDIA / Relay and configurable-interface profile

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: none
-->

**Status:** normative · **Scope:** host interface direction, relay modes, policy,
and the TwistedPear optical, acoustic, and ntfy carriers.

## Direction and modes

`tx`, `rx`, and `both` map to `(incoming, outgoing)` as pinned in
[`vectors/relay-interfaces.json`](vectors/relay-interfaces.json). Direction controls
local carriage; it does not itself authorize forwarding.

- `off` keeps enabled interfaces available for the device's own traffic and forwards
  no peer traffic.
- `bridge` forwards received packets only to other outgoing, policy-allowed
  interfaces. It decrements hops, suppresses packet-hash loops, and rate-limits each
  interface-kind pair.
- `transport-node` enables Reticulum transport announcements, path handling, packet
  forwarding, and link forwarding.

Missing policy cells allow forwarding. An explicit `false` denies the directed
`from` → `to` pair. Disabled interfaces and interfaces with `relay: false` never
participate in bridge forwarding.

## TwistedPear media framings

- Optical frames begin with `TO`, carry a content-derived transfer id, and use
  systematic source blocks plus one XOR repair block. A receiver can reorder frames,
  discard duplicates, and recover any one missing source block.
- Acoustic frames reuse `TPA1` chunk/parity framing. Each encoded frame additionally
  applies three-way bit-majority repetition before the host audio modem, allowing one
  corrupted repetition per bit to be corrected. The host channel owns FSK/AFSK PCM;
  PCM never enters a mini-app.
- ntfy packet messages are versioned XChaCha20-Poly1305 envelopes. The 24-byte nonce
  is authenticated as part of the header; the configured topic and timing remain
  visible to the ntfy service.

## Evidence

- Golden vectors: [`vectors/relay-interfaces.json`](vectors/relay-interfaces.json),
  checked by `packages/host-core/test/relay-vectors.test.ts`.
- Adapter behavior: `optical-interface.test.ts`, `acoustic-interface.test.ts`, and
  `ntfy-interface.test.ts`.
- Relay behavior: `bridge-forwarder.test.ts` and `transport-node.test.ts`.
- Direction gates: `packages/reticulum-ts/test/interface-direction.test.ts`.

Physical camera/screen, speaker/microphone, BLE, RNode/LoRa, and public/self-hosted
ntfy evidence remains hardware/service-gated and is recorded in
[`STATUS-HARDWARE.md`](../../STATUS-HARDWARE.md); it is not implied by simulator tests.
