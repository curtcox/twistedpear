# Phase 6 — Desktop host + network health: Detailed Plan

Companion to [PLAN.md](PLAN.md) §5 Phase 6. Reticulum compatibility remains the only hard
constraint; known costs are in [LIMITATIONS.md](LIMITATIONS.md) §§6–8.

## 1. Scope

Build the desktop host — the always-on peer the mobile phases have been assuming exists —
and make the network as a whole healthy: routing, rebroadcast, seeding, store-and-forward,
and honest observability. Concretely:

- **Desktop host app** (`apps/host-desktop`): an Electron shell with a web UI, running the
  *same* worklet core as mobile in a supervised Bare child process. The Electron layer is
  UI and OS integration only (tray, login item, sleep/wake); every protocol byte and every
  role runs in the worklet, identical to Android/iOS.
- **`host-core` extraction** (`packages/host-core`): node boot, config, identity, interface
  manager, and role management (transport / seeder / propagation) as a runtime-neutral
  package consumed by the desktop worklet entry *and* by the headless `tp seed` daemon —
  one node implementation, two shells.
- **Network roles on by default:** transport-node routing, announce rebroadcast/retention,
  and package seeding (installed apps + subscribed catalogs, quota'd) — because phones are
  bad always-on peers and this is what makes the mobile mesh actually work. All roles run
  with rate limits and bandwidth/storage caps: infrastructure, but a good citizen.
- **LXMF propagation-node server** (`lxmf-ts`): the server side Phase 1 deliberately
  skipped — announce as a propagation node, serve client sync (list/download/delete),
  store with quotas and eviction; opt-in toggle. Interop-tested against Python `lxmd`
  and LXMF clients both directions. Node-to-node propagation peering is a stretch goal.
- **Mini-app runtime parity:** the full Phase 3/4 loop on desktop — catalog → install →
  grant → launch → **DOM widget renderer** → update → rollback — plus `tp dev` against the
  desktop host. The declarative widget tree gets its second renderer, validating the
  "host renders, mini-apps describe" design cross-platform.
- **`rnsd` interop mode:** a config preset attaching the host as a leaf to a local
  reference `rnsd` over TCP instead of routing with the built-in stack —
  belt-and-suspenders against `reticulum-ts` bugs and a migration path (PLAN §7 risk 1).
- **Desktop RNode over USB serial:** `SerialPipe` over the `serialport` package, reusing
  the Phase 2 KISS driver unchanged — the desktop as a LoRa gateway.
- **Network health = observability + citizenship:** a status dashboard (interfaces, peers,
  path table, announce rates, link/Resource stats, seed storage, propagation store), an
  opt-in localhost-only JSON status endpoint, clean sleep/wake quiesce/resume (reusing the
  Phase 5 suspend/resume IPC semantics), crash supervision, and launch-at-login.
- **Packaging:** electron-builder artifacts for macOS (dmg) and Linux (AppImage/deb);
  a Windows artifact is *built* in CI but functionally verified only via the register
  (H17). macOS signing/notarization reuses the H12 Apple account when it exists.

**Decisions locked for this phase** (2026-07): the shell is **Electron + web UI** (not
Pear-distributed, not headless-only — but the core stays headless-capable via `tp seed`);
desktop gets **full mini-app runtime parity** including the widget renderer; the **LXMF
propagation server is in scope** (client-facing sync; node-to-node peering stretch);
**`rnsd` interop mode is in scope**. First-class platforms are macOS + Linux; Windows is
build-only pending H17.

**Out of scope (deferred):**

- Desktop BLE (noble/bleno-class stacks are flaky; desktop reaches BLE-only peers through
  phones or RNode). Wi-Fi Direct/Aware unchanged.
- P2P self-distribution of the host app itself (Pear-style) and host auto-update —
  installers only this phase; Hyperdrive-based host update is future work.
- Embedded I2P router (external SAM only, as shipped in Phase 2); I2P gets a UI toggle,
  nothing more.
- Autobase community registries (unchanged since Phase 3); publisher key rotation.
- Multi-app concurrency beyond the Phase 4 model; mini-app background execution.
- App-store distribution of the desktop host (Mac App Store etc.); notarization for
  direct distribution is in scope *if* the H12 account exists, otherwise documented.
- Node-to-node propagation sync **if** the stretch goal slips — recorded in LIMITATIONS
  (our propagation nodes would serve clients but not mesh with each other).

**Relationship to earlier phases:** consumes `reticulum-ts` transport routing (Phase 1),
the Bare runtime adapter and interface layer including I2P (Phase 2), the distribution
pipeline and `tp seed` (Phase 3 — `tp seed` is refactored onto `host-core`, behavior
preserved), the runtime/broker/widget-tree contract (Phase 4 — the desktop renderer is a
new *consumer* of the same validated tree, not a new tree), and the discovery-provider
abstraction with the desktop mDNS Bonjour provider (Phase 5). Gaps found land in the
owning package with Node tests first. The Phase 4 desktop-Bare CI tier graduates from
"test vehicle" to "product core".

## 2. Guiding principles

1. **Same worklet, new shell.** Electron main supervises a `bare` child process running
   the same worklet bundle mobile uses (desktop entry point); RPC framing matches the
   bare-kit IPC shape so worklet code is unchanged. If child-process supervision proves
   unworkable, the fallback is Electron `utilityProcess` on the Node runtime adapter —
   a runtime divergence recorded in LIMITATIONS §6, triggered only by the M0 tripwire.
2. **Headless-first.** Every role — transport, seeding, propagation, rnsd mode — works in
   `tp seed`/`tp node` without Electron, and CI tests roles at that tier. The UI renders
   state; it never owns it. This is also what makes a server/RPi deployment trivial.
3. **Infrastructure by default, citizen by design.** Roles default on, but every role has
   quotas (storage, bandwidth, rates) with enforced limits and visible accounting. An
   always-on node that trashes a home network gets turned off — health includes restraint.
4. **The renderer is hostile-adjacent.** Widget trees cross into the Electron renderer as
   validated data only; the renderer runs with `contextIsolation`, sandbox on,
   `nodeIntegration` off, and a strict CSP. The Phase 4 broker chokepoint remains the
   only door; Electron adds no second one.
5. **Interop bar carries over.** Every network role lands with dockerized Python RNS
   interop: transport routing between Python leaves, propagation sync against `lxmd` and
   Python LXMF clients, rnsd mode against real `rnsd`. BLE-less desktop keeps the
   simulated-pipe suites untouched.
6. **CI-first, environment-gated** (the Phases 2–5 discipline, radios swapped for
   machines). Every milestone has a CI exit on Linux (xvfb) + macOS runners with docker
   peers; real-LAN, Windows, RNode-USB, and long-uptime criteria go to the §7 register
   and block phase exit, not milestone order.
7. **One tree, two renderers, zero drift.** The RN and DOM widget renderers consume
   shared golden fixtures; structural-equivalence tests are the contract that keeps
   "declarative UI" from quietly forking per platform.

## 3. Repo layout additions

```
apps/
  host-desktop/
    src/main/          Electron main: Bare child supervisor, tray, login item,
                       power/network event handling, crash restart with backoff
    src/preload/       contextBridge: minimal validated RPC surface to the renderer
    src/renderer/      web UI: status dashboard, catalog, grants, settings,
                       widgets/ (DOM renderer for the Phase 4 widget tree)
    worklet/           desktop worklet entry (boots host-core on Bare)
packages/
  host-core/           node boot, config (platform dirs), identity, interface
                       manager, role manager (transport/seed/propagation/rnsd-mode),
                       status/metrics RPC surface — runtime-neutral (Node + Bare)
  lxmf-ts/src/
    propagation-server.ts   announce, client sync protocol, store, quotas/eviction
  reticulum-interfaces/src/
    serial-node.ts     SerialPipe over `serialport` (desktop USB; pinned in UPSTREAM)
  cli/                 `tp seed` refactored onto host-core; `tp node` alias with
                       role flags; `--attach-rnsd` preset
conformance/
  desktop/             Playwright-scripted Electron runs: boot, full app loop,
                       lifecycle (sleep/wake, crash-restart), dashboard asserts
  transport-role/      docker: desktop host as the only route between Python leaves
  propagation-interop/ docker: lxmd + Python LXMF clients ⇄ our server, both ways
  rnsd-mode/           docker rnsd; app-layer loop through the attached host
  widget-parity/       shared golden widget-tree fixtures, RN ⇄ DOM equivalence
  desktop-soak/        72 h role + mini-app soak under churn
docs/
  desktop-host.md      roles, quotas, config, lifecycle matrix, security posture
  propagation-node.md  ops guide: store limits, eviction, announce behavior, interop
```

## 4. Milestones

### M0 — Shell spike, host-core skeleton, CI lanes
Scaffold `apps/host-desktop`: Electron main spawns `bare` running the desktop worklet
entry; stdio RPC framing compatible with the bare-kit IPC shape (worklet code unchanged);
preload/renderer skeleton showing live node status. Extract `packages/host-core` far
enough to boot identity + TCPClientInterface from config on both Node and Bare. Stand up
the two CI lanes: Linux (xvfb) and macOS, each booting Electron + worklet, linking to a
dockerized (Linux) or host-process (macOS, the Phase 5 pattern) Python RNS peer,
announce/link/LXMF smoke, Playwright driving the status screen.
**Tripwire:** if Bare-as-child-of-Electron is unworkable (signal handling, packaging,
crash semantics), fall back to `utilityProcess` + Node runtime adapter and record the
divergence in LIMITATIONS §6 *before* any role work begins — the Phase 2 M0 discipline.
**CI exit:** both lanes green; supervisor restarts a killed worklet with state intact;
RPC framing conformance test shared with harness-mobile.

### M1 — host-core roles: transport-node + rebroadcast by default
Interface manager (TCPClient/Server, UDP, AutoInterface with multicast **and** Bonjour
providers, I2P toggle) driven by config in platform dirs; transport routing enabled by
default on desktop; announce rebroadcast/retention per the reference transport rules;
rate limits and bandwidth caps enforced and surfaced; `tp seed` refactored onto
host-core with behavior preserved (existing seeder conformance stays green as the
refactor's regression net).
**CI exit:** docker topology with the desktop host as the *only* route between two
Python RNS leaves — announces propagate, links form, LXMF and Resource transfer traverse
end-to-end; the Phase 1 interop scenario suite passes with the desktop node in the
transport role; policy/quota unit tests; `test:seeder` unchanged and green.

### M2 — Seeding + LAN mirror role in the host
Absorb drive mirroring and Resource serving into the desktop host: seed installed apps
and subscribed catalog entries by default under a storage quota; seeding status, per-app
pinning, and storage management in the UI; LAN-mirror advertisement so nearby peers
prefer the desktop (Phase 3 fetch-strategy engine unchanged — the desktop just becomes
the good path).
**CI exit:** dist-interop variant where the Android emulator harness installs a package
whose *only* fast path is the desktop LAN mirror; Resource-path install through the
desktop over docker; quota enforcement (eviction, pin survival) tested; budgets suite
(`test:budgets`) untouched.

### M3 — LXMF propagation-node server
`lxmf-ts/propagation-server.ts`: announce the propagation destination, serve the client
sync protocol (offer/list/download/delete per the reference), transient-ID store with
size/count quotas and eviction, per-client limits, malformed-input rejection. Opt-in
toggle (UI + `tp node --propagation`). **Stretch:** node-to-node propagation peering;
if it slips, LIMITATIONS records that our nodes serve clients but don't mesh with each
other, and deployments wanting meshed stores run `lxmd`.
**CI exit:** offline-delivery round trip through our server with our client (docker);
cross-interop both directions — a Python LXMF client syncs from our server, our client
syncs from `lxmd` (Phase 1 client tests reused); hostile suite: oversize messages, quota
exhaustion, junk frames; store survives restart.

### M4 — Mini-app runtime parity: the DOM renderer + full loop
Run `miniapp-runtime` in the desktop worklet (the Phase 4 desktop-Bare tier, now
product); build the DOM widget renderer in the Electron renderer mapping the Phase 4
whitelist; capability-grant UI; the full loop on desktop: catalog from announces →
install with verification badge → grants → launch → widget render → update on relaunch →
rollback. `tp dev` targets the desktop host (localhost side-load, hot reload, DEV badge,
dev-mode gate — same rules as mobile). Electron hardening lands here with the renderer
(principle 4). `conformance/widget-parity/`: golden widget-tree fixtures rendered by
both RN (harness) and DOM (desktop) with structural-equivalence asserts.
**CI exit:** Playwright-scripted full loop against the docker seeder; hostile-apps suite
on the desktop worklet; dev-loop edit-to-render inside the Phase 4 5 s budget; widget
parity suite green; Electron security posture asserted in tests (no node in renderer,
CSP present, IPC surface enumerated and frozen).

### M5 — External-node interop: rnsd mode + desktop RNode USB
**(a) rnsd mode:** `--attach-rnsd` config preset — the host runs as a leaf over a
TCPClientInterface to a local reference `rnsd`, local transport role off (rnsd routes);
all app-layer roles (catalog, install, mini-apps, propagation client) work unchanged.
Documented as both a fallback against `reticulum-ts` bugs and a migration path.
**(b) RNode USB:** `serial-node.ts` SerialPipe over `serialport` (pinned in
`conformance/UPSTREAM.md`), reusing `rnode/kiss.ts` and `interface.ts` byte-for-byte;
RNode config UI (port pick, radio params) in the host; desktop-as-LoRa-gateway posture
documented.
**CI exit:** rnsd-mode conformance — announce/link/LXMF/install loop through a docker
`rnsd`; explicit assert that the attached host does not route; RNode glue tests over the
mocked SerialPipe (the Phase 2 bar); `serialport` builds and loads in both the Electron
and Bare contexts on macOS + Linux CI.
**Device exit (H19):** real RNode pair over desktop USB, LoRa end-to-end.

### M6 — Always-on citizenship + health dashboard
OS integration: launch at login, tray/menubar with quit-to-tray, sleep/wake handling —
on suspend the worklet gets the Phase 5 `suspend` IPC (quiesce, clean link teardown,
state persisted), on wake `resume` (reconnect, re-announce); network-change re-peering;
supervisor crash-restart with backoff and role resumption. Health surface: status RPC →
dashboard (interfaces, peer/path-table counts, announce rates, link and Resource
transfer stats, seed storage, propagation store, uptime, bandwidth counters); opt-in
**localhost-only** JSON status endpoint for scripted monitoring; log rotation.
**CI exit:** scripted sleep/wake and interface-flap cycling ×100 — the Python peer sees
teardown not timeout, reconnect + re-announce within 10 s, flat RSS; kill −9 the worklet
→ supervised restart < 5 s with roles resumed; status-endpoint schema tests; dashboard
numbers cross-checked against docker-peer ground truth.

### M7 — Packaging, soak, docs, release
electron-builder artifacts: macOS dmg/zip, Linux AppImage + deb, Windows NSIS **built**
in CI (verification deferred to H17); macOS signing/notarization performed if the H12
Apple account exists, otherwise the procedure is documented and registered. 72 h desktop
soak (nightly): transport + seeding + propagation + one running mini-app under interface
flapping and sleep/wake churn — flat RSS, zero unsupervised worklet deaths, stores
intact. `demo:phase6`: publish on desktop → route through desktop transport → install on
the emulator harness via the desktop seed → offline LXMF delivered via the desktop
propagation node. Write **docs/desktop-host.md** and **docs/propagation-node.md**;
update LIMITATIONS (§6 runtime facts, §8 time-to-usefulness now that desktops exist;
propagation peering status); update PLAN §6's device-lab flow (desktop leg is now the
product, not a stand-in); write **PHASE6-HARDWARE.md** runbooks for §7; publish
`lxmf-ts` 0.2.0 (propagation server), `host-core` 0.1.0, `host-desktop` 0.1.0.
**CI exit:** soak green; fresh-checkout `demo:phase6` clean; every register row has a
written procedure.
**Phase exit:** additionally requires the §7 register cleared (H17–H20).

### Parallelism notes
M0 → M1 is the spine. After M1, **M2, M3, and M5 are mutually independent**; M4 needs M1
(node + catalog) and prefers M2 (install via desktop seed makes its CI loop
self-contained). M6 needs M1 and consumes M2/M3/M5 state for dashboard depth; M7 closes.
The M0 tripwire (Bare-under-Electron) is the phase's only fail-fast gate — it must
resolve before role work begins. The M3 stretch (node-to-node peering) must be declared
kept-or-slipped by the time M6 starts, so the dashboard and docs tell the truth.

## 5. Testing strategy detail

| Layer | What | When |
|---|---|---|
| Existing suites | vectors, interop, dist, hostile-apps, dev-loop, ios-sim | unchanged, every commit |
| Desktop boot smoke | Electron + worklet + TCP slice vs Python peer, both OS lanes | every PR touching host-desktop/host-core |
| Transport role | desktop as only route between Python leaves (docker) | every PR from M1 |
| Seeder regression | `test:seeder` on refactored host-core | every commit from M1 |
| LAN-mirror install | emulator installs via desktop seed | PRs touching dist path; nightly |
| Propagation interop | ours ⇄ lxmd / Python clients, both directions + hostile | every PR from M3 |
| Full desktop loop | Playwright: install → grant → launch → update → rollback | PRs touching host/runtime; nightly |
| Widget parity | golden fixtures, RN ⇄ DOM structural equivalence | every PR touching widgets/renderers |
| Electron posture | renderer isolation, CSP, frozen IPC surface | every PR touching host-desktop |
| rnsd mode | app loop through docker rnsd; no-routing assert | every PR from M5 |
| RNode glue | mocked SerialPipe suite; serialport load test | every commit touching rnode/serial |
| Lifecycle | sleep/wake + flap ×100, crash-restart, RSS | every PR from M6; nightly |
| Soak | 72 h roles + mini-app under churn | nightly from M7 |
| Register runbooks | §7 procedures (PHASE6-HARDWARE.md) | when environments exist; before phase exit |

Two desktop CI lanes (Linux xvfb + macOS) from M0; Playwright jobs are pre-merge for
host-desktop/host-core paths only, nightly-plus-label elsewhere — the same escape hatch
as the Phase 2 emulator and Phase 5 simulator lanes.

## 6. Phase-6-specific risks

1. **Bare under Electron supervision** — child-process lifecycle, packaging the `bare`
   binary per platform, crash/signal semantics. Mitigation: M0 tripwire with a defined
   fallback (`utilityProcess` + Node adapter); supervision tests from M0.
2. **LXMF propagation server fidelity** — the reference implementation *is* the spec;
   server-side behavior (sync semantics, limits, peering) must be derived from `lxmd`
   and validated by interop, and upstream changes are ours to chase (the standing
   LIMITATIONS §1 posture, now for LXMF too). Mitigation: both-directions interop in CI
   from M3; peering is a stretch, not a promise.
3. **Renderer drift** — a DOM renderer that "mostly" matches RN quietly forks the
   declarative UI contract. Mitigation: shared golden fixtures and structural-
   equivalence tests as a merge gate (principle 7); the whitelist stays small.
4. **Electron attack surface** — a desktop host that renders hostile-adjacent widget
   trees and holds identity keys. Mitigation: principle 4 hardening from M4, asserted in
   CI; the security *review* stays in Phase 7, but the posture ships now.
5. **Transport-role resource growth** — path tables, announce retention, and link state
   on an always-on node have different growth curves than a phone session. Mitigation:
   caps + eviction tested at M1; the M7 soak and H20 long-run watch RSS and table sizes.
6. **serialport native module** — must build/load in both Electron and Bare contexts
   across three OSes. Mitigation: CI load tests both contexts from M5; USB is
   desktop-only so failure degrades to "no LoRa gateway", never blocks the host.
7. **Windows as a third first-class OS is scope creep** — mitigation: explicitly
   build-only this phase; H17 verification decides its status and LIMITATIONS records it.
8. **Quota/citizenship tuning** — defaults that saturate a home uplink (seeding) or disk
   (propagation store) would make desktops *worse* for the network's reputation.
   Mitigation: conservative defaults, visible accounting, all caps user-adjustable;
   H18/H20 measure real behavior.

## 7. Environment/hardware-debt register (Phase 6 additions)

Continues Phase 2–5 numbering (H1–H16). Cleared before phase exit; runbook procedures
written in M7 (PHASE6-HARDWARE.md).

| # | Needs | Deferred criterion |
|---|---|---|
| H17 | 1 Windows 10/11 machine | host-desktop artifact installs and runs; boot + TCP slice + full app loop; multicast/Bonjour behavior noted; status (supported / degraded / dropped) recorded in LIMITATIONS |
| H18 | 2 desktops + 1 Android phone (+ iPhone if H13 cleared) on one real WiFi LAN | LAN discovery both providers across machines; phone installs a real package via the desktop seed; measured LAN throughput sanity-checks the LIMITATIONS §6 budget table; desktop ⇄ desktop transport routing on real network |
| H19 | RNode pair + desktop USB (Phase 2 H4 hardware) | RNode over desktop USB serial; LoRa end-to-end phone → RNode ⇄ RNode → desktop with the desktop as gateway/transport; propagation-node sync over LoRa within budget limits |
| H20 | 1 always-on box (spare machine / home server, Linux) | 2-week unattended `tp node` run with all roles: uptime, flat RSS, path-table/store sizes over time, log review; findings fold into LIMITATIONS §8 (time-to-usefulness) and quota defaults |

## 8. Phase exit deliverables

- **`apps/host-desktop` 0.1.0** — Electron host running the identical worklet core:
  full Phase 3/4 loop with the DOM widget renderer, roles dashboard, packaged for
  macOS + Linux (Windows artifact built, H17-gated), scripted in CI
  (`conformance/desktop/`).
- **`packages/host-core` 0.1.0** — runtime-neutral node/role engine shared by the
  desktop host and the headless `tp seed`/`tp node` daemon; transport-node +
  rebroadcast + seeding on by default with enforced quotas.
- **`lxmf-ts` 0.2.0** — LXMF propagation-node server, interop-proven against `lxmd`
  and Python LXMF clients both directions; node-to-node peering shipped or explicitly
  recorded as a gap in LIMITATIONS.
- **rnsd interop mode** — `--attach-rnsd` preset, conformance-tested against a docker
  `rnsd`; documented as fallback and migration path (closes the PLAN §7 risk-1
  mitigation).
- **Desktop RNode USB** (`serial-node.ts`) — mocked-pipe CI green; real-hardware
  criterion in H19.
- **Widget-parity suite** — shared golden fixtures proving the RN and DOM renderers
  implement one contract.
- **docs/desktop-host.md** and **docs/propagation-node.md**; LIMITATIONS §§6–8 updated
  with measured desktop facts; PLAN §6 device-lab flow updated.
- **`demo:phase6`** — publish → route → seed-install → offline-LXMF, end to end through
  the desktop, from a fresh checkout.
- **PHASE6-HARDWARE.md** runbook; §7 register (H17–H20) cleared.
- **Phase 7 inputs:** the enumerated desktop attack surface (Electron renderer/IPC,
  propagation store parsers, serialport, status endpoint) as fuzz/review targets; a
  real always-on node population making the hardening phase's battery/bandwidth policy
  work measurable; `reticulum-ts` + BLE spec + (new) propagation-server notes ready for
  the upstream-publication deliverable.
