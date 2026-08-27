# SPEC-CHROME — Host chrome and confirmation conduct

<!-- tp-doc
lifecycle: live
audited: 2026-08-27
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 3

## Scope

What the host user interface must guarantee regardless of app behavior: grant screens
render the canonical capability descriptions; `apps:*` operations raise host-chrome
confirmation dialogs a mini-app cannot draw over or acknowledge; host chrome is never
spoofable by app-rendered content. Web analog: browser UI security requirements — an
area the web under-specifies; this spec exists so TwistedPear does better.

## Named requirements

Fixtures cite these ids; a fixture that attacks a rule names it.

- **CHROME-R1 (canonical descriptions).** Grant screens render exactly the
  descriptions from the capability registry ([SPEC-CAP](../spec-cap/spec.md)); app
  content cannot substitute its own wording.
- **CHROME-R2 (double-gating).** Every `apps:*` package/publish/install/preview call,
  and every `apps:channel` open, raises a host-chrome confirmation in addition to the grant.
  The `app-channel` confirmation names the destination mini-app.
- **CHROME-R3 (no draw-over).** App-rendered content can neither overlay nor visually
  imitate host chrome; confirmations render outside the app's drawing surface.
- **CHROME-R4 (no synthetic acknowledgement).** No app-reachable API can accept,
  dismiss, or auto-answer a host confirmation; only direct user input can.
- **CHROME-R5 (headless refusal).** A host without chrome refuses — never silently
  approves — operations requiring confirmation (`CONFIRMATION_UNAVAILABLE` in the
  [SPEC-SDK](../spec-sdk/spec.md) error taxonomy).
- **CHROME-R6 (review material).** Confirmations display the material the user
  must review before approving: the `package` confirmation lists the declared
  capability set, the `preview` confirmation lists the requested grants, the
  `install` confirmation identifies the package and the post-fetch review
  step, and the `app-channel` confirmation names the destination mini-app.
  (Recorded by the fixtures: at `install` time the capability list is
  not yet known — the package has not been fetched — so capability review
  happens in the host's post-fetch review pipeline, which the install
  confirmation names.)
- **CHROME-R7 (background has no surface).** Host-rendered UI is painted only
  for the foreground mini-app. A concurrently running app that is not on
  screen has no drawing surface and cannot overlay chrome. Its widget tree is
  retained and painted when the user switches to it.
- **CHROME-R8 (reserved lexicon).** App widget text cannot use reserved host-chrome
  vocabulary: platform-name authority claims, host-update banners, or an
  Approve/Deny (Allow/Not now) pair that imitates a grant screen. Canonical
  capability-registry wording is allowed as documentation, but is reserved when the
  same widget tree also presents an Approve, Allow, Deny, or Not now action.
- **CHROME-R9 (no secret solicitation).** App widget text cannot solicit a recovery
  phrase, seed words, mnemonic, identity backup, or identity string.

## Normative artifacts (current locations)

- Requirement-keyed fixture suite: [conformance/chrome/run.mjs](../../conformance/chrome/run.mjs)
  (`npm run test:chrome`). Each fixture cites the rule it attacks:
  - **CHROME-R1** — confirmation copy is `describeCapability()`; the app tree does
    not carry that copy.
  - **CHROME-R2** — every `apps:*` call raises exactly one host-chrome
    confirmation _before_ the backend runs; a grant alone never suffices.
  - **CHROME-R3** — snapshot geometry: the confirmation is a host layer above the
    app surface; a full-bleed widget tree stays clipped inside the surface and
    has no z-index with which to occlude chrome
    ([chrome-geometry.ts](../../packages/widget-renderer-headless/src/chrome-geometry.ts)).
  - **CHROME-R4** — no app-reachable broker method (`host.confirm`,
    `apps.approve`, `ui.confirm`, …) can resolve a pending confirmation; all
    fail `UNKNOWN_METHOD` and the confirmation stays open until the chrome
    channel answers.
  - **CHROME-R5** — a host with no confirmation channel refuses `apps:*` with
    `CONFIRMATION_UNAVAILABLE` and never invokes the backend.
  - **CHROME-R6** — the `package`/`preview`/`install` confirmations carry the
    review material (declared capabilities, requested grants, package id +
    review note) and an unguessable token.
  - **CHROME-R7** — two concurrent apps: only the foreground app is painted.
  - **CHROME-R8 / CHROME-R9** — `validateWidgetTree` rejects reserved lexicon and
    secret solicitation (`ui/chrome-lexicon.ts`). Hostile-author HA-20…HA-24
    assert `INVALID_WIDGET`.
- Broader hostile-app fixtures: [conformance/hostile-apps](../../conformance/hostile-apps/)
  (`npm run test:hostile-apps`)
- Double-gating of `apps:*` is partially captured by the grant model in
  [SPEC-CAP](../spec-cap/spec.md); escrow/recovery confirmation flows are owned by
  [SPEC-AUTHORITY](../spec-authority/spec.md)

## Implementations

Desktop ([apps/host-desktop](../../apps/host-desktop/)), mobile/web
([apps/harness-mobile](../../apps/harness-mobile/)), and headless (which must refuse,
not silently approve, operations requiring chrome confirmation).

## To finish this spec

Done — every named rule has a machine-checkable fixture. Layer A (R8/R9) is the
deterministic validator; Layer B (R1/R3/R7) is the snapshot geometry that closed
the previous informative-only gap.
