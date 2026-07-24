# Consolidation plan — shared abstractions and naming

<!-- tp-doc
lifecycle: planned
audited: 2026-07-24
register: none
-->

Progress (2026-07-24):
- **Phase 1 done** — `packages/worklet-core` holds `dev-channel`, bonjour/multicast/serial IPC bridges.
- **Phase 2 done** — `FetchPath`/`FetchProgress` live in `bridge-hyper`; `host-core` re-exports.
- **Phase 3 done (factories + composers)** — `createWorkletMiniappHost` / `createWebWorkletMiniappHost`, `createHostReplyChannel`, `createStatusTimer`, `createMiniappAnnounceService` in worklet-core. Host `entry.mjs` files still carry platform IPC, `pushStatus`, and interface stacks (further shrink is opportunistic, not blocking).
- **Phase 4 done** — schema value tables + `WidgetVisitor` / `visitWidget` in runtime; renderers + describe use it.
- **Phase 5 done** — `bridge-hyper` split into `client/` / `server/` / `core/`; renames `web-gateway-hyper-fetch` / `gateway-hyperswarm-drive-fetch`; `DriveFetcher` interface + fetch-plane wiring.
- **Phase 6 seeded** — `conformance/lib/` + adoption rule; desktop runner converted (adopt more when touching runners).
- **Phase 7.1 done** — Layer-1/2/3 + checked traces named in specs/README and glossary.
- **Deferred** — Phase 7.3 `apps/harness-mobile` → `apps/host-mobile` (quiet-window rename; do not land casually).

Plan exit criteria largely met for Phases 1–6 and 7.1. Loop stopped.

This plan removes the duplication and naming debt identified by the 2026-07-24
terminology and abstraction audit. The durable terminology output of that audit
is the [developer glossary](glossary.md); this document is the work order for
everything the audit proposed but did not apply. Phases are ordered so each
lands independently, cheapest and highest-leverage first; later phases never
block earlier ones.

Motivating measurements (tree state at audit time):

- The desktop and mobile worklet entries shared **1,360 identical lines**;
  `dev-channel.mjs`, `ipc-bonjour-bridge.mjs`, and `ipc-multicast-bridge.mjs`
  were byte-identical between `apps/host-desktop/worklet/` and
  `apps/harness-mobile/worklet/`; `ipc-serial-bridge.mjs` differed by 10 lines;
  the two `miniapp-host.mjs` factories were ~85% common. Every cross-host
  feature currently lands as parallel edits to three or four worklets.
- `FetchPath` / `FetchProgress` and the fetch request/result shapes are defined
  twice, structurally identically, in
  [`packages/host-core/src/fetch-plane.ts`](../packages/host-core/src/fetch-plane.ts)
  and [`packages/bridge-hyper/src/core/fetch.ts`](../packages/bridge-hyper/src/core/fetch.ts).
- 68 conformance `run.mjs` runners; ≥13 hand-rolled `assert` helpers, ~32
  ad-hoc `spawn`/`execFile` wrappers, repeated log-file plumbing.
- Both widget renderers hand-write per-type `switch` dispatch over the closed
  widget vocabulary; per-type prop tables live in
  [`scripts/generate-widget-schema.mjs`](../scripts/generate-widget-schema.mjs)
  rather than beside `WIDGET_TYPES`.

## Guardrails (every phase)

A phase is done only when:

1. `npm run check:fast` and `npm run check:ci-base` pass.
2. The focused conformance suites named in the phase pass.
3. No new entry appears in `violations.json` and the Sans-IO gate
   (`npm run sansio`) stays green — none of this work may move code across the
   pure boundary.
4. Docs that name moved files are updated in the same change
   (`npm run test:doc-audit`).

## Phase 1 — `worklet-core`: lift the byte-identical files

**Goal.** One home for worklet modules that are literal copies today.

**Steps.**

1. Create `packages/worklet-core` (plain internal workspace package, same
   build shape as `packages/host-core`). If a separate package proves heavier
   than warranted, a `worklet/` export of `host-core` is the fallback; decide
   at PR time, the import sites are identical either way.
2. Move verbatim: `dev-channel.mjs`, `ipc-bonjour-bridge.mjs`,
   `ipc-multicast-bridge.mjs`.
3. Merge `ipc-serial-bridge.mjs` (10-line delta) behind an options argument;
   both hosts call the shared module with their platform pipe.
