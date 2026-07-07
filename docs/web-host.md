# Web Host: a full TwistedPear host in the browser (plan)

Status: **in progress** (Phase W1 complete; W-S2 + W-S3 + W-S4 landed; W2 software tier landed) — Workstreams A/B/C landed; W-S1 interop + Playwright CI wired; browser identity persistence + `createWebLeafHost` landed; Expo web tab UI (`App.web.tsx` + core Web Worker) landed; `WebSandboxBackend` + W-S2 adversarial isolation spike landed; `packages/widget-renderer-rn` + W-S3 RNW widget preview landed; `createWebPackageStorage` + W-S4 OPFS/IndexedDB CAS install spike landed; `WebSandboxProxyBackend` + main-thread sandbox relay + `test:web-miniapp` (W2 hello dev side-load).
Tracking: [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) Phase W.

The web host is a browser tab (React Native for Web via Expo web) that runs the
**complete host stack**: a real Reticulum leaf peer (`reticulum-ts` in the page),
the mini-app runtime with per-app sandboxes, install/run of signed `.tpkg`
packages, and the same host UI as mobile. It is not a thin remote UI for another
node — the protocol stack runs in the browser. What the browser cannot do
(listen for inbound connections, raw TCP/UDP, BLE, multicast) is bridged through
a new **first-class WebSocket Reticulum interface** to any gateway node.

## Why this is feasible now

The codebase already has the seams a browser port needs:

