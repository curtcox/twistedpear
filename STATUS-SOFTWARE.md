# TwistedPear — Remaining software work


<!-- tp-doc
lifecycle: live
audited: 2026-07-31
register: software
-->

This is the canonical backlog for work that can be completed without new devices,
a paid account, or a real multi-machine network. It contains only open work.

- Completed and reproducible work: [STATUS-COMPLETE.md](STATUS-COMPLETE.md)
- Device-, account-, and real-network-gated work: [STATUS-HARDWARE.md](STATUS-HARDWARE.md)
- Original milestone design: [archive/design/plan-v0.md](archive/design/plan-v0.md)

Short CI and nightly runs already exercise every soak path below. The open criterion is
the full planned duration, not basic implementation.

Last consolidated: 2026-07-31.

## Release qualification

| ID | Status | Item | Current evidence | Completion criterion |
|---|---|---|---|---|
| RQ-LINK | open | Link keepalive soak | Short and nightly tiers pass via `npm run test:link-soak` | Run 1 h with `LINK_SOAK_DURATION_MS=3600000` |
| RQ-TRANSPORT | open | Transport-node soak | Short and nightly tiers pass via `npm run test:transport-node-soak` | Run 72 h with `TRANSPORT_SOAK_DURATION_MS=259200000` |
| RQ-INTEGRATION | open | Interface integration soak | Short and nightly tiers pass via `npm run test:integration-soak` | Run 24 h with `SOAK_DURATION_MS=86400000` |
| RQ-DIST | open | Distribution seeder soak | Short and nightly tiers pass via `npm run test:dist-soak` | Run 24 h with `SOAK_DURATION_MS=86400000` |
| RQ-MIXED | open | Mixed-network soak | Short and nightly tiers pass via `npm run test:mixed-network-soak` | Run 24 h with `SOAK_DURATION_MS=86400000` |
| RQ-MINIAPP | open | Mini-app runtime soak | Short and nightly tiers pass via `npm run test:miniapp-soak` | Run 24 h with `SOAK_DURATION_MS=86400000` |
| RQ-IOS | open | iOS simulator soak | Short and nightly tiers pass via `npm run test:ios-soak:required` | Run 24 h with `SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100` |
| RQ-DESKTOP | open | Desktop host soak | Short and nightly tiers pass via `npm run test:desktop-soak` | Run 72 h with `SOAK_DURATION_MS=300000 DESKTOP_SOAK_CYCLES=864` |
| RQ-RETICULUM | open | `reticulum-ts` 0.1.0 release | Package remains at `0.0.0`; CI-tier hardening is complete | Tag and publish after the 72 h transport soak; update [LIMITATIONS.md](LIMITATIONS.md) §1 |

Use the plan-duration Stage 8 runner rather than starting the soaks individually:

```sh
npm run validate:mac -- --stage 8 --plan-duration
```

