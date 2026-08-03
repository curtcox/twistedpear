# File-size reduction — executed plan

<!-- tp-doc
lifecycle: historical
audited: 2026-08-02
register: none
-->

**This work order was completed on 2026-08-02.** It is retained as historical context only.
Current thresholds, the empty ratchet, and published results are described in
[File-size classification](../../docs/file-sizes.md).

The ratchet stops the problem growing. It does not shrink anything. This plan is the
schedule for emptying `size-ratchet.json` and then tightening the thresholds onto what is
left.

## Where we are

33 files are grandfathered, carrying **33,737 excess lines** — lines beyond the danger
threshold for their type. That number is the burndown metric this plan drives to zero.
The inventory reports it as `totals.excessLines`; the ratchet enforces it as
`maxExcessLines` (lowered by `npm run sizes:baseline` after each cut); the published
`file-sizes` results page charts it per area.

Phase 1 (mechanical barrel split and the tail) is done: the protocol public barrel is
domain-split under `packages/protocol/src/index/`, and the handbook, CLI commands,
worklet-core hosts, LXMF router/propagation, and drifted plan docs are under threshold.

| Area | Excess lines | Share |
|---|---:|---:|
| `packages/protocol` | 19,496 | 58% |
| `apps/harness-mobile` | 5,882 | 17% |
| `packages/reticulum-ts` | 3,700 | 11% |
| `apps/host-desktop` | 3,187 | 9% |
| `packages/miniapp-runtime` | 1,472 | 4% |

## Phasing

Each phase ends when its files are removed from `size-ratchet.json` and the ceiling is
lowered. Phases are ordered by value per unit of risk, not by file size.

| Phase | Scope | Files | Excess removed | Offenders left |
|---|---|---:|---:|---:|
| 2 | Host shells and worklet entries | 6 | 9,069 | 27 |
| 3 | Protocol tier 1, with paired tests | 7 | 13,090 | 20 |
| 4 | Reticulum-ts and miniapp-runtime | 6 | 5,172 | 14 |
| 5 | Protocol tier 2 | 14 | 6,406 | 0 |

### Phase 2 — host shells and worklet entries

| Lines | Over | File |
|---:|---:|---|
| 3331 | 2531 | `apps/host-desktop/worklet/entry.mjs` |
| 2955 | 2155 | `apps/harness-mobile/worklet/entry.mjs` |
| 2318 | 1518 | `apps/harness-mobile/App.tsx` |
| 2063 | 1263 | `apps/harness-mobile/App.web.tsx` |
| 1746 | 946 | `apps/harness-mobile/worklet/web-entry.mjs` |
| 1456 | 656 | `apps/host-desktop/src/renderer/app.js` |

These are three near-duplicate pairs: the two worklet entries, the mobile web entry
against the mobile native entry, and `App.tsx` against `App.web.tsx`. Each pair shares
most of its body. One extraction of the shared half therefore clears two entries, which
is why this phase removes more excess per unit of work than its file count suggests.

The shared halves belong in `packages/worklet-core` (already the home for shared Bare
worklet adapters) and in a new shared module under `apps/harness-mobile`, leaving each
entry point as platform wiring only. Duplication between these pairs is itself a defect —
they drift — so the phase pays down more than size.

Sequence this before the protocol work: it is app-layer, so it does not collide with the
Sans-IO constraints, and it can proceed in parallel with phase 3 if two people are
working.

**Exit:** 27 offenders, 24,668 excess lines.

### Phase 3 — protocol tier 1, with paired tests

| Lines | Over | File |
|---:|---:|---|
| 4354 | 3554 | `packages/protocol/src/link-establish.ts` |
| 4120 | 3320 | `packages/protocol/src/lxmf-delivery.ts` |
| 2709 | 1909 | `packages/protocol/src/transport-ingress.ts` |
| 2535 | 1735 | `packages/protocol/src/resource-hashmap.ts` |
| 2485 | 1285 | `packages/protocol/test/lxmf-delivery.test.ts` |
| 1937 | 737 | `packages/protocol/test/link-establish.test.ts` |
| 1750 | 550 | `packages/protocol/test/transport-ingress.test.ts` |

