# Phase 4 — Mini-app runtime & SDK: Detailed Plan

Companion to [PLAN.md](PLAN.md) §5 Phase 4. Reticulum compatibility remains the only hard
constraint; known costs are in [LIMITATIONS.md](LIMITATIONS.md) §§4, 7.

## 1. Scope

Make the verified packages that Phase 3 leaves on device storage actually *run*: a
sandboxed mini-app runtime inside the Bare worklet, a capability model enforced by the
host, an SDK that is the only door to host services, a declarative UI rendered by the
host, and the developer loop that Phase 3 deferred. Concretely:

- **Isolation decision by spike** (`miniapp-runtime`): M0 compares Bare-Worker-per-app
  against a hardened in-worklet compartment and commits to one, behind a backend
  interface so the rest of the phase is agnostic.
- **Capability model** (`miniapp-runtime`): a v1 capability taxonomy formalizing the
  manifest `capabilities` strings, install-time user grants persisted per app+publisher,
  deny-by-default runtime enforcement at a single broker chokepoint, and
  `HOST_API_VERSION` as the value the Phase 3 `minHostApi` gate checks against.
- **Sandbox + lifecycle**: load the verified bundle into the isolation backend; explicit
  lifecycle (install → launch → running → suspended → stopped); watchdogs, message-rate
  caps, and crash containment so a hostile or broken mini-app cannot take down the P2P
  core. One foreground mini-app at a time in v1; no background autonomy (LIMITATIONS §7).
- **SDK surface v1** (`miniapp-sdk`): identity (app-scoped, brokered — never raw keys),
  LXMF send/receive, announce/subscribe, local KV storage, Hyperbee-backed storage,
  Resource fetch (through the Phase 3 fetch engine, budget rules intact), peer presence.
- **Declarative UI**: a whitelisted RN component set rendered by the host from a widget
  tree the mini-app submits over RPC; validated, size/depth-capped, App-Store-friendly
  (LIMITATIONS §4). A React binding (custom reconciler emitting the same tree) is a
  stretch milestone, not a dependency.
- **CLI dev loop** (`packages/cli`): `tp create` (templates) and `tp dev` (build,
  side-load to a dev-mode host, hot reload) — the half of the CLI Phase 3 deferred here.
- **Example apps** (`apps/examples`): chat (LXMF), file drop (Resource fetch + storage),
  board (announce/subscribe + Hyperbee) — each exists to validate a different SDK
  surface, published and installed through the real Phase 3 pipeline.

**Out of scope (deferred):**

- Arbitrary RN bundles / custom native UI from mini-apps — the declarative whitelist is
  the v1 posture (PLAN §5, LIMITATIONS §4); revisit after Phase 7's security review.
- Background execution of mini-apps, multi-app concurrency beyond suspend/resume.
- The full sandbox security review and parser fuzzing — Phase 7 (this phase ships the
  hostile-app *test suite*; Phase 7 ships the adversarial *review*).
- Desktop runtime parity (mini-apps running on the desktop host) — Phase 6; this phase's
  CI executes the runtime on desktop **Bare** as a test tier, which is not the same as a
  desktop host product.
- Mini-app-to-mini-app IPC, shared storage between apps, registry/moderation UX.
- Hyperbee cross-device replication — v1 Hyperbee storage is local (versioned, offline);
  sync topics are sketched in the SDK doc as future work.

**Relationship to Phase 3:** consumes verified packages, the catalog/install UX, the
fetch engine and its budget rules, and `minHostApi` gating as-is. Gaps found in
`app-registry`/`bridge-hyper` (e.g. capability-string validation, archive streaming) are
fixed in those packages, not worked around. The manifest format does not change; M1 only
pins down what the existing `capabilities` strings *mean*.

## 2. Guiding principles

1. **Emulator-first, device-gated** (carried from Phases 2–3). Every milestone has a CI
   exit (desktop Node/Bare, docker topologies, Android emulator); device criteria go to
   the hardware register (§7) and block phase exit, not milestone order.
2. **The broker is the only door.** Mini-app code can reach exactly one host object: the
   capability-checked RPC broker. No ambient `require`, no filesystem, no sockets, no
   Bare APIs. Every SDK feature — including UI — is a brokered call, so enforcement,
   quotas, rate limits, and audit logging live at one chokepoint.
3. **Deny by default, grant by manifest.** A capability can be granted only if it was
   declared in the signed manifest; anything not granted fails with a typed, catchable
   error. Unknown capability strings block install with a message pointing at
   `minHostApi` — adding a capability to the taxonomy bumps the host-API minor version.
