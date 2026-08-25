# SPEC-WIDGET — Widget tree vocabulary and update stream

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 2

## Scope

The declarative widget tree a mini-app emits and the update/diff stream that mutates
it. Web analog: HTML/DOM. **Language-neutral by requirement:** target renderers are
React Native, DOM, headless-snapshot, TUI, and Flutter — so the vocabulary must live as
a schema, not as TypeScript types.

Layout and styling semantics are deliberately excluded — they belong to
[SPEC-PRESENT](../spec-present/spec.md). This spec defines _what exists in the tree_;
that one defines _how it looks_. The brokered calls that carry the tree
(`ui.render`, `ui.onEvent`) are owned by [SPEC-SDK](../spec-sdk/spec.md); this spec
owns their payloads.

## Current vocabulary

The closed component set the schema must cover (as implemented in
[MiniappWidgetTree.tsx](../../packages/widget-renderer-rn/src/MiniappWidgetTree.tsx)
and validated by the host broker): `view`, `text`, `image`, `button`, `text-input`,
`switch`, `scroll`, `list`, `progress`, `divider`, `spacer`, `code-editor`,
`qr-code`, `select`, `slider`, `date`. `text-input` also accepts `multiline`,
`secure`, and `keyboard` (`default` / `numeric` / `email` / `url`). `code-editor` is content-by-reference — it carries a workspace
`documentId`, never file text ([docs/miniapp-sdk.md](../../docs/miniapp-sdk.md)).

Tree well-formedness (enforced by
[validate.ts](../../packages/miniapp-runtime/src/ui/validate.ts)): unknown component
types and unknown per-type props are rejected (`INVALID_WIDGET`, mirroring the
unknown-capability rule in [SPEC-CAP](../spec-cap/spec.md)); node ids are non-empty
and unique per tree; default budgets are 256 KiB serialized, 5000 nodes, depth 32
(`TOO_LARGE` / `TOO_MANY_NODES` / `TOO_DEEP`). Accessibility props are part of that
closed per-type set — see [Accessibility](#accessibility).

## Normative artifacts (current locations)

- [schema/widget.schema.json](schema/widget.schema.json) — JSON Schema for the
  vocabulary and the update-stream operations, **generated** from the host-side
  tables in `ui/schema.ts` by
  [scripts/generate-widget-schema.mjs](../../scripts/generate-widget-schema.mjs)
  (`npm run generate:widget-schema`); the parity runner fails on drift.
- [streams/](streams/) — golden widget streams recorded from the example apps
  (chat, board, file-drop) by
  [scripts/record-widget-streams.mjs](../../scripts/record-widget-streams.mjs)
  (`npm run record:widget-streams`): the apps' real bundles run headlessly
  against a stub SDK, their `ui.onEvent` handlers are driven by a scripted
  event sequence, and every `ui.render` frame is pinned together with the diff
  stream and the headless-snapshot rendering.
- `npm run test:widget-parity` drives everything from the recorded streams:
  schema + host validation of every frame, node-for-node parity between the
  headless renderer and the canonical host render model, pinned snapshots,
  pinned diffs, and patch-stream reconstruction where the stream contains no
  structural inserts.

### Update-stream semantics (recorded decision)

The diff stream (`ui/diff.ts`) replaces or removes nodes by id; it cannot
express the insertion position of a child whose id was absent from the
previous frame. Hosts therefore always deliver the full next tree alongside
the patch stream; a replace targeting an unknown id is a render invalidation,
not a constructive edit. The headless consumer
(`applyWidgetPatches`) enforces this by throwing `UnappliablePatchError` on
such patches.

## Existing assets

- Explicit host-side vocabulary: `WIDGET_TYPES`, `WIDGET_PROP_KEYS`,
  `WIDGET_STYLE_KEYS` in
  [packages/miniapp-runtime/src/ui/schema.ts](../../packages/miniapp-runtime/src/ui/schema.ts)
  — the JSON Schema should be generated from this, not re-derived from the renderer
- Validation and diff:
  [validate.ts](../../packages/miniapp-runtime/src/ui/validate.ts),
  [diff.ts](../../packages/miniapp-runtime/src/ui/diff.ts)
- Renderer interpretation in
  [packages/widget-renderer-rn](../../packages/widget-renderer-rn/)
- Cross-renderer checks in [conformance/widget-parity](../../conformance/widget-parity/)
  and [conformance/web-widget-renderer](../../conformance/web-widget-renderer/)

## Implementations (renderer order)

1. React Native (exists)
2. Headless-snapshot
   ([packages/widget-renderer-headless](../../packages/widget-renderer-headless/))
   — **the conformance oracle for all others**: independent interpretation of
   the vocabulary, strict patch consumer, deterministic text snapshots, and
   the SPEC-PRESENT reference geometry
3. DOM (web host partially covers this)
4. TUI
5. Flutter (proves language-neutrality end-to-end)

## Accessibility

These props are renderer-neutral. A host maps them onto the platform accessibility
API; a TUI or Flutter renderer uses the same meaning. They do not change layout.

`button.label` and `image.alt` remain the accessible name for those two types.
`accessibilityLabel` is not accepted on them.

| Prop                 | Domain                      | Meaning                                                                                                                                                                                                                                                                                               |
| -------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accessibilityLabel` | string, 1–128 chars         | App-supplied accessible **name**. Used when the type has no dedicated name prop. Hosts expose this string as the name; they must not invent a different name from visible text when this prop is present. Omission means "no name supplied". An empty string is invalid.                              |
| `accessibilityHint`  | string, 1–128 chars         | App-supplied description of the **result of activating** the node (`aria-describedby` / RN `accessibilityHint`). Must not be used as the name. Accepted only on interactive types.                                                                                                                    |
| `heading`            | integer 1–6                 | The `text` node is a heading at that rank. The `value` remains the name. Hosts expose heading semantics (`h1`–`h6`, `role="header"` + level).                                                                                                                                                         |
| `live`               | `"polite"` \| `"assertive"` | The `text` or `view` is a live region. Hosts announce updates at that politeness (`aria-live`, RN `accessibilityLiveRegion`). Omission means the node is not a live region.                                                                                                                           |
| `decorative`         | `true`                      | The `image` or `view` is intentionally unnamed and must be omitted from the accessibility tree (`aria-hidden`, RN `accessibilityElementsHidden`). Distinct from a missing name: omission is possibly a bug; `decorative` is an explicit author claim. `decorative: false` is invalid — omit the prop. |

Accepted on:

- `accessibilityLabel` — `view`, `scroll`, `list`, `progress`, `text-input`, `switch`, `slider`, `select`, `date`, `code-editor`, `qr-code`, and the five preview surfaces
- `accessibilityHint` — `button`, `text-input`, `switch`, `slider`, `select`, `date`, `code-editor`
- `heading` — `text`
- `live` — `text`, `view`
- `decorative` — `image`, `view`

Preview surfaces may carry `accessibilityLabel` as a name for the region. They still
must not carry sample or pixel props; the live output is not in the widget tree.

Unnamed-control rejection, the accessibility-tree projection, and derived focus order
are specified in later amendments; this section only defines the vocabulary and its
meaning.

## To finish this spec

Done — the JSON Schema is generated from `ui/schema.ts`, the golden streams
are recorded from the example apps, and `npm run test:widget-parity` drives
the differ, the schema, and the headless renderer from the same recorded
streams. Isolated UI testing falls out: a renderer needs no broker, no
network, and no app runtime to be fully exercised. Remaining renderers (DOM,
TUI, Flutter) conform by replaying the same streams.