The largest single phase, and the first that touches protocol behaviour. Split each source
module together with its test file in the same change — splitting a 4,000-line module and
leaving a 2,500-line test against it moves the problem rather than fixing it.

These modules are already Sans-IO state machines built from many small exported functions
(`link-establish.ts` exports 277 functions and 159 types; `lxmf-delivery.ts` exports 245
and 136). The seam is the sub-phase: establishment, proof, teardown, keepalive. Extract
per sub-phase into sibling modules and keep the current module as the composition point,
so `packages/protocol/src/index.ts` and its consumers do not move.

Constraints that apply throughout: no clocks, entropy, I/O, timers, or logging inside
protocol roots. Run `npm run sansio` on every change here, and the focused protocol suites
rather than the full conformance run during iteration.

**Exit:** 20 offenders, 11,578 excess lines.

### Phase 4 — reticulum-ts and miniapp-runtime

| Lines | Over | File |
|---:|---:|---|
| 2725 | 1925 | `packages/reticulum-ts/src/link.ts` |
| 2071 | 1271 | `packages/miniapp-runtime/src/device-manager.ts` |
| 1637 | 837 | `packages/reticulum-ts/src/resource.ts` |
| 1600 | 800 | `packages/reticulum-ts/src/transport/node.ts` |
| 1001 | 201 | `packages/miniapp-runtime/src/host.ts` |
| 938 | 138 | `packages/reticulum-ts/src/channel.ts` |

`reticulum-ts/src/link.ts` is a single 2,725-line class — unlike the protocol modules, it
has no export-level seam, so it needs genuine design work rather than a mechanical move.
Treat it as the phase's long pole. `device-manager.ts` is the miniapp-runtime equivalent
and splits per device capability.

**Exit:** 14 offenders, 6,406 excess lines.

### Phase 5 — protocol tier 2

The 14 remaining protocol modules, each between 810 and 2,095 lines: `path-table.ts`,
`channel-window.ts`, `destination-allow.ts`, `announce-framing.ts`,
`identity-ciphertext.ts`, `channel-envelope.ts`, `stream-data.ts`, `resource-status.ts`,
`propagation-quota.ts`, `transport-announce.ts`, `packet-receipt-timeout.ts`,
`link-proof.ts`, `packet-header.ts`, `link-resource-accept.ts`.

By this point phase 3 has established the sub-phase extraction pattern for exactly this
kind of module, so these are repetitions of a known move rather than new design. Several
are only tens of lines over and clear with one extraction.

**Exit:** 0 offenders. `size-ratchet.json` holds an empty `entries` list.

## Endgame — tighten the thresholds

An empty ratchet is not the goal; it is the precondition for setting honest thresholds.
The current numbers were chosen to grandfather a real codebase, so they sit above where
the code should live. Today's TypeScript p90 is 605 lines against a danger threshold of
800 — the threshold is loose by construction.

Once `entries` is empty, re-derive each type's thresholds from the post-cleanup
distribution rather than picking a round number now, and record the new values in
`size-rules.json` with the distribution that justified them. Repeat the exercise when a
phase materially changes the shape of a type's distribution.

## Working rules

- **One file per change, source and test together.** A decomposition diff that also
  changes behaviour cannot be reviewed for either.
- **Remove entries; never add them.** If a change needs a new grandfathered file, the
  change is wrong. `--allow-regressions` exists for genuine emergencies and its use
  belongs in the commit message.
- **Lower the ceiling as you go.** Run `npm run sizes:baseline` at the end of each change
  so the next one cannot give the ground back.
- **Warn-level files are not in scope.** 146 files sit between warn and danger. They are
  reported, not scheduled; pulling them in would make this plan unfinishable.
- **No phase is a prerequisite for shipping.** This is background work, interleaved with
  feature work, and the ratchet holds the line in between.

## Related

- [File-size classification](../../docs/file-sizes.md) — the gate as it exists today
- [Sans-IO protocol discipline](../../docs/sansio.md) — constraints on every phase 3 and 5 change
- [CI policy](../../docs/ci-policy.md) — where the gate runs
