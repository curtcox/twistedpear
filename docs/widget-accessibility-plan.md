# Accessibility in the mini-app widget model — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-25
register: software
counterpart: docs/widget-accessibility.md
-->

**This is a plan, not a description of current behaviour.** The bounded prop set is now
accepted by `ui/schema.ts` and specified in SPEC-WIDGET; that lives in
[widget-accessibility.md](widget-accessibility.md). That live file wins against this one.
Nothing here gates the release. This plan develops §2 of the
[platform facilities survey](platform-facilities-plan.md) rather than repeating it.

The proposal: give the widget vocabulary enough accessibility data that the **host** can
guarantee a mini-app is usable with a screen reader, and make that guarantee checkable in CI
from the widget tree alone — no browser, no human.

## 1. What still cannot be said

The closed vocabulary now _accepts_ labels, hints, heading, live, and decorative — see
[widget-accessibility.md](widget-accessibility.md). The accessibility tree is
checkable via `renderHeadlessAxSnapshot` and the `ax` golden strings. What still
cannot be checked is derived focus order. Unnamed `switch` / `slider` /
`select` / `date` nodes are rejected when `minHostApi` is 0.21.0 or newer.
Cookbook unlabeled-control floors live in
`conformance/cookbook/unlabeled-controls-ratchet.json`.
There are three renderer implementations, not four: the web host renders through
`packages/widget-renderer-rn` under react-native-web. Most of the new props are not yet
honoured by those renderers.

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

The closed prop set, value domains, and per-type acceptance now live in
[widget-accessibility.md](widget-accessibility.md) and
[SPEC-WIDGET — Accessibility](../specs/spec-widget/spec.md#accessibility). Phase 2 landed
them in `ui/schema.ts` and the generated JSON Schema. Phase 3 landed the headless
accessibility-tree oracle and `ax` strings on the golden streams. Remaining work is
honouring the new props in the visual renderers (§5), and the rejection / ratchet /
focus-order phases.

**Focus order is not here, because it is presentation.** It is a function of laid-out reading
order, which is exactly what SPEC-PRESENT already computes: `layoutWidgetTree` produces one
box per node in viewport coordinates ([spec-present/spec.md](../specs/spec-present/spec.md) —
Normative artifacts). Focus order should be _derived_ from that geometry and pinned in the
existing layout vectors as a `focusOrder` array, not authored as a prop — an author-supplied
focus index is a known anti-pattern, and the vocabulary is better without one.

### Where the change actually lands

`specs/spec-widget/schema/widget.schema.json` is **generated** from `ui/schema.ts` by
`scripts/generate-widget-schema.mjs`, and `conformance/widget-parity/run.mjs` fails on
drift. Phase 2 edited the TypeScript tables, regenerated the JSON Schema, and wrote the
normative meaning into `specs/spec-widget/spec.md`. Remaining renderer and tree work still
starts from those tables.

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

## 5. What each renderer must still do

`view.accessibilityLabel` and `image.alt` already pass through; see
[widget-accessibility.md](widget-accessibility.md). Remaining renderer work is the §3
prop set and the accessibility tree:

| Renderer                            | Remaining work                                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `widget-renderer-rn` (RN + web)     | `accessibilityHint` on interactive types; `accessibilityRole="header"` + `aria-level` for `heading`; `accessibilityLiveRegion` for `live`; `accessibilityElementsHidden` for `decorative` |
| Desktop DOM (`renderer/widgets.js`) | `aria-describedby`; `<h1>`–`<h6>` for `heading`; `aria-live`; `aria-hidden`; and a real `<label>` association for the four bare controls above                                            |
| `widget-renderer-headless`          | carry every new prop into `RenderedWidgetNode`, and emit the accessibility tree of §6                                                                                                     |
| `describe.ts` (canonical model)     | carry every new prop — otherwise parity tests stay blind to renderer regressions                                                                                                          |

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

| Phase | Deliverable                                                                        | Gate                                                              |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 3     | Accessibility-tree projection and `ax` strings in the golden streams               | Done — `renderHeadlessAxSnapshot` + `ax` on every stream          |
| 4     | `validate.ts` rejection tier behind `minHostApi >= 0.21.0`; `doctor.ts` retargeted | Done — hostile-app fixture cannot bypass; 3 switch sites migrated |
| 5     | Cookbook accessibility ratchet at measured floors                                  | Done — new app cannot enter above its floor                       |
| 6     | Focus order derived into the SPEC-PRESENT layout vectors                           | Vectors regenerate identically                                    |

Phase 4 is the only one that can break a shipped app, and the `minHostApi` gate is what
stops it.

The remaining phase is tracked as `AX-6-FOCUS` in the [software backlog](../STATUS-SOFTWARE.md). Phases 3–5 (`AX-3-TREE`, `AX-4-VALIDATE`, `AX-5-RATCHET`) are implemented.

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