4. **The host renders; mini-apps describe.** UI crosses the boundary as validated data
   (a widget tree), never as code. This is simultaneously the sandbox posture, the App
   Review 3.3.2 posture, and what keeps the whitelist enforceable.
5. **A mini-app is a hostile input.** Signature verification (Phase 3) authenticates the
   *publisher*; it says nothing about behavior. Watchdogs, memory/node/rate caps, and
   crash containment are correctness features tested from M2 onward, not hardening
   afterthoughts.
6. **Dev mode is loud and local.** `tp dev` side-loading works only on a host with
   developer mode explicitly enabled, uses a dev signing identity, badges the app as DEV
   in the UI, and never writes into the announce catalog.

## 3. Repo layout additions

```
packages/
  miniapp-runtime/src/
    host-api.ts        HOST_API_VERSION (the minHostApi anchor), API changelog policy
    capabilities.ts    v1 taxonomy, manifest validation, grant store (persisted)
    broker.ts          capability-checked RPC dispatch; quotas, rate caps, audit log
    lifecycle.ts       app states, launch/suspend/stop, crash containment, watchdogs
    sandbox/
      backend.ts       isolation backend interface (spawn, message, kill, limits)
      worker.ts        Bare-Worker-per-app backend        (M0 candidate A)
      compartment.ts   hardened in-worklet compartment    (M0 candidate B)
    services/          host-side brokers: lxmf.ts, announce.ts, storage-kv.ts,
                       storage-bee.ts, resource.ts, presence.ts, identity.ts
    ui/
      schema.ts        widget-tree types, component/prop/style whitelist
      validate.ts      structural validation, depth/node/size caps
      diff.ts          tree diffing for incremental updates over RPC
  miniapp-sdk/src/
    index.ts           what mini-app developers import (the only import)
    ui.ts              render(tree), event subscription
    lxmf.ts  announce.ts  storage.ts  resource.ts  presence.ts  identity.ts
  cli/src/
    commands/          + create, dev
    dev/               dev server: watch, bundle, side-load channel, hot reload
apps/
  examples/
    chat/  file-drop/  board/
  harness-mobile/      grows: mini-app surface (tree renderer), grants UI at install,
    worklet/           launcher, per-app log view; runtime wired into the worklet
docs/
  miniapp-runtime.md   isolation ADR (M0), lifecycle, limits, threat model
  miniapp-sdk.md       SDK reference, widget-tree protocol spec, capability taxonomy
conformance/
  hostile-apps/        fixture bundles: loops, memory bombs, escape attempts, UI abuse
  sdk-interop/         docker: each SDK API exercised against real peers
  dev-loop/            scripted create → dev → edit → hot-reload run
```

Scoped names follow the existing convention (`@twistedpear/miniapp-runtime`,
`@twistedpear/miniapp-sdk`). Hyperbee joins the pinned Holepunch set in
`conformance/UPSTREAM.md`.

## 4. Milestones

### M0 — Isolation spike + ADR
Build the same minimal harness twice: load a bundle, exchange broker messages, enforce a
memory ceiling, kill on command — once as a **Bare Worker per app**, once as a
**hardened compartment** inside the existing worklet (SES-style lockdown: frozen
intrinsics, no ambient globals). Measure on desktop Bare *and* Android emulator: spawn
latency, per-app memory, message throughput, kill semantics (can a `while(true)` app be
terminated?), behavior with 3 concurrent apps, interaction with the running P2P core.
**Exit:** decision recorded as an ADR in docs/miniapp-runtime.md with the numbers; the
losing backend's file stays as a stub documenting why; `sandbox/backend.ts` interface
committed and both candidates implement it (the rest of the phase codes to the
interface). Hard requirement for the winner: a hostile busy-loop app is killable without
restarting the worklet — if only Workers can do that, Workers win.

### M1 — Capability taxonomy, grants, host-API anchor
`capabilities.ts` + `host-api.ts`: v1 taxonomy — `identity`, `presence`,
`announce:subscribe`, `announce:publish`, `lxmf:send`, `lxmf:receive`, `storage:kv`,
`storage:hyperbee`, `resource:fetch` — each with a one-line user-facing description (the
grant screen renders these). Grant store keyed by appId+publisher key, persisted in the
worklet state dir; grants survive updates (same key, per the Phase 3 trust model) and
die with uninstall. Declare `HOST_API_VERSION = 0.1.0` and wire it as the value
harness-mobile passes to the Phase 3 `minHostApi` verifier gate. Unknown capability
strings block install. Install-time grant UI in harness-mobile (per-capability toggles,
deny-all default requires explicit action); revocation from the app detail screen.
**Exit:** grant matrix tests (declared/undeclared × granted/denied/revoked → typed
results); grants persist across worklet restart; revocation while the app is running
takes effect on the next broker call; install blocked with a useful message for unknown
capabilities and for `minHostApi > HOST_API_VERSION`.

