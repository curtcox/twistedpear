# SPEC-WIDGET — Widget tree vocabulary and update stream

**Group:** C (platform) · **Status:** stub · **Migration phase:** 2

## Scope

The declarative widget tree a mini-app emits and the update/diff stream that mutates
it. Web analog: HTML/DOM. **Language-neutral by requirement:** target renderers are
React Native, DOM, headless-snapshot, TUI, and Flutter — so the vocabulary must live as
a schema, not as TypeScript types.

Layout and styling semantics are deliberately excluded — they belong to
[SPEC-PRESENT](../spec-present/spec.md). This spec defines *what exists in the tree*;
that one defines *how it looks*. The brokered calls that carry the tree
(`ui.render`, `ui.onEvent`) are owned by [SPEC-SDK](../spec-sdk/spec.md); this spec
owns their payloads.

## Current vocabulary

The closed component set the schema must cover (as implemented in
[MiniappWidgetTree.tsx](../../packages/widget-renderer-rn/src/MiniappWidgetTree.tsx)
and validated by the host broker): `view`, `text`, `image`, `button`, `text-input`,
`switch`, `scroll`, `list`, `progress`, `divider`, `spacer`, `code-editor`,
`qr-code`. `code-editor` is content-by-reference — it carries a workspace
`documentId`, never file text ([docs/miniapp-sdk.md](../../docs/miniapp-sdk.md)).

Tree well-formedness (enforced by
[validate.ts](../../packages/miniapp-runtime/src/ui/validate.ts)): unknown component
types and unknown per-type props are rejected (`INVALID_WIDGET`, mirroring the
unknown-capability rule in [SPEC-CAP](../spec-cap/spec.md)); node ids are non-empty
and unique per tree; default budgets are 256 KiB serialized, 5000 nodes, depth 32
(`TOO_LARGE` / `TOO_MANY_NODES` / `TOO_DEEP`).

## Normative artifacts (target)

- `schema/` — JSON Schema for the widget vocabulary and the update-stream operations
- Golden widget streams recorded from the example apps (chat, file-drop, board) and the
  Handbook, replayable against any renderer

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
2. **Headless-snapshot (build first — it is the conformance oracle for all others)**
3. DOM (web host partially covers this)
4. TUI
5. Flutter (proves language-neutrality end-to-end)

## To finish this spec

Generate the JSON Schema from `ui/schema.ts`, record the golden streams, then drive
every renderer from the same recorded streams in the parity suite. Isolated UI testing
falls out: a renderer needs no broker, no network, and no app runtime to be fully
exercised.
