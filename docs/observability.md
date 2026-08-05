# Observability — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: software
-->

**This document describes what is built and verified today.** The executed design
plan lives under
[archive/design/observability-plan.md](../archive/design/observability-plan.md).

Discovery failures are diagnosed by a closed census of announce-ingress drop decisions,
not by querying “who is online?” after the fact.

## What ships

| Area                              | Current evidence                                                                                                                                                         | Status      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| SPEC-EVENTS `observe/drop` intent | `specs/spec-events/schema/events.schema.json`, generated `types.gen.ts`, `tapes/all-shapes.json`                                                                         | implemented |
| Ladder mappers (rungs 3–8)        | `packages/protocol/src/observe-drop.ts`, `packages/protocol/test/observe-drop.test.ts`                                                                                   | implemented |
| Reticulum adapter emission        | `registerDropObserver`, `drop-notify.ts`, bare-return sites in `transport.ts` / `layer-1.ts`                                                                             | implemented |
| Host drop census                  | `packages/host-core/src/drop-census.ts` on `/status`, peer-agent `status` / `link-state`                                                                                 | implemented |
| Peer-agent live capture           | Bounded observe ring, `subscribe` / `unsubscribe` / `observe-snapshot`                                                                                                   | implemented |
| Collector tape persistence        | `npm run peers -- status --capture` writes SPEC-TRACE envelopes under `.tmp/local-peers/tapes/`                                                                          | implemented |
| Handbook field report             | Export includes `dropCensus`; compare matrix renders `drop:*` rows                                                                                                       | implemented |
| Desktop / mobile / web worklets   | `createDropCensus` + `registerDropObserver`; `host.info` forwards `dropCensus` via `createCommonHostInfoBackend`                                                         | implemented |
| Local multipeer                   | `conformance/local-multipeer/run.mjs` requires a nonzero rung-4 (`announce-rate-limit:rate_limited`) count after a parallel announce burst, plus absent-peer distinction | implemented |

## Surfaces

- **`buildStatus()` / loopback `/status`** — `dropCensus: { byReason, byPeer }` beside `announcesSeen`.
- **Peer control agent** (`test-agent.ts`) — same census on `status` and `link-state`; opt-in
  `subscribe` domain `observe` streams `observe.drop` events; `observe-snapshot` returns a
  `recorded-history`-shaped tape via `ringToRecordedHistory`.
- **`npm run peers -- status --capture`** — for each attached agent, writes
  `.tmp/local-peers/tapes/<label>-<iso>.json` with `history` + `dropCensus`.
- **Handbook** — Export report packs `host.dropCensus`; Compare report shows announce drop
  counts with `=` / `≠` (human-mediated correlation only).
- **`sdk.host.info()`** — includes optional `dropCensus` when the host snapshot provides it
  (desktop, mobile Bare, and web leaf).

## Consent

Field reports remain user-initiated. There is no on-the-wire cross-peer trace-id for field
traffic. Dev hub / local-multipeer may correlate freely.

## Related

- Archived plan: [observability-plan.md](../archive/design/observability-plan.md)
- Announce ladder context: [local-peer-discovery.md](local-peer-discovery.md),
  [local-multipeer.md](local-multipeer.md)
- Normative alphabet: [SPEC-EVENTS](../specs/spec-events/spec.md),
  [SPEC-TRACE](../specs/spec-trace/spec.md)
