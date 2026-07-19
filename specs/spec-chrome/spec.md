# SPEC-CHROME — Host chrome and confirmation conduct

**Group:** C (platform) · **Status:** stub (**informative**) · **Migration phase:** 3

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
- **CHROME-R6 (install review).** `apps:install` confirmation displays the requested
  capability list before the user can approve.

R2, R4, R5, and R6 are fixture-testable (broker-observable); R1 and R3 are
render-level and stay informative until a snapshot-based check exists.

## Normative artifacts

Per the tree-wide rule (vectors + formal models normative, prose informative), this
spec is **informative until it has machine-checkable artifacts**. Current evidence:

- Hostile-app fixtures: [conformance/hostile-apps](../../conformance/hostile-apps/)
  (`npm run test:hostile-apps`)
- Double-gating of `apps:*` is partially captured by the grant model in
  [SPEC-CAP](../spec-cap/spec.md); escrow/recovery confirmation flows are owned by
  [SPEC-AUTHORITY](../spec-authority/spec.md)

## Implementations

Desktop ([apps/host-desktop](../../apps/host-desktop/)), mobile/web
([apps/harness-mobile](../../apps/harness-mobile/)), and headless (which must refuse,
not silently approve, operations requiring chrome confirmation).

## To finish this spec

Grow the hostile-app fixture set into a conformance suite keyed to the named
requirements above (each fixture cites the rule it attacks), starting with the
fixture-testable set R2/R4/R5/R6. Rules that cannot be fixture-tested stay
informative and are listed as such.
