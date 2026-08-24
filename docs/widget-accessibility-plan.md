# Accessibility in the mini-app widget model — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-23
register: software
-->

**This document describes planned work, not current behaviour.** Nothing here ships yet,
and it does not gate the release. What ships today is the closed
widget vocabulary defined by [SPEC-WIDGET](../specs/spec-widget/spec.md), laid out under
[SPEC-PRESENT](../specs/spec-present/spec.md), refused by the host under the rules of
[SPEC-CHROME](../specs/spec-chrome/spec.md), and measured — for host chrome only — by the
axe-core ratchet described in [Static analysis](static-analysis.md). This plan develops §2 of
the [platform facilities survey](platform-facilities-plan.md) rather than repeating it.

The proposal: give the widget vocabulary enough accessibility data that the **host** can
guarantee a mini-app is usable with a screen reader, and make that guarantee checkable in CI
from the widget tree alone — no browser, no human.

## 1. What the vocabulary can say today, and what it cannot

Two props exist across all 21 widget types
([schema.ts:96, :98](../packages/miniapp-runtime/src/ui/schema.ts)): `view` accepts
`accessibilityLabel` and `image` accepts `alt`. Everything else is absent from the schema —
no label for `text-input`, `switch`, `slider`, `select`, or `date`; no heading level on
`text`; no live region; no hint distinct from a name. The two that do exist fare worse than
the survey suggests, and **each fails differently** — the distinction this plan turns on:

| Prop                      | Canonical model                | Headless oracle             | React Native                              | Desktop DOM                    |
| ------------------------- | ------------------------------ | --------------------------- | ----------------------------------------- | ------------------------------ |
| `view.accessibilityLabel` | dropped ([describe.ts:165][d]) | dropped ([index.ts:161][h]) | dropped ([MiniappWidgetTree.tsx:245][r])  | dropped ([widgets.js:13][w])   |
| `image.alt`               | dropped ([describe.ts:224][d]) | dropped ([index.ts:213][h]) | honoured ([MiniappWidgetTree.tsx:386][r]) | honoured ([widgets.js:205][w]) |

[d]: ../packages/miniapp-runtime/src/ui/describe.ts
[h]: ../packages/widget-renderer-headless/src/index.ts
[r]: ../packages/widget-renderer-rn/src/MiniappWidgetTree.tsx
[w]: ../apps/host-desktop/src/renderer/widgets.js

So `accessibilityLabel` is expressible and honoured by nothing at all, and `alt` is honoured
by both real renderers but invisible to both conformance oracles — so no parity test can
catch a renderer that stops honouring it. One is a schema gap plus a renderer gap; the other
is a renderer gap only, and they need different fixes.

There are three renderer implementations, not four: the web host renders through the same
`packages/widget-renderer-rn` under react-native-web (`scripts/site/editor/entry.tsx:6`;
`apps/harness-mobile/host/miniapp-renderer.tsx:1` re-exports it), so the work is RN, DOM,
and headless.

## 2. Why this platform is the unusual case — checked, and narrower than it sounds

The architecture claim holds. A mini-app "describes its UI as a widget tree that the _host_
renders" ([architecture.md](architecture.md) §7), and the host already refuses trees on the
basis of what the app's own strings say: CHROME-R8 and CHROME-R9 reject a whole tree for
reserved host-chrome vocabulary or secret solicitation, implemented as a semantic pass in
[chrome-lexicon.ts](../packages/miniapp-runtime/src/ui/chrome-lexicon.ts) and thrown from
[validate.ts:210](../packages/miniapp-runtime/src/ui/validate.ts). The precedent for
"refuse to draw this" is built and normative. So is label synthesis: the desktop renderer
already invents `aria-label="Progress 42%"` for a `progress` node
([widgets.js:175](../apps/host-desktop/src/renderer/widgets.js)).

Two limits on the claim, both load-bearing. **Rejection is destructive**: a rejected tree is
discarded whole and the previous tree retained
([Testing and debugging](../authors/11-testing-and-debugging.md) — Reading a failure), and
for the _first_ render there is no previous tree, so a rejecting rule makes an existing app
show nothing on a host upgrade. Rejection is only safe behind a version gate (§4). And **the
host cannot judge quality**: it can prove a `switch` has no name, but cannot tell a good name
from `"input"`. Enforcement must stop where proof stops.

## 3. The bounded prop set

SPEC-WIDGET is a closed vocabulary; an open prop bag would break it. Five props, each with a
fixed value domain, each mapping to something all three renderers can already do:

