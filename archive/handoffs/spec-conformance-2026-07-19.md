# Handoff — implement the spec conformance artifacts


<!-- tp-doc
lifecycle: historical
audited: 2026-07-20
register: none
-->

You are working in the TwistedPear repo. The spec tree in `specs/` was reviewed and
gap-filled on 2026-07-19: every spec now states its semantics, artifact shapes, and
acceptance bars, so the remaining work is **building artifacts, not deciding
semantics**. Your job is to work through the items below until every spec's status in
`specs/README.md` can be flipped per its own definition of done.

First read `specs/README.md` (normative rule, status vocabulary, migration order),
then skim each `specs/spec-*/spec.md` as you reach it. Run `git status` / `git log`
first — the spec-tree edits from the gap-fill session may be uncommitted; if so,
commit them separately before starting.

## Ground rules

- **Vectors and formal models are normative; prose is informative.** If an artifact
  you build disagrees with spec prose, the artifact wins and the prose gets fixed.
- **Never change protocol machine semantics** (grant, escrow, recovery-quorum, or any
  step function) to make an artifact pass. Semantics changes are out of scope.
- **Byte-level upstream compatibility** with Python RNS 0.9.4 / LXMF is a permanent
  constraint (`conformance/UPSTREAM.md`).
- Follow the exemplar shape (`specs/spec-cap/spec.md`): one formal/vector artifact,
  multiple implementations, one cross-check command wired into CI.
- After each item: run its acceptance command plus `npm run sansio`, update the
  spec's status header and the `specs/README.md` index row if the spec's "to finish"
  bar is met, and commit that item alone.

## Phase 1 — substrate (do in this order)

1. **SPEC-TRACE schema + canonicalization** (`specs/spec-trace/spec.md`)
   - Publish JSON Schemas for trace entries and recorded histories in
     `specs/spec-trace/schema/`, validated in a test against real recorded output.
   - Resolve the documented canonicalization gap: today the FNV-1a hash covers JSON
     with insertion-order keys (see comment in `packages/effects/src/trace.ts`).
     Define the sorted-key canonical form and migrate `serializeTrace` to it.
     Caution: this changes every trace hash — search for stored/fixture hashes
     (recorded histories, sim-campaign fixtures, canary expectations) and regenerate
     them in the same commit. `npm run sansio` and
     `npx vitest run packages/effects` must be green.
   - Add the cross-producer check: record a history, replay it through a separate
     consumer entry point, require identical hashes.

2. **SPEC-KERNEL conformance runner** (`specs/spec-kernel/spec.md`)
   - Promote the double-run hash suite (`doubleRunHashes`,
     `packages/effects/test/determinism.test.ts`) to a freestanding runner under
     `conformance/` that accepts any kernel implementation.
   - Add ordering fixtures for the four dequeue rules written in the spec (timers
     before transport within an instant; timers by node-id then timer-id; transport
     by `(deliverAt, source, destination)`; ties in send order).
   - Acceptance: runner passes against `SimKernel`; a deliberately mis-ordered
     kernel variant fails each fixture (mutation-test the runner, as
     `formal-conformance.test.ts` does for the machine checker).

3. **SPEC-EVENTS authority inversion** (`specs/spec-events/spec.md`)
   - Write the JSON Schema for the alphabet tabulated in the spec into
     `specs/spec-events/schema/`, with `transport/adversary` in a separate `harness`
     group (it is a harness extension — the spec records this decision).
   - Land schema→TypeScript codegen **in one atomic change** (it touches every
     protocol package's build), then delete the hand-written types in
     `packages/effects/src/types.ts`. Generated types must be shape-identical;
     `npm run build` and `npm run sansio` green.
   - Add example tapes exercising each shape.

4. **SPEC-MACHINE freestanding gate** (`specs/spec-machine/spec.md`) — package the
   canary + determinism gate so it can be pointed at a machine outside this repo.

5. **SPEC-ADAPTER pair suites** (`specs/spec-adapter/spec.md`) — per-adapter-pair
   equivalence suites for the six families tabulated in the spec, so a new adapter
   conforms by passing, not by review.

## Phase 2 — UI boundary

6. **SPEC-WIDGET** — generate the widget JSON Schema from `WIDGET_TYPES` /
   `WIDGET_PROP_KEYS` / `WIDGET_STYLE_KEYS` in
   `packages/miniapp-runtime/src/ui/schema.ts` (do NOT re-derive from the RN
   renderer); record golden widget streams from the example apps; build the
   headless-snapshot renderer (it is the conformance oracle for all other
   renderers); drive `npm run test:widget-parity` from the recorded streams.
7. **SPEC-PRESENT** — layout vectors in the exact shape the spec defines
   (`{ tree, viewport, boxes }`, monospace reference metric, per-box tolerance for
   real fonts), produced by the headless-snapshot renderer from item 6.
8. **SPEC-BIND-LOOPBACK** — implement the existing backend interfaces
   (`LxmfBackend`, `AnnounceBackend`, `PresenceBackend`, storage/resource in
   `packages/miniapp-runtime/src/services/`) as a packaged in-memory loopback; run
   the SPEC-SDK vectors over both bindings in CI, identical results minus timing.

## Phase 3 — platform + profiles

9. **SPEC-NAME vectors** — `specs/spec-name/vectors/` per the vector shape and
   reject classes in the spec; seed from `packages/cas-256t` tests.
10. **SPEC-PKG vectors** — golden + hostile package vectors per the reject-class
    list in the spec; seed from `conformance/hostile-apps`.
11. **SPEC-SDK vectors** — `(granted capabilities, call, args) → (result | error)`
    per namespace, covering all 13 error codes tabulated in the spec; derive from
    `conformance/sdk-interop`.
12. **SPEC-CHROME fixtures** — key hostile-app fixtures to the named requirements
    CHROME-R2/R4/R5/R6 (each fixture cites the rule it attacks); R1/R3 stay
    informative.
13. **Group A profiles** — one page each for SPEC-WIRE, SPEC-MSG, and per-medium
    SPEC-MEDIA files, using the five-section template in `specs/spec-wire/spec.md`.
    A profile is done when every subset row cites a pinned vector or interop test.
14. **SPEC-AUTHORITY relocation** (optional, last) — move `escrow.tla` /
    `recovery_quorum.tla` + configs + traces from `formal/` into
    `specs/spec-authority/model/`, updating `formal/check-machine-conformance.mjs`
    paths and `formal/README.md`; `npm run formal:all` must stay green.

## Verification commands

`npm run sansio` · `npm run formal:all` · `npm run test:sdk-interop` ·
`npm run test:widget-parity` · `npm run test:hostile-apps` ·
`npm run vectors:generate` · `npm run test:interop` (needs Docker/Python; skip if
unavailable and say so).

## Done means

Every row in the `specs/README.md` index is **normative** except SPEC-CHROME
(allowed to stay partially informative for R1/R3) and SPEC-PRESENT (allowed to stay
stub until the DOM/Flutter renderers converge). Report any spec you could not
promote and exactly which acceptance bar blocked it.