### M2 — Sandbox + lifecycle
`lifecycle.ts` + the chosen backend: launch the verified package's `entry` bundle (from
Phase 3 storage — the runtime never loads unverified bytes) inside the sandbox with
exactly one global: the broker endpoint. Lifecycle: launch → running → suspended (host
backgrounded or another app launched) → stopped; state is the app's problem (storage),
not the runtime's. Enforcement: memory ceiling, CPU watchdog (unresponsive-to-ping ⇒
kill), broker message-rate and message-size caps, structured per-app log channel
surfaced in the harness. A mini-app crash or kill must leave the P2P core, other state,
and the UI shell fully intact. Update interplay: a package updated (Phase 3 M8) while
its app runs keeps running the old version; the new version activates on next launch.
**Exit:** `conformance/hostile-apps/` suite green on desktop Bare and emulator —
busy-loop (killed by watchdog), allocation bomb (killed by ceiling), escape attempts
(`require`, `process`, `Bare`, `import`, constructor-chain tricks — all absent/frozen),
message flood (throttled, then killed); 100 launch/stop cycles leak-free; core keeps
routing and the catalog UI stays live throughout.

### M3 — Broker services: the non-UI SDK surface
`services/*` on the host side, `miniapp-sdk` on the app side — a typed, promise-based
API over the RPC boundary, one namespace per capability:
- **identity**: app-scoped destination derived from host identity + appId; sign/verify
  brokered; private keys never cross the boundary.
- **lxmf**: send/receive via the `lxmf-ts` router; per-app inbox namespacing (an app
  sees only messages to its own app-scoped destination); delivery/failure surfaced.
- **announce**: publish the app's destination; subscribe to announces in the app's
  namespace; host-enforced rate limits reusing `reticulum-ts` rate limiting.
- **storage (kv)**: local per-app KV with a byte quota, counted in the Phase 3 storage
  view; uninstall deletes it only after user confirmation (user data ≠ package cache).
- **resource**: fetch through the Phase 3 fetch engine — budget rules, progress, and
  cancel included; no direct Link/socket access, size visible before fetch.
- **presence**: coarse peer/interface state (what `WorkletStatus` already aggregates),
  no raw interface control.
**Exit:** every namespace integration-tested in `conformance/sdk-interop/` against real
peers (docker Python RNS transport + seeder from Phase 3): two sandboxed apps on two
hosts exchange LXMF messages; app A provably cannot read app B's inbox or storage
(cross-app isolation asserted, not assumed); quotas and rate limits enforced with typed
errors; every call without its grant fails closed.

### M4 — Declarative UI: widget tree + host renderer
`ui/schema.ts|validate.ts|diff.ts`, SDK `ui.render(tree)` + event subscription, and the
renderer in harness-mobile. Component whitelist v1: `view`, `text`, `image` (package
assets only, by manifest path), `button`, `text-input`, `switch`, `scroll`, `list`
(virtualized), `progress`, `divider`, `spacer`. Style subset: flex layout, spacing,
colors, and a bounded typography scale — a closed allowlist, not a CSS passthrough.
Caps: ≤ 5 000 nodes, depth ≤ 32, ≤ 256 KiB per tree message, bounded update rate; the
host diffs (`diff.ts`) so incremental updates are cheap. Events (tap, input change,
list scroll-end) flow back over the broker with the app suspended/killed rules applying.
UI requires no capability grant — it is the app's *surface*, not a host service — but it
obeys the same rate/size enforcement as every broker call.
**Exit:** golden tests tree → rendered RN element snapshots; hostile-UI fixtures (depth
bomb, node bomb, oversized message, non-whitelisted component/prop/style, event forgery
for nodes the app never rendered) all rejected with the app alive or killed per policy —
never the host crashing; input-latency sanity budget met on emulator (tap → app → tree
update → render round trip).

### M5 — Hyperbee storage
`services/storage-bee.ts` + SDK `storage.bee()`: per-app Hyperbee (on Corestore, which
M1 of Phase 3 already proved on Bare) for ordered, versioned KV — local-only in v1;
replication/sync topics documented as future work in docs/miniapp-sdk.md. Same quota
pool and uninstall semantics as M3's KV; Hyperbee version history counts against quota.
**Exit:** CRUD + range iteration from a sandboxed app on desktop Bare and emulator;
quota enforcement includes history growth; data survives host restart and app update;
two apps' bees are separate cores (isolation at the Corestore namespace level, tested);
Hyperbee pinned in `conformance/UPSTREAM.md`.