| Prop                 | Value                       | Accepted on                                                                                                                                       |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accessibilityLabel` | string, 1–128 chars         | `view`, `scroll`, `list`, `progress`, `text-input`, `switch`, `slider`, `select`, `date`, `code-editor`, `qr-code`, and the five preview surfaces |
| `accessibilityHint`  | string, 1–128 chars         | the interactive types only: `button`, `text-input`, `switch`, `slider`, `select`, `date`, `code-editor`                                           |
| `heading`            | integer 1–6                 | `text`                                                                                                                                            |
| `live`               | `"polite"` \| `"assertive"` | `text`, `view`                                                                                                                                    |
| `decorative`         | `true`                      | `image`, `view`                                                                                                                                   |

`button.label` and `image.alt` already carry the accessible name for those two types and are
not duplicated. `accessibilityHint` is not accepted on `view`: a hint describes the result
of acting, and a container is not actionable. `decorative` is not decoration — it is the
checkable way to say "this node has no accessible name on purpose", which a required-name
rule needs or it has no honest escape (`aria-hidden`, RN `accessibilityElementsHidden`).

**Focus order is not here, because it is presentation.** It is a function of laid-out reading
order, which is exactly what SPEC-PRESENT already computes: `layoutWidgetTree` produces one
box per node in viewport coordinates ([spec-present/spec.md](../specs/spec-present/spec.md) —
Normative artifacts). Focus order should be _derived_ from that geometry and pinned in the
existing layout vectors as a `focusOrder` array, not authored as a prop — an author-supplied
focus index is a known anti-pattern, and the vocabulary is better without one.

### Where the change actually lands

`specs/spec-widget/schema/widget.schema.json` is **generated** from `ui/schema.ts` by
`scripts/generate-widget-schema.mjs`, and `conformance/widget-parity/run.mjs:231` fails on
drift — so the TypeScript tables are edited and the JSON Schema follows. But a JSON Schema
cannot carry _meaning_, and meaning is what a Flutter or TUI renderer needs: the normative
semantics of each prop must be written into `specs/spec-widget/spec.md` in the same change.
Editing `schema.ts` alone produces a schema nobody can implement against.

## 4. Enforce, ratchet, or carry

Three tiers, drawn where proof stops.

**Rejected (`INVALID_WIDGET`).** A control whose accessible name can come only from the app,
with no `accessibilityLabel` and no `decorative`: `switch`, `slider`, `select`, `date`.
Provable, not heuristic — the DOM for these is a bare `<input type="checkbox">`, `<select>`,
`<input type="range">`, and `<input type="date">` with no label element and no `aria-label`
([widgets.js:77–131](../apps/host-desktop/src/renderer/widgets.js)). Gated on the manifest's
existing `minHostApi` field ([manifest.ts:36](../packages/app-registry/src/manifest.ts)):
strict for apps declaring `>= 0.21.0`, advisory below. That is the no-flag-day lever, on a
field the packer already validates.

**Ratcheted.** Contextual findings that must never reject a tree: a `text-input` whose only
name is a `placeholder`; a `view` that is the target of an `event` but has no name; a `text`
styled at `fontSize: 24` or `32` with no `heading`. Recorded per app in a ratchet file on the
pattern of `accessibility-ratchet.json`, monotonic, floors starting where the corpus is.

**Carried only.** `accessibilityHint` and `live` — no host can tell a missing hint from a
node that needs none. Schema-and-renderer work, not gate work.

An advisory check already exists, pointed at the wrong type: `collectAccessibilityGaps`
([doctor.ts:70–80](../packages/miniapp-test/src/doctor.ts)) flags every `view` lacking
`accessibilityLabel` — the one type where a name is usually _wrong_ — and ignores `switch`,
`select`, `slider`, and `date`, where a name is always required. It cannot fail anything
either: `runDoctor` prints findings and returns 0
([inspect-commands.ts:98](../packages/cli/src/commands/inspect-commands.ts)).

## 5. What each renderer must do

| Renderer                            | Work                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `widget-renderer-rn` (RN + web)     | pass `accessibilityLabel` / `accessibilityHint` through on every accepting type — including `view`, which it drops today; `accessibilityRole="header"` + `aria-level` for `heading`; `accessibilityLiveRegion` for `live`; `accessibilityElementsHidden` for `decorative` |
| Desktop DOM (`renderer/widgets.js`) | `aria-label` / `aria-describedby`; `<h1>`–`<h6>` for `heading`; `aria-live`; `aria-hidden`; and a real `<label>` association for the four bare controls above                                                                                                             |
| `widget-renderer-headless`          | carry every prop into `RenderedWidgetNode`, and emit the accessibility tree of §6                                                                                                                                                                                         |
| `describe.ts` (canonical model)     | carry every prop, including `alt`, which it drops today — otherwise parity tests stay blind to renderer regressions                                                                                                                                                       |

For `alt` and `accessibilityLabel` these are pure renderer gaps, fixable today with no
schema change; that half should land first.

## 6. The accessibility tree as a golden artifact

This is the lever. `renderHeadlessTree` is already a pure function from tree to rendered
model, and `renderHeadlessSnapshot` ([index.ts:305][h]) already serialises it
deterministically. A second pure projection over the same input gives an accessibility tree
of `AxNode = { role, name, level?, value?, state?, children }`.

`role` comes from a closed 21-entry map keyed by widget type; `name` from
`accessibilityLabel`, `alt`, `label`, or host synthesis; a node with no role and no name
flattens into its parent. `renderHeadlessAxSnapshot(tree): string` is the artifact, and the
golden streams in `specs/spec-widget/streams/` gain an `ax` string beside the existing
`snapshot`, pinned by `npm run test:widget-parity`.

An accessibility tree is precisely what axe-core _approximates_ from a DOM; here it can be
computed exactly, for every renderer target including the two that do not exist yet, with no
browser in the loop. It is also the only way to check the RN native renderer at all.

## 7. What is claimed about WCAG, and what is not

**No WCAG conformance claim.** Conformance is a property of a rendered result, and one
widget tree has three renderings today and five planned; an author who never draws a pixel
cannot conform to anything. What this plan targets is narrower and measurable: **WCAG 2.2
Level A and AA on the author-determined subset** — the success criteria whose satisfaction
requires data only the app can supply.

| Criterion                    | Level | Why it is in scope                                      |
| ---------------------------- | ----- | ------------------------------------------------------- |
| 1.1.1 Non-text Content       | A     | `image.alt`, `decorative`                               |
| 1.3.1 Info and Relationships | A     | `heading`, label association for the four bare controls |
| 2.4.6 Headings and Labels    | AA    | `heading`, `accessibilityLabel`                         |
| 3.3.2 Labels or Instructions | A     | placeholder-only inputs; `accessibilityHint`            |
| 4.1.2 Name, Role, Value      | A     | the whole §3 prop set                                   |

Out of scope, stated rather than promised: **1.4.3 Contrast**, 1.4.11, 2.1.1 Keyboard, 2.4.3
Focus Order, and 2.4.7 Focus Visible are renderer-determined, belong to SPEC-PRESENT and the
existing axe ratchet, and no vocabulary change touches them — 1.4.3 is already a recorded
open finding on 23 nodes of the Handbook reader (`accessibility-ratchet.json`). **Not
meaningful here at all**: 2.4.1 Bypass Blocks, 2.4.2 Page Titled, 3.1.1 Language of Page,
2.4.5 Multiple Ways — a widget tree is not a page, and a TUI or Flutter renderer has no such
concept. Measurement is the §6 artifact for the in-scope set and the existing axe gate for
the renderer half: both node-counted and ratcheted, neither a conformance statement.

## 8. What the existing gate already covers, and the hole

Three of the six ratcheted surfaces **do** already scan a real mini-app widget tree:
`handbook-chapter` and `handbook-search` render the Handbook's tree through react-native-web
(`conformance/accessibility/run.mjs:139–174`), and `web-editor` scans DevStudio rendered
through `MiniappWidgetTree` (`scripts/site/editor/entry.tsx:6`). The `desktop-host` surfaces
scan the Electron shell with a mocked catalog and never call `renderWidgetTree`, so
`apps/host-desktop/src/renderer/widgets.js` is unmeasured.

The hole is sharper than "no widget tree is scanned": **no Cookbook or example app is
scanned, and the DOM renderer is scanned by nothing** — and the surfaces that are scanned are
green because of what axe cannot see, not because the trees are labelled. Measured against
the repository's own axe-core 4.13.0 on the exact DOM shapes `widgets.js` emits, an
`<input placeholder="…">` with no label produces **no finding**, while a bare checkbox,
range, and date input produce `label` on 3 nodes and a bare `<select>` produces
`select-name`. So the dominant shape in the corpus passes today's gate silently, and the
controls axe _would_ catch sit on a surface nobody scans.

## 9. Migration across the existing corpus

The corpus is far smaller than the app count suggests. Counting literal widget-type
constructions across `cookbook/apps/*/bundle.js`, `apps/devstudio`, `apps/handbook`, and
`apps/examples/*`:

| Type         | Sites | Consequence                                                  |
| ------------ | ----- | ------------------------------------------------------------ |
| `text-input` | 38    | ratcheted, not rejected — every site carries a `placeholder` |
| `switch`     | 3     | the only rejection-tier migration in the whole repository    |
| `select`     | 0     | strict from day one, at zero cost                            |
| `slider`     | 0     | strict from day one, at zero cost                            |
| `date`       | 0     | strict from day one, at zero cost                            |

One `switch` each in `beacon-lite`, `form-forge`, and `streak-tracker`; three of the four
rejection-tier types have no existing use at all, so the strict rule can be written strict
and stay strict. The golden streams are smaller still — across `board.json`, `chat.json`,
and `file-drop.json` the final frames hold one `text-input` and no other named control.

[Static analysis](static-analysis.md) already establishes the ratchet pattern for exactly
this: an app with no coverage enters at a zero floor, visible and monotonic from there
rather than absent. Every Cookbook app enters with its measured count of unlabelled
controls, and `conformance/cookbook/cookbook.test.mjs` already launches each app and holds a
real tree (`host.snapshot().widgetTree`, line 946ff), so the audit hooks onto an existing
walk rather than a new harness.

**Is it small enough to land inside existing gates?** On this evidence, yes: three `switch`
edits, 38 `text-input` edits the ratchet does not force, one generated schema, three renderer
prop-passes, one new pure function in the headless renderer, one ratchet file. No new spec
unit or formal model is needed — only an amendment to a spec already normative and already
finished.

## 10. Sequencing

| Phase | Deliverable                                                                                | Gate                                                       |
| ----- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1     | Renderers honour the two props that already exist; `describe.ts` and headless carry them   | Parity test fails if a renderer drops `alt`                |
| 2     | §3 prop set in `ui/schema.ts`, regenerated JSON Schema, semantics written into SPEC-WIDGET | `npm run test:widget-parity`                               |
| 3     | Accessibility-tree projection and `ax` strings in the golden streams                       | Pinned per stream                                          |
| 4     | `validate.ts` rejection tier behind `minHostApi >= 0.21.0`; `doctor.ts` retargeted         | Hostile-app fixture cannot bypass; 3 switch sites migrated |
| 5     | Cookbook accessibility ratchet at measured floors                                          | New app cannot enter above its floor                       |
| 6     | Focus order derived into the SPEC-PRESENT layout vectors                                   | Vectors regenerate identically                             |

Phase 1 is useful alone and changes no schema. Phase 4 is the only one that can break a
shipped app, and the `minHostApi` gate is what stops it.

The phases are tracked as `AX-1-RENDERERS`, `AX-2-SCHEMA`, `AX-3-TREE`,
`AX-4-VALIDATE`, `AX-5-RATCHET`, and `AX-6-FOCUS` in the
[software backlog](../STATUS-SOFTWARE.md), chained in the same order as the table.

## 11. Open questions

1. **Does `decorative` need to exist, or is an empty `accessibilityLabel` enough?** An empty
   string is how the DOM says it and is one fewer prop; it is also indistinguishable from a
   bug, which is the whole argument for a distinct prop.
2. **Should `heading` be a prop on `text` or a widget type?** A type is more honest about
   structure and lets a TUI renderer reserve a line; a prop is one fewer vocabulary entry.
3. **Per-app ratchet numbers, or one per repository?** Per app follows the coverage ratchet
   and localises blame; per repository is one number to burn down.
4. **What does a preview surface announce?** `camera-preview` and `remote-video` carry only
   an opaque session handle by design; the name must come from the app or from synthesis.

## 12. What this deliberately does not do

- It does not make TwistedPear WCAG conformant, or claim it is; §7 says what is claimed.
- It does not add layout, styling, contrast, or focus-visible work. Those are SPEC-PRESENT,
  and already measured — badly — by the existing axe ratchet.
- It does not open the vocabulary. An open prop bag would end the closed-set property that
  makes five renderers possible.
- It does not gate the release: the `AX-*` backlog rows are ordinary feature and quality
  work, not release gates.
