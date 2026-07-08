# Network interfaces

Reticulum peers attach through typed **PacketInterface** implementations.
The [live difference matrix](chapter:difference-matrix) lists which types
`host.info()` reports for **this** host.

## WebSocket (browser gateway)

- **Leaf client** — browser tab or CI harness dials `ws://` / `wss://` on a gateway.
- **Gateway** — desktop host or `tp node --ws-listen [host:]port`.
- **Framing** — one Reticulum wire packet per binary WebSocket message.
- **Auth** — optional shared token (`--ws-token`).

Full spec: [docs/websocket-interface.md](../../../docs/websocket-interface.md).
Web host chapter: [Web host](chapter:host-web).

## TCP / AutoInterface / Bonjour

Desktop and mobile worklets enable TCP client mode, LAN multicast (AutoInterface),
and Bonjour discovery when the platform permits. iOS multicast requires the
networking multicast entitlement; web hosts omit these entirely.

## BLE phone pipe

Android and iOS expose a BLE GATT byte stream for peer links. Web Bluetooth is
central-only and not used for the phone-pipe role. Device-gated Handbook probes:
[Device-gated probes](chapter:device-gated-probes).

## RNode serial

USB serial on desktop/Android; BLE-only on iOS. WebSerial (Chromium) is optional.
LoRa bandwidth budgets apply — see [LIMITATIONS.md](../../../LIMITATIONS.md) §6.
