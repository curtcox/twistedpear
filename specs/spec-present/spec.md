# SPEC-PRESENT — Presentation and layout semantics

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** C (platform) · **Status:** stub · **Migration phase:** 2

## Scope

How a widget tree ([SPEC-WIDGET](../spec-widget/spec.md)) is laid out and styled:
box/flow semantics, sizing, spacing, text measurement rules, theming. Web analog: CSS.
Splitting this from the vocabulary is what allows RN, DOM, headless-snapshot, TUI, and
Flutter renderers to be independently valid implementations.

## Normative artifacts (target)

- Layout vectors: `(widget tree, viewport) → box geometry`, in the style of CSS test
  suites. The headless-snapshot renderer produces the reference geometry. Each vector
  is `{ tree, viewport: { width, height }, boxes: { [nodeId]: { x, y, width,
height } } }` — one box per tree node, in viewport coordinates. Text measurement is
  the known nondeterminism: vectors fix a reference metric (monospace advance-width
  table) so geometry is font-independent; renderers using real fonts conform within a
  declared tolerance per box.
- The style-key vocabulary the semantics must cover is already enumerated as
  `WIDGET_STYLE_KEYS` in
  [packages/miniapp-runtime/src/ui/schema.ts](../../packages/miniapp-runtime/src/ui/schema.ts).

## Normative artifacts (current locations)

- [vectors/layout.json](vectors/layout.json) — 16 layout vectors in the exact
  shape above (`{ tree, viewport, boxes }`), produced by the headless-snapshot
  renderer (`layoutWidgetTree` in
  [packages/widget-renderer-headless](../../packages/widget-renderer-headless/))
  and regenerated with `npm run generate:layout-vectors`. The reference metric
  is monospace: advance width `round(fontSize * 0.6)` per character, line
  height `round(fontSize * 1.25)`, default font size 16. The vector file
  declares the per-box tolerance for renderers measuring real fonts
  (width/height within 25% of the reference extents). `display: none`
  subtrees produce no boxes. Vectors cover row/column flow, `justifyContent`
  and `alignItems`, percent widths, margins, gaps, list items, intrinsic
  component sizes, and the first/last frames of each recorded golden stream.
- Recomputed on every `npm run test:widget-parity` run: the headless renderer
  must reproduce every vector's boxes exactly.

## Existing assets

Presentation semantics were previously fused into
[packages/widget-renderer-rn](../../packages/widget-renderer-rn/); the headless
renderer now states them independently. This remains the only spec in the tree
where semantics are being _invented_ rather than codified.

## To finish this spec

The headless-snapshot renderer and the first vector set have landed. The spec
stays **stub** (not yet normative) deliberately: expect several revisions as
the DOM and Flutter renderers disagree with RN. TUI conformance is a defined
projection (character-cell quantization of the reference geometry), not pixel
equality.
