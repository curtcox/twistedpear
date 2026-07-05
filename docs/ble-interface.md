# Reticulum BLE Interface Specification

Version: 0.1.0-draft  
Status: proposed for community review

This document defines a custom Reticulum `PacketInterface` for phone-to-phone
communication over Bluetooth Low Energy (BLE). Reticulum requires only a
half-duplex channel ≥ 5 bps with a 500-byte MTU; this interface meets that bar
with a reliable framing layer above GATT.

## 1. Roles

Every node simultaneously:

- **Advertises** a GATT peripheral service (accepts inbound connections)
- **Scans** as a BLE central (initiates outbound connections)

When two nodes discover each other, each may attempt connection. Tie-break rule:

1. Compare Reticulum identity hashes lexicographically (ascending).
2. The node with the **lower** hash acts as **central** (initiator).
3. The node with the **higher** hash acts as **peripheral** (acceptor).

Only one active data connection is maintained per peer pair. The central writes;
the peripheral notifies.

## 2. GATT Service

| Item | UUID |
|---|---|
| Service | `6e6f0001-7e3a-4f2d-9b1c-8a5d3e2f1a0b` |
| Data characteristic (write + notify) | `6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0b` |
| Control characteristic (read + write) | `6e6f0003-7e3a-4f2d-9b1c-8a5d3e2f1a0b` |

The data characteristic carries framed Reticulum packets. The control
characteristic carries a 16-byte identity beacon (Reticulum identity hash) for
discovery filtering.

### MTU negotiation

Request the largest ATT MTU supported (target 512; accept 185/247/512). Effective
payload per frame is `MTU - 4` (4-byte header, see §3).

## 3. Framing

Each GATT write/notify carries one frame:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Sequence   |     Flags     |          Length (BE)            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Payload (Length bytes)                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **Sequence**: `uint8`, wraps at 255.
- **Flags**: `uint8`
  - `0x01` MORE — additional fragments follow
  - `0x02` ACK_REQ — reserved for flow control (v0.1: unused)
  - `0x04` KEEPALIVE — empty payload, no reassembly
  - `0x08` IDENTITY — payload is a 16-byte identity hash beacon
- **Length**: `uint16` big-endian payload length (0–65535).

Reassembly: accumulate fragments with matching sequence until a frame arrives
without `MORE`. A sequence gap resets the reassembly buffer.

## 4. Data flow

Half-duplex pipe semantics:

1. Central may write up to `(MTU - 4)` bytes per frame using **Write Without
   Response** when supported.
2. Peripheral delivers inbound data via **Notify**.
3. Only one direction sends at a time; implementations SHOULD wait for notify
   idle before writing (simple turn-taking).

Reticulum packets MUST NOT exceed 500 bytes on this interface (`BLE_INTERFACE_MTU`).

## 5. Flow control and keepalive

- **Keepalive**: either side MAY send a `KEEPALIVE` frame every 30 s when idle.
- **Disconnect**: link loss is surfaced to Reticulum as `online = false`; the
  interface retries connection with exponential backoff (initial 5 s).
- **ACK_REQ** is reserved for a future windowed mode; v0.1 implementations MAY
  ignore it.

## 6. Discovery and identity beaconing

During scan, filter on the control characteristic or advertisement service UUID.
The control characteristic exposes the 16-byte Reticulum identity hash so peers
can recognize known contacts before opening a data connection.

## 7. Degraded mode: central-only

Some Android devices lack reliable peripheral/GATT-server support. In
central-only mode a node can connect to peers but cannot be connected to. Such
nodes SHOULD still advertise identity via scan response when the OS permits it.

## 8. Reference mapping

| Concept | Implementation |
|---|---|
| `BlePipe` | Native bridge byte stream |
| `spec-framing.ts` | Fragmentation/reassembly |
| `BleInterface` | `RawPacketInterface` over `BlePipe` |

## 9. Conformance

An implementation MUST:

- Exchange announces, links, Resources, and LXMF over a simulated pipe with 2%
  loss, MTU variants 185/247/512, and mid-transfer disconnect/reconnect.
- Preserve Reticulum packet boundaries after reassembly.

Device-level throughput targets are recorded in `LIMITATIONS.md` §3 after
hardware measurement (Phase 2 M5).
