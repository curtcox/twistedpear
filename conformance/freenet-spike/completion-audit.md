# Freenet plan completion audit

<!-- tp-doc
lifecycle: live
audited: 2026-07-29
register: none
-->

This audit maps every gate and exit criterion in
[`docs/freenet-integration-plan.md`](../../docs/freenet-integration-plan.md) to
current evidence. “Implemented” does not mean that a live or hardware gate
passed.

| Item | Status | Evidence or remaining work |
|---|---|---|
| S1 Bare SDK | complete | `s1-report.md`, exact shims, offline bundle and live Atlas read |
| S2 update-to-notify | partial | `measured-roundtrip.json`: local 3-node, 100 samples/size, p95 ~89 ms (≤64 KiB) / ~256 ms (1 MiB) on local-executor notify; live series and cross-node notify still open |
| S3 convergent log | complete | `s3-report.md`, Rust contract, native convergence tests and committed measurements; rebuilding requires the pinned Rust 1.97.1 toolchain and its `wasm32-unknown-unknown` target |
| S4 sandboxed WASM | partial | Node passes; browser deliberately unsupported (hardened CSP / Option A); Android/iOS simulator BareKit probes require explicit `wasmExecuted`; physical device confirmation pending |
| S5 bundled node | partial | installed macOS size + signature inspection; Linux/Windows compressed release archive sizes in `s5-bundling-matrix.json`; fresh verify + TP embedding/signing remain |
| S6 API churn | complete | `churn-report.md` and exact SDK/core/stdlib pins |
| S7 live-app interop | partial | Atlas read passes; a public update requires explicit authorization and an app signing/curator path |
| S8 privacy posture | complete for F1 | `docs/security-review.md`; mobile remote-node grant chrome + validation landed (simulator software path) |
| F0 gate | partially open | S2 local + S6 + S8 satisfy proceed criteria for roles 1/3; role 2 viable on measured path; live S2 is evidence-only per plan §12 |
| F1 package/CAS | implemented, exit incomplete | bridge, locator vector, verified fetch ranking and `tp publish --freenet` exist; `tp node --freenet` configures an external node; `--freenet-binary` supervises a user-supplied hash-verified executable; a real two-host publish/install still needs an irreversible live write |
| F2 packet interface | wired + state-reconciling notify | SPEC-FREENET packet-log WASM; notifications treated as hints with gap recovery/dedup; HDLC live proof; simulated announce+LXMF. Live multi-Freenet-node confirmation optional |
| F3 propagation backing | WASM + store proof + host mirror | SPEC-FREENET propagation-set WASM; `FreenetPropagationStore`; isolated offline-A/retrieve-B; `createNodeHost` attaches remote mirror when freenet URL + propagation role enabled |
| F4 provisioning | supervision software-complete; redistribute gated | `FreenetSupervisor` + CLI `--freenet-binary`; signed redistributed daemon still gated on S5 |
| F5 capability/UI | capability + desktop + mobile grant chrome | `freenet:contract` + HOST_API 0.11.0; desktop Settings; mobile remote-node disclosure/refusal/revoke; web off per Option A |
| F6 app-execution ADR | Option A accepted | [adr-freenet-app-execution.md](../../docs/adr-freenet-app-execution.md); B/C deferred on S4/platform-shape |

## External evidence still required

- Explicit authorization before any live-network contract update. Freenet
  publication is irreversible and exposes operation metadata.
- A recorded cross-node notify series after B2 reconciliation (use
  `FREENET_FORCE_CROSS_NODE=1`; do not overwrite gate artifacts from smoke runs).
- A physical BareKit mobile confirmation for release claims.
- Linux and Windows artifact hosts plus a fresh macOS artifact and signing /
  notarization credentials.
- Atlas write authority or a supported non-curator live interop target.

These are not represented as zeroes, skips, or successful software tests.

## Software pause

As of 2026-07-29, simulator-first software for S4 policy, F2 reconciliation,
user-supplied-binary supervision, and mobile remote-node grant chrome is
landed alongside the earlier F1–F3/F5 paths. Remaining gates need signing
credentials, live-write authorization, or physical-device confirmation.
