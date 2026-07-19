# SPEC-EVENTS — Event and intent vocabulary

**Group:** B (substrate) · **Status:** stub (informative) · **Migration phase:** 1

## Scope

The closed vocabulary of events (inputs to machines) and intents (outputs) — the "tape
alphabet" between every protocol machine and every host. This is the single boundary
that lets production adapters, the simulator, and future non-TypeScript participants
drive identical machines.

## Vocabulary

The current alphabet, as defined in
[packages/effects/src/types.ts](../../packages/effects/src/types.ts):

**Intents** (machine → host):

| Kind | Payload |
|---|---|
| `need_entropy` | `nbytes` |
| `timer/set` | `{ id, delayMs }` |
| `timer/cancel` | `{ id }` |
| `transport/send` | `{ channel, destination, payload }` |
| `store/read` | `{ key }` |
| `store/write` | `{ key, value }` |
| `store/delete` | `{ key }` |
| `log` | `level` (`debug`/`info`/`warn`/`error`), `message` |
| `transport/adversary` | Dolev-Yao action — **harness extension, see below** |

**Events** (host → machine):

| Kind | Payload |
|---|---|
| `start` | `at` |
| `tick` | `at` |
| `entropy` | `bytes` |
| `timer/fired` | `{ id, at }` |
| `transport/recv` | `{ channel, source, payload, at }` |
| `store/value` | `{ key, value? }` |
| `store/done` | `{ key, op }` |

### Harness extension: `transport/adversary`

`transport/adversary` (drop/delay/reorder/duplicate/inject) is emitted only by test
harness machines to script Dolev-Yao adversaries; no production protocol machine emits
it, and production adapters are not required to implement it. It is part of the
simulator's contract, not the normative machine alphabet. The schema will carry it in
a separate `harness` group so generated production bindings can omit it.

## Normative artifacts (target)

- `schema/` — JSON Schema for every event and intent shape. **Authority inversion is
  the point of this spec:** today the vocabulary is defined by the TypeScript types
  cited above; when this spec lands, the schema is normative and the TS types are
  generated from it.
- Example tapes (event/intent sequences) exercising each shape.

## Implementations

- Generated TypeScript types consumed by [packages/protocol](../../packages/protocol/)
  and [packages/effects](../../packages/effects/)
- Any future language binding generated from the same schema (a Flutter/Dart host will
  need one)

## To finish this spec

Extract the schema mechanically from `types.ts` (the tables above are its checklist),
land the codegen step in one change (it touches every protocol package's build — do it
atomically, not incrementally), then delete the hand-written types.
