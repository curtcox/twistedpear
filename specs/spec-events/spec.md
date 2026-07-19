# SPEC-EVENTS — Event and intent vocabulary

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

The closed vocabulary of events (inputs to machines) and intents (outputs) — the "tape
alphabet" between every protocol machine and every host. This is the single boundary
that lets production adapters, the simulator, and future non-TypeScript participants
drive identical machines.

## Normative artifacts (target)

- `schema/` — JSON Schema for every event and intent shape. **Authority inversion is
  the point of this spec:** today the vocabulary is defined by TypeScript types in
  [packages/effects/src/types.ts](../../packages/effects/src/types.ts); when this spec
  lands, the schema is normative and the TS types are generated from it.
- Example tapes (event/intent sequences) exercising each shape.

## Implementations

- Generated TypeScript types consumed by [packages/protocol](../../packages/protocol/)
  and [packages/effects](../../packages/effects/)
- Any future language binding generated from the same schema (a Flutter/Dart host will
  need one)

## To finish this spec

Extract the schema mechanically from `types.ts`, land the codegen step in one change
(it touches every protocol package's build — do it atomically, not incrementally), then
delete the hand-written types.
