# SPEC-CHROME — Host chrome and confirmation conduct

**Group:** C (platform) · **Status:** stub (**informative**) · **Migration phase:** 3

## Scope

What the host user interface must guarantee regardless of app behavior: grant screens
render the canonical capability descriptions; `apps:*` operations raise host-chrome
confirmation dialogs a mini-app cannot draw over or acknowledge; host chrome is never
spoofable by app-rendered content. Web analog: browser UI security requirements — an
area the web under-specifies; this spec exists so TwistedPear does better.

## Normative artifacts

Per the tree-wide rule (vectors + formal models normative, prose informative), this
spec is **informative until it has machine-checkable artifacts**. Current evidence:

- Hostile-app fixtures: [conformance/hostile-apps](../../conformance/hostile-apps/)
  (`npm run test:hostile-apps`)
- Double-gating of `apps:*` is partially captured by the grant model in
  [SPEC-CAP](../spec-cap/spec.md); escrow/recovery flows have formal models in
  [formal/](../../formal/)

## Implementations

Desktop ([apps/host-desktop](../../apps/host-desktop/)), mobile/web
([apps/harness-mobile](../../apps/harness-mobile/)), and headless (which must refuse,
not silently approve, operations requiring chrome confirmation).

## To finish this spec

Grow the hostile-app fixture set into a conformance suite keyed to named requirements
(each fixture cites the rule it attacks). Rules that cannot be fixture-tested stay
informative and are listed as such.
