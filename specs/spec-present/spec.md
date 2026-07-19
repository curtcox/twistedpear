# SPEC-PRESENT — Presentation and layout semantics

**Group:** C (platform) · **Status:** stub · **Migration phase:** 2

## Scope

How a widget tree ([SPEC-WIDGET](../spec-widget/spec.md)) is laid out and styled:
box/flow semantics, sizing, spacing, text measurement rules, theming. Web analog: CSS.
Splitting this from the vocabulary is what allows RN, DOM, headless-snapshot, TUI, and
Flutter renderers to be independently valid implementations.

## Normative artifacts (target)

- Layout vectors: `(widget tree, viewport) → box geometry`, in the style of CSS test
  suites. The headless-snapshot renderer produces the reference geometry.

## Existing assets

None as a separate artifact — presentation semantics are currently fused into
[packages/widget-renderer-rn](../../packages/widget-renderer-rn/). This is the only
spec in the tree where semantics are being *invented* rather than codified.

## To finish this spec

Extract layout rules from the RN renderer into vectors; expect several revisions as the
DOM and Flutter renderers disagree with RN. TUI conformance is a defined projection
(character-cell quantization of the reference geometry), not pixel equality.
