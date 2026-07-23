# Local peer discovery implementation status

<!-- tp-doc
lifecycle: live
audited: 2026-07-22
register: software
-->

This records shipped source and test evidence for
[the delivery plan](local-peer-discovery-plan.md). A mechanism is not advertised merely
because its portable codec exists; the host must also supply its trusted UI/effect channel
and pass the shared adapter suite.

| Area | Current evidence | Status |
|---|---|---|
| Canonical invitation | `packages/protocol/src/peer-invitation.ts`, CDDL and fixed vectors | implemented |
| Pairing/replay machine | `peer-pairing.ts`, `PeerReplayCache`, hostile traces | implemented |
| Authentication coordinator | signed Ed25519 identity binding, fresh X25519 agreement, three-word SAS, common-data-plane enforcement, trusted confirmation callback | implemented; desktop and native bind the signed candidate to a real Reticulum destination/link |
| Adapter/session contract | `packages/peer-discovery`, scoped authenticated handles and in-memory two-host test | implemented |
| Automatic Reticulum rendezvous | pure announce/link effect boundary with correlated offer/answer validation; service-scoped announces and authenticated Link return | desktop and native implemented; two-device evidence pending |
| Broker and SDK | `peer:connect`, `peers.request/listen/info/close`, runtime cleanup and isolation tests | implemented |
| Manual full code | checksummed Base32 plus two-round `ManualPeerDiscoveryAdapter` | desktop, native mobile, and static web trusted-host bindings implemented |
| Static/animated QR | bounded frames, CRC32, reorder/duplicate handling, mixed-session rejection, JS raster fallback | desktop, static-web, and native trusted camera/display bindings implemented |
| WebRTC/Reticulum route | host-owned WebRTC wrapper plus signed Reticulum destination validation and Link establishment | static web WebRTC and desktop Reticulum implemented; TURN configuration remains host policy |
| ntfy | XChaCha20-Poly1305 messages, 128-bit topics, HTTPS/bearer client, replay/expiry/backoff, common adapter, fake service tests | desktop, static-web, and native-mobile trusted-host bindings implemented; disposable-server evidence pending |
| Audio | bounded framing, CRC, one-loss XOR FEC, audible FSK at 44.1/48 kHz, stream burst extraction, common adapter | desktop, static-web, and native trusted playback/microphone effects implemented; room/device evidence pending |
| Native Bluetooth | common native adapter, bounded CRC/FEC invitation frames multiplexed on the existing negotiated-MTU BLE GATT pipe, accurate web unsupported result | native software path implemented; real-device/background evidence pending |
| Browser LP2P | intentionally unsupported until a production browser implementation exists | pending |
| Announce/presence/LXMF/Resource route adoption | host-only confirmed-route registry with bounded transport access and lifecycle cleanup; transport-backed Reticulum announce destinations on desktop/native/web; confirmed-route presence; LXMF/Resource share each host's Reticulum path table; distinct-service two-host cookbook tier | software integration implemented; physical two-host service evidence pending |

Current automated evidence lives in:

- `packages/protocol/test/peer-invitation.test.ts`
- `packages/protocol/test/peer-qr-framing.test.ts`
- `packages/protocol/test/peer-audio-framing.test.ts`
- `packages/protocol/test/peer-audio-fsk.test.ts`
- `packages/peer-discovery/test/adapter-contract.test.ts`
- `packages/peer-discovery/test/coordinator.test.ts`
- `packages/peer-discovery/test/crypto-backend.test.ts`
- `packages/peer-discovery/test/manual.test.ts`
- `packages/peer-discovery/test/qr.test.ts`
- `packages/peer-discovery/test/peer-discovery.test.ts` (confirmed-route adoption and cleanup)
- `packages/peer-discovery/test/reticulum.test.ts`
- `packages/peer-discovery/test/ntfy.test.ts`
- `packages/peer-discovery/test/audio.test.ts`
- `packages/peer-discovery/test/portable-qr.test.ts`
- `packages/peer-discovery/test/webrtc-route.test.ts`
- `packages/miniapp-runtime/test/peers.test.ts`
- `packages/miniapp-sdk/test/peers.test.ts`

The remaining delivery gates are the required service/browser/hardware trials recorded in
[the evidence register](local-peer-discovery-evidence.md). Unsupported mechanisms remain
diagnostic results and are not advertised as working merely because their portable codec or
adapter contract exists.