The exact manual commands, monitoring criteria, and CI dispatch inputs live in
[the Mac validation runbook](docs/mac-validation.md#stage-8--soaks-tiered) and
[CI policy](docs/ci-policy.md#nightly-schedule-nightlyyml).

## Optional and non-blocking backlog

These items are explicitly outside the release exit criteria.

| Item | Current posture | Canonical detail |
|---|---|---|
| Node-to-node propagation peering | Use `lxmd` for meshed stores; the built-in node supports client sync | [Propagation node](docs/propagation-node.md) |
| React reconciler renderer | The declarative widget renderer is the supported v1 UI | [Mini-app runtime](docs/miniapp-runtime.md) |
| BLE and WebSocket spec community review | Drafts and publication checklist are ready; submission is a manual community step | [Upstream publication](docs/upstream-publication.md) |
| Reader-guide capture completion | 47 of 106 images are real desktop/browser host/runtime captures; exact remaining filenames and blockers are recorded per guide | [User guide](guide/images/README.md), [author guide](authors/images/README.md), [cookbook](cookbook/images/README.md) |
| Unified peer discovery and connection | Software landed: invitation/pairing, `peer:connect` SDK/broker, and desktop/native/web trusted chrome adapters (manual, QR, audio, ntfy, WebRTC/Reticulum, BLE). Remaining: physical/browser/service evidence gates and browser LP2P | [Implementation status](docs/local-peer-discovery-implementation.md), [evidence register](docs/local-peer-discovery-evidence.md), [plan](docs/local-peer-discovery-plan.md), [platform capabilities status](docs/platform-capabilities-status.md) |
| Device I/O and sensors for mini-apps | Plan phases 1–7 landed in software: registry, Device Manager, SDK (`inventory`/`diagnostics`/`open`/`close`/`read`/`write`/`stream`), derived+raw sensors, actuators, sidecar, admission, remote acquisition, NFC payment AID blocklist, biometric assertions, scalar sensors, [device-class runbook](docs/device-class-runbook.md). Host Devices & Sensors chrome is wired on desktop/android/ios/web. Desktop/web bridge location/camera/microphone plus browser battery/tts/haptics; native mobile bridges location/camera/haptics. Preview surfaces are host-rendered without sandbox pixel round-trip. SPEC-DEVICE session machine has TLA+ + Layer-3 vectors (`npm run formal:device-session`). Remaining: more Expo drivers (motion/battery), hardware-gated evidence, full InterfaceManager ownership on shipping hosts | [Device I/O plan](docs/device-io-plan.md), [SPEC-DEVICE](specs/spec-device/spec.md), [platform capabilities status](docs/platform-capabilities-status.md) |
| Realtime peer media (`line-check`) | Core software landed: app-scoped link observation and bounded probes; expiring two-sided readiness; host-authored outbound share offers; fail-closed five-plane egress binding and receive-side host sinks; corrected admission plus backpressure adaptation; `TPD2` timestamps, clock/jitter primitives, encoding profiles and codec Effects boundary; foreground-only signed invite routing; Line Check cookbook app; SPEC-STREAM executable/TLA+/trace/vector cross-check (`npm run formal:stream`). Peer routes on desktop, mobile, and web meter delivered bytes through `meterHostPeerRoute`, so a link summary reports `observed` only once something was measured and stays `declared`/low-confidence otherwise. Shipping hosts own a persistent `lxmf.delivery` destination via `createHostLxmfDelivery` (desktop 60s re-announce; mobile/web announce-once + resume) so invitations raise chrome without a mounted test agent. `PlaneStreamEgressFactory` now opens WebRTC / Pears-bulk / Reticulum via the peer-route bridge and CAS for derived snapshots, a live Pears Hyperdrive append path for latency-tolerant rungs, SPEC-STREAM admission of `cas-snapshot` when no live plane has supply, and a WebRTC media-track opener (`createWebRtcMediaTrackPlaneOpener` / `createDelegatedWebRtcMediaPlaneOpener` / `WebRtcRouteController.attachTrack`) preferred over the data-channel path; web and desktop hosts wire `openWebRtcMediaPlane` so Chromium `getUserMedia`+`addTrack`/`replaceTrack` feeds the plane table (desktop also offers WebRTC candidates beside Reticulum via `peer-webrtc-bridge.js`). Two headless peers on one Mac complete a decoded readiness exchange, a measured active probe, a signature-verified `session-invite` raised into host chrome, post-accept PCM call media round trips (`accept-invite` / `send-call` → `calls` in the proof), and derived+PCM `TPD2` carrier round trips (`npm run test:local-multipeer`); the ladder collapses, settles, and recovers across four adversarial link profiles and four transport classes (`npm run test:sim-media-ladder`); share grant/revoke/expiry/restart/indicator, invite accept/decline, and the invite → call → degrade → kill → revoke chrome arc are driven through the shipping desktop renderer (`npm run test:share-policy`); Maestro share-policy flow is authored (`.maestro/share-policy.yaml`, skippable `test:ios-sim:share-policy` / `test:android-emulator:share-policy`); `test:webrtc-gui-call` and `test:webrtc-gui-call:web` record desktop↔desktop and web↔web WebRTC track bytes after invite accept; both also record WebCodecs Opus encode/decode/speaker play (`callsOpusDuplex`) with voice-duplex AEC constraints on track attach. Android `PeerAudioModule` now mirrors iOS PCM play/record plus `recordVoicePcm16` AEC/NS/AGC. `LOCAL_MULTIPEER_REQUIRED=1 npm run test:local-multipeer -- --peers=hub,ios` (also `npm run test:local-multipeer:ios`) records hub↔iOS simulator discovery, readiness, probes, invites, post-accept call media, and realtime carriers (2026-08-01). Native mobile depends on `react-native-webrtc` + `@config-plugins/react-native-webrtc` with `registerGlobals` on native boot; worklet wires `openWebRtcMediaPlane` plus WebRTC beside Reticulum. `LOCAL_MULTIPEER_REQUIRED=1 npm run test:webrtc-gui-call:ios` records desktop↔iOS simulator WebRTC track bytes after invite accept (`callsWebRtc`, 2026-08-01). Android Maestro share-policy grant/revoke/expiry/restart is recorded on Medium_Phone (`SHARE_POLICY_REQUIRED=1 npm run test:android-emulator:share-policy`, 2026-08-01). Remaining software is shipping-host integration evidence: Android emulator peer in the multipeer matrix (`npm run test:local-multipeer:android` / `Link: online` to hub), and device-proven Android Opus duplex (native `PeerAudioModule` already autolinks). Hardware/network evidence remains in STATUS-HARDWARE | [Realtime peer media plan](docs/realtime-media-plan.md), [SPEC-STREAM](specs/spec-stream/spec.md), [platform capabilities](docs/platform-capabilities-status.md) |
| Freenet integration | F1–F5 software advanced on the [simulator-first plan](docs/freenet-simulator-first-work-plan.md): S4 browser unsupported by policy; Android/iOS BareKit probes require recorded `wasmExecuted` (still probe-ready until emulator/sim record); paced local-cross-node S2 100-sample series; F2 notify reconciliation + distinct-node F2 (HDLC + announce/LXMF)/F3 runner (CI smoke); user-supplied-binary supervisor (CI); mobile remote-node grant chrome wires Bare worklet contract, packet-tunnel, and Freenet-backed LXMF `PropagationServer` role with Maestro probes (disclosure/refusal/revoke/write-confirm/unavailable/reconnect); packaging posture = user-supplied supervised binary. Remaining: live S2/S7 write auth, signing/embedding, recorded simulator BareKit evidence, physical BareKit confirmation. | [Integration plan](docs/freenet-integration-plan.md), [simulator-first plan](docs/freenet-simulator-first-work-plan.md), [Option A ADR](docs/adr-freenet-app-execution.md), [F0 evidence](conformance/freenet-spike/evidence-status.json) |

Hardware measurements, Apple entitlement/notarization work, real-LAN checks, Windows
verification, and device-specific soak criteria belong only in
[STATUS-HARDWARE.md](STATUS-HARDWARE.md).