### M6 — CLI dev loop
`tp create <template>`: scaffolds manifest + entry bundle + capability declarations
(templates: `hello` widget-tree app, `chat-min` LXMF app). `tp dev`: watch + esbuild
bundle + side-load to a dev-mode host over a local TCP dev channel; hot reload =
re-push, restart app, storage preserved. Dev packages are signed with a `tp init` dev
identity, install with a persistent **DEV** badge, bypass announce/catalog entirely, and
are only accepted when the host's developer mode toggle (harness settings) is on.
**Exit:** scripted `conformance/dev-loop/` run in CI: create → dev → edit source →
observe hot reload on the emulator, under 5 s edit-to-render; dev channel refuses
connections when dev mode is off (and is bound to localhost/adb only); `tp pack` +
`tp publish` of a created template installs and runs via the normal Phase 3 path.

### M7 — Example apps
`apps/examples/chat` (LXMF send/receive, conversation list — exercises identity + lxmf),
`file-drop` (offer a file as a Resource, fetch on the peer — exercises resource +
storage:kv + budget visibility), `board` (public posts via announce + Hyperbee-backed
local store — exercises announce + storage:hyperbee). Each is also documentation: small,
idiomatic, commented SDK usage.
**Exit:** end-to-end CI: `tp publish` each example → emulator discovers → installs →
user grants (scripted) → launches → exercises the app function against a second peer
(docker/seeder), for all three; chat additionally green over the forced-Resource path;
every example fits the BLE install budget (≤ 180 KiB, LIMITATIONS §6) with sizes
recorded in `conformance/budgets/`.

### M8 — Integration, docs, release (+ React stretch)
Full-loop demo script (publish → discover → install → grant → run → update → app picks
up new version on relaunch → rollback); docs/miniapp-sdk.md (SDK reference + widget
protocol spec + taxonomy) and docs/miniapp-runtime.md (ADR, lifecycle, limits, threat
model) finalized; LIMITATIONS §7 updated with what the sandbox does *not* promise before
the Phase 7 review; publish `miniapp-runtime` and `miniapp-sdk` 0.1.0; CLI 0.2.0 with
`create`/`dev`. **Stretch (non-blocking):** a React binding — custom `react-reconciler`
in the sandbox emitting the same validated widget tree; if it slips, it moves to the
backlog without renaming anything.
**Exit:** demo script clean from a fresh checkout; 24 h soak — emulator host cycling
launch/suspend/kill across the three examples under interface flapping, flat RSS, zero
worklet restarts; all §7 register procedures written; PLAN §6's device-lab flow updated
to include "launch and use the app" after "install".

### Parallelism notes
M0 and M1 are independent and start together. M2 needs M0 (backend) and M1 (nothing
launches without the grant store). M3 needs M2; M4 needs M2 and shares the broker
plumbing with M3 (protocol first, then the two proceed in parallel); M5 extends M3;
M6 needs M2+M4 (something must run and render to dev against); M7 needs M3+M4+M5;
M8 closes. The serial spine is {M0,M1} → M2 → {M3,M4} → {M5,M6} → M7 → M8. Sandbox risk
is front-loaded into M0/M2 deliberately: if both isolation candidates fail the killable
requirement on-device, the fallback (documented in the ADR) is compartment isolation
plus a worklet-restart-based kill, accepted as a LIMITATIONS §7 entry until Phase 7.

## 5. Testing strategy detail

| Layer | What | When |
|---|---|---|
| Hostile-app fixtures | escape, loop, memory, flood, UI-bomb bundles vs sandbox | every commit touching runtime, no network |
| Grant matrix | capability × declared/granted/revoked × API call | every commit touching runtime/sdk |
| UI golden tests | tree → RN snapshot; validator rejection matrix | every commit touching ui/ or renderer |
| SDK interop (docker) | each namespace against real peers incl. Python transport | every PR from M3 |
| Cross-app isolation | inbox/storage/bee separation asserted between two apps | every PR from M3 |
| Emulator jobs | install→grant→launch→use; suspend/resume; update-on-relaunch | PRs touching harness/worklet; nightly |
| Dev-loop e2e | create→dev→edit→hot-reload scripted | every PR from M6 |
| Example e2e | all three examples full-loop vs second peer | nightly from M7 |
| Soak | 24 h app-cycling under interface flapping | nightly from M8 |
| Device runbook | §7 register procedures | when hardware allows; before phase exit |