4. Point both hosts' worklet entries at the shared modules; delete the copies.
5. Update `apps/*/scripts/build-worklet.mjs` resolution and regenerate
   `imports.generated.json`; diff the generated imports to confirm the bundle
   graph changed only in paths, not membership.

**Verify.** `npm run build && npm run build:worklet`, `npm run test:desktop`,
`npm run test:desktop-lifecycle`, `npm run test:handbook-mobile`,
`npm run test:release-harness`.

**Risk.** Low — mechanical moves. The bundler is the only moving part; the
`imports.generated.json` diff is the tripwire.

## Phase 2 — one home for the fetch-plane contract

**Goal.** `FetchPath`, `FetchProgress`, request/result shapes, and the
size-warning constants (`SIZE_WARNING_BLE_BYTES`, `SIZE_WARNING_RNODE_BYTES`,
`BULK_BLOCK_RNODE_BYTES`) defined exactly once.

**Steps.**

1. `host-core` already depends on `bridge-hyper`
   (`fetch-plane-bridge-hyper.ts`), so the contract's single home is
   `bridge-hyper/src/fetch.ts`. Do **not** invert the dependency.
2. Reduce `packages/host-core/src/fetch-plane.ts` to re-exports of those types
   plus the `FetchPlane` interface it genuinely owns (the host-facing
   `fetchPackage(provider, request)` seam), keeping every existing `host-core`
   import site working unchanged.
3. Reconcile the two copies field-by-field before deleting one; any divergence
   found is a latent bug — record it in the PR description.

**Verify.** `npm run typecheck`, `npm run test:web-distribution`,
`npm run test:dist-interop`.

**Risk.** Low. Pure type/constant consolidation; no runtime behavior change.

## Phase 3 — `worklet-core`: shared mini-app host, then converged entries

**Goal.** "Wire X into four worklets" becomes "wire X into worklet-core once,
set per-host flags".

**Steps.**

1. Move `createWorkletMiniappHost` into `worklet-core`. The factory is already
   options-injected; catalog the real deltas between the desktop, mobile, and
   web copies (bundled catalog, store posture, sandbox backend choice,
   browser device-class list, AI config) and make each an explicit option.
   Everything not in that catalog is drift — resolve toward the newest copy
   and note each resolution in the PR.
2. Extract the shared sections of the three `entry.mjs` files (status
   protocol, service registration, device-manager and flag-relay wiring,
   confirmation channel plumbing) into composer functions in `worklet-core`.
3. Shrink each per-host entry to: construct platform services (IPC pipes,
   device bridge, sandbox backend, store posture), call the composer. Target:
   each entry under ~300 lines of genuinely platform-specific code.

**Verify.** Full phase-1 suite plus `npm run test:web-miniapp`,
`npm run test:web-examples`, `npm run test:sdk-interop`,
`npm run test:bind-loopback`, and one soak (`npm run test:desktop-soak`).

**Risk.** Medium — this is the largest behavioral surface. Mitigations: land
as two PRs (factory, then entries); resolve drift explicitly rather than
silently; the conformance suites above already cover every shipping host.

## Phase 4 — widget vocabulary: metadata beside the vocabulary, checked dispatch

**Goal.** Adding a widget type produces compile errors at every site that must
change, and the schema generator becomes a serializer.

**Steps.**

1. Move the per-type property/requirement tables from
   `scripts/generate-widget-schema.mjs` into
   `packages/miniapp-runtime/src/ui/schema.ts`, next to `WIDGET_TYPES`.
2. Export a `WidgetVisitor<T>` (one member per widget type) from the runtime;
   convert the dispatch in `widget-renderer-rn/src/MiniappWidgetTree.tsx` and
   `widget-renderer-headless/src/index.ts` to it so exhaustiveness is
   type-checked. Rendering behavior itself does not change.
3. Regenerate the JSON schema and require a byte-identical result as the
   proof of pure relocation (`npm run generate:widget-schema` or the current
   script invocation; commit no schema diff).

**Verify.** `npm run test:widget-parity`, `npm run test:web-widget-renderer`,
schema byte-comparison, `npm run check:fast`.

**Risk.** Low. Type-level change plus a table move.

## Phase 5 — `bridge-hyper` role split and renames

**Goal.** A file's path says which side of the wire it runs on, and the fetch
plane selects a fetcher through one interface instead of special-cased call
sites.

