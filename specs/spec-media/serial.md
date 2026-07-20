# SPEC-MEDIA / Serial profile (adopted)

**Group:** A (adopted) · **Status:** normative (profile) for HDLC framing;
**physical serial line gated on hardware evidence** · Medium: plain serial

RNS's plain `SerialInterface` frames Reticulum packets with HDLC (0x7E flag +
byte-stuffing), distinct from the RNode KISS carrier
([rnode-lora.md](rnode-lora.md)). This profile pins the HDLC framing; real serial-line
behavior (baud, flow control) is gated on hardware
([STATUS-HARDWARE.md](../../STATUS-HARDWARE.md)).

## 1. Upstream pin

| Upstream | Version | Role |
|---|---|---|
| RNS SerialInterface HDLC framing | RNS 0.9.4-compatible | Byte framing on the serial carrier |

## 2. Subset

| Feature | TwistedPear use | Pinned by |
|---|---|---|
| HDLC frame round-trip incl. flag/escape byte-stuffing | Serial packet framing | `packages/protocol` `hdlc.test.ts` ("round-trips payloads including flag/escape bytes") |
| Streamed decode across chunk boundaries | Partial-read reassembly | `hdlc.test.ts` ("streams across chunk boundaries") |
| Deterministic framing | Replay/determinism | `hdlc.test.ts` ("double-runs identically") |
| Node serialport driver availability | Host serial carrier | `npm run test:serialport-load` ("Node serialport import OK") |

## 3. Extensions

None to the HDLC framing.

## 4. Deviations

None. HDLC framing is byte-compatible with RNS SerialInterface.

## 5. Evidence

- `hdlc.test.ts` in [packages/protocol/test](../../packages/protocol/test/) (default
  `vitest` run; also in the `sansio:determinism` gate).
- `npm run test:serialport-load` — Node serialport driver load check.
- **Physical serial-line behavior** (baud negotiation, flow control on real hardware)
  remains gated on [STATUS-HARDWARE.md](../../STATUS-HARDWARE.md).
