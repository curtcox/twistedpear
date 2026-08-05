# Reticulum WebSocket Interface Specification


<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Version: 0.1.0-draft  
Status: proposed for community review

This document defines a custom Reticulum `PacketInterface` that carries one
Reticulum wire packet per binary WebSocket message. It exists so browser (and
other leaf) peers that cannot open raw TCP/UDP can reach a gateway node that
already participates in a Reticulum network.

Reticulum requires only a half-duplex channel ≥ 5 bps with a 500-byte MTU for
custom interfaces; this interface uses a much larger hardware MTU because
WebSocket is message-oriented and runs over TCP/TLS.

## 1. Roles

| Role | Who | Direction |
|---|---|---|
| **Gateway** | Any transport-capable node that enables the server interface (`tp node --ws-listen`, desktop host, etc.) | Accepts inbound WebSocket upgrades; spawns one Reticulum interface per client |
| **Leaf client** | Browser tab, CI harness, or another node that dials the gateway | Opens one outbound WebSocket; reconnects on drop |

The web host is always a leaf. Browsers cannot accept inbound connections, so
transport / seeder / propagation roles are permanently out of scope on the
browser target (see [LIMITATIONS.md](../LIMITATIONS.md) §8 and
[web-host.md](web-host.md)).

## 2. Transport framing

- **Message type:** binary WebSocket frames only (`opcode 0x2`). Text frames and
  other opcodes are ignored (except `0x8` close).
- **Packet boundary:** exactly one Reticulum wire packet per WebSocket message.
  No HDLC, KISS, or length-prefix framing is required — WebSocket is already
  message-oriented.
- **Decode:** the receiver passes the message payload to `Packet.decode` (same
  wire format as TCP/UDP interfaces).
- **Hardware MTU:** default `262_144` bytes (`WEBSOCKET_HW_MTU`). Reticulum's
  logical packet MTU rules still apply; the large hardware MTU avoids
  unnecessary fragmentation on an already-framed TCP stream.
- **Bitrate:** unset (`null`) unless the operator configures one; treat as a
  fast wired path for budget policy.

## 3. Connection lifecycle

### Client (`WebSocketClientInterface`)

1. Open `ws://` or `wss://` to the gateway URL (default path `/` unless configured).
2. Set `binaryType = "arraybuffer"`.
3. On open: interface `online = true`; send/receive as above.
4. On close/error: `online = false`; schedule reconnect after
   `WEBSOCKET_RECONNECT_WAIT_MS` (default 5 s). Optional `maxReconnectTries`
   closes the interface permanently after N failures.
5. Initial connect times out after `WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS`
   (default 5 s).

### Server (`WebSocketServerInterface`)

1. Listen on `[host:]port` (CLI default `127.0.0.1:9480`).
2. On HTTP Upgrade: validate optional path + shared-token auth (§4).
3. Complete the standard WebSocket handshake
   (`Sec-WebSocket-Accept` = SHA-1 of key + GUID).
4. Wrap the accepted socket as a `WebSocketClientInterface` and register it with
   the local `Reticulum` instance (one interface per client).
5. Path `/dht-relay` is reserved for the optional Hyperdrive DHT relay (§6) and
   is **not** upgraded as a Reticulum packet interface.

## 4. Optional shared-token auth

Private gateways MAY require a shared token. Public transport gateways need none.

| Side | Mechanism |
|---|---|
| Client | When `sharedToken` is set, includes WebSocket subprotocol `tp-token.<token>` (`Sec-WebSocket-Protocol`) |
| Server | When `sharedToken` is set, accepts the upgrade only if that exact subprotocol is offered; echoes it in the 101 response |
| Failure | Server responds `403 Forbidden` and closes the TCP socket |

CLI: `tp node --ws-listen [host:]port --ws-token <token>`.

This is gateway access control only. It does not replace Reticulum identity,
link encryption, or packet authentication.

## 5. Origin serving (`--serve-web`)

The same HTTP server that accepts WebSocket upgrades MAY serve the web-host
static bundle (`dist/web-host` by default):

```
tp node --ws-listen 9480 --serve-web
tp node --ws-listen 9480 --serve-web path/to/bundle
```

Non-upgrade `GET`/`HEAD` requests are served from `staticRoot` (path traversal
rejected). The **serving origin is part of the TCB**: whoever serves the page
bytes can substitute them. Default posture is self-serving from the user's own
node ([LIMITATIONS.md](../LIMITATIONS.md) §8).

## 6. Gateway companion endpoints (TwistedPear bulk plane)

These are **not** Reticulum packet interfaces. They share the gateway HTTP/WS
listener so the browser leaf can accelerate package installs when IP is available.
Resource transfer remains the offline/fallback path.

| Path | Protocol | Purpose |
|---|---|---|
| `/dht-relay` | WebSocket (`@hyperswarm/dht-relay`) | Experimental DHT relay for browser Hyperdrive clients; lookup relay remains brittle against current `hyperdht` in CI |
| `/bulk-fetch?driveKey=<hex>&version=<semver>` | HTTP GET/HEAD | Gateway joins Hyperswarm, fetches the Hyperdrive archive, streams `application/octet-stream` to the tab |

A WebSocket Reticulum gateway implementation MUST leave `/dht-relay` free for the
relay (or document an alternate path). Bulk-fetch is optional; when present it
SHOULD set `access-control-allow-origin` appropriately for the served web origin.

## 7. Reference mapping

| Concept | Implementation |
|---|---|
| Client interface | `packages/reticulum-ts/src/interfaces/websocket-client.ts` |
| Server interface + static serve | `packages/reticulum-ts/src/interfaces/websocket-server.ts` |
| CLI enablement | `tp node --ws-listen` / `--ws-token` / `--serve-web` (`packages/cli`) |
| DHT relay | `packages/bridge-hyper/src/dht-relay-server.ts` |
| Bulk fetch | `packages/bridge-hyper/src/gateway-bulk-fetch-server.ts` |
| Browser leaf host | `apps/harness-mobile` web target (`App.web.tsx`, `build:web-host`) |

## 8. Conformance

An implementation MUST:

- Carry announces, links, Resources, and LXMF through a gateway between a
  WebSocket leaf and a dockerized Python RNS peer (no Python RNS changes required
  — the gateway is our own node).
- Preserve packet boundaries (one wire packet per binary message).
- Reject upgrades that fail shared-token checks when a token is configured.
- Reconnect with bounded backoff after client disconnect without corrupting
  in-flight Reticulum state beyond normal interface `online = false` semantics.

Evidence in this repo:

| Check | Command |
|---|---|
| Node WS leaf → gateway → Python RNS | `INTEROP=1 npm run test:web-interop` |
| Browser tab packet + LXMF echo | `INTEROP=1 npm run test:web-interop-browser` |
| DHT relay + `/bulk-fetch` smoke | `npm run test:web-hyperdrive` |
| Browser Hyperdrive install path | `npm run test:web-hyperdrive-browser` |

## 9. Non-goals

- Replacing TCPClient/TCPServer for native nodes that can open sockets directly.
- Making a browser a transport node, seeder, or propagation server.
- BLE, multicast/AutoInterface, or I2P on the web target.
- Requiring Python RNS to speak WebSocket (interop is always via a TwistedPear
  or other TS gateway).

## 10. Upstream publication

Community submission steps live in
[upstream-publication.md](upstream-publication.md) (WebSocket section). After
feedback, bump this document from `0.1.0-draft` to `0.1.0` and record adoption
status in [LIMITATIONS.md](../LIMITATIONS.md) §8.
