# Terminology and abstraction audit

<!-- tp-doc
lifecycle: reference
audited: 2026-07-24
register: none
-->

A point-in-time audit (2026-07-24) of the repository's working vocabulary and of
duplication that suggests missing abstractions. The durable output is the
[developer glossary](glossary.md); this document records the findings and the
refactor proposals that were *not* applied, so they can be scheduled
deliberately. Line counts and file lists below describe the tree at audit time.

## What was changed

- Added [docs/glossary.md](glossary.md) (developer register), cross-linked from
  [guide/glossary.md](../guide/glossary.md), `AGENTS.md`, and
  [docs/README.md](README.md).
- Normalized the three prose occurrences of "sans-IO" to **Sans-IO**
  (`docs/abuse-resistance-loop.md`, `docs/local-peer-discovery-plan.md`).
- No identifiers, file names, or wire formats were touched.

## Terminology findings

**Healthy.** Prose already uses *mini-app* consistently (`miniapp` occurs only
in identifiers/paths). The spec tree's core vocabulary — machine, event,
intent, adapter, kernel, trace, vector — is used precisely and is defined by
its owning specs. The `tp-doc` lifecycle/register vocabulary is enforced by
`scripts/doc-audit`.

**Dual-register pairs (intentional, now documented).** The user guide says
*propagation server* and *share identifier* where developer docs say
*propagation node* and *256t identifier*. Both mappings are now stated in both
glossaries. Keep the split, but keep it deliberate: dev docs should not say
"propagation server" except when quoting UI labels
(`docs/desktop-host.md:24` and `docs/websocket-interface.md:153` do quote UI
labels and are fine).

**Overloaded words (documented in the glossary's disambiguation section).**
*Bridge* (4 senses), *relay* (6), *chrome* (2), *node* (3), *plane* (4),
*ratchet* (2), *harness* (3), *worklet* (vs Web Worklet). None of these needs a
rename; they need qualification when written, which the glossary now
prescribes.

**Open naming issues (report only):**

1. **`apps/harness-mobile` is a misnomer.** It is the shipping mobile and web
   host, not a test harness, and "harness" elsewhere means the conformance or
   release harness. A rename to `apps/host-mobile` would match
   `apps/host-desktop` but touches many paths, scripts, and docs — schedule it
   as its own change if at all.
2. **"Layer-1" is never named.** Specs name the *Layer-2 twin* (TLA+ model) and
   the *Layer-3 vector*, but the numbering's first layer (the executable
   table) is never called Layer-1 anywhere. Either name all layers once in
   [specs/README.md](../specs/README.md) or drop the numbers in favor of the
   representation names.
3. **`packages/bridge-hyper` file names permute their morphemes.**
   `web-hyper-fetch.ts`, `web-hyper-fetch-gateway.ts`,
   `gateway-hyperswarm-fetch.ts`, `relay-hyper-fetch.ts`,
   `node-relay-hyper-fetch.ts`, `fetch-plane-web.ts` — reading a name does not
   tell you which side of the wire the code runs on. See abstraction A3.
4. **Minor register leak.** `guide/06-using-apps.md` uses "permissions" for
   grants ("Changing your mind about permissions"). Acceptable plain language
   for users, but *permission* should stay reserved for OS permissions
   (camera, notification) in developer docs, which currently do this correctly.

## Missing abstractions

### A1. Shared worklet composition (`worklet-core`) — the big one

The three shipping worklet compositions are maintained as parallel copies:

| Evidence | Measure |
|---|---|
| `apps/host-desktop/worklet/entry.mjs` (2,522 lines) vs `apps/harness-mobile/worklet/entry.mjs` (1,616) | 1,360 identical lines |
| mobile `entry.mjs` vs mobile `worklet/web-entry.mjs` (1,271) | 704 identical lines |
| desktop `worklet/miniapp-host.mjs` (629) vs mobile `worklet/web-miniapp-host.mjs` (726) | 523 identical lines |
| `dev-channel.mjs`, `ipc-bonjour-bridge.mjs`, `ipc-multicast-bridge.mjs` (desktop vs mobile) | byte-identical |
| `ipc-serial-bridge.mjs` (desktop vs mobile) | 10 differing lines |

