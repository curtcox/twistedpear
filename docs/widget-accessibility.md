# Accessibility in the mini-app widget model — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/widget-accessibility-plan.md
-->

**This describes the implementation as it exists now.** Remaining phases live in the
[widget accessibility plan](widget-accessibility-plan.md). Where the two disagree, this
file wins.

The widget vocabulary is the closed set in
[SPEC-WIDGET](../specs/spec-widget/spec.md). The host now **accepts** the bounded
accessibility prop set below. Two props — `view.accessibilityLabel` and `image.alt` —
already pass through every renderer. The rest of the set is accepted and specified;
renderers do not yet honour the new members. The accessibility-tree oracle and
version-gated unnamed-control rejection are in this drop.

## What ships

### Renderer-honoured today

| Prop                      | Canonical model (`describe.ts`) | Headless oracle | React Native / web   | Desktop DOM                                 |
| ------------------------- | ------------------------------- | --------------- | -------------------- | ------------------------------------------- |
| `view.accessibilityLabel` | carried                         | carried         | `accessibilityLabel` | `aria-label`                                |
| `image.alt`               | carried                         | carried         | `accessibilityLabel` | `<img alt>` (placeholder uses `aria-label`) |

`button.label` was already the accessible name for buttons and is unchanged.

### Accepted by schema and `validate.ts` (not yet renderer-honoured)

Normative meaning is in [SPEC-WIDGET — Accessibility](../specs/spec-widget/spec.md#accessibility).

| Prop                 | Domain                      | Accepted on                                                                                                                          |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `accessibilityLabel` | string, 1–128 chars         | `view`, `scroll`, `list`, `progress`, `text-input`, `switch`, `slider`, `select`, `date`, `code-editor`, `qr-code`, preview surfaces |
| `accessibilityHint`  | string, 1–128 chars         | `button`, `text-input`, `switch`, `slider`, `select`, `date`, `code-editor`                                                          |
| `heading`            | integer 1–6                 | `text`                                                                                                                               |
| `live`               | `"polite"` \| `"assertive"` | `text`, `view`                                                                                                                       |
| `decorative`         | `true`                      | `image`, `view`                                                                                                                      |

`npm run test:widget-parity` fails if the JSON Schema drifts from `ui/schema.ts`, and it
fails if host validation and the schema disagree on the trees above. The `a11y-existing`
golden stream pins the two renderer-honoured props and the projected `ax` string.

The web host still renders through `packages/widget-renderer-rn` under react-native-web,
so RN and web stay one implementation.

CHROME-R8 / CHROME-R9 scan `accessibilityHint` as well as `accessibilityLabel`.

## Accessibility tree oracle

`renderHeadlessAxSnapshot` in `packages/widget-renderer-headless` projects a
widget tree to a deterministic accessibility tree: a closed role map of widget
type, a name from `accessibilityLabel` / `alt` / `label` / visible text, and
flattening of unnamed groups, spacers, and `decorative` nodes. Golden streams
in `specs/spec-widget/streams/` pin an `ax` string beside each frame's visual
`snapshot`. `npm run test:widget-parity` checks both.

## Version-gated unnamed-control rejection

Apps that declare `minHostApi` 0.21.0 or newer are rejected (`INVALID_WIDGET`) if a
`switch`, `slider`, `select`, or `date` has no `accessibilityLabel`. Older apps are
unchanged at render time. `tp doctor` flags those four types as advisory findings for
every app, and no longer flags unlabeled `view` nodes.

## Cookbook unlabeled-control ratchet

`conformance/cookbook/cookbook.test.mjs` measures unlabeled controls on each
Cookbook app's first render: unnamed `switch` / `slider` / `select` / `date`,
`text-input` without `accessibilityLabel`, `view` nodes that handle an `event`
with no name, and `text` at `fontSize` 24 or 32 with no `heading`. Floors live in
`conformance/cookbook/unlabeled-controls-ratchet.json`. A new app enters at 0;
an existing floor may only shrink.

## Not in this drop

Renderer mapping for `accessibilityHint`, `heading`, `live`, and `decorative`;
and derived focus order remain in the [plan](widget-accessibility-plan.md).
