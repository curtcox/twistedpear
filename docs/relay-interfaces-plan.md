# Reticulum relay and configurable interfaces plan

<!-- tp-doc
lifecycle: planned
audited: 2026-07-22
register: software
-->

This plan lets a TwistedPear host act as a **Reticulum relay over any medium the device
can drive** — WiFi, Bluetooth, camera/screen (optical), speaker/microphone (acoustic),
`ntfy.sh`, and the transports already implemented (TCP, UDP, RNode/LoRa, I2P, WebSocket).
The user chooses which interfaces exist and, per interface, whether it may **transmit**,
**receive**, or both. The same configuration is reachable from an authorized mini-app
through a brokered API.

The goal is one **Interface Manager** that owns interface lifecycle and relay policy, a set
of new `PacketInterface` adapters for the physical-medium and push transports, a
user-facing configuration surface in every host, and a capability-gated SDK namespace for
programmatic control.

## Scope and boundary

The request touches two planes that the codebase deliberately keeps separate today, and the
distinction drives the whole design:

1. **Reticulum interfaces** (`PacketInterface`, in
   [`reticulum-ts`](../packages/reticulum-ts/src/interfaces/interface.ts) and
   [`reticulum-interfaces`](../packages/reticulum-interfaces/src/index.ts)). These carry raw
   Reticulum packets and are what the Transport node forwards across. Implemented today:
   TCP, UDP, BLE, RNode/LoRa, I2P, Auto (multicast/mDNS over WiFi LAN), WebSocket, serial,
   pipe.
2. **Peer-discovery adapters** (in [`peer-discovery`](../packages/peer-discovery/src/index.ts)):
   `qr`, `audio`, `ntfy`, `bluetooth`, `local-peer-to-peer`. These are **rendezvous** channels
   that exchange small invitation envelopes and then hand off to a data plane
   (`reticulum | webrtc | gateway | bluetooth`). **They do not carry arbitrary Reticulum
   packets and cannot relay.**

"Relay over camera / screen / speaker / microphone / ntfy" therefore means **promoting those
media into full `PacketInterface` transports** so the Transport node can forward over them —
an optical modem (camera in ↔ screen out), an acoustic modem (mic in ↔ speaker out), and an
`ntfy.sh` HTTP push transport. The existing peer-discovery `audio`/`ntfy`/`qr` adapters are
reused for *framing and permission plumbing* where possible, but the relay path is a new,
parallel capability, not a reinterpretation of discovery.

Two directional concepts must not be conflated:

- **Interface direction** — may this interface send bytes (`outgoing`), receive bytes
  (`incoming`), or both. This is the "which interfaces can transmit and receive" control the
  user asked for. `PacketInterface` already carries `incoming`/`outgoing` flags
  ([`interface.ts:48`](../packages/reticulum-ts/src/interfaces/interface.ts)); today only
  `outgoing` is configurable and `incoming` is hard-wired `true`.
- **Relay participation** — whether packets *received* on one interface may be *retransmitted*
  on others. This is governed by the relay mode and the relay policy matrix (below), not by
  interface direction alone.

Out of scope: changing Reticulum's on-wire packet format, the cryptographic identity model,
or the LXMF layer. Relay operates below LXMF and never decrypts payloads.

## What exists to build on

| Capability | Where | Status for this plan |
|---|---|---|
| Relay / Transport node (`transportEnabled` → `TransportNode`, packet + link forwarding) | [`reticulum.ts`](../packages/reticulum-ts/src/reticulum.ts), `transport/transport.ts`, `transport/node.ts` (`relayTransportPacket`) | Reuse as the "full transport node" relay mode. |
| Interface registration / listing | `Reticulum.registerInterface` / `unregisterInterface` / `listInterfaces` | Reuse; wrap in the Interface Manager. |
| Interface adapters: TCP, UDP, BLE, RNode, I2P, Auto, WebSocket, serial, pipe | `reticulum-ts/src/interfaces/*`, `reticulum-interfaces/src/*` | WiFi and Bluetooth are already covered here; extend. |
| Config-driven wiring from a typed `HostInterfaceConfig` | [`node-host.ts`](../packages/host-core/src/node-host.ts), [`types.ts`](../packages/host-core/src/types.ts) | Extend the config schema and the wiring loop. |
| Outbound interface ranking / kinds | [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts) | Extend `InterfaceKind` with `optical`, `acoustic`, `ntfy`. |
| Capability-gated brokered SDK calls | `callHost(ns, method, payload, capability)` in `miniapp-sdk/src/rpc.ts`; host enforcement in `miniapp-runtime/src/host-api.ts` | Add a `relay` namespace + a new capability. |
| Permission-gated media effects (mic/speaker, camera/QR, ntfy client) | `peer-discovery/src/{audio,qr,ntfy}.ts` — effect boundaries where PCM/frames never reach mini-apps | Reuse the effect boundaries as the host-side medium drivers. |

