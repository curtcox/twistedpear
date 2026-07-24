# TwistedPear — Remaining software work


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: software
-->

This is the canonical backlog for work that can be completed without new devices,
a paid account, or a real multi-machine network. It contains only open work.

- Completed and reproducible work: [STATUS-COMPLETE.md](STATUS-COMPLETE.md)
- Device-, account-, and real-network-gated work: [STATUS-HARDWARE.md](STATUS-HARDWARE.md)
- Original milestone design: [archive/design/plan-v0.md](archive/design/plan-v0.md)

Short CI and nightly runs already exercise every soak path below. The open criterion is
the full planned duration, not basic implementation.

Last consolidated: 2026-07-21.

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
| Unified peer discovery and connection | Host announces are still process-local; apps have no platform-owned QR, manual, audio, Bluetooth, ntfy, WebRTC-signaling, or future LP2P pairing service | [Local peer discovery and connection plan](docs/local-peer-discovery-plan.md) |
| Device I/O and sensors for mini-apps | Phases 1–4 in progress: registry through actuators, plus raw tiers (`camera:frames` / `microphone:pcm` / `motion:samples` / `screen-capture`) with stream sidecar framing, tier negative controls, and fingerprint sanitization. Remaining: peer streaming, remote acquisition, host Devices UI | [Device I/O plan](docs/device-io-plan.md), [SPEC-DEVICE](specs/spec-device/spec.md) |

Hardware measurements, Apple entitlement/notarization work, real-LAN checks, Windows
verification, and device-specific soak criteria belong only in
[STATUS-HARDWARE.md](STATUS-HARDWARE.md).
