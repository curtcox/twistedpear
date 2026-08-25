# Mini-app record and replay — current

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: software
counterpart: docs/miniapp-record-replay-plan.md
-->

**This describes the implementation as it exists now.** Replay, shrinking,
and host chrome remain in the
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

## Not in this drop

`tp trace record` / `replay` / `step` / `shrink` do not exist. Desktop has no
Record session control. Payload recording and sealed traces are later plan
phases.
