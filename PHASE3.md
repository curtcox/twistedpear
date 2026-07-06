# Phase 3 — Distribution system: Detailed Plan

Companion to [PLAN.md](PLAN.md) §5 Phase 3. Reticulum compatibility remains the only hard
constraint; known costs are in [LIMITATIONS.md](LIMITATIONS.md) §§6–7.

## 1. Scope

Build the P2P app-distribution pipeline: signed packages published to Hyperdrive and
served as Reticulum Resources, discovered via Reticulum announces, fetched over the best
available path, and stored — verified — on the device. Concretely:

- **Package format** (`app-registry`): manifest + JS bundle + assets, Ed25519-signed with
  the developer's Reticulum identity; a published spec (docs/package-format.md).
- **Hyperdrive publish/consume** (`bridge-hyper`): versioned, updatable drives; sparse
  fetch; Hyperdrive proven on Bare (Hyperswarm itself already smoke-passes —
  `conformance/bare-hyperswarm`).
- **Discovery**: app destinations announced over Reticulum; hosts subscribe and build a
  persistent local catalog. **Announce-only** — Autobase community registries are
  deferred; the manifest format stays registry-friendly (self-contained, signed, no
  context needed to validate).
- **Resource fetch path**: packages downloadable as Reticulum Resources over any
  interface, including through transport nodes and over (simulated) BLE.
- **Fetch strategy engine**: Hyperswarm/Hyperdrive → LAN-mirrored drive → Reticulum
  Resource, selected using interface state (`reticulum-interfaces/policy.ts`), with
  resume, progress, and budget rules for constrained links.
- **CLI, publish side only** (`packages/cli`): `init`/`pack`/`sign`/`publish`/`update`/
  `seed`. The dev-loop (`create` templates, hot-reload `dev`) waits for Phase 4, when
  there is a runtime to develop against.
- **Headless seed node** (`tp seed`): a small Node daemon that mirrors drives, serves
  Resources, and optionally routes as a transport node — CI's always-on peer and the
  precursor of Phase 6's desktop role.
- **On-device catalog + install** in `apps/harness-mobile`: discover → download →
  verify → store, with progress and storage management. **Nothing executes**; packages
  land verified on disk for Phase 4.
- **Updates**: Hyperdrive versioning for OTA; `minHostApi` pinning; version monotonicity
  (downgrade rejection); keep-previous-version rollback.

**Out of scope (deferred):**

