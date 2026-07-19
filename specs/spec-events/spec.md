# SPEC-EVENTS — Event and intent vocabulary

**Group:** B (substrate) · **Status:** normative · **Migration phase:** 1

## Scope

The closed vocabulary of events (inputs to machines) and intents (outputs) — the "tape
alphabet" between every protocol machine and every host. This is the single boundary
that lets production adapters, the simulator, and future non-TypeScript participants
drive identical machines.

## Vocabulary

The alphabet, normatively defined in
[schema/events.schema.json](schema/events.schema.json) (this table is
informative prose):

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

## Normative artifacts (current locations)

- [schema/events.schema.json](schema/events.schema.json) — JSON Schema for every
  event and intent shape. **Authority is inverted:** the schema is normative;
  the TypeScript alphabet
  ([packages/effects/src/types.gen.ts](../../packages/effects/src/types.gen.ts))
  is generated from it by
  [scripts/generate-event-types.mjs](../../scripts/generate-event-types.mjs)
  (`npm run generate:event-types`). The `machineIntent` group is the production
  alphabet; `harnessIntent` carries `transport/adversary` separately; `intent`
  is their union as accepted by simulation-capable hosts.
- Example tape exercising each shape (all events, all machine intents, every
  log level and Dolev-Yao power): [tapes/all-shapes.json](tapes/all-shapes.json).
- Enforcement:
  [packages/effects/test/spec-events.test.ts](../../packages/effects/test/spec-events.test.ts)
  (in the `sansio:determinism` gate) validates the tape against the schema,
  checks full-alphabet coverage, rejects out-of-alphabet payloads, and fails if
  the committed generated types drift from the schema. SPEC-TRACE's entry
  schema references this schema for payload validation, so every recorded
  history is also checked against the alphabet.

## Implementations

- Generated TypeScript types consumed by [packages/protocol](../../packages/protocol/)
  and [packages/effects](../../packages/effects/)
- Any future language binding generated from the same schema (a Flutter/Dart host will
  need one)

## To finish this spec

Done — the schema landed with the `harness` group split out, the codegen step
replaced the hand-written alphabet types in one atomic change
(`types.ts` retains only the host-facing interfaces and re-exports the
generated alphabet), and the example tape covers every shape.
