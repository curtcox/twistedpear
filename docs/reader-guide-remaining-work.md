# Prompt: implement the remaining work called out by the User Guide, App Authoring Guide, and Cookbook


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This page is a work order, not a status register. The authoritative registers remain
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md), [STATUS-HARDWARE.md](../STATUS-HARDWARE.md),
and [LIMITATIONS.md](../LIMITATIONS.md); where they disagree with this page, they win.

Three reader-facing docs each maintain a "feature status" appendix listing everything they
describe that is incomplete:

- `guide/appendix-feature-status.md` (User Guide — people *using* TwistedPear)
- `authors/appendix-feature-status.md` (App Authoring Guide — people *writing* apps)
- `cookbook/appendix-feature-status.md` (Cookbook — the 25 recipes in `cookbook/apps/`)

Your job is to close the items on those three lists that are **software work this repo can
actually do**, and to leave the rest correctly documented rather than silently pretending.

## Scope rules — read before planning

Each appendix row has a "Tracked as" column. Use it to sort:

**In scope (implement):**
- Rows tracked as "This cookbook", `STATUS-SOFTWARE.md`, or a `docs/*.md` design doc, where
  the blocker is unwritten code rather than absent hardware, an Apple/Google account, or a
  deliberate v1 exclusion.
- Anything whose blocker text describes missing plumbing that exists in the protocol layer
  but has no surface ("Protocol mechanisms exist; no UI").

**Out of scope (do not implement; verify the row's wording is still accurate and move on):**
- Anything tracked as an `H<N>` hardware-debt ID (H2, H3, H4, H7, H8, H9, H11–H20) — these
  need physical handsets, RNodes, real LANs, or Windows machines.
- Anything tracked as an `RQ-*` row in `STATUS-SOFTWARE.md` — those are long-duration soaks
  and a `reticulum-ts` release, gated on wall-clock time, not code.
- Store listings, notarization, signed installers, the Apple multicast entitlement — all
  gated on paid accounts (`RELEASE-PLAN.md`, `docs/ios-submission.md`).
- Anything the appendices label a **permanent trade-off** or an explicit v1 exclusion:
  multiple concurrent mini-apps, background execution, mini-app IPC / shared storage,
  Hyperbee cross-device replication, group chat, attachments, history sync, key rotation
  and multi-maintainer apps, native modules, a central registry, anonymity.
- The React binding — the appendices already mark it "optional backlog, non-blocking for v1".

If a row is ambiguous, say so and ask rather than guessing; some of these represent
deliberate product decisions and implementing them would be a regression against the design.

## The work, in the order it should land

1. **CI coverage for the cookbook samples.**
   `cookbook/appendix-feature-status.md` admits nothing builds, packs, or runs
   `cookbook/apps/*` — 25 apps whose sources "parse and follow the published SDK surface"
   but are unverified and will drift. Add a test suite (wire it into the existing
   Vitest workspace and the PR-tier CI job) that, for every directory under `cookbook/apps/`:
   parses the source, type/lint-checks it against the real `packages/miniapp-sdk` surface,
   validates its manifest and declared capabilities, packs it with the `packages/cli` `tp`
   codepath, and runs it far enough under `packages/miniapp-runtime` to prove it starts and
   renders. Fix whatever drift this exposes in the samples themselves. Add an npm script.
   This is the highest-value item: it is what stops the other two guides' code snippets
   from rotting.

2. **Identity backup and recovery.** Listed by *all three* appendices (guide: "Guided
   identity backup"; authors and cookbook: "Guided publisher-identity backup"). Today the
   key file is unencrypted with no export flow, no passphrase, and no recovery phrase.
   Implement export/import with passphrase encryption at rest and a recovery-phrase
   representation, in `packages/host-core` plus the `tp` CLI, with a host UI path. Do not
   invent a scheme — check `docs/` for an existing design first, and if none exists, write
   the design doc before the code and get it reviewed.

3. **Blocking, muting, reporting.** `guide/appendix-feature-status.md` says the protocol
   mechanisms exist but there is no UI. Find the existing mechanisms (start from
   `packages/protocol` and `packages/lxmf-ts`), then build the surface: persisted block and
   mute lists, enforcement on the receive path, and the UI in the host. "Reporting" has no
   central authority to report *to* — implement it as a local record plus an export, or
   argue in the PR description that the row should be reworded instead.

4. **Multi-part transfer over propagation.** Called out by the guide, the authors guide, and
   the cookbook ("Large messages via propagation"). Chunking, ordering, resume, and
   reassembly against `packages/lxmf-ts` propagation, with the budget rules from
   `authors/12-limits-and-budgets.md` respected. Cookbook chapters 6 and 9 currently
   downgrade chunking to "exercises" because of this; upgrade those to real recipes once it
   works.

5. **Streaming `ai.chat`.** Cookbook chapter 7 notes every model recipe fakes a "working"
   state because `ai.chat` returns one whole reply. Add a streaming API to
   `packages/miniapp-sdk` and the broker, keeping the existing non-streaming call working,
   and update `cookbook/07-apps-that-use-a-model.md` plus the affected samples.

6. **Screenshots.** All three guides ship placeholder graphics — 103 pending files total
   (`node scripts/site/section-images.mjs --report`; 42 for the guide, the rest split across
   authors and cookbook). Each has a written caption in the prose describing exactly the
   shot required, and `<section>/images/README.md` documents the conventions. Capture what
   can be captured from hosts that actually run today (desktop host, browser host, DevStudio,
   the emulator). Do **not** fabricate screenshots of features that do not exist, and do not
   ship a screenshot of a real handset — that is H-tier hardware debt. Report which
   filenames remain unobtainable and why.

## Definition of done for every item

- Tests first or alongside, in the existing suites; `npm test` green, and the PR-tier CI
  job green.
- The corresponding row is **removed** from all three appendices that carry it, or moved
  from "⏳ Not yet available" to "⚠️ Works, with limits" with the limit stated precisely.
  All three appendices cross-reference each other; keep them consistent.
- Bump `audited:` in the `tp-doc` frontmatter of every file you touch, and the
  "Last reviewed against the registers" date.
- Update the authoritative registers (`STATUS-SOFTWARE.md`, `LIMITATIONS.md`) to match —
  the appendices state that the registers win on conflict, so the registers must move first.
- Prose in the affected chapters updated so it no longer hedges around the gap you closed.
- `npm run site:build` succeeds and the rendered site reflects the change.

## Ground rules

- Land each numbered item as its own commit on its own branch; do not bundle them.
- Start by reading the three appendices, `LIMITATIONS.md`, `STATUS-SOFTWARE.md`, and
  `STATUS-HARDWARE.md` end to end, then produce a plan that classifies every row in all
  three appendices as in-scope / out-of-scope / needs-a-decision, and confirm that
  classification before writing code.
- Do not weaken or delete a limitation to make a row disappear. If an item turns out to be
  a bad idea, say so and propose the reworded row instead.
