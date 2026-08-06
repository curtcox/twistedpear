# SPEC-MEDIA / RNode–LoRa profile (adopted)

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** A (adopted) · **Status:** normative (profile) for KISS framing;
**radio/physical layer gated on hardware evidence** · Medium: RNode / LoRa

RNode uses upstream RNS's KISS-style serial framing over the RNode firmware protocol.
This profile pins the framing and bring-up handshake against golden byte transcripts;
LoRa on-air behavior remains gated on hardware
([STATUS-HARDWARE.md](../../STATUS-HARDWARE.md)).

## 1. Upstream pin

| Upstream                    | Version              | Role                                                                                                                               |
| --------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| RNode firmware KISS framing | RNS 0.9.4-compatible | Golden byte transcripts ([conformance/vectors/rnode-kiss-transcripts.json](../../conformance/vectors/rnode-kiss-transcripts.json)) |

## 2. Subset

| Feature                                                                         | TwistedPear use             | Pinned by                                                                                                                                   |
| ------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Detect + radio-state handshake                                                  | Device bring-up             | `rnode-kiss-transcripts.json` → `detect-handshake`, `radio-state-query`; `packages/reticulum-interfaces` `rnode-transcripts.test.ts`        |
| Firmware/platform query                                                         | Capability detection        | `rnode-kiss-transcripts.json` → `firmware-version`, `platform-query`                                                                        |
| KISS data-frame round-trip                                                      | Packet carriage over serial | `rnode-kiss-transcripts.json` → `data-frame-roundtrip`                                                                                      |
| Interface lifecycle (online after handshake, offline + reconnect on disconnect) | Link state management       | `rnode-interface.test.ts` ("goes online after detect and radio-state handshake", "marks offline on pipe disconnect and attempts reconnect") |

## 3. Extensions

None to the KISS framing.

## 4. Deviations

None to the framing. The golden transcripts are byte-for-byte RNode firmware exchanges.

## 5. Evidence

- `rnode-transcripts.test.ts`, `rnode-interface.test.ts`, `rnode-kiss.test.ts` in
  [packages/reticulum-interfaces/test](../../packages/reticulum-interfaces/test/)
  (default `vitest` run).
- `npm run test:serialport-load`, `npm run test:link-benchmark` — serial carrier load
  and link throughput (link-benchmark needs INTEROP=1 + Docker; skip if unavailable).
- **LoRa on-air behavior** (spreading factor, duty cycle, real range/pacing) remains
  gated on [STATUS-HARDWARE.md](../../STATUS-HARDWARE.md); the transcripts pin the
  host↔device framing, not the radio.
