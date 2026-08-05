# SPEC-MEDIA / WebSocket profile (TwistedPear-defined)

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** A directory, but **TwistedPear-authored** framing · **Status:** normative
(profile) · Medium: WebSocket

WebSocket is not an upstream RNS interface; TwistedPear defines the framing. This
profile therefore uses the five-section template but the "upstream" is TwistedPear's
own [docs/websocket-interface.md](../../docs/websocket-interface.md).

## 1. Upstream pin

| Source                                                           | Version   | Role                                        |
| ---------------------------------------------------------------- | --------- | ------------------------------------------- |
| [docs/websocket-interface.md](../../docs/websocket-interface.md) | this tree | Framing definition (TwistedPear-authored)   |
| RFC 6455                                                         | —         | Underlying WebSocket binary frame transport |

## 2. Subset

| Feature                                     | TwistedPear use                      | Pinned by                                                                                |
| ------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Binary frame encode (short/medium payloads) | Reticulum-over-WS carriage           | `packages/protocol` `websocket-frame.test.ts` ("encodes short and medium binary frames") |
| Masked client-frame decode                  | Server-side receive                  | `websocket-frame.test.ts` ("decodes masked client frames")                               |
| Partial-frame handling                      | Streamed reassembly                  | `websocket-frame.test.ts` ("returns null for incomplete frames")                         |
| End-to-end WS interop                       | Browser/node carriage of RNS traffic | `npm run test:web-interop`                                                               |

## 3. Extensions

The framing is the extension: a TwistedPear-defined binary WebSocket carrier for
Reticulum packets. Publication plan tracked in
[docs/upstream-publication.md](../../docs/upstream-publication.md).

## 4. Deviations

Not applicable — no upstream RNS WebSocket interface to deviate from.

## 5. Evidence

- `websocket-frame.test.ts` in [packages/protocol/test](../../packages/protocol/test/)
  (default `vitest` run; also in the `sansio:determinism` gate).
- `npm run test:web-interop` — WebSocket carriage interop (needs Docker/Python; skip if
  unavailable).