Every suite that launches an app first verifies it (Phase 3 verifier); no test path
loads unverified bytes, so the tests can't normalize a bypass.

## 6. Phase-4-specific risks

1. **Sandbox escape** — the headline risk; JS-level isolation is a real attack surface
   (LIMITATIONS §7). Mitigation: M0 picks the strongest killable backend; one broker
   chokepoint; hostile suite from M2; no code crosses the UI boundary; Phase 7 review is
   the formal audit and installation remains "trust the developer key" until then.
2. **Bare Worker maturity on Android** — N workers inside a bare-kit worklet is
   unproven. Mitigation: it's half of M0, measured on emulator before anything depends
   on it; the compartment backend is the standing fallback behind the same interface.
3. **Widget-tree expressiveness vs DX** — too small a whitelist and real apps can't be
   built; too large and it's unreviewable. Mitigation: the three examples are the
   forcing function (each must be buildable and pleasant); whitelist grows only with
   host-API minor bumps.
4. **Watchdog/limit tuning** — kill thresholds that are wrong in either direction (lag
   on old phones vs runaway apps surviving). Mitigation: limits are config, measured in
   M2 on emulator and revisited in the M8 soak; per-app logs make kills explainable.
5. **Capability taxonomy churn** — manifests are signed; renaming a string strands
   published apps. Mitigation: taxonomy is additive-only; unknown strings block install;
   additions ride `HOST_API_VERSION` minors (the anchor Phase 3 already gates on).
6. **Hyperbee quota surprises** — append-only history growth counts against user-visible
   quota. Mitigation: M5 tests history-driven quota pressure; truncation/compaction
   documented; Hyperbee pinned in UPSTREAM.md like every Holepunch dep.
7. **Store policy (3.3.2 / Play)** — running downloaded JS is the gray zone itself.
   Mitigation: this phase *is* the mitigation posture — declarative UI, curated
   capabilities, host-rendered everything; posture documented in LIMITATIONS §4 and
   revisited before the Phase 5 iOS submission.
8. **Dev channel as a backdoor** — a side-load path is an unsigned-code path.
   Mitigation: off by default, loud toggle, localhost/adb binding, dev-signed packages
   badged and catalog-excluded; refusal tested in M6's exit.

## 7. Hardware-debt register (Phase 4 additions)

Same discipline as Phases 2–3; cleared before phase exit, runbook procedures written in
M8.

| # | Needs | Deferred criterion |
|---|---|---|
| H9 | 2 Android phones (Phase 2 H2 pair) | chat example exchanges LXMF messages over BLE-only, both apps sandboxed, foreground service on |
| H10 | 1 Android phone + desktop on one LAN | file-drop example transfers a real file phone↔desktop over AutoInterface; budget warning shown for an oversized file |
| H11 | 1 mid/low-tier Android phone | M2 watchdog/memory limits validated on weak hardware: no false-positive kills of the three examples; hostile apps still killed |

## 8. Phase exit deliverables

- **docs/miniapp-runtime.md** — isolation ADR with measurements, lifecycle states,
  enforcement limits, threat model, explicit non-promises pre-Phase-7.
- **docs/miniapp-sdk.md** — SDK reference, widget-tree protocol spec, capability
  taxonomy with grant-screen wording, future-work sketches (React binding if slipped,
  Hyperbee sync, app IPC).
- `miniapp-runtime` 0.1.0: sandbox backend (chosen), lifecycle + watchdogs, grant store,
  broker with quotas/rate caps, UI schema/validator/differ, `HOST_API_VERSION`.
- `miniapp-sdk` 0.1.0: identity, lxmf, announce, storage (kv + bee), resource, presence,
  ui — the only import a mini-app needs.
- `cli` 0.2.0: `create`/`dev` with hot reload; dev-mode side-load channel spec'd and
  access-tested.
- `apps/examples`: chat, file-drop, board — published, installed, and exercised through
  the real pipeline in CI; all within BLE install budget.
- `apps/harness-mobile`: grant UI, mini-app surface/renderer, launcher, per-app logs;
  emulator-proven full loop (install → grant → launch → use → update → rollback).
- Hostile-app conformance suite green on Bare + emulator; cross-app isolation tests;
  24 h soak; Hyperbee pin in `conformance/UPSTREAM.md`; §7 register cleared or runbook'd.
- **Phase 5/6 inputs:** a runtime whose UI posture is the iOS 3.3.2 argument (Phase 5),
  a backend interface a desktop host can adopt for runtime parity (Phase 6), and the
  sandbox surface Phase 7's security review audits.