- Running/sandboxing mini-apps, capability grants, SDK — Phase 4. (The manifest *carries*
  capability requests so the format doesn't churn, but nothing interprets them yet.)
- Autobase registries, registry subscription UI, catalog merging — later phase; format
  compatibility is Phase 3's only obligation to them.
- CLI `create`/`dev` — Phase 4.
- Publisher key rotation and revocation — documented as a gap (LIMITATIONS §7), design
  sketch only; packages are trusted exactly as far as the signing key.
- Desktop host app proper — Phase 6 (`tp seed` is deliberately headless and minimal).
- iOS — Phase 5 (the 3.3.2 posture in LIMITATIONS §4 constrains *runtime*, not this
  phase's transport/verify work).

**Relationship to Phase 2:** consumes the running on-device node, the Bare runtime
adapter, and the interface prioritization policy as-is. Phase 2's remaining hardware-debt
items don't block Phase 3 CI-tier work; the one new device-gated criterion here (BLE-only
install) joins the same register discipline. Gaps found in `reticulum-ts` Resources or in
`policy.ts` are fixed in those packages, not worked around.

## 2. Guiding principles

1. **Emulator-first, device-gated** (carried from Phase 2). Every milestone has a CI exit
   (desktop Node/Bare, docker topologies, Android emulator); device criteria go to the
   hardware register (§7) and block phase exit, not milestone order.
2. **Verify at the content layer, not the transport layer.** A package is valid iff its
   manifest signature and file hashes check out — regardless of whether bytes arrived via
   Hyperdrive, LAN mirror, or Resource. Transports are untrusted pipes; the same verifier
   runs on every path, and the package hash is identical on every path (canonical
   archive, §4 M0).
3. **The publisher's Reticulum identity is the only trust root.** No accounts, no
   certificates, no registry authority. App identity = publisher identity + app name;
   same-key continuity is required for updates.
4. **Reticulum is the control plane; Hyperdrive is the bulk plane** (PLAN §3). Discovery
   and small metadata go over announces; bulk bytes prefer IP paths; the Resource path
   must nonetheless carry a *complete* install, because for off-grid peers it is the only
   path (LIMITATIONS §6 — hence size budgets).
5. **Sovereign by default, convenient by default.** CI and tests run against a
   self-hosted DHT bootstrap (hyperdht testnet); the shipped default uses public
   bootstrap nodes but the bootstrap list is configuration, not code.

## 3. Repo layout additions

```
packages/
  app-registry/src/
    manifest.ts       manifest schema, canonical JSON serialization, validation
    package.ts        pack/unpack, canonical archive, file hashing, size accounting
    signing.ts        Ed25519 sign/verify over canonical manifest (reticulum-ts identity)
    announce.ts       app-destination naming, announce app_data encode/decode/validate
    catalog.ts        persistent local catalog: ingest, trust rules, expiry, caps
  bridge-hyper/src/
    drive.ts          Hyperdrive publish/mirror/consume wrappers, key management
    swarm.ts          Hyperswarm lifecycle, topic derivation, bootstrap config
    fetch.ts          fetch strategy engine (drive → LAN mirror → Resource), resume/progress
    resource-server.ts  serve packages as Reticulum Resources (list/fetch protocol over Link)
    resource-client.ts  fetch packages as Resources
  cli/src/
    commands/         init, pack, sign, publish, update, seed
    seed/             headless seeder daemon (mirror drives, serve Resources, transport opt-in)
apps/
  harness-mobile/     grows: catalog screen, app detail, install/progress, storage mgmt
    worklet/          bridge-hyper + app-registry wired into the worklet
docs/
  package-format.md   the publishable package + announce format spec
conformance/
  dist-interop/       docker topologies: publish/discover/fetch incl. via Python transport
  fixtures/packages/  sample packages (tiny/typical/oversized) used across suites
```

Scoped names follow the existing convention (`@twistedpear/app-registry`, etc.).
Hyperdrive/Corestore/Hyperswarm versions are pinned and recorded in
`conformance/UPSTREAM.md` alongside the RNS pin.

## 4. Milestones

### M0 — Package format spec + signing
Write **docs/package-format.md**: manifest schema (name, version [semver], entry point,
capability requests, icon, `minHostApi`, file table with per-file SHA-256 + sizes, drive
key, publisher public key), canonical JSON serialization for signing, the **canonical
archive** (deterministic ordering, no timestamps) so one package hash is stable across
Hyperdrive and Resource transports, signature block, and the threat model (tamper,
substitute, downgrade, replay-of-old-version). Implement `manifest.ts`/`package.ts`/
`signing.ts` with golden fixtures in `conformance/fixtures/packages/`.
**Exit:** spec committed; pack → unpack → verify round-trips; tamper matrix (modified
file, modified manifest, wrong key, truncation) all rejected with distinct errors;
package hash identical when built twice from the same inputs.

### M1 — Hyperdrive publish/consume (desktop + Bare)
`drive.ts`/`swarm.ts`: create a drive per app, write package versions, consumer-side
sparse download and integrity handoff to the M0 verifier. CI runs against a local
hyperdht testnet bootstrap. **Bare tier:** the consumer path runs on desktop Bare
(Corestore on bare-fs) — this is the phase's biggest platform risk, so it's proven here,
not in M7.
**Exit:** publish v1 on peer A → fetch + verify on peer B via the testnet swarm; publish
v2 → B observes and fetches the update; consumer suite green on desktop Bare; bootstrap
list injectable via config.

### M2 — Discovery: announces + local catalog
`announce.ts`/`catalog.ts`: app destination naming scheme (derived from publisher
identity + app name, spec'd in M0's doc), announce `app_data` carrying a compact signed
summary (version, size, drive key, Resource availability flag), catalog ingest with
trust rules (first-seen key pinning per app, same-key updates only), persistence,
expiry, and per-source caps (leaning on `reticulum-ts` rate limiting).
**Exit:** docker topology — publisher announces through a Python RNS transport node; TS
host builds a correct catalog; tampered/mis-signed/oversized announces rejected; catalog
survives restart; a flood from one identity cannot evict other entries.

### M3 — Reticulum Resource fetch path
`resource-server.ts`/`resource-client.ts`: a small request protocol over a Link
(list versions → fetch canonical archive as a Resource), served by publishers and
seeders. Must behave over constrained interfaces: resume via Resource retry semantics,
sane timeouts at low bitrates.
**Exit:** package fetch + verify over Reticulum only, in docker: direct, through a
Python transport node, and over the Phase 2 simulated-BLE pipe with 2% loss and
mid-transfer disconnect; fetched bytes hash-identical to the Hyperdrive copy.

### M4 — Fetch strategy engine
`fetch.ts`: choose and sequence paths — Hyperswarm drive → drive mirrored from a LAN
peer → Reticulum Resource — driven by interface state and `DEFAULT_INTERFACE_PRIORITY`
(`reticulum-interfaces/policy.ts`); unified progress/cancel/resume API; **budget rules**:
no automatic bulk fetch over RNode-class links, size warnings against the LIMITATIONS §6
budgets, catalog shows size before fetch.
**Exit:** scenario matrix where each path is forced (DHT blocked → LAN; all IP blocked →
Resource); mid-fetch path failure falls through and completes; a fetch started on
Hyperdrive and completed via Resource verifies (content-layer equality); budget rules
demonstrably block/warn.

### M5 — CLI publish side
`tp init` (create/load a Reticulum identity as the publisher key), `tp pack`, `tp sign`,
`tp publish` (write drive version + announce + register with a seeder), `tp update`
(bump + republish). Config file for bootstrap list, seeder address, identity path.
**Exit:** end-to-end on desktop: `init → pack → publish` then a second machine (docker)
discovers and fetch-verifies; `tp update` produces v2 visible to subscribers; every
command has `--help` and non-zero exit codes on failure paths (CI-scripted).

### M6 — Headless seed node
`tp seed`: daemon that mirrors nominated drives (or auto-mirrors what its operator's
catalog trusts), serves the Resource protocol, optionally runs transport-node mode;
systemd/pm2-friendly (single process, logs to stdout, state dir flag).
**Exit:** publish from machine A, **kill A**, fetch from the seeder via both Hyperdrive
and Resource paths; 24 h soak seeding 3 apps under periodic fetch load with flat RSS;
seeder restart resumes seeding from state dir. CI adopts the seeder as its standing
always-on peer for M7+.

### M7 — On-device catalog + install (harness-mobile)
Wire `app-registry` + `bridge-hyper` into the worklet; RPC surface to the RN host;
UI: catalog list (name, publisher, version, size, source path), app detail, install with
progress, verified-badge, delete/storage view. Storage quota with LRU eviction of
*packages* (never user data).
**CI exit:** scripted emulator run — `tp publish` on the host machine → emulator
discovers the announce over TCP → installs via Hyperswarm path → package verified on
device storage; forced-Resource-path install also green; install survives app
background/foreground mid-download (Phase 2 foreground service).
**Device exit (deferred → §7):** phone discovers and installs from a desktop seeder over
LAN (AutoInterface); **BLE-only install** of a budget-sized package between two phones —
the PLAN §6 flagship scenario.

### M8 — Updates, pinning, rollback
Update check from announces + drive version watching; `minHostApi` gate at install time;
version monotonicity per app (reject downgrades and re-signed older versions); keep
previous version for one-tap rollback; same-key continuity enforced (key rotation
explicitly documented as unsupported, with the design sketch parked in
docs/package-format.md §Future).
**Exit:** v1→v2 OTA on emulator with rollback to v1; downgrade and key-swap attacks
rejected in tests; `minHostApi` violation blocks install with a useful message; update
of an app while its package is being served (seeder) doesn't corrupt either version.

### M9 — Integration, budgets, release
End-to-end demo script (the CI-tier version of PLAN §6's device-lab flow); size budgets
measured and written into LIMITATIONS §6 (what installs in <1 min on LAN / BLE / LoRa
Resource path); 24 h mixed soak: seeder + 2 desktop peers + emulator, publishing updates
hourly under interface flapping; docs; publish `app-registry`, `bridge-hyper`, `cli`
0.1.0; update `conformance/UPSTREAM.md` with the Holepunch pins and tracking policy.
**CI exit:** soak green (no leaks, catalogs consistent, zero corrupt installs); demo
script runs clean from a fresh checkout; §7 register has runbook procedures written.

### Parallelism notes
M0 is the only serial gate. M1 (Hyperdrive), M2 (discovery), and M3 (Resource path) are
independent of each other and can run in parallel off M0. M4 needs M1+M3; M5 needs
M0–M2; M6 extends M5; M7 needs M2+M4 (and rides Phase 2's harness); M8 needs M1+M7.
The serial spine is M0 → {M1,M2,M3} → M4 → M7 → M8 → M9. Bare risk is front-loaded
into M1 deliberately — if Corestore-on-Bare fails there, the LIMITATIONS §6 fallback
(Resources-only distribution) is invoked while M2/M3/M5 continue unaffected.

## 5. Testing strategy detail

| Layer | What | When |
|---|---|---|
| Format golden fixtures | pack/verify round-trips, tamper matrix, hash stability | every commit, no network |
| Swarm topologies | publish/fetch/update over local hyperdht testnet | every PR touching bridge-hyper |
| Docker dist-interop | discovery + Resource fetch incl. via Python RNS transport | every PR from M2/M3 |
| Path-forcing matrix | each fetch path forced + fallthrough | every PR from M4 |
| Desktop Bare | drive consumer + verifier suite on Bare | every PR from M1 |
| Emulator jobs | discover→install→verify, both paths, backgrounding | PRs touching harness/worklet; nightly soaks |
| CLI e2e | scripted init→publish→update against dockerized consumer | every PR from M5 |
| Soak | seeder 24 h (M6), mixed-network 24 h (M9) | nightly from M6 |
| Device runbook | §7 register procedures | when hardware allows; before phase exit |

All suites verify at the content layer (principle 2): any test that fetches also
verifies, and cross-path hash equality is asserted wherever two paths exist.

## 6. Phase-3-specific risks

1. **Hyperdrive/Corestore on Bare/Android** — the least-proven dependency (only
   Hyperswarm is smoke-tested). Mitigation: M1 proves the consumer on desktop Bare
   before anything builds on it; documented fallback is Resources-only distribution
   (LIMITATIONS §6), which M3 makes real rather than theoretical.
2. **DHT bootstrap dependency** — public Holepunch bootstrap is an external service.
   Mitigation: bootstrap-as-config, hyperdht testnet in CI, seeder can host bootstrap
   for sovereign deployments; noted in LIMITATIONS §6.
3. **Trust-model gaps** (key rotation, revocation, multi-maintainer apps) — deliberately
   out of scope; first-seen key pinning + same-key updates is the whole story. Risk:
   lost key = dead app identity. Mitigation: stated loudly in the spec and LIMITATIONS
   §7; design sketch parked for a later phase.
4. **Catalog abuse** — announces are unauthenticated-by-context (anyone can announce).
   Mitigation: signature checks before ingest, per-identity caps, expiry, and
   `reticulum-ts` rate limiting; no auto-fetch of anything, ever — install is a user
   action with the size visible.
5. **Package size vs constrained links** — a typical RN-adjacent JS bundle blows the
   LoRa/BLE budget. Mitigation: measured budgets in M9, size warnings in catalog/CLI,
   canonical archive is compressed; delta updates noted as future work (Hyperdrive
   dedupe already softens the IP path).
6. **On-device storage growth** — drives + archives + installed packages triple-store
   bytes. Mitigation: M7 quota/eviction, archives discarded after verify+unpack, sparse
   drive fetch only.
7. **Holepunch upstream churn** — Hyperdrive/Corestore major-version moves. Mitigation:
   pins in UPSTREAM.md with the same deliberate-bump policy as the RNS pin.

## 7. Hardware-debt register (Phase 3 additions)

Same discipline as Phase 2 §7; cleared before phase exit, runbook procedures written in
M9.

| # | Needs | Deferred criterion |
|---|---|---|
| H6 | 1 Android phone + desktop on one LAN | M7 install from desktop seeder over AutoInterface |
| H7 | 2 Android phones (same pair as Phase 2 H2) | M7 BLE-only install of a budget-sized package, foreground service on |
| H8 | RNode pair (Phase 2 H4) | M4 budget rule verified live: bulk fetch refused over LoRa, Resource fetch of a tiny package succeeds |

## 8. Phase exit deliverables

- **docs/package-format.md** — published spec: manifest, canonical archive, signing,
  announce format, threat model, explicit non-goals (rotation/revocation).
- `app-registry` 0.1.0: pack/sign/verify, announces, persistent catalog with trust rules.
- `bridge-hyper` 0.1.0: Hyperdrive publish/mirror/consume (Node + Bare), Resource
  serve/fetch protocol, fetch strategy engine with budget rules.
- `cli` 0.1.0: `init`/`pack`/`sign`/`publish`/`update`/`seed`; seeder soak-proven as CI's
  always-on peer.
- `apps/harness-mobile`: catalog + install UI; emulator-proven discover→install→verify
  over both Hyperdrive and Resource paths.
- Updates: OTA v1→v2 with rollback, downgrade rejection, `minHostApi` gating.
- Measured size budgets and bootstrap-sovereignty notes folded into LIMITATIONS §6;
  Holepunch pins in `conformance/UPSTREAM.md`; §7 register cleared or runbook'd.
- **Phase 4 inputs:** verified packages on device storage with capability requests in
  their manifests, a catalog/install UX to hang grants off, and `minHostApi` as the
  host-SDK versioning anchor.
