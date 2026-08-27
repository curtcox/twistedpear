# Mini-app record and replay — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/miniapp-record-replay-plan.md
-->

**This describes the implementation as it exists now.** Shrinking and host
chrome remain in the
[record-and-replay plan](miniapp-record-replay-plan.md). Where the two disagree, this
file wins.

The App Authoring Guide still has no debugger attached to the sandbox. What exists
beyond the console shim and diagnostics ring is an interoperable **shape-only session
trace**: the document two hosts can exchange without exchanging user content.

## Format 1

A session is a JSON document with `format: 1`, `kind: "miniapp-session"`, and
`mode: "shape"`. It carries bundle identity, starting grants, host facts, and an
ordered tape of `clock`, `entropy`, `grant`, `broker`, `inbound`, and `assert`
entries. Broker rows name the namespace, method, capability, and outcome; they do
not carry payloads or results. Entropy rows name a byte count, not the bytes.

Canonical serialization and hashing reuse the SPEC-TRACE rules (sorted-key JSON,
FNV-1a 64-bit). The parser rejects any object key that would smuggle content
(`payload`, `result`, `body`, `text`, and the rest of the denylist).

The schema, three Cookbook vectors (dice-table, pocket-notes, unit-converter), and
the TypeScript parser live under [SPEC-APP-TRACE](../specs/spec-app-trace/spec.md)
and `packages/miniapp-runtime/src/trace-format.ts`. Round-trip is
`npx vitest run packages/miniapp-runtime/test/trace-format.test.ts`.

## Recording

A host that constructs a `SessionRecorder` and passes it as
`MiniappHostOptions.sessionRecorder` writes Format 1 traces from a live
session. The recorder sits on the existing broker `audit` callback: it copies
namespace, method, capability, and outcome, and never copies payloads or
results. Widget renders contribute `assert` rows (node counts only). UI events
contribute `inbound` rows (kind and name).

The three sandbox bootstraps (node worker, Bare worker, browser worker) replace
`Date.now`, `Math.random`, and `crypto.getRandomValues` with host-injected
sources. Clock and entropy draws become tape entries. An app cannot start,
observe, or impersonate recording. Passing `shimClock: false` is a negative
control: `SessionRecorder.snapshot()` throws `UnshimmedClockError` rather than
emitting a trace that would silently fail replay.

Focused tests: `npx vitest run packages/miniapp-runtime/test/trace-recording.test.ts`.

## Payload, redaction, and sealed traces

Shape remains the default. A host that constructs `SessionRecorder` with
`mode: "payload"` may attach JSON `payload` and `result` on broker rows.
`snapshot()` is still shape-only. `snapshotPayload()` returns the payload
document. `redactAppTrace` / `SessionRecorder.redact()` drop those fields and
parse as shape; a known secret string must not survive as UTF-8 in the
serialized redaction.

`sealAppTrace` wraps a shape or payload document in an X25519-ChaCha20-Poly1305
envelope addressed to a 32-byte recipient key (typically the publisher's
encryption key). Identity stays in the clear. Opening with the matching
private key recovers the inner document; any other key fails closed.
Recording stays host-owned: `MiniappBroker` has no trace methods, and two
recorders do not share tape. In-memory tape is capped (`maxBytes`, default
256 KiB) and drops oldest entries rather than growing without bound.

Focused tests: `npx vitest run packages/miniapp-runtime/test/trace-security.test.ts`.

## Replay and step

`tp trace replay <file.tptrace> [app-dir]` re-runs a recorded session against a
real `MiniappHost` and compares tapes. `tp trace step` does the same and prints
each step through `widget-renderer-headless` — `--at <n>` for one step, `--ax`
for the accessibility tree instead of the widget tree. Both refuse a trace that
names another app or another `HOST_API_VERSION` (`--allow-host-skew` overrides
the latter) rather than reporting a quietly-wrong result.

The engine is `replaySession` / `recordSession` / `roundTripSession` in
`@twistedpear/miniapp-test`. Two things make it work:

- **A virtual clock.** `createTraceClock` advances a fixed step per host `now()`
  call. The sandbox entropy LCG is seeded from the launch clock, so record and
  replay only agree on `Math.random` when they agree on that seed. A trace
  recorded on a wall-clock host replays control flow but not entropy draws.
- **Inputs resolved by event name.** A shape tape records the event name, never
  the node id — the id is app data. Replay resolves it from the replayed tree
  the way `AppHandle.fire` does. A tree that no longer declares the name fails
  loudly instead of skipping the input.

What replay asserts is the tape: entry kinds, capabilities, and outcomes, in
order. Entry timestamps are counted (`clockDrift`) rather than asserted, because
`at` counts host clock reads and async completion order can shift that by a tick
without changing what the app did. The widget-patch stream is not in the tape
at all, so only a record-and-replay in one process (`roundTripSession`) can
compare it — which is what the Cookbook corpus does.

The sandbox shims `Date.now`, `Math.random`, `crypto.getRandomValues`, and —
since replay made the hole visible — `new Date()` and `Date()`, which read the
platform clock straight past `Date.now`.

Conformance: all 26 apps under `cookbook/apps/` record a scripted session and
replay to an identical widget-patch stream
(`npx vitest run conformance/cookbook/cookbook.test.mjs`). Focused tests:
`npx vitest run packages/miniapp-test/test/trace-replay.test.ts packages/cli/test/trace.test.ts`.

## Not in this drop

`tp trace record` and `tp trace shrink` do not exist; recording is a host-side
API, not a CLI verb. Desktop has no Record session control.