## Target architecture

```
                       ┌─────────────────────────────────────────────┐
   mini-app (granted)  │             Interface Manager               │
   ── relay.* ───────► │  • interface registry + lifecycle           │
   host config UI ───► │  • per-interface direction (tx / rx / both) │
                       │  • relay mode + relay policy matrix          │
                       │  • persistence + hot reload + telemetry      │
                       └───────────────┬─────────────────────────────┘
                                       │ registerInterface / unregister
                                       ▼
                    ┌──────────────────────────────────────────────┐
                    │ Reticulum (LeafTransport | TransportNode)     │
                    └───────────────┬──────────────────────────────┘
                                    │ PacketInterface
   ┌────────────┬────────────┬──────┴──────┬───────────┬───────────┬───────────┐
  WiFi        Bluetooth    Optical       Acoustic     ntfy.sh    RNode/LoRa   TCP/UDP/
 (Auto/UDP/    (BLE)     (camera↔screen) (mic↔speaker)  (HTTP)     I2P/WS…      …
  TCP)                    NEW             NEW           NEW
```

The Interface Manager is the single owner of "which interfaces exist and what they may do."
Both the host UI and the mini-app API mutate the same manager state; the wiring loop in
`node-host.ts` becomes a thin caller of the manager.

## New interface adapters

Each is a real `PacketInterface` (extends `AbstractPacketInterface`, or `HdlcPacketInterface`
where HDLC framing over a byte stream applies), respecting `mtu`, `bitrate`, `incoming`,
`outgoing`, and `online`. All packet payloads are already Reticulum-encrypted; these adapters
add only framing and physical transport.

### Optical (camera ↔ screen), `InterfaceKind.OPTICAL`

- **Outgoing (screen):** render a stream of QR (or higher-density color) codes; each frame is
  a fountain-coded / sequence-numbered slice of the HDLC-framed packet stream. Reuse the
  streaming approach in `peer-discovery/src/portable-qr.ts`.
- **Incoming (camera):** decode the code stream, reassemble, deframe. Reuse camera/QR effect
  boundary from `peer-discovery/src/qr.ts`.
- **Framing:** fountain codes (e.g. LT/RaptorQ-style) so a receiver with no back-channel can
  recover from a purely one-way display. A back-channel (both devices with camera+screen)
  enables selective ACK.
- **Realistic bitrate:** low (hundreds of bytes/s to a few KB/s); set `mtu` small and
  advertise a conservative `bitrate` so [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts)
  deprioritizes it. Direction is naturally asymmetric — a screen-only device is `outgoing`,
  a camera-only device is `incoming`.

### Acoustic (microphone ↔ speaker), `InterfaceKind.ACOUSTIC`

- **Outgoing (speaker):** modulate HDLC frames to audio (FSK/AFSK or a ggwave-style scheme);
  emit PCM through the host's audio-out effect.
- **Incoming (microphone):** demodulate PCM captured via the mic effect boundary already
  defined in `peer-discovery/src/audio.ts` (PCM never crosses into mini-apps).
- **Framing:** reuse `framePeerAudioPayload` / `stepPeerAudioAssembly` from `protocol` for
  chunking + reassembly; add forward error correction for the noisy channel.
- **Realistic bitrate:** tens to low-thousands of bps; near/ultrasonic band selectable. Very
  low `bitrate`, small `mtu`, high latency.

### ntfy.sh push, `InterfaceKind.NTFY`

- A relay interface backed by an `ntfy` topic: **outgoing** = HTTP `POST` of a framed,
  length-bounded packet batch to the topic; **incoming** = long-poll / SSE subscription to the
  topic, deframe each message.
