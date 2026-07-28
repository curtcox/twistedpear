# Freenet plan completion audit

<!-- tp-doc
lifecycle: live
audited: 2026-07-28
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
| S3 convergent log | complete | `s3-report.md`, Rust contract, native convergence tests and committed measurements; the current machine cannot rebuild WASM because its Rust installation lacks the pinned WASM target |
| S4 sandboxed WASM | partial | Node passes; browser CSP blocks compilation; physical BareKit device run is pending |
| S5 bundled node | partial | installed macOS size + signature inspection; Linux/Windows compressed release archive sizes in `s5-bundling-matrix.json`; fresh verify + TP embedding/signing remain |
| S6 API churn | complete | `churn-report.md` and exact SDK/core/stdlib pins |
| S7 live-app interop | partial | Atlas read passes; a public update requires explicit authorization and an app signing/curator path |
| S8 privacy posture | complete for F1 | `docs/security-review.md`; mobile and expanded roles retain explicit warnings |
| F0 gate | partially open | S2 local + S6 + S8 satisfy proceed criteria for roles 1/3; role 2 viable on measured path; live S2 is evidence-only per plan §12 |
| F1 package/CAS | implemented, exit incomplete | bridge, locator vector, verified fetch ranking and `tp publish --freenet` exist; `tp node --freenet` was intentionally not added before provisioning, and a real two-host publish/install requires an irreversible live write |
| F2 packet interface | wired + announce/LXMF (sim) + relay policy | SPEC-FREENET packet-log WASM; `FreenetInterface`; host `freenet` at 90 kbps; HDLC live proof; simulated announce+LXMF; BridgeForwarder freenet source/dest policy. Live multi-Freenet-node confirmation optional |
| F3 propagation backing | WASM + store proof + host mirror | SPEC-FREENET propagation-set WASM; `FreenetPropagationStore`; isolated offline-A/retrieve-B; `createNodeHost` attaches remote mirror when freenet URL + propagation role enabled |
| F4 provisioning | blocked by S5 | no daemon bundle, supervisor, platform artifact matrix or signing result |
| F5 capability/UI | capability + desktop chrome | `freenet:contract` + HOST_API 0.11.0; desktop Settings for contracts and HDLC Freenet interface (URL/rendezvous); status rows; mobile/web off per S8 |
| F6 app-execution ADR | Option A accepted | [adr-freenet-app-execution.md](../../docs/adr-freenet-app-execution.md); B/C deferred on S4/platform-shape |

## External evidence still required

- Explicit authorization before any live-network contract update. Freenet
  publication is irreversible and exposes operation metadata.
- An honest cross-node notify series that survives locator reordering, if F2
  needs peers on distinct Freenet nodes.
- A physical BareKit mobile run.
- Linux and Windows artifact hosts plus a fresh macOS artifact and signing /
  notarization credentials.
- Atlas write authority or a supported non-curator live interop target.

These are not represented as zeroes, skips, or successful software tests.
