# SPEC-CHROME — Host chrome and confirmation conduct

**Group:** C (platform) · **Status:** normative for R2/R4/R5/R6, informative for R1/R3 · **Migration phase:** 3

## Scope

What the host user interface must guarantee regardless of app behavior: grant screens
render the canonical capability descriptions; `apps:*` operations raise host-chrome
confirmation dialogs a mini-app cannot draw over or acknowledge; host chrome is never
spoofable by app-rendered content. Web analog: browser UI security requirements — an
area the web under-specifies; this spec exists so TwistedPear does better.

## Named requirements

Fixtures and future rules cite these ids; a fixture that attacks a rule names it.

- **CHROME-R1 (canonical descriptions).** Grant screens render exactly the
  descriptions from the capability registry ([SPEC-CAP](../spec-cap/spec.md)); app
  content cannot substitute its own wording.
- **CHROME-R2 (double-gating).** Every `apps:*` package/publish/install/preview call
  raises a host-chrome confirmation in addition to the grant.
- **CHROME-R3 (no draw-over).** App-rendered content can neither overlay nor visually
  imitate host chrome; confirmations render outside the app's drawing surface.
- **CHROME-R4 (no synthetic acknowledgement).** No app-reachable API can accept,
  dismiss, or auto-answer a host confirmation; only direct user input can.
- **CHROME-R5 (headless refusal).** A host without chrome refuses — never silently
  approves — operations requiring confirmation (`CONFIRMATION_UNAVAILABLE` in the
  [SPEC-SDK](../spec-sdk/spec.md) error taxonomy).
- **CHROME-R6 (review material).** Confirmations display the material the user
  must review before approving: the `package` confirmation lists the declared
  capability set, the `preview` confirmation lists the requested grants, and
  the `install` confirmation identifies the package and the post-fetch review
  step. (Recorded by the fixtures: at `install` time the capability list is
  not yet known — the package has not been fetched — so capability review
  happens in the host's post-fetch review pipeline, which the install
  confirmation names.)

R2, R4, R5, and R6 are fixture-testable (broker-observable); R1 and R3 are
render-level and stay informative until a snapshot-based check exists.

## Normative artifacts (current locations)

- Requirement-keyed fixture suite: [conformance/chrome/run.mjs](../../conformance/chrome/run.mjs)
  (`npm run test:chrome`). Each fixture cites the rule it attacks and asserts a
  broker-observable property:
  - **CHROME-R2** — every `apps:*` call raises exactly one host-chrome
    confirmation *before* the backend runs; a grant alone never suffices.
  - **CHROME-R4** — no app-reachable broker method (`host.confirm`,
    `apps.approve`, `ui.confirm`, …) can resolve a pending confirmation; all
    fail `UNKNOWN_METHOD` and the confirmation stays open until the chrome
    channel answers.
  - **CHROME-R5** — a host with no confirmation channel refuses `apps:*` with
    `CONFIRMATION_UNAVAILABLE` and never invokes the backend.
  - **CHROME-R6** — the `package`/`preview`/`install` confirmations carry the
    review material (declared capabilities, requested grants, package id +
    review note) and an unguessable token.
- **R1 (canonical descriptions)** and **R3 (no draw-over)** are render-level
  and stay **informative** until a snapshot-based check exists.
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

Done for the fixture-testable set — `conformance/chrome/` keys fixtures to
R2/R4/R5/R6, each citing the rule it attacks. R1 (canonical grant-screen
descriptions) and R3 (no draw-over) remain render-level and stay informative
until a snapshot-based check exists; this is the allowed partial-informative
state for SPEC-CHROME per [specs/README.md](../README.md).
