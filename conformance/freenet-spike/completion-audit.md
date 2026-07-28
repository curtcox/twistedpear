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
| S2 update-to-notify | pending, negative diagnostic | `measure-roundtrip.mjs` plus self-cleaning `run-local-s2.mjs`; 0.2.112 reaches all three APIs but the first retained PUT times out, so no latency is claimed |
| S3 convergent log | complete | `s3-report.md`, Rust contract, native convergence tests and committed measurements; the current machine cannot rebuild WASM because its Rust installation lacks the pinned WASM target |
| S4 sandboxed WASM | partial | Node passes; browser CSP blocks compilation; physical BareKit device run is pending |
| S5 bundled node | partial | installed macOS binary size measured; fresh artifact verification, Linux/Windows, embedding, signing and notarization remain |
| S6 API churn | complete | `churn-report.md` and exact SDK/core/stdlib pins |
| S7 live-app interop | partial | Atlas read passes; a public update requires explicit authorization and an app signing/curator path |
| S8 privacy posture | complete for F1 | `docs/security-review.md`; mobile and expanded roles retain explicit warnings |
| F0 gate | closed | S6 and S8 pass, but S2 has no valid local/live 100-sample result |
| F1 package/CAS | implemented, exit incomplete | bridge, locator vector, verified fetch ranking and `tp publish --freenet` exist; `tp node --freenet` was intentionally not added before provisioning, and a real two-host publish/install requires an irreversible live write |
| F2 packet interface | correctly absent | S2 gate is closed; no bitrate, latency, policy row or interface stub is guessed |
| F3 propagation backing | not implemented | S3 permits design work, but the plan-wide gate remains closed and the required node-A-offline/node-B retrieval proof needs a functioning multi-node contract path |
| F4 provisioning | blocked by S5 | no daemon bundle, supervisor, platform artifact matrix or signing result |
| F5 capability/UI | not implemented | depends on an honestly supportable node/provisioning surface; no capability grant has been weakened or predeclared |
| F6 app-execution ADR | blocked by S4 and S7 | Option A has read evidence only; Option B lacks device/browser support; the decision remains deliberately unresolved |

## External evidence still required

- A Freenet release or topology that passes retained PUT and cross-node
  subscription, followed by the prescribed 100 samples for all three sizes.
- Explicit authorization before any live-network contract update. Freenet
  publication is irreversible and exposes operation metadata.
- A physical BareKit mobile run.
- Linux and Windows artifact hosts plus a fresh macOS artifact and signing /
  notarization credentials.
- Atlas write authority or a supported non-curator live interop target.

These are not represented as zeroes, skips, or successful software tests.
