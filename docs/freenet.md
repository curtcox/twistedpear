# Freenet integration — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-02
register: software
counterpart: docs/freenet-plan.md
-->

**This document describes what is built and verified today.** Work that is planned
but not yet built lives in the [Freenet integration plan](freenet-plan.md); the remaining
sequencing lives in the
[simulator-first work plan](freenet-simulator-first-work-plan.md). Neither of those
overrides the ledger below.

TwistedPear reaches **Freenet** (the 2023 Rust rewrite at [freenet.org](https://freenet.org/),
formerly Locutus — *not* [Hyphanet](https://www.hyphanet.org/), the original Java network)
through an adapter, the same way it treats I2P and Hyperswarm: an external network, never a
dependency of protocol code. See [prior art](prior-art.md) for why Freenet is adjacent to but
not aligned with TwistedPear's goals.

## What Freenet actually is (verified 2026-07-28)

Facts established from freenet.org and freenet/freenet-core, not from assumption. Anything
not verifiable from public docs is listed as a spike in the [plan](freenet-plan.md) §4, not asserted here.

| Property | Value | Consequence for this plan |
|---|---|---|
| Implementation | Rust; `cargo install --path crates/core`, plus `fdev` tooling | No TypeScript node exists. Integration is client-side or binary-bundling. |
| Latest release | 0.2.112, 2026-07-27 | Pre-1.0 and fast-moving. Version pinning is mandatory. |
| Client API | WebSocket, default port **50509**, path `/v1/contract/command`, optional auth token | This is the entire integration surface. Same shape as I2P's SAM bridge. |
| Client SDK | `@freenetorg/freenet-stdlib` (TypeScript) | Usable directly from Node, Electron, and browsers; Bare is a spike ([plan](freenet-plan.md) §4, S1). |
| Client operations | `put`, `get`, `update`, `subscribe`, `disconnect`, `DelegateRequest` | **There is no client-visible stream or direct-peer-message primitive.** |
| Peer transport | Encrypted UDP, hole-punching, gateways on default port **31337** | Internal to the node. Not reachable from the client API. |
| Unit of state | Contract: WASM code + params; key = 32-byte hash of code+params | Content-addressed, which lines up well with 256t/CAS ([plan](freenet-plan.md) §5). |
| Consistency | Summary/delta sync with a **commutative merge** function per contract | Great for sets and logs. Hostile to ordered byte streams ([plan](freenet-plan.md) §6). |
| Topology | Small-world ring over locations 0.0–1.0, O(log n) hops, subscription trees | Popular contracts self-replicate; cold contracts pay full routing cost. |
| Delegates | WASM actors holding keys/secrets, running **locally** on the user's device | Messaging to delegates is local-only; not a network primitive. |
| Web UIs | Vite/TS or Dioxus, wrapped by `fdev website publish` into a signed web-container contract, served over the node's HTTP surface; the shell injects the WS auth token | DOM-based. Directly conflicts with host-rendered widgets ([plan](freenet-plan.md) §7). |
| Live apps | River (chat), Delta (publishing), Atlas (discovery), freenet-git | Real interop targets for F0 spikes. |

**The single most consequential fact:** the Freenet client API exposes *replicated state*,
not *channels*. Every transport role below is therefore a matter of encoding movement of
bytes as convergent mutation of contract state. That is a natural fit for role 1
(distribution), a plausible fit for role 3 (propagation), and an open question for role 2
(packet tunnel). The plan is sequenced accordingly.

## Scope boundary and non-negotiables

Constraints from [AGENTS.md](../AGENTS.md) that this plan must not violate:

- **Sans-IO.** No Freenet client, WebSocket, timer, or clock read may appear inside
  configured protocol roots. The client lives in `bridge-freenet`; protocol code sees
  intents only. `npm run sansio` gates every phase touching a protocol boundary.
- **Upstream wire compatibility.** Reticulum and LXMF byte-level compatibility with the
  pinned Python references is unaffected. A Freenet interface carries existing Reticulum
  packets unchanged; it never alters framing above the interface.
- **No weakening of capability, signature, sandbox, budget, or store-posture checks.** A
  Freenet-sourced package is verified by exactly the same manifest signature and per-file
  SHA-256 path as a Hyperdrive-sourced one ([package format](package-format.md)); the
  transport is untrusted in both cases.

Out of scope: changing Reticulum's packet format, the identity model, the LXMF layer, or the
trust root. Freenet is never a trust root — a contract key is a locator, not an authority.

## What a user can actually do today

With an external Freenet node running and `interfaces.freenet.url` set (or a
user-supplied binary via `--freenet-binary`): publish a `.tpkg` locator
(`tp publish --freenet`), fetch a package over the `freenet` path, run a
Reticulum link over `FreenetInterface`, back LXMF propagation with a Freenet
store, and grant a mini-app `freenet:contract` on desktop. Mobile hosts can
accept a simulator-verified remote-node grant (off by default) that attaches
contract, packet-tunnel, and/or Freenet-backed LXMF propagation role in the Bare
worklet. The user path is
documented in [Using Freenet](../guide/11-using-freenet.md), with a worked
[mini-app recipe](../cookbook/10-apps-that-use-freenet.md). Not available: any
bundled/redistributed node, browser Freenet support, or any contract or delegate
execution on a TP node.

## Implementation status (2026-07-29)

This section is the authoritative done/remaining ledger. Every "done" row below is
backed by a committed artifact; nothing here is claimed from intent. The
machine-readable mirror is
[conformance/freenet-spike/evidence-status.json](../conformance/freenet-spike/evidence-status.json),
and the per-exit-criterion mapping is
[completion-audit.md](../conformance/freenet-spike/completion-audit.md).

### F0 spikes

| Spike | Status | Done | Remaining |
|---|---|---|---|
| S1 Bare SDK | **done** | Pinned SDK bundles and reads live Atlas under Bare with exact shims (`bare-ws@2.0.4`, `bare-encoding@1.0.3`); `s1-report.md`, `s1-live-read.json` | — (mobile lifecycle is F4/S8, not S1) |
| S2 update→notify latency | **partial** | Local 3-node harness, 100 samples/size: local-executor p95 ~89 ms (≤64 KiB) / ~256 ms (1 MiB); paced cross-node notify p95 ~111 ms (≤64 KiB) / ~2.5 s (1 MiB); `measured-roundtrip.json` | Authorized live-network 100-sample series |
| S3 convergent log | **done** | Pinned Rust ordered-log contract, native convergence tests, growth/merge curve; `s3-report.md`, `s3-measurements.json` | — |
| S4 sandboxed WASM | **partial** | Node workers execute WASM and keep the watchdog kill guarantee; browser CSP deliberately keeps web unsupported (Option A); Android/iOS simulator BareKit probes require explicit `wasmExecuted`; `s4-support-matrix.json` | Physical BareKit release confirmation. **Option B stays closed.** |
| S5 bundled node | **partial** | Installed macOS universal binary ≈93 MiB; Linux/Windows compressed archive sizes and SHA-256s in `s5-bundling-matrix.json` | Fresh macOS artifact whose signature verifies strictly; signed + notarized TwistedPear bundle embedding the binary. **F4 stays blocked.** |
| S6 API churn | **done** | Ten consecutive core releases kept contract ops and key derivation stable; `churn-report.md` plus exact SDK/core/stdlib pins | — (recheck on every pin bump) |
| S7 live-app interop | **partial** | Read half passed: the TS adapter read the live Atlas CBOR index through a localhost node; `s7-atlas-read.json` | Write half needs explicit authorization — even a rejected update publishes public operation metadata |
| S8 privacy posture | **done for F1** | Threat model in [security review](security-review.md) §F9; mobile remote-node grant/role path recorded | Physical mobile confirmation for release claims |

**Gate verdict: partially open.** S2 (local), S6, and S8 satisfy the proceed criteria
for roles 1 and 3 and make role 2 viable on the measured path. Live S2 is evidence,
not a gate, per the [plan](freenet-plan.md) §12.

### Phases

| Phase | Status | Done | Remaining |
|---|---|---|---|
| F1 package/CAS | **implemented; exit criterion not met** | `bridge-freenet` with pinned SDK client, locator/package state encoder, signed-locator + 256t verification, Rust locator contract pinned to an exact upstream commit, SPEC-FREENET locator vector, `freenet` fetch-path ranking, IP-bulk budget behavior, `tp publish --freenet`, `tp node --freenet` (external node URL) | The stated exit criterion — publish from host A, install on host B with `--force-path freenet` — requires an irreversible live write and is unmet |
| F2 packet interface | **wired; distinct-node announce+LXMF** | SPEC-FREENET packet-log WASM + vectors, `FreenetInterface` / `FreenetContractPacketLogBackend` with notify reconciliation, host-core `freenet` kind at the S2-derived 90 kbps, `test:freenet-interface` HDLC + announce/LXMF against a real node, `test:freenet-distinct-nodes` for cross-node F2 (HDLC + announce/LXMF)/F3/restart, paced local-cross-node S2 100-sample series in `measured-roundtrip.json`, simulated announce+LXMF over FreenetInterface-only peers, BridgeForwarder relay policy as source and destination | Public two-host Freenet-node announce+LXMF remains optional confirmation |
| F3 propagation backing | **wired** | SPEC-FREENET propagation-set WASM + vectors, encode/decode/merge, `PropagationRemoteMirror` seam, `FreenetPropagationStore` (16-byte destination grouping, PUT/UPDATE merge), isolated offline-A/retrieve-B proof, distinct-node publish-A/stop-A/retrieve-B via `test:freenet-distinct-nodes`, `createNodeHost` attaches the mirror when `roles.propagation` + `interfaces.freenet` URL are set | Public multi-Freenet-node retrieval remains optional confirmation |
| F4 node provisioning | **software supervision started; redistribution gated** | `FreenetSupervisor` in host-core (ephemeral port, generated token kept out of URLs/logs, readiness, bounded restart, host data-dir isolation, starting/online/degraded/failed); `tp node --freenet-binary` / `--freenet-binary-sha256`; `test:freenet-supervisor` in CI against the hash-verified release archive | Signed/notarized redistribution and embedded packaging remain S5/signing gates |
| F5 capability + chrome | **landed (software)** | `freenet:contract` in `CAPABILITY_DEFINITIONS` with irreversible-update wording; HOST_API 0.11.0 brokers `get`/`put`/`update` with confirmation on put/update; `createNodeHost` exposes `freenetBackend` when a URL is set; desktop Settings for contracts enable / URL / auth token plus an HDLC interface toggle with peer rendezvous and explicit side 0/1 selection; mobile remote-node grant chrome pushes `set-freenet-config` into the Bare worklet for contract, packet-tunnel (`FreenetInterface`), and Freenet-backed LXMF `PropagationServer` (Maestro covers disclosure/refusal/revoke/write-confirm/unavailable/reconnect/token-safe/propagation-role); Node status and [platform capability](platform-capabilities-status.md) rows | Web stays off per Option A; recorded Android/iOS BareKit measurements and physical mobile confirmation for release claims |
| F6 app-execution ADR | **decided** | [Option A accepted](../archive/decisions/freenet-app-execution.md): mini-apps are Freenet clients, not hosts, on S7 read evidence and S4/S8 blockers for B/C | B reopens only if S4 clears; C remains a separate proposal |

### Detail

- **Landed:** pinned TypeScript SDK adapter; F1 locator/package state encoder;
  signed-locator and 256t verification; Rust locator contract source pinned to an
  exact upstream commit; SPEC-FREENET locator vector; `freenet` fetch-path
  ranking and IP-bulk budget behavior; opt-in `tp publish --freenet`; S1 Bare
  packaging and live-read probe; S8 threat model.
- **S1 passed with exact shims:** the SDK bundles and reads the live Atlas index
  under Bare using `bare-ws@2.0.4` behind a narrow compatibility adapter and
  `bare-encoding@1.0.3` for FlatBuffers text globals. This proves Bare client
  viability; mobile lifecycle and remote-node trust remain separate gates.
- **Contract build passed:** the locator contract passes native Rust tests and
  builds with the pinned Rust 1.97.1 `wasm32-unknown-unknown` toolchain. The
  committed WASM size and hashes are pinned in the SPEC-FREENET vector. This is
  contract evidence only; S5 node-binary bundling remains open.
- **S6 passed with pins:** ten consecutive core releases kept the contract
  operations and key derivation stable, despite a very fast release cadence.
- **S3 passed conditionally:** the pinned Rust ordered-log spike converges
  under concurrent/reordered inputs with a bounded per-direction retention
  window. Its growth and native merge-cost curve is recorded, but S2 still
  determines whether using it as a packet interface is viable.
- **S4 is partial under Option A:** Node workers execute WASM and retain the
  watchdog kill guarantee; the browser sandbox CSP deliberately omits
  `wasm-unsafe-eval`, so embedded Freenet WASM on web is unsupported; Android
  and iOS simulator BareKit probes require explicit `wasmExecuted`. Physical
  BareKit confirmation is a release gate. Option B is not open.
- **S5 is partial:** the installed 0.2.112 macOS universal binary adds roughly
  93 MiB, but strict verification of that installed copy fails. Linux/Windows
  compressed release-archive sizes are recorded in `s5-bundling-matrix.json`
  (~15–18 MiB archives; Windows `freenet.exe` ~46 MiB). Fresh-signature
  verification and a signed/notarized TwistedPear embedding remain open, so F4
  is not open.
- **S7 read interop passed:** the TypeScript adapter read the live Atlas CBOR
  index through the localhost node. The write half remains pending explicit
  approval because even a rejected/idempotent update exposes public operation
  metadata.
- **S2 local gate passed:** a self-cleaning three-node harness records 100
  samples per size with p95 update→notify of ~89 ms (1 KiB / 64 KiB) and
  ~256 ms (1 MiB) on the local-executor notify path. Topology bind/advertise
  and the divergent 0.2.112 UPDATE encodings are handled by a hash-first,
  full-WASM-on-missing-contract compatibility retry. Live-network confirmation
  still needs explicit authorization;
  per the [plan](freenet-plan.md) §12, live runs are evidence rather than gates. A paced local-cross-node
  100-sample notify series is recorded in `measured-roundtrip.json`
  (`FREENET_FORCE_CROSS_NODE=1`); unpaced blasts can drop Freenet 0.2.112
  subscription snapshots, so the harness paces samples and can GET-reconcile
  when notifies are missing.
- **F2 interface wired:** SPEC-FREENET packet-log WASM + vectors,
  `FreenetInterface` / `FreenetContractPacketLogBackend`, host-core `freenet`
  kind at the S2-derived 90 kbps policy bitrate,
  `npm run test:freenet-interface` HDLC exchange plus announce+LXMF,
  simulated announce+LXMF over FreenetInterface-only peers, distinct-node
  announce+LXMF via `prove-f2-announce-lxmf.mjs`, and BridgeForwarder
  relay-policy coverage with freenet as source and destination. Public
  multi-host Freenet-node announce+LXMF remains optional confirmation.
- **F3 codec foundation landed:** SPEC-FREENET
  propagation-set vectors and `bridge-freenet` encode/decode/merge cover
  per-destination LXMF ciphertext sets.
- **F3 mirror seam landed:** `PropagationRemoteMirror` lets
  `PropagationServer` publish debounced snapshots asynchronously;
  `FreenetPropagationStore` groups by 16-byte destination hash and PUT/UPDATE
  merges. The propagation-set WASM contract is pinned in SPEC-FREENET, and
  `npm run test:freenet-propagation` records an isolated offline-A/retrieve-B
  store proof. When `roles.propagation` and `interfaces.freenet` are enabled
  with a URL, `createNodeHost` attaches the Freenet store as the remote mirror
  and pulls on startup.
- **F5 capability surface landed (software):** `freenet:contract` is in
  `CAPABILITY_DEFINITIONS` with irreversible-update wording; HOST_API 0.11.0
  brokers `get` / `put` / `update` with confirmation on put/update.
  `createNodeHost` exposes `freenetBackend` when `interfaces.freenet.url` is
  set (independent of the HDLC `enabled` flag); desktop injects a lazy proxy
  driven by `set-freenet-config`. Desktop Settings expose contracts enable / URL /
  optional auth token, plus an HDLC Freenet interface toggle with peer rendezvous;
  Node status shows Freenet rows. Mobile remote-node grant chrome is
  simulator-verified and off by default; accepted grants attach contract,
  packet-tunnel, and Freenet-backed LXMF `PropagationServer` backends in the
  Bare worklet. Web remains off under Option A.
- **F6 Option A ADR recorded:** [the app-execution ADR](../archive/decisions/freenet-app-execution.md)
  accepts mini-apps as Freenet clients (not hosts), based on S7 read evidence
  and S4/S8 blockers for B/C.
- **Gate partially open:** S2 local latency, S6, and S8 satisfy the F0 proceed
  criteria for roles 1 and 3, and make role 2 viable on the measured path.
  F2/F3/F5 software wiring, user-supplied-binary supervision, and the F6 Option A
  ADR are landed; signed redistribution remains gated on S5; live S2/S7 write need
  authorization.
  Current machine-readable status is
  [conformance/freenet-spike/evidence-status.json](../conformance/freenet-spike/evidence-status.json)
  and
  [measured-roundtrip.json](../conformance/freenet-spike/measured-roundtrip.json).

## Documentation and examples

**Status: complete (2026-07-29).** [Using Freenet](../guide/11-using-freenet.md)
covers the external pinned node, CLI and desktop configuration, package
publication/installation, interface side selection, security posture, and exact
offline/real-node verification commands. The
[Contract notebook recipe](../cookbook/10-apps-that-use-freenet.md) and runnable
[`cookbook/examples/contract-notebook`](../cookbook/examples/contract-notebook/README.md)
exercise brokered `get`, `put`, and `update`, including the host confirmation
boundary.

Delivered:

1. **A user-facing walkthrough** in the guide. It covers, in order: obtaining
   and running an external Freenet
   node; the pinned version and why pinning is mandatory (S6);
   `tp node --freenet <url>` and `--freenet-interface`; `tp publish --freenet`;
   installing with `--force-path freenet`; the desktop Settings surface (contracts
   enable, URL, optional auth token, HDLC interface toggle, peer rendezvous) and
   the Node status rows; and — not as a footnote — that Freenet is off by default,
   that a contract update is irreversible and globally published, that mobile remote-node grants
   require explicit disclosure, and that web stays unsupported under Option A.
2. **A verification recipe.** Exact commands with expected output let a user
   confirm the integration on their own machine rather than trusting this document:
   the offline suites from tier 1–2 below, then the real-node suites from tier 3.
   State plainly which steps need a node and which do not.
3. **A worked mini-app example** exercises `freenet:contract` through the broker —
   `get`, then `put`/`update` with the confirmation prompt.
4. **Feature-status rows.** `guide/appendix-feature-status.md`,
   `cookbook/appendix-feature-status.md`, and
   [platform capabilities status](platform-capabilities-status.md) carry per-host
   support matching the phase ledger above: desktop/node conditional on an external or
   user-supervised node, mobile grant chrome simulator-verified, web off.
5. **The two documentation errors** named in the [plan](freenet-plan.md) are fixed.

## CI verification

**Policy decision (2026-07-29):** CI may download a pinned, hash-verified Freenet
release archive and run a real node. This supersedes the "offline-by-default"
reading of the [plan](freenet-plan.md) §11 for CI *jobs* — the suites themselves must still skip cleanly without
a node, because developers run them locally.

**Status: wired (2026-07-29).** `.github/workflows/ci.yml` now verifies S1,
S3, reproducible WASM, F2, and F3; `.github/workflows/nightly.yml` records the
S2 100-sample local series. Both real-node jobs download v0.2.112 and verify the
recorded SHA-256 before execution. Proof and measurement JSON files are uploaded
as workflow artifacts.

The binding goal is: **everything that can be verified without
signing credentials, live-network writes, or physical hardware must be verified by
GitHub Actions on every push.**

### Tier 1 — offline, already verified in CI

These ride `npm test` inside `check:ci-base` today. They are real coverage and
include the strongest single check in the integration: the committed WASM artifacts
are hash- and length-checked against the SPEC-FREENET vectors, so a tampered or
stale contract binary fails the build.

- `packages/bridge-freenet/test/` — locator contract, packet log, packet
  log backend, contract backend, propagation set, propagation store, update
  code fields.
- `packages/effects/test/freenet-sim.test.ts` — the deterministic simulated adapter.
- `packages/reticulum-interfaces/test/freenet-announce-lxmf.test.ts` — simulated
  announce + LXMF over FreenetInterface-only peers.
- `apps/harness-mobile/test/freenet-remote-*.test.ts` — remote-node grant and
  session helpers.

These are named explicitly in the `freenet-offline` CI job (in addition to
riding `npm test` inside `check:ci-base`).

### Tier 2 — offline, wired in CI

| Check | Command | Needs | Proves |
|---|---|---|---|
| S1 Bare bundle | `npm run test:freenet-spike` | Node only | The pinned SDK still bundles under Bare with the exact shims. Verified 2026-07-29 to pass offline in seconds and to skip the live portion cleanly. |
| S3 ordered log | `npm run test:freenet-ordered-log` | `rustup` + `wasm32-unknown-unknown` | Convergence under concurrent/reordered writers, and the growth curve, still hold. |
| **Reproducible contracts** | `npm run build:freenet-contract` then assert `git diff --exit-code` on the three `.wasm` files | Pinned toolchain from each `rust-toolchain.toml` | That the committed WASM actually corresponds to the pinned Rust source. |

### Tier 3 — real node in CI

Fetch `freenet-x86_64-unknown-linux-musl.tar.gz` for the pinned `v0.2.112`,
verifying SHA-256 `b5b6bdf975c1563a98507e94c8edc1091278306e16f25ef216aacea1570a5571`
against
[s5-bundling-matrix.json](../conformance/freenet-spike/s5-bundling-matrix.json), and
pass the extracted path as `FREENET_BINARY`. A `freenet` service in
`conformance/docker/docker-compose.yml` is the alternative shape, matching the
existing `i2pd` job; the raw download is lighter at ~19 MiB.

- `npm run test:freenet-interface` — F2 HDLC exchange plus announce+LXMF over a
  real node. It runs in `ci.yml` and turns "F2 is wired" from a local claim into a
  verified one.
- `npm run test:freenet-propagation` — F3 offline-A/retrieve-B store proof. It
  also runs in `ci.yml`.
- `npm run test:freenet-supervisor` — user-supplied-binary supervisor smoke
  (ephemeral port, generated token kept out of URLs/logs, online→stop). Runs in
  `ci.yml` against the same hash-verified archive.
- `npm run test:freenet-distinct-nodes -- --smoke` — cross-node notify sample plus
  distinct-endpoint F2 (HDLC + announce/LXMF)/F3 (including restart and offline-A
  retrieve-B). Smoke only in `ci.yml`; never promote incomplete notify series to
  gate artifacts.
- `npm run test:freenet-local-network` — the S2 100-sample series. It is too slow
  for per-push and runs in `nightly.yml` beside the other soak suites, with
  `measured-roundtrip.json` uploaded as an artifact. Set
  `FREENET_FORCE_CROSS_NODE=1` for a separate `local-cross-node` series.

Upload `f2-interface-proof.json`, `f3-propagation-proof.json`, and
`measured-roundtrip.json` as artifacts, following the `sansio` and
`simulation-replay` jobs.

### Tier 4 — cannot be done in CI, and must not be faked

Recorded here so no future pass mistakes these for gaps in tier 3: the live-network
write (S7 write half, live S2, the F1 exit criterion), macOS signing and
notarization (S5, F4), the physical BareKit run and the browser-CSP decision (S4),
and public multi-host announce + LXMF confirmation beyond the isolated
distinct-node proofs (F2/F3 optional evidence). These stay manual and explicitly
authorized. A CI job must never report them as passing, skipped-as-green, or zero.

### Plan/evidence drift guard

`conformance/doc-audit/freenet-plan.test.mjs` follows the existing
`peer-discovery-plan.test.mjs` and `device-io-plan.test.mjs` pattern. It asserts
that this document's status claims, `evidence-status.json`, `completion-audit.md`, user
surfaces, contract inventory, pinned archive hash, and CI commands do not silently
diverge.

