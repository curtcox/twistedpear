# Freenet plan completion audit

<!-- tp-doc
lifecycle: live
audited: 2026-07-29
register: none
-->

This audit maps every gate and exit criterion in
[`docs/freenet-plan.md`](../../docs/freenet-plan.md) to
current evidence. “Implemented” does not mean that a live or hardware gate
passed.

| Item | Status | Evidence or remaining work |
|---|---|---|
| S1 Bare SDK | complete | `s1-report.md`, exact shims, offline bundle and live Atlas read |
| S2 update-to-notify | partial | `measured-roundtrip.json`: local-executor and paced cross-node 100-sample series; p95 ~89/256 ms local-executor and ~111 ms / ~2.5 s cross-node (≤64 KiB / 1 MiB); live series still open |
| S3 convergent log | complete | `s3-report.md`, Rust contract, native convergence tests and committed measurements; rebuilding requires the pinned Rust 1.97.1 toolchain and its `wasm32-unknown-unknown` target |
| S4 sandboxed WASM | partial | Node passes; browser deliberately unsupported (hardened CSP / Option A); Android/iOS simulator BareKit probes require explicit `wasmExecuted`; physical device confirmation pending |
| S5 bundled node | partial | installed macOS size + signature inspection; Linux/Windows compressed release archive sizes in `s5-bundling-matrix.json`; fresh verify + TP embedding/signing remain |
| S6 API churn | complete | `churn-report.md` and exact SDK/core/stdlib pins |
| S7 live-app interop | partial | Atlas read passes; a public update requires explicit authorization and an app signing/curator path |
| S8 privacy posture | complete for F1 | `docs/security-review.md`; mobile remote-node grant chrome + contract/packet-tunnel/Freenet-backed LXMF PropagationServer + Maestro probes (simulator software path) |
| F0 gate | partially open | S2 local + S6 + S8 satisfy proceed criteria for roles 1/3; role 2 viable on measured path; live S2 is evidence-only per plan §12 |
| F1 package/CAS | implemented, exit incomplete | bridge, locator vector, verified fetch ranking and `tp publish --freenet` exist; `tp node --freenet` configures an external node; `--freenet-binary` supervises a user-supplied hash-verified executable; a real two-host publish/install still needs an irreversible live write |
| F2 packet interface | wired + state-reconciling notify; distinct-node announce+LXMF | SPEC-FREENET packet-log WASM; notifications treated as hints with gap recovery/dedup; HDLC live proof; announce+LXMF over real Freenet packet-log (`prove-f2-announce-lxmf.mjs` in `test:freenet-interface` and `test:freenet-distinct-nodes`); `test:freenet-distinct-nodes` for cross-node F2/restart (CI smoke); simulated announce+LXMF. Public multi-host optional |
| F3 propagation backing | WASM + store proof + host mirror + distinct-node runner | SPEC-FREENET propagation-set WASM; `FreenetPropagationStore`; isolated offline-A/retrieve-B; distinct publish-A/stop-A/retrieve-B; `createNodeHost` attaches remote mirror when freenet URL + propagation role enabled |
| F4 provisioning | supervision software-complete; redistribute gated | `FreenetSupervisor` + CLI `--freenet-binary` + `test:freenet-supervisor` (CI with hash-verified release archive); signed redistributed daemon still gated on S5 |
| F5 capability/UI | capability + desktop + mobile grant chrome | `freenet:contract` + HOST_API 0.11.0; desktop Settings; mobile remote-node disclosure/refusal/revoke/session + Bare worklet contract, packet-tunnel (`FreenetInterface`), and Freenet-backed LXMF `PropagationServer` role (Maestro); web off per Option A; S4 BareKit measurements still probe-ready |
| F6 app-execution ADR | Option A accepted | [Option A ADR](../../archive/decisions/freenet-app-execution.md); B/C deferred on S4/platform-shape |

## External evidence still required

- Explicit authorization before any live-network contract update. Freenet
  publication is irreversible and exposes operation metadata.
- A physical BareKit mobile confirmation for release claims.
- Linux and Windows artifact hosts plus a fresh macOS artifact and signing /
  notarization credentials.
- Atlas write authority or a supported non-curator live interop target.

These are not represented as zeroes, skips, or successful software tests.

## Software pause

As of 2026-07-29, simulator-first software for S4 policy, F2 reconciliation,
distinct-node F2/F3 runners including announce+LXMF (CI smoke), user-supplied-binary
supervision (CI), mobile remote-node grant/session chrome (including Bare worklet
contract, packet-tunnel, and Freenet-backed LXMF propagation role plus Maestro
probes for disclosure/refusal/revoke/write-confirm/unavailable/reconnect), and a
reviewed paced local-cross-node 100-sample notify series are landed alongside
the earlier F1–F3/F5 paths. Android/iOS BareKit `wasmExecuted` measurements
remain probe-ready until an emulator or simulator record run. Remaining gates
need signing credentials, live-write authorization, or physical-device
confirmation.