The cost is visible in the git log: every cross-cutting feature lands as N
parallel edits ("Wire host Devices & Sensors chrome UI into
desktop/android/ios/web worklets", "Wire flag-plane relay service into desktop
and mobile worklets", …).

**Proposal.** Extract a `packages/worklet-core` (or a `worklet/` export of
`host-core`) owning the shared composition:

- `createWorkletMiniappHost(options)` — today's `miniapp-host.mjs`, which is
  already written as an options-injected factory; the per-host divergence
  (sandbox backend, device bridge, AI config, store posture) is *already*
  expressed as options. The copies differ mostly in drift, not design.
- The dev channel and the IPC bridge helpers (bonjour, multicast, serial, BLE)
  as shared modules with a small per-platform pipe interface.
- Per-host `entry.mjs` shrinks to: construct platform services (which IPC
  pipes exist, which device bridge, which sandbox backend, store posture),
  then call the shared composer.

This turns "wire X into four worklets" into "wire X into worklet-core once,
flip per-host flags". The worklet bundlers (`scripts/build-worklet.mjs`)
already resolve across packages, so no build-model change is required.
Suggested first step: lift the byte-identical files, which is mechanical and
zero-risk; lift `miniapp-host.mjs` second; converge the entries last.

### A2. One home for the fetch-plane contract

`FetchPath`, `FetchProgress`, and the fetch result/request shapes are defined
twice, structurally identically:
[`packages/host-core/src/fetch-plane.ts`](../packages/host-core/src/fetch-plane.ts)
and [`packages/bridge-hyper/src/fetch.ts`](../packages/bridge-hyper/src/fetch.ts).
Adding a fourth fetch path (e.g. a BLE mirror) means editing both and hoping
they stay compatible.

**Proposal.** Make `host-core`'s `fetch-plane.ts` the contract's only home and
have `bridge-hyper` import it (it already sits below `host-core` in the
dependency graph via `reticulum-interfaces`; if a cycle threatens, a tiny
`@twistedpear/fetch-plane` types-only module costs nearly nothing). The
byte-size warning constants (`SIZE_WARNING_BLE_BYTES`, …) belong with the
contract too.

### A3. `bridge-hyper` role split: client / server / gateway

Beyond naming (terminology issue 3), the package interleaves three roles in
one flat `src/`: things that run in a browser leaf, things that run on a
gateway/node, and the shared swarm/drive machinery.

**Proposal.** Split `src/` into `client/`, `server/`, and `core/` (or publish
separate entry points like the existing `worklet.ts` / `web.ts` pattern), and
define one `DriveFetcher` interface that `web-hyper-fetch`,
`gateway-hyperswarm-fetch`, and `node-relay-hyper-fetch` implement, so the
fetch plane selects a fetcher rather than special-casing call sites. File
renames can ride along with the split rather than happening separately.

### A4. Conformance runner toolkit

There are 68 `run.mjs` runners; at least 13 hand-roll their own
`function assert(condition, message)`, 32 hand-roll `spawn`/`execFile`
wrappers, and several reimplement log-file plumbing (`logFileFor`,
`createWriteStream` boilerplate). Only one uses `node:assert`.

**Proposal.** A `conformance/lib/` (not a published package) with: `assert`,
step/section logging, a `spawnChecked` wrapper with captured output and
timeout, temp-dir lifecycle, and the standard pass/fail exit protocol.
Adopt opportunistically — convert a runner when it is next touched; no big-bang
rewrite. This also standardizes failure output across CI, which makes red runs
faster to read.

### A5. Widget vocabulary metadata beside the vocabulary

`WIDGET_TYPES` is properly single-sourced in
`packages/miniapp-runtime/src/ui/schema.ts` and the JSON schema is generated
from it — good. But the per-type property/requirement tables live inside
[`scripts/generate-widget-schema.mjs`](../scripts/generate-widget-schema.mjs),
and both renderers (`widget-renderer-rn`, `widget-renderer-headless`)
hand-write per-type `switch` branches. Adding a widget type touches four
places, two of which the type system does not connect.

**Proposal.** Move the per-type prop tables into `ui/schema.ts` next to
`WIDGET_TYPES` (the generator becomes a serializer), and export a
`WidgetVisitor<T>` dispatch type from the runtime so both renderers get an
exhaustiveness error when the vocabulary grows. Renderer behavior stays
hand-written; only the dispatch becomes checked.

## Patterns worth replicating (found healthy)

- **Backend-interface pattern** in `miniapp-runtime/src/services`:
  `StorageBeeBackend` with Corestore, KV-backed, and in-memory implementations;
  the loopback binding implementing *every* backend in memory
  (SPEC-BIND-LOOPBACK). A1 and A3 should aim for this shape.
- **Generated tables from one registry** (device classes → capabilities ids,
  TS tables, schema) — the SPEC-DEVICE pipeline is the right template for A5.
- **Options-injected host factories** (`createWorkletMiniappHost`,
  `createNodeHost`, `createWebLeafHost`) — the reason A1 is cheap.

## Suggested order

1. A1 step one (lift byte-identical worklet files) — mechanical, immediate
   payoff for every future cross-host feature.
2. A2 (single fetch-plane contract) — small, prevents silent drift.
3. A1 steps two/three (shared `miniapp-host`, converged entries).
4. A5 (widget dispatch exhaustiveness) — small, pays off at the next widget.
5. A3 (`bridge-hyper` split + renames) — medium, best done as one change.
6. A4 (conformance toolkit) — opportunistic, no deadline.
