# SPEC-PRESENT — Presentation and layout semantics

**Group:** C (platform) · **Status:** stub (**informative**) · **Migration phase:** 2

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

## Existing assets

None as a separate artifact — presentation semantics are currently fused into
[packages/widget-renderer-rn](../../packages/widget-renderer-rn/). This is the only
spec in the tree where semantics are being *invented* rather than codified.

## To finish this spec

Build the headless-snapshot renderer, extract layout rules from the RN renderer into
vectors of the shape above; expect several revisions as the DOM and Flutter renderers
disagree with RN. TUI conformance is a defined projection (character-cell quantization
of the reference geometry), not pixel equality.