- Reuse the encrypted-envelope and topic/secret machinery in
  `peer-discovery/src/ntfy.ts` (`NtfyRendezvousEffect`, per-message XChaCha20-Poly1305) so the
  ntfy server sees only ciphertext. `MAX_NTFY_PACKET_BYTES` bounds `mtu`.
- Config carries `baseUrl` (default `https://ntfy.sh`), topic, shared secret, optional bearer
  token, and poll interval. Self-hosted ntfy servers are supported via `baseUrl`.

### WiFi and Bluetooth

- **WiFi**: already covered by `AutoInterface` (multicast/mDNS peering over the LAN) plus
  TCP/UDP. This plan surfaces it as a first-class, directionally-controllable entry in the
  config and UI; no new adapter needed.
- **Bluetooth**: `BleInterface` already exists
  ([`ble/interface.ts`](../packages/reticulum-interfaces/src/ble/interface.ts)). Promote it to a
  first-class relay interface in the config/UI and ensure it participates in the relay policy
  matrix. (Native BLE central/peripheral drivers on mobile hosts are tracked separately in
  [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).)

## Direction and relay policy

### Per-interface direction

Extend `ReticulumInterfaceOptions` so `incoming` is configurable (today only `outgoing` is),
and thread it through `AbstractPacketInterface`. Config gains a `direction` field per
interface: `"tx" | "rx" | "both"` mapping to (`outgoing`, `incoming`) pairs. A `tx`-only
interface never enqueues received packets; an `rx`-only interface rejects `send`.

### Relay modes (user-selectable)

Add a host-level `relay.mode`:

- **`transport-node`** — set `transportEnabled: true`, becoming a full Reticulum Transport
  node that forwards packets and links for *other* peers across all enabled interfaces (the
  existing `TransportNode` path).
- **`bridge`** — leaf transport (`transportEnabled: false`) plus an explicit forwarding shim
  that only re-emits packets **received** on one enabled interface onto the **other** enabled
  interfaces the relay policy allows. This bridges the device's own media (e.g. receive on
  ntfy, retransmit on BLE) without announcing itself as a general-purpose transport.
- **`off`** — leaf only; interfaces carry the device's own traffic but nothing is relayed.

`bridge` is new work: a small forwarding component subscribed to each interface's `packets`
iterator that re-sends onto peers per the policy matrix, with loop suppression (packet-hash
dedup + hop limit) and rate limiting reusing `transport/bandwidth.ts`.

### Relay policy matrix

Optional fine-grained control: an `allow[fromKind][toKind]` matrix (default: all enabled
interfaces relay to all others, subject to direction). This lets a user say "relay ntfy→BLE
but never BLE→ntfy" for privacy or metering reasons. Defaults keep the simple case simple.

## Configuration schema

Extend [`HostInterfaceConfig`](../packages/host-core/src/types.ts). Each interface entry gains
a common shape plus interface-specific fields:

```ts
interface RelayInterfaceCommon {
  readonly enabled: boolean;
  readonly direction: "tx" | "rx" | "both";   // default "both"
  readonly relay: boolean;                     // participate in relay/bridge (default true)
  readonly bitrateHint?: number;               // overrides policy default
}

interface HostInterfaceConfig {
  // existing: tcp, websocket, auto, i2p, rnode
  readonly bluetooth: RelayInterfaceCommon & BleOptions;
  readonly optical:   RelayInterfaceCommon & OpticalOptions;   // camera/screen
  readonly acoustic:  RelayInterfaceCommon & AcousticOptions;  // mic/speaker
  readonly ntfy:      RelayInterfaceCommon & NtfyOptions;      // baseUrl, topic, secret…
}

interface HostRelayConfig {
  readonly mode: "off" | "bridge" | "transport-node";  // default "off"
  readonly policy?: RelayPolicyMatrix;
}
```

- Add `direction` and `relay` to the existing tcp/websocket/auto/i2p/rnode entries too, so the
  control is uniform.
- Provide `DEFAULT_INTERFACE_CONFIG` values that are safe-by-default: physical-medium and
  push interfaces **disabled** until explicitly enabled; relay `mode: "off"`.
- Config is persisted with the host's existing config store, validated on load, and supports
  **hot reload** — the Interface Manager diffs old vs new config and starts/stops/reconfigures
  only the affected interfaces without restarting Reticulum.

