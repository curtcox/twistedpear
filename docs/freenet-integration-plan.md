# Freenet integration plan

<!-- tp-doc
lifecycle: planned
audited: 2026-07-28
register: software
-->

This plan integrates **Freenet** (the 2023 Rust rewrite at [freenet.org](https://freenet.org/),
formerly Locutus — *not* [Hyphanet](https://www.hyphanet.org/), the original Java network)
into TwistedPear along two axes:

1. **Freenet as a transport** — three distinct roles: a package/CAS distribution path, a
   Reticulum `PacketInterface` tunnel, and store-and-forward backing for LXMF propagation.
2. **Freenet apps on TwistedPear nodes** — deliberately *undecided*. Phase F0 exists to
   produce the evidence needed to choose, rather than committing to an execution model now.

Freenet is treated the same way this repo already treats I2P and Hyperswarm: an external
network reached through an adapter, never a dependency of protocol code. See
[prior art](prior-art.md) for why Freenet is adjacent to but not aligned with TwistedPear's
goals — that misalignment is a design input, not a footnote.

## 1. What Freenet actually is (verified 2026-07-28)

Facts established from freenet.org and freenet/freenet-core, not from assumption. Anything
not verifiable from public docs is listed in §4 as a spike, not asserted here.

| Property | Value | Consequence for this plan |
|---|---|---|
| Implementation | Rust; `cargo install --path crates/core`, plus `fdev` tooling | No TypeScript node exists. Integration is client-side or binary-bundling. |
| Latest release | 0.2.112, 2026-07-27 | Pre-1.0 and fast-moving. Version pinning is mandatory. |
| Client API | WebSocket, default port **50509**, path `/v1/contract/command`, optional auth token | This is the entire integration surface. Same shape as I2P's SAM bridge. |
| Client SDK | `@freenetorg/freenet-stdlib` (TypeScript) | Usable directly from Node, Electron, and browsers; Bare is a spike (§4, S1). |
| Client operations | `put`, `get`, `update`, `subscribe`, `disconnect`, `DelegateRequest` | **There is no client-visible stream or direct-peer-message primitive.** |
| Peer transport | Encrypted UDP, hole-punching, gateways on default port **31337** | Internal to the node. Not reachable from the client API. |
| Unit of state | Contract: WASM code + params; key = 32-byte hash of code+params | Content-addressed, which lines up well with 256t/CAS (§5). |
| Consistency | Summary/delta sync with a **commutative merge** function per contract | Great for sets and logs. Hostile to ordered byte streams (§6). |
| Topology | Small-world ring over locations 0.0–1.0, O(log n) hops, subscription trees | Popular contracts self-replicate; cold contracts pay full routing cost. |
| Delegates | WASM actors holding keys/secrets, running **locally** on the user's device | Messaging to delegates is local-only; not a network primitive. |
| Web UIs | Vite/TS or Dioxus, wrapped by `fdev website publish` into a signed web-container contract, served over the node's HTTP surface; the shell injects the WS auth token | DOM-based. Directly conflicts with host-rendered widgets (§7). |
| Live apps | River (chat), Delta (publishing), Atlas (discovery), freenet-git | Real interop targets for F0 spikes. |

**The single most consequential fact:** the Freenet client API exposes *replicated state*,
not *channels*. Every transport role below is therefore a matter of encoding movement of
bytes as convergent mutation of contract state. That is a natural fit for role 1
(distribution), a plausible fit for role 3 (propagation), and an open question for role 2
(packet tunnel). The plan is sequenced accordingly.

## 2. Decisions taken

| Decision | Choice | Rationale |
|---|---|---|
| Which network | Freenet 2023 | The only one of the two with a real application model. |
| Transport roles | All three: CAS distribution, `PacketInterface` tunnel, LXMF propagation backing | Requested. Sequenced by decreasing semantic fit. |
| Node provisioning | **Bundle the Rust binary with the desktop host and CLI; external or remote node everywhere else** | Requested. Consequences and the mobile problem are in §8. |
| App execution model | **Open.** Resolved by the F0 gate | Requested: exploratory work first, commitment second. |

## 3. Scope boundary and non-negotiables

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

## 4. Phase F0 — exploratory work (the gate)

F0 answers questions whose answers change the design. Nothing after F0 is committed until its
gate passes. Each spike is throwaway code under `conformance/freenet-spike/` plus a recorded
measurement file; none of it ships.

| ID | Question | Method | Artifact | Unblocks |
|---|---|---|---|---|
| **S1** | Does `@freenetorg/freenet-stdlib` run under Bare, or only Node/browser? | Bundle it with `bare-pack`, run against a local node from a Bare worklet, following the `test:bare-hyperswarm` pattern | Pass/fail + required shims | Whether mobile can be a Freenet client at all |
| **S2** | What is the real round-trip latency and throughput of `update` → subscriber `notify`, for 1 KB, 64 KB, 1 MB, against a live network and a local 3-node testnet? | `fdev` testnet + one live-gateway run; 100 samples per size; record p50/p95/max | `conformance/freenet-spike/measured-roundtrip.json` | **Whether role 2 (packet tunnel) is viable at all** |
| **S3** | Does a contract's commutative merge admit a usable ordered-channel encoding, and at what cost? | Write a minimal ring-buffer / append-log contract in Rust; measure state growth, merge cost, and reordering behaviour under concurrent writers | Contract source + growth curve | Role 2 design; role 3 design |
| **S4** | Can a WASM engine be run inside the mini-app sandbox on each host (Bare worker on device, Node worker on desktop, browser worker on web) **while preserving the kill-a-hostile-app guarantee**? | Load a trivial WASM module in each backend; re-run the busy-loop kill measurement from [miniapp-runtime](miniapp-runtime.md) with WASM executing | Per-backend support matrix + kill latency | App execution option B (§7) |
| **S5** | What does bundling `freenet` into the Electron host actually cost? | Build for macOS arm64/x64, Linux, Windows; measure size delta, then attempt codesign + notarize with the hardened runtime | Size table + signing outcome | §8 packaging; likely a new STATUS-HARDWARE entry |
| **S6** | How stable is the client API across releases? | Diff the client-API surface across the last ~10 `freenet-core` releases; check whether contract keys survive node upgrades | Churn report | Pinning policy, vector-suite design |
| **S7** | Can a TwistedPear mini-app usefully interoperate with a *real* live app (River or Atlas)? | Read River's contract state via `get`/`subscribe` from a TS client; attempt a well-formed `update` | Interop notes | App execution option A (§7); proves the value of the whole exercise |
| **S8** | What is the honest privacy posture of a TP node that speaks Freenet? | Threat-model write-up: what a Freenet gateway observes, what correlation a joint RNS+Freenet node enables, what is irreversibly public | Threat model section for [security review](security-review.md) | §9, and the grant-screen wording |

**F0 gate.** Proceed only if: S2 shows p95 update→notify under a threshold that makes at least
one transport role viable; S6 shows churn slow enough to pin against; S8 produces no
show-stopper that cannot be surfaced honestly on a grant screen. If S2 fails badly, roles 1
and 3 continue and role 2 is recorded as rejected-with-evidence in [LIMITATIONS.md](../LIMITATIONS.md).

S3, S4, S5, S7 gate individual later phases, not F0 as a whole.

## 5. Phase F1 — `bridge-freenet` package and CAS/package distribution

The first shipping slice, and the one with the best semantic fit: content-addressed
distribution onto a content-addressed network.

**New package `packages/bridge-freenet`**, modelled directly on
[`bridge-hyper`](../packages/bridge-hyper/src/index.ts):

- `src/core/client.ts` — the sole Freenet WebSocket client. Connection lifecycle, auth token,
  reconnect, request timeouts, the SDK's ~512 KB chunking boundary. Everything else in the
  repo goes through this.
- `src/core/locator-contract.ts` — the contract that maps a **256t id** to package bytes or
  to a fetch hint. Reuses the existing signed compact locator
  ([`cas-256t/src/locator.ts`](../packages/cas-256t/src/locator.ts),
  [256t distribution](256t-distribution.md)); the Freenet contract carries the *same* signed
  locator payload, so signature verification is unchanged and Freenet adds no new trust.
- `src/client/freenet-package-fetch.ts` — a fetcher satisfying the existing `DriveFetcher`
  shape from [`bridge-hyper/src/core/fetch.ts`](../packages/bridge-hyper/src/core/fetch.ts).
- `src/server/freenet-publish.ts` — publish a `.tpkg` locator from `tp publish`.

**Changes to existing code:**

- `FetchPath` in [`fetch.ts`](../packages/bridge-hyper/src/core/fetch.ts) gains `"freenet"`.
  Path selection ranks it after `hyperdrive` and `lan-mirror` and before `resource` when a
  node is available — Freenet is slower than a direct drive but cheaper than pushing bulk
  bytes over a Reticulum Resource on a constrained link.
- `assessFetchBudget` treats Freenet as an IP-bulk path, subject to the same size warnings.
- The CLI gains `tp publish --freenet` and `tp node --freenet` (external node
  URL / optional `--freenet-interface`; bundling remains F4/S5).

**Why this is worth doing on its own:** it gives package distribution a fourth independent
path that survives when Hyperswarm is blocked and no Reticulum peer holds the archive, and it
does so without inventing any new verification story.

**Exit criteria:** a `.tpkg` published from one host installs on a second host with
`--force-path freenet`; hash and signature verification identical to other paths; a golden
vector for the locator contract's state encoding.

## 6. Phase F2 — `FreenetInterface` (Reticulum packet tunnel)

Gated on **S2** and **S3**. This is the highest-risk role, because Freenet gives no channel —
only convergent state.

**Design.** `packages/reticulum-interfaces/src/freenet.ts`, extending `HdlcPacketInterface`
exactly as [`I2PInterface`](../packages/reticulum-interfaces/src/i2p.ts) does. A pair of
peers shares a rendezvous contract; each direction is an append-only, monotonically indexed
log of HDLC-framed Reticulum packets, with a commutative merge that unions by index and a
retention window that evicts consumed entries. Each side subscribes to the peer's log.

Wiring (mirrors the existing pattern precisely):

- `InterfaceKind` and the bitrate/priority tables in
  [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts) gain `freenet`, with a bitrate
  and latency derived from S2 measurements — not guessed.
- `RelayInterfaceKind` and `HostInterfaceConfig` in
  [`host-core/src/types.ts`](../packages/host-core/src/types.ts) gain `freenet`; `resolveHostConfig`
  in [`config.ts`](../packages/host-core/src/config.ts) gains the merge branch.
- `createFreenetInterface` in
  [`interface-manager.ts`](../packages/host-core/src/interface-manager.ts) joins the
  `createInterface` switch, and the relay policy matrix gets Freenet rows.

**Known costs, stated up front.** Contract state grows with traffic and must be trimmed;
every packet costs a network `update` plus subscriber fan-out; ordering must be reconstructed
client-side from indices because merge is commutative; and MTU is bounded by contract-state
size limits rather than by a link. If S2 puts p95 update→notify in the multi-second range,
this interface is honestly comparable to LoRa in latency and should be ranked and documented
as such — usable for LXMF, not for interactive links.

**Note.** `createI2pInterface` and `createRnodeInterface` are still `return null` TODOs in
`interface-manager.ts`. F2 should not add a third stub; it lands wired or not at all.

**Exit criteria:** two hosts establish a Reticulum link over `FreenetInterface` only, exchange
an announce, and complete an LXMF round trip; measured bitrate/latency recorded and used in
the policy table; relay-policy conformance covers Freenet as both source and destination.

## 7. Phase F3 — LXMF propagation backing

Gated on S3. `PropagationServer` in [`lxmf-ts`](../packages/lxmf-ts/README.md) currently keeps
a local store with byte/count quotas ([propagation node](propagation-node.md)), and
node-to-node peering is an explicit stretch goal.

A Freenet-backed store is a genuinely good fit: LXMF propagation is a *set* of encrypted
messages addressed to destination hashes, with no ordering requirement and natural expiry —
which is exactly what a commutative merge does well. This also delivers the meshed multi-node
store that the built-in node lacks today, without requiring `lxmd`.

Scope: a `FreenetPropagationStore` behind the existing store interface; per-destination
contracts; quotas enforced locally *before* publishing; expiry driven by the contract's own
retention rules. Messages are already encrypted end-to-end, so Freenet sees ciphertext — but
destination-hash observability by Freenet peers is a real metadata leak and must be covered by
S8 and surfaced in the node operator's UI.

**Exit criteria:** a message sent while the recipient is offline, published to Freenet by
node A, is retrieved by the recipient through node B, with node A offline.

## 8. Phase F4 — node provisioning

**Desktop and CLI (bundled).** The Electron host and `tp` ship a pinned `freenet` binary,
supervised as a child process with an ephemeral WebSocket port and a generated auth token,
never a shared 50509. Per S5, this pulls in per-platform binaries, size growth, hardened-runtime
codesigning of the embedded executable, and macOS notarization — the notarization item already
tracked in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md). If S5 shows notarization of the
embedded binary is not achievable, fall back to opt-in download-on-first-use with hash pinning.

**Everywhere else (external).** Mobile and web hosts connect to a node the user already runs,
addressed explicitly. iOS in particular cannot host a daemon — no long-lived background
process, no spawning executables — so bundling is not merely inconvenient there, it is
prohibited by the platform.

**The mobile trust problem, stated plainly.** "Point your phone at someone's Freenet node"
means that node sees every contract you read and write. That is a delegation of trust of
exactly the kind this project exists to make legible, and it must not be papered over: the
mobile connection screen has to name the node, say what it can observe, and default to
off. A remote-node connection is a capability grant, not a setting. If S8 concludes this
cannot be explained honestly in a grant screen, mobile Freenet support should be dropped
rather than shipped with a shrug.

**Degradation.** No node reachable ⇒ the Freenet fetch path, interface, and propagation store
report offline and every other path continues unchanged. Freenet is never on the critical path
for any existing function.

## 9. Phase F5 — capability model and user-facing surface

A new capability, e.g. `freenet:contract`, gated exactly like every other
([miniapp-runtime](miniapp-runtime.md) capability model; broker enforcement in
[`host-api.ts`](../packages/miniapp-runtime/src/host-api.ts), SDK surface via
[`rpc.ts`](../packages/miniapp-sdk/src/rpc.ts)). Grant wording must convey what is genuinely
irreversible: **a contract update is published to a global network and cannot be recalled.**
That is a stronger statement than any existing capability makes, and it is the reason the
grant screen for this capability probably needs its own treatment rather than a table row.

Also in scope: host chrome for Freenet node status and interface toggles, alongside the
existing interface controls; a `freenet` row in
[platform capabilities status](platform-capabilities-status.md); and honest per-host support
(desktop full, mobile/web conditional on §8).

## 10. Phase F6 — the app-execution decision

**Deliberately unresolved.** F0's S4, S7, and S8 produce the evidence; this phase records the
decision and its rationale in an ADR. The three options and their real tradeoffs:

**Option A — TwistedPear apps as Freenet clients.** Mini-apps get `get`/`put`/`update`/
`subscribe` through the broker; a TP app can share live state with River or Atlas.
*For:* no WASM engine, no sandbox change, no new UI model; fits the existing broker exactly;
S7 proves or disproves it cheaply. *Against:* Freenet apps do not run on TwistedPear — TP apps
merely reach Freenet data. This is interoperability, not hosting, and the plan should say so
rather than claim more.

**Option B — contract/delegate execution on TP nodes.** TP nodes run Freenet WASM contracts
and delegates, making a TP node a real participant carrying app state. *For:* the only option
that makes the phrase "Freenet apps run on TwistedPear nodes" literally true; a TP node
becomes useful to the Freenet network rather than a leech. *Against:* needs a WASM engine in
every sandbox backend (S4), with Bare on device the likely blocker; contracts are untrusted
code, so the kill-a-hostile-app guarantee must be re-established, not assumed; and it
duplicates work `freenet-core` already does well. If a node is bundled anyway (§8), the
bundled node can execute contracts and Option B's marginal value shrinks sharply — a point
that should be tested before any engine work begins.

**Option C — Freenet web UIs as mini-apps.** Run an existing Freenet app's HTML/JS UI on a TP
host. *For:* the only path to running *existing, unmodified* Freenet applications.
*Against:* head-on collision with the host-rendered widget model. Freenet UIs are DOM apps
that talk WebSocket to a node; supporting them means a webview capability and a second sandbox
posture, and the capability-comprehension guarantees that are the point of this project would
have to be re-derived from scratch for that posture. This is a platform-shape decision, not a
feature.

**Recommended sequencing** (a recommendation, not a decision): ship A as it is nearly free and
immediately testable against live apps; treat B as conditional on S4 *and* on B retaining value
once a node is bundled; treat C as a separate proposal with its own plan, because it changes
what TwistedPear is.

## 11. Testing and conformance

- **Pinned reference.** Pin an exact `freenet-core` version, as the Python RNS/LXMF references
  are pinned. Record it wherever interop pins live and bump it deliberately.
- **Docker interop** (`freenet-interop`, following the `test:interop` pattern): a small local
  testnet of `freenet` nodes plus TP hosts, exercising publish→fetch, interface link, and
  propagation round trips.
- **Golden vectors** for every contract-state encoding this plan introduces (locator, packet
  log, propagation store), owned by a new `specs/spec-freenet` — starting as
  *stub (informative)* per [specs/README.md](../specs/README.md) until its first vectors land.
- **Offline-by-default.** Every Freenet suite skips cleanly without a node, like the existing
  Docker-gated suites. No new hard dependency in `check:fast` or `check:ci-base`.
- **Simulation.** A simulated Freenet adapter in `packages/effects` so campaign and adversary
  runs can exercise Freenet paths deterministically without a live network.

## 12. Risks and kill criteria

| Risk | Kill criterion |
|---|---|
| Freenet's client API churns faster than we can track (S6) | If contract keys or client API break across minor releases, drop to Option A only, behind an explicitly experimental flag |
| Packet tunnel is too slow to be a real interface (S2) | Record as rejected-with-evidence in LIMITATIONS.md; do not ship a stub interface |
| Bundled binary cannot be notarized (S5) | Fall back to opt-in download with hash pinning; never ship an unsigned executable |
| Mobile remote-node trust cannot be explained honestly (S8) | Ship desktop-only; say why in the guide |
| Scope creep into "TwistedPear is a Freenet client" | Freenet stays optional and off by default; no existing function may acquire a Freenet dependency |
| Network unpopulated enough for real testing | Local `fdev` testnet is the primary gate; live-network runs are evidence, not gates |

## 13. Sequencing

```
F0 (spikes, ~all parallel)
 ├─ gate ──> F1 bridge-freenet + CAS/package path      [S6, S8]
 │            └─> F4 node provisioning (desktop bundle) [S5]
 │                 └─> F5 capability + host chrome      [S8]
 ├─ gate ──> F2 FreenetInterface                        [S2, S3]
 ├─ gate ──> F3 LXMF propagation backing                [S3]
 └─ gate ──> F6 app-execution ADR                       [S4, S7, S8]
```

F1 and F4 are the shortest path to something a user can actually use. F2 is the most likely to
be killed by evidence, and that is a successful outcome for F0, not a failure.

## 14. Implementation status (2026-07-28)

The gate is being enforced rather than treated as prose:

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
- **S4 is partially negative:** Node workers execute WASM and retain the
  watchdog kill guarantee; the current browser sandbox CSP blocks WASM
  compilation, and the faithful BareKit device probe is still pending. Option B
  is not open.
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
  and the 0.2.112 UPDATE `codeField` workaround are documented with the
  artifact. Live-network confirmation still needs explicit authorization;
  per §12, live runs are evidence rather than gates. Cross-node notify under
  locator min-merge reordering remains an open measurement, not fabricated.
- **F2 interface wired:** SPEC-FREENET packet-log WASM + vectors,
  `FreenetInterface` / `FreenetContractPacketLogBackend`, host-core `freenet`
  kind at the S2-derived 90 kbps policy bitrate,
  `npm run test:freenet-interface` HDLC exchange, simulated announce+LXMF over
  FreenetInterface-only peers, and BridgeForwarder relay-policy coverage with
  freenet as source and destination. Live two-host Freenet-node announce+LXMF
  remains optional confirmation.
- **F3 codec foundation landed (no store adapter):** SPEC-FREENET
  propagation-set vectors and `bridge-freenet` encode/decode/merge cover
  per-destination LXMF ciphertext sets. A Freenet-backed
  `PropagationServer` seam is still absent.
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
  Node status shows Freenet rows. Mobile/web remain off per S8.
- **F6 Option A ADR recorded:** [adr-freenet-app-execution.md](adr-freenet-app-execution.md)
  accepts mini-apps as Freenet clients (not hosts), based on S7 read evidence
  and S4/S8 blockers for B/C.
- **Gate partially open:** S2 local latency, S6, and S8 satisfy the F0 proceed
  criteria for roles 1 and 3, and make role 2 viable on the measured path.
  F2/F3/F5 software wiring and the F6 Option A ADR are landed; F4 remains
  blocked on S5; live S2/S7 write need authorization.
  Current machine-readable status is
  [conformance/freenet-spike/evidence-status.json](../conformance/freenet-spike/evidence-status.json)
  and
  [measured-roundtrip.json](../conformance/freenet-spike/measured-roundtrip.json).