| Concern | Existing seam | Web implementation |
|---|---|---|
| Crypto | `CryptoProvider` (`reticulum-ts/src/crypto/provider.ts`) | `PureCryptoProvider` (`@noble/*`) is already portable; optional WebCrypto acceleration later |
| Runtime (clock, KV store, sockets) | `Runtime` (`reticulum-ts/src/runtime/runtime.ts`) with `bare/` and `node/` impls | New `runtime/web`: IndexedDB `KeyValueStore`, standard timers, **no** `TcpFactory` |
| Interfaces | `interfaces/interface.ts` + framing | New `WebSocketClientInterface` (browser + node), `WebSocketServerInterface` (gateway side) |
| Mini-app isolation | `SandboxBackend` (`miniapp-runtime/src/sandbox/backend.ts`); Bare Worker and Node Worker backends | New `WebSandboxBackend` (sandboxed-iframe + Worker); `terminate()` satisfies the M0 killability bar |
| Mini-app UI | Host-rendered `WidgetTree` — validated data, never code | Same schema rendered by RNW; extract the RN renderer from `apps/harness-mobile/host/miniapp-renderer.tsx` into a shared package |
| Worklet boundary | bare-kit RPC channel (mobile), Electron IPC (desktop) | Dedicated "core" Web Worker + `MessageChannel` RPC carrying the same protocol |
| Bulk plane | `bridge-hyper` fetch-strategy selection (Hyperdrive vs Reticulum Resource) | v1: Resource transfer only; Hyperdrive via WebSocket DHT relay is Phase W4 |

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│ Browser tab (Expo web / react-native-web)                     │
│   host UI: peer/app browser, settings, grants, confirmations  │
│   mini-app surface: RNW widget renderer (shared with mobile)  │
├───────────────────────────────────────────────────────────────┤
│ Core Web Worker — same TS stack as the Bare worklet           │
│   reticulum-ts (runtime/web, PureCryptoProvider)              │
│   host-core (leaf roles only) · lxmf-ts · app-registry        │
│   miniapp-runtime broker/lifecycle                            │
│   storage: IndexedDB KV · CAS + packages in OPFS/IndexedDB    │
├───────────────────────────────────────────────────────────────┤
│ Per-app sandbox: sandboxed iframe (opaque origin) + Worker    │
│   broker-only API via MessageChannel; no ambient net/storage  │
├───────────────────────────────────────────────────────────────┤
│ WebSocketClientInterface ──wss──▶ gateway node                │
│   (desktop host, `tp node`, or any node with --ws-listen)     │
└───────────────────────────────────────────────────────────────┘
```

Roles: the web host is always a **leaf peer**. Browsers cannot accept inbound
connections, so transport node, seeder, and propagation-server roles are
permanently out of scope for this target (see LIMITATIONS §9).

## Workstream A — WebSocket Reticulum interface

A first-class interface, not a private control channel: any in-browser
`reticulum-ts` becomes a leaf peer through any gateway node that enables it.

- **Framing:** one Reticulum wire packet per binary WebSocket message.
  WebSocket is message-oriented, so no HDLC/KISS framing layer is required;
  standard Reticulum MTU rules apply unchanged.
- **`WebSocketClientInterface`** in `reticulum-ts/src/interfaces/`: uses the
  global `WebSocket` in the browser; `ws` (or bare equivalent) under node/bare
  so desktop and CI can use the same interface. Reconnect with backoff,
  identical link/keepalive semantics to `TCPClientInterface`.
- **`WebSocketServerInterface`** in `@twistedpear/reticulum-interfaces`:
  enabled on the desktop host and headless `tp node --ws-listen <addr:port>`.
  TLS via `wss` directly or a reverse proxy; optional shared-token auth for
  private gateways (a public gateway is just a transport node and needs none).
- **Origin serving:** `tp node --serve-web` serves the built web-host bundle
  from the same machine, so the page origin and the gateway are the same
  trusted node. Public hosting of the bundle is possible but the served origin
  must be treated as part of the TCB (LIMITATIONS §9).
- **Interop:** the gateway is our own node, so Python RNS needs no changes;
  conformance runs browser ↔ gateway ↔ dockerized Python RNS. Publish the
  interface spec upstream per [upstream-publication.md](upstream-publication.md).

## Workstream B — `runtime/web` in reticulum-ts

- `Clock` from standard timers; `KeyValueStore` over IndexedDB;
  randomness via `crypto.getRandomValues` (what `@noble` already uses).
- No `TcpFactory`/UDP on this runtime; interface availability is gated by
  runtime capability, mirroring how BLE/serial are absent on desktop.
- CI guard: an esbuild `--platform=browser` bundle check so `bare-*`,
  `sodium-native`, and node builtins can never leak into the web entrypoint.

## Workstream C — host-core as a browser leaf

- `bridge-hyper` (corestore/hyperswarm) is not browser-safe. Introduce a
  `FetchPlane` seam in host-core so the web build omits Hyperdrive imports
  entirely and installs packages via Reticulum Resource transfer — the path
  that already exists for non-IP scenarios.
- Role config hard-locks leaf mode on web (no transport/seed/propagation).
- CAS + installed packages in OPFS (fall back to IndexedDB), with
  `navigator.storage.persist()` and quota surfacing in host UI. **W-S4 landed:**
  `createWebPackageStorage` in `@twistedpear/host-core/web` + `test:web-storage` (Playwright) +
  harness quota card in `App.web.tsx`.

## Workstream D — mini-app runtime on web

- **`WebSandboxBackend`** implementing `SandboxBackend` (**W-S2 landed**): each app runs in a
  Worker inside a **sandboxed iframe with an opaque origin**, so it gets no
  ambient IndexedDB/OPFS and no same-origin fetch; iframe CSP
  (`connect-src 'none'` etc.) closes cross-origin fetch. The broker
  `MessageChannel` is the only capability surface — same chokepoint as native.
  `Worker.terminate()` / iframe removal satisfies busy-loop killability;
  benchmark to `measured-web.json` alongside the desktop/emulator numbers.
  **W2:** `WebSandboxProxyBackend` delegates spawn to the main-thread relay
  (`host/web-sandbox-relay.ts`) so the core worker can run `MiniappHost` without `document`.
- Host confirmation channel renders in RNW host chrome, outside the widget
  surface; unchanged guarantees since widget trees are validated data.
- Extract the RN widget renderer from `apps/harness-mobile/host/miniapp-renderer.tsx`
  into `packages/widget-renderer-rn`, consumed by mobile (RN) and web (RNW). **W-S3 landed:**
  shared package + harness re-export + `App.web.tsx` widget preview + Playwright render tests.
  The Electron DOM renderer (`apps/host-desktop/src/renderer/widgets.js`) can
  migrate to it later; not a prerequisite.

## Workstream E — `apps/host-web` (Expo web)

- Start as a **web target of `apps/harness-mobile`** using platform forks
  (`*.web.ts`): stubs for bonjour/multicast/BLE/USB/node-service that report
  capability-unavailable, and an `expo-bare-kit` replacement that talks to the
  core Web Worker over the same RPC protocol. Graduate to a separate
  `apps/host-web` only if divergence makes the forks messy.
- **W1 landed:** `App.web.tsx`, `host/web-core-bridge.ts`, and
  `worklet/web-entry.mjs` (bundled to `public/web-core.worker.js`). Build static
  assets with `npm run build:web-host` → `dist/web-host` for `tp node --serve-web`.
- PWA shell (offline app-shell, install prompt) is Phase W4 polish.

## Workstream F — security posture

- **Identity keys** live in IndexedDB encrypted under a WebCrypto AES-GCM key
  (non-extractable); optionally unlocked via passkey/PRF later. This is weaker
  than Android Keystore / Secure Enclave — documented, not hidden
  (LIMITATIONS §9).
- **TCB includes the serving origin**: whoever serves the bundle can serve a
  malicious one. Default deployment is self-serving from the user's own node
  (`--serve-web`); anything else is a documented trust decision.
- Sandbox isolation claims (opaque origin, no ambient network) are validated
  by spike W-S2 with adversarial tests, mirroring the Phase 7 broker review.

## Phases

### Phase W0 — spikes (de-risk before committing)

| Spike | Proves | Exit criteria |
|---|---|---|
| W-S1 | `reticulum-ts` in a browser bundle + WS interface | Browser links to dockerized Python RNS through a `tp node` gateway; announce/link/packet golden parity |
| W-S2 | Web sandbox isolation | Hostile bundle in sandboxed-iframe worker: no ambient storage, no network, busy loop killed < 1 s without reloading the tab | **Done (CI tier)** — `WebSandboxBackend` + `test:web-sandbox` (Playwright) |
| W-S3 | RNW UI path | Harness UI + extracted widget renderer running under `expo start --web`, examples' widget trees render correctly | **Done (CI tier)** — `packages/widget-renderer-rn` + `test:web-widget-renderer` (Playwright) + `App.web.tsx` preview |
| W-S4 | Browser storage | Install an example `.tpkg` into OPFS/IndexedDB CAS; survives reload; quota surfaced | **Done (CI tier)** — `createWebPackageStorage` + `test:web-storage` (Playwright) |

### Phase W1 — Reticulum leaf peer in the tab
`runtime/web`; `WebSocketClientInterface` + `WebSocketServerInterface`;
`tp node --ws-listen/--serve-web`; identity create/persist/unlock; LXMF
send/receive from the browser; playwright conformance job in CI.

### Phase W2 — mini-app runtime
`WebSandboxBackend` + adversarial isolation tests; broker + confirmation
channel on web; `packages/widget-renderer-rn` extraction; chat/file-drop/board
examples run end-to-end in the tab. **W2 (software tier) landed:** `WebSandboxProxyBackend` +
main-thread sandbox relay + `createWebWorkletMiniappHost` + harness `App.web.tsx` mini-app
panel + `test:web-miniapp` (Playwright hello dev side-load + UI event).

### Phase W3 — distribution
Install from pasted/scanned 256t string via Resource fetch; capability review
and grant UI; publisher trust import; DevStudio on web (workspace in OPFS);
package + sign + publish from the browser through the gateway.

### Phase W4 — bulk plane and polish
Hyperdrive fetch via a WebSocket DHT relay on the gateway (optional
acceleration; Resource path remains the fallback); PWA offline shell; quotas
and soak tests; **stretch:** RNode over WebSerial (Chrome) for direct LoRa
from the laptop browser with no gateway.

## Non-goals (this target, v1)

Transport node / seeder / propagation roles; BLE (Web Bluetooth is
central-only and cannot run the peripheral GATT stream); AutoInterface /
multicast discovery; I2P; USB serial before the W4 WebSerial stretch.

## CI

New `web` job per [ci-policy.md](ci-policy.md): typecheck, browser bundle
guard (Workstream B), playwright conformance (W-S1 path), sandbox isolation +
kill benchmark, RNW widget-renderer render tests.