## Mini-app configuration API

Answer to the trust question: **a mini-app holding the new grant may perform full
configuration, including enabling hardware-sensitive interfaces, without a separate per-action
user prompt.** The grant *is* the consent gate, so it must be a high-tier, clearly-worded
capability shown prominently at install/grant time.

### New capability

Add capability string **`relay:configure`** (declared in the app manifest `capabilities`,
surfaced in [`app-registry/src/trust.ts`](../packages/app-registry/src/trust.ts) with an
explicit, scary-by-default description: "Turn your device's radios, camera, microphone,
speaker, and internet-push relaying on and off, and forward other people's traffic"). A
read-only companion **`relay:read`** exposes status/telemetry without mutation, for dashboards.

### New SDK namespace `relay`

Add `packages/miniapp-sdk/src/relay.ts`, exported from `index.ts` alongside `peers`, `host`,
etc. All methods route through `callHost("relay", method, payload, "relay:configure" | "relay:read")`.

```ts
// read (relay:read)
relay.list(): Promise<ReadonlyArray<RelayInterfaceStatus>>;  // kind, enabled, direction, online, bitrate, relay
relay.status(): Promise<RelayStatus>;                        // mode, online interfaces, bytes in/out, peers
relay.diagnostics(): Promise<ReadonlyArray<RelayInterfaceDiagnostic>>; // availability/permission per kind

// configure (relay:configure)
relay.setMode(mode: "off" | "bridge" | "transport-node"): Promise<void>;
relay.enable(kind: RelayInterfaceKind, options?: RelayInterfaceOptions): Promise<void>;
relay.disable(kind: RelayInterfaceKind): Promise<void>;
relay.setDirection(kind: RelayInterfaceKind, direction: "tx" | "rx" | "both"): Promise<void>;
relay.configure(kind: RelayInterfaceKind, patch: RelayInterfaceOptions): Promise<void>;
relay.setPolicy(policy: RelayPolicyMatrix): Promise<void>;
```

Mirror the shape of the existing `peers` namespace (typed errors, handle/summary style). Host
enforcement lives in `miniapp-runtime/src/host-api.ts`: verify the grant, validate the payload,
call the Interface Manager, return status. All mutations are audit-logged and rate-limited.

### Reticulum interface `diagnostics`

Extend `peers.diagnostics()`-style availability (`available | permission-required | unsupported
| offline | policy-disabled`) to relay interfaces so an app can discover what the device can
actually do before enabling it. Reuse the effect-boundary availability checks in
`peer-discovery/src/{audio,qr,ntfy}.ts`.

## User-facing configuration surface

A "Relay & Interfaces" settings screen in each host, backed by the same Interface Manager:

- **Desktop** ([`apps/host-desktop`](../apps/host-desktop/)): a settings pane listing every
  interface with an enable toggle, a TX/RX/both selector, an online indicator, live bitrate and
  bytes in/out, and a relay-mode selector (`off` / `bridge` / `transport-node`). ntfy shows
  topic/server fields; optical/acoustic show a live "listening / displaying" affordance.
- **Mobile** ([`apps/harness-mobile`](../apps/harness-mobile/)): same controls; enabling
  camera/mic/BLE triggers the OS permission prompt through the existing effect boundaries. This
  is the natural place to actually *use* optical/acoustic relaying.
- **Web** ([web host](web-host.md)): the browser-capable subset (WiFi via WS/WebRTC, ntfy,
  optical/acoustic via `getUserMedia`), with unsupported interfaces shown as `unsupported`.
- **Headless / CLI** ([`tp node`](desktop-host.md)): config file + flags
  (`--relay-mode`, `--enable ntfy --ntfy-topic … --direction rx`), and the existing localhost
  `/status` endpoint extended with the interface/relay table.

When a mini-app changes config via the API, the host UI reflects it live and (per the trust
decision) shows a persistent, dismissible notice of which app enabled which sensitive interface,
so a granted app cannot silently keep the camera/mic on invisibly.

## Security, privacy, and safety considerations

- **Physical-medium interfaces are promiscuous and privacy-sensitive.** Camera, microphone,
  and speaker are always-listening/emitting when enabled. Even though Reticulum payloads are
  encrypted, *enabling* these is a real-world exposure. Mitigations: disabled by default; OS
  permission prompts at enable time; a persistent host indicator whenever mic/camera relay is
  live; and the app-attribution notice above.
- **`transport-node` relaying forwards strangers' traffic.** Make the metering, hop limits, and
  bandwidth quotas from `transport/bandwidth.ts` apply to every new interface, with
  conservative defaults on metered/mobile links. Surface data usage per interface.
- **ntfy exposes metadata to a third party.** The server sees topic + timing + ciphertext size.
  Default to encrypted envelopes (reuse `peer-discovery/src/ntfy.ts`), document the metadata
  leak, and allow self-hosted `baseUrl`.
- **Loop and amplification safety in `bridge` mode.** Mandatory packet-hash dedup, hop-count
  decrement, and per-pair rate limits to prevent a two-interface device from becoming an echo
  amplifier.
- **Grant clarity.** `relay:configure` is broad; its trust description and install-time
  presentation must make the camera/mic/relay implications unmistakable, since the grant
  replaces per-action prompts.

## Testing and conformance

- **Unit** per adapter: framing round-trips (optical fountain-code recovery, acoustic
  FEC under simulated noise, ntfy encrypt/deframe), direction gating (`tx`-only rejects
  receive, `rx`-only rejects send). Extend `reticulum-interfaces/test/`.
- **Simulated media**: an in-memory optical channel (frame drop/reorder) and acoustic channel
  (noise/attenuation), following `ble/sim.ts` and `simulated-radio.test.ts` precedent, plus a
  mock ntfy server. Enables CI coverage without hardware.
- **Relay behavior**: bridge-mode loop suppression, `transport-node` forwarding across a mix of
  interfaces, policy-matrix enforcement. Extend the transport/relay tests and
  `sim-campaign` / `sim-adversaries`.
- **SDK/permission**: a hostile-app test that calls `relay.*` without `relay:configure` is
  denied; a granted app round-trips enable/disable/setDirection; audit-log assertions.
- **Hardware-gated**: real camera↔screen and speaker↔mic loopback between two devices, and a
  real `ntfy.sh` topic, tracked in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) and the device
  runbooks under [`conformance`](../conformance/).
