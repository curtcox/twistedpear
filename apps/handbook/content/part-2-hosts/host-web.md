# Web host

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

The web host is a **browser tab** running the full mini-app stack in-page — not a
remote UI for another node. `reticulum-ts` executes in a core Web Worker;
per-app sandboxes use opaque-origin iframes plus workers; the host UI renders
widgets with React Native for Web.

## Leaf-only posture

Browsers cannot accept inbound connections or open raw TCP/UDP. The web host is
permanently a **leaf peer**:

- No transport-node, seeder, or propagation roles — ever.
- Reticulum reachability goes through a **WebSocket gateway** on a desktop or
  `tp node` peer (`--ws-listen`).
- Bulk installs use the gateway's `/bulk-fetch` proxy; offline fallback is
  Reticulum Resource transfer.

## Architecture

```
Browser tab (Expo web)
  host UI + RNW widget renderer
Core Web Worker — reticulum-ts, host-core leaf, broker
Per-app sandbox — iframe + Worker, broker-only API
WebSocketClientInterface ──wss──▶ gateway node
```

## Security notes

Identity keys live in IndexedDB encrypted with WebCrypto — weaker than a hardware
keystore. The **page origin is part of the trust base**: default posture is
self-serving from your own node (`tp node --serve-web`). See
[Known limitations](chapter:ref-limitations) §8.

## Radios & serial

No BLE peripheral, no multicast AutoInterface. WebSerial RNode (Chromium) is a
stretch path; real USB LoRa E2E is device-gated. Probes report `unavailable`
honestly on `platform=web`.

Gateway spec: [WebSocket interface](chapter:ref-interfaces). Live matrix:
[Live difference matrix](chapter:difference-matrix).
