# Freenet integration plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-02
register: software
counterpart: docs/freenet.md
-->

**This document describes intended work, not current behaviour.** For what is built
and verified today — the phase-by-phase status ledger, what a user can actually do,
and which checks run in CI — read
[Freenet integration — current implementation](freenet.md). Where the two disagree, that
document wins. Section numbering below is unchanged from the original single-file plan, so
§1 (what Freenet is) and §3 (scope boundary) are absent — both moved to that document, and
existing `§n` citations elsewhere in the repo still resolve.

The near-term sequencing of the remaining work is in the
[simulator-first work plan](freenet-simulator-first-work-plan.md).

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

## 2. Decisions taken

| Decision | Choice | Rationale |
|---|---|---|
| Which network | Freenet 2023 | The only one of the two with a real application model. |
| Transport roles | All three: CAS distribution, `PacketInterface` tunnel, LXMF propagation backing | Requested. Sequenced by decreasing semantic fit. |
| Node provisioning | **Bundle the Rust binary with the desktop host and CLI; external or remote node everywhere else** | Requested. Consequences and the mobile problem are in §8. |
| App execution model | **Open.** Resolved by the F0 gate | Requested: exploratory work first, commitment second. |

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

**Decided.** [Option A — mini-apps are Freenet clients, not hosts](../archive/decisions/freenet-app-execution.md)
was accepted on 2026-07-28. Option B reopens only if S4 clears on physical devices;
Option C remains a separate proposal because it changes the platform shape. The full
option analysis that produced the decision is preserved in
[archive/design/freenet-app-execution-options.md](../archive/design/freenet-app-execution-options.md).

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

The [CI verification section](freenet.md#ci-verification) of the current-implementation
document records which of these are actually wired into GitHub Actions today, which are
merely runnable by hand, and what remains. The "offline-by-default" rule above binds
the *suites*; per that section a CI job may run a pinned, hash-verified node.

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

## 14. Scope of the protocol pause (2026-07-29)

The pause recorded on 2026-07-28 said "no further agent loop work" until signing
credentials, live-write authorization, or BareKit hardware became available. Its
*rationale* is sound and unchanged: F1–F3/F5 protocol work genuinely cannot advance
without those external inputs, and inventing evidence for them would be worse than
waiting. Its *scope* was too broad. The two largest remaining deficits in this
integration — documentation and CI verification — need none of those three
inputs.

**The pause therefore applies to protocol and evidence work only.** Documentation,
examples, and CI wiring were outside it and are now implemented and recorded in [the current-implementation document](freenet.md). Resume
protocol work only when one of the three external inputs is available.

The remaining work is sequenced in the
[simulator-first companion plan](freenet-simulator-first-work-plan.md). That
plan treats Android emulator and iOS simulator evidence as the primary mobile
software gates, reserves physical devices for claims that simulators cannot
make, and leaves public writes and signing as explicit approval gates. This
does not upgrade simulator results into physical-device evidence or change the
status ledger in [freenet.md](freenet.md).

Two corrections found while re-validating, now fixed:

- `completion-audit.md` had stated that the current machine "cannot rebuild WASM
  because its Rust installation lacks the pinned WASM target." That was imprecise:
  `wasm32-unknown-unknown` *is* installed. The mismatch is the toolchain version —
  Homebrew `rustc` 1.96.1 against the 1.97.1 pinned in each contract's
  `rust-toolchain.toml`. This matters because it means the reproducible-contract
  check in [freenet.md](freenet.md#ci-verification) is a `rustup` install away, not blocked.
- `packages/bridge-freenet/README.md` had listed only the locator and
  propagation-set WASM artifacts. It now also lists the F2
  `contract/packet-log/packet-log-contract.wasm`.