**Steps.**

1. Split `packages/bridge-hyper/src/` into `client/` (browser/leaf side:
   `web-hyper-fetch`, `fetch-plane-web`, `resource-client`), `server/`
   (gateway/node side: `dht-relay-server`, `gateway-bulk-fetch-server`,
   `gateway-hyperswarm-fetch`, `node-relay-hyper-fetch`, `resource-server`),
   and `core/` (`swarm`, `drive`, `fetch` contract, shared types). Keep the
   existing `worklet.ts` / `web.ts` entry-point pattern; keep `index.ts`
   re-exports so external import sites survive the move.
2. Define one `DriveFetcher` interface in `core/` implemented by the client,
   gateway, and node-relay fetchers; make the phase-2 fetch plane consume it.
3. Rename files to the `<role>-<transport>` rule during the move (one rename
   commit, no logic changes in it), e.g. `web-hyper-fetch-gateway.ts` and
   `gateway-hyperswarm-fetch.ts` stop being near-anagrams of each other.
4. Sweep docs for old paths (`npm run test:doc-audit` catches dead links).

**Verify.** `npm run test:web-hyperdrive`, `npm run test:web-hyperdrive-browser`,
`npm run test:web-distribution`, `npm run test:dist-interop`; optionally
`npm run test:dist-soak` before merge.

**Risk.** Medium — wide import churn, low semantic risk. The rename-only
commit keeps review tractable.

## Phase 6 — conformance runner toolkit (opportunistic, no deadline)

**Goal.** New and touched runners stop hand-rolling scaffolding; failure
output becomes uniform across CI.

**Steps.**

1. Add `conformance/lib/` (repo-internal, not a published package): `assert`,
   step/section logging, `spawnChecked` (captured output, timeout, exit-code
   check), temp-dir lifecycle, standard pass/fail exit protocol.
2. Adopt by rule, not by rewrite: a runner converts when it is next touched
   for any other reason. Record the rule in `conformance/AGENTS.md`.
3. Seed adoption with the two or three runners the earlier phases touch
   anyway (desktop, web-miniapp, dist-interop).

**Verify.** The converted runners' own suites; no repo-wide gate.

**Risk.** Minimal by construction.

## Phase 7 — naming decisions (each its own small change)

1. **Name the layers once.** Add one paragraph to
   [specs/README.md](../specs/README.md) naming all four representations of a
   twinned machine and their layer numbers — or drop the numbers and use the
   representation names everywhere. Today "Layer-2 twin" and "Layer-3 vector"
   appear with no Layer-1 defined anywhere. Update
   [glossary.md](glossary.md) to match the decision.
2. **Dev-doc register discipline.** Developer docs say *propagation node* and
   *256t identifier* except when quoting UI labels; the user guide keeps
   *propagation server* and *share identifier*. Already documented in both
   glossaries; enforce by review, not tooling.
3. **`apps/harness-mobile` → `apps/host-mobile`** *(decide before v1; default:
   do it, in a quiet window)*. It is the shipping mobile/web host and the only
   "harness" in the tree that is not a test harness. Touchpoints to enumerate
   in the PR: workspace globs, `build:worklet` scripts, Expo config, CI jobs,
   conformance runners that spawn it, `imports.generated.json`, and every doc
   path (the doc-audit link check finds those). A rename after public release
   costs strictly more.

## Sequencing

| Order | Phase | Size | Depends on |
|---|---|---|---|
| 1 | 1 — lift identical worklet files | S | — |
| 2 | 2 — fetch-plane contract | S | — |
| 3 | 3 — shared mini-app host + entries | L | 1 |
| 4 | 4 — widget dispatch | S | — |
| 5 | 5 — bridge-hyper split | M | 2 |
| 6 | 6 — conformance toolkit | S, rolling | — |
| 7 | 7 — naming decisions | S each | — (7.3 best after 1–3) |

Phases 1, 2, 4, and 7.1 are each a single reviewable PR and can start
immediately and in parallel.

## Exit criteria for the plan as a whole

- No byte-identical `.mjs` files remain under two different `apps/*/worklet/`
  directories (checkable with a one-line CI grep if regression appears).
- `FetchPath` is defined in exactly one module.
- Adding a widget type without updating both renderers fails `typecheck`.
- A new cross-host worklet feature is demonstrably a one-package change plus
  per-host flags (the next such feature is the acceptance test).
