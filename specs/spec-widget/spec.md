# SPEC-WIDGET — Widget tree vocabulary and update stream

**Group:** C (platform) · **Status:** stub · **Migration phase:** 2

## Scope

The declarative widget tree a mini-app emits and the update/diff stream that mutates
it. Web analog: HTML/DOM. **Language-neutral by requirement:** target renderers are
React Native, DOM, headless-snapshot, TUI, and Flutter — so the vocabulary must live as
a schema, not as TypeScript types.

Layout and styling semantics are deliberately excluded — they belong to
[SPEC-PRESENT](../spec-present/spec.md). This spec defines *what exists in the tree*;
that one defines *how it looks*.

## Normative artifacts (target)

- `schema/` — JSON Schema for the widget vocabulary and the update-stream operations
- Golden widget streams recorded from the example apps (chat, file-drop, board) and the
  Handbook, replayable against any renderer

## Existing assets

- Implicit vocabulary in [packages/widget-renderer-rn](../../packages/widget-renderer-rn/)
- Cross-renderer checks in [conformance/widget-parity](../../conformance/widget-parity/)
  and [conformance/web-widget-renderer](../../conformance/web-widget-renderer/)

## Implementations (renderer order)

1. React Native (exists)
2. **Headless-snapshot (build first — it is the conformance oracle for all others)**
3. DOM (web host partially covers this)
4. TUI
5. Flutter (proves language-neutrality end-to-end)

## To finish this spec

Extract the schema from the RN renderer, record the golden streams, then drive every
renderer from the same recorded streams in the parity suite. Isolated UI testing falls
out: a renderer needs no broker, no network, and no app runtime to be fully exercised.