- **Spec**: add an interface/relay spec unit under [`specs`](../specs/) (naming, direction
  semantics, relay modes, policy matrix) with golden vectors for the new framings.

## Phasing

1. **Foundation.** Interface Manager (registry + lifecycle + config diff/hot-reload);
   configurable `incoming`; `direction` on all existing interfaces; `relay.mode`
   `off`/`transport-node` wired to `transportEnabled`; extend `HostInterfaceConfig`,
   `InterfaceKind`, and `node-host.ts`. Desktop/CLI config surface for existing interfaces.
2. **Push transport.** ntfy `PacketInterface` (reusing `peer-discovery/src/ntfy.ts` crypto),
   `bridge` relay mode with loop suppression, relay policy matrix. Bluetooth promoted to
   first-class relay interface.
3. **Physical media.** Optical (camera↔screen) and acoustic (mic↔speaker) adapters with
   simulated-channel CI; mobile permission integration and live host indicators.
4. **App API.** `relay:configure` / `relay:read` capabilities, trust descriptions, `relay` SDK
   namespace, `host-api.ts` enforcement + audit log, app-attribution UI, diagnostics.
5. **Hardening.** Bandwidth/metering per interface, self-hosted ntfy, hardware-gated
   conformance, spec unit + golden vectors, docs (per-interface pages like
   [ble-interface.md](ble-interface.md), [websocket-interface.md](websocket-interface.md)).

## Open questions to resolve during design

- Optical density/scheme: monochrome QR vs color codes vs a custom high-density symbology, and
  fountain-code choice (RaptorQ licensing vs a simpler LT code).
- Acoustic band default (audible vs ultrasonic) and target bitrate; whether to vendor an
  existing modem (ggwave-style) or implement AFSK in-house.
- Whether `bridge` mode should be expressible purely as a `transport-node` with a restrictive
  policy, or remain a distinct simpler code path (current plan: distinct, for clarity and to
  avoid announcing transport).
- Persistence and revocation model for `relay:configure` when the granting app is uninstalled —
  should its enabled interfaces auto-disable.
