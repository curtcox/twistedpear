# Mini-app record and replay — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-25
register: software
counterpart: docs/miniapp-record-replay.md
-->

**This document describes intended work, not current behaviour.** The shape-only
session format that already ships is in
[mini-app record and replay](miniapp-record-replay.md). What still does not exist
is recording, replay, shrinking, and host chrome. What already existed for debugging
a mini-app is a console shim and a diagnostics ring, described in
[Testing and debugging](../authors/11-testing-and-debugging.md) and
[the mini-app runtime reference](miniapp-runtime.md); the deterministic kernel this plan
builds on is described in [Deterministic abuse simulation](simulation.md), and the drop
census that established the "record the decision, not the aftermath" pattern is
[Observability](observability.md).

The proposal: give a mini-app author a recorded trace of a real session that replays
deterministically, so that a bug seen once on someone else's phone can be re-entered,
stepped, and turned into a regression test.

## 1. The gap

The App Authoring Guide states the position plainly: there is no debugger, no breakpoint,
and no devtools attached to the sandbox. An author has three tools — a `console` shim
surfaced through `DiagnosticsRing` (200 entries, 4 KiB each), their own state rendered into
a `text` widget, and `tp test`.

That is workable while an app is on the author's desk. It fails exactly where this platform
is hardest, and the guide says where that is: resolution, seeding, slow links, partial
grants, a grant revoked mid-session, a quota tightened mid-session. Those failures happen on
a device the author does not hold, over a link the author cannot see, and they leave behind
200 lines of ring buffer.

## 2. Why this is cheap here and expensive elsewhere

Determinism is already paid for. Three properties that a conventional platform would have to
build from nothing are load-bearing parts of this repository already:

| Property                            | Where it already lives                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pure step functions over events     | The Sans-IO boundary, [sansio.md](sansio.md), enforced by `npm run sansio`                                                           |
| Virtual clock, seeded PRNG          | `packages/effects/src/adapters/sim/clock.ts`, `entropy.ts`, `kernel.ts`                                                              |
| Record, replay, and shrink          | `packages/effects/src/adapters/sim/recorder.ts`, `replay.ts`, `shrink.ts`                                                            |
| A single call chokepoint            | `MiniappBroker.dispatch` in `packages/miniapp-runtime/src/broker.ts`                                                                 |
| A UI layer that is data             | `WidgetTree` and `WidgetPatch` in `packages/miniapp-runtime/src/ui/`                                                                 |
| Replay proven against shipping code | `sim-campaign` executes the real `MiniappHost`, real broker registration, and the real `GrantStore` ([simulation.md](simulation.md)) |

`replayEvents` and `assertReplayDeterminism` already exist and already prove that a recorded
history reproduces byte-identically. What is missing is not the machinery. It is that the
machinery stops below the mini-app: it records protocol nodes, not an app's session.

## 3. What an author gets

```sh
tp trace record my-app          # attach to a running app, write my-app.tptrace
tp trace replay my-app.tptrace  # re-run it, deterministically
tp trace step  my-app.tptrace   # scrub, inspect state and widget tree per step
tp trace shrink my-app.tptrace  # minimise to the shortest failing prefix
tp trace test  my-app.tptrace   # emit a *.test.js case for @twistedpear/miniapp-test
```

And, for a user rather than an author: a **Record session** control in the desktop Runtime
controls panel, next to the counters and **Force quit** already there, producing a file the
user can inspect and choose to send.

The last command is the one that makes this more than a debugger. A trace that becomes a
`tp test` case turns a field report into a permanent regression, which is the same loop
`sim-campaign` already runs for protocol bugs: find, shrink, fix, keep the trace.

## 4. What a trace is

Format 1, the shape-only document, identity, entry tags, and hash rules now live in
[mini-app record and replay](miniapp-record-replay.md) and
[SPEC-APP-TRACE](../specs/spec-app-trace/spec.md). Later phases still have to *fill*
that document from a live session.

## 5. Where it plugs in

| Seam                                                              | Change                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `BrokerOptions.audit` in `packages/miniapp-runtime/src/broker.ts` | Exists, and is the right seam. `BrokerAuditEntry` deliberately carries no payload or result — see §6. |
| `packages/miniapp-runtime/src/ui/diff.ts`                         | `WidgetPatch` stream is already the render output; tap it for the assertion side.                     |
| `packages/miniapp-runtime/src/sandbox/`                           | Clock and entropy inside the sandbox must route through recordable sources.                           |
| `packages/effects/src/adapters/sim/recorder.ts`                   | Generalise `RecordedHistory<S>` so an app session is a recordable node kind.                          |
| `packages/effects/src/adapters/sim/replay.ts`                     | `replayEvents` / `assertReplayDeterminism` apply unchanged once the session is a node.                |
| `packages/miniapp-test/src/harness.ts`                            | Load a trace as a fixture; this is what makes `tp trace test` a two-line generator.                   |
| `packages/widget-renderer-headless`                               | Render replayed trees for the step view without a GUI.                                                |
| `packages/cli`                                                    | The `tp trace` verbs.                                                                                 |

## 6. The privacy problem, which is the hard part

`BrokerAuditEntry` records `namespace`, `method`, `capability`, `outcome`, and `at`. It does
**not** record `payload` or `result`. That omission is a design decision, not an oversight,
and it is precisely what a replayable trace needs to reverse.

A full trace of a chat app contains the messages. A trace of a field-log app contains the
log. A trace of anything with `identity` contains signatures over real payloads. Handing
that to a publisher because the app crashed is a considerably worse bargain than the crash.

The plan therefore treats a trace as **user data with an owner**, not as telemetry:

- **Recording is user-initiated and user-visible.** A host control the user presses, with a
  recording indicator in host chrome for the duration. No app can request it, and no
  capability grants it — an app must not be able to tell that it is being recorded, or a
  hostile app records only its innocent path.
- **Traces never leave the device implicitly.** Writing a trace file is not sending one.
- **Redaction is a first-class trace operation, not a post-hoc grep.** `tp trace redact`
  should be able to drop payloads per namespace, leaving a shape-only trace that still
  replays control flow. Many bugs — a mishandled denial, a render loop, a quota branch —
  reproduce from shapes alone.
- **Sealed traces.** A trace should be encrypted to the publisher's key at record time so
  a user can hand over something the author can read but they themselves cannot.
  This composes with the proposed publisher-directed crash reports and with the
  "record the decision" posture already taken in [Observability](observability.md).
- **A shape-only trace is the default.** Full-payload recording is the explicit choice.

This section should be reviewed against the threat model in
[security-review.md](security-review.md) before any of §5 is built. A trace file is a new
exfiltration target on a platform whose whole trust story is that apps cannot read each
other's data — and a trace sitting in a filesystem has left the broker's protection.

## 7. What breaks determinism, and what to do about it

Replay is only useful if it is honest about its own limits. Known hazards:

- **Wall-clock and entropy reached directly.** Inside the sandbox the app is ordinary
  JavaScript; `Date.now()` and `Math.random()` are reachable. The sandbox must shim both to
  recorded sources, and `tp trace replay` must report divergence rather than paper over it.
- **Real concurrency.** Broker dispatch is async. Recording must capture completion order,
  not just call order, or a replay reorders two in-flight calls and diverges.
- **Watchdog and timing-dependent kills.** A watchdog kill depends on wall-clock latency the
  replay does not reproduce. Record it as an input event; do not try to re-derive it.
- **Host version skew.** A trace recorded against one `HOST_API_VERSION` replayed against
  another is not the same experiment. Stamp the trace and refuse quietly-wrong replays.
- **Device preview surfaces.** `camera-preview`, `audio-meter`, `waveform`, `map-preview`,
  and `remote-video` are drawn by the host from live device output and are explicitly not
  readable back through the widget tree. A trace can record that a session existed and what
  the app did about it; it cannot reproduce the pixels, and should say so.

The negative control matters as much as the feature: a deliberately nondeterministic app
must fail replay loudly. `assertReplayDeterminism` already does this at the kernel layer and
should be the mechanism here too.

## 8. Conformance and evidence

Nothing in this plan is claimed until these run:

- Round-trip: every cookbook app under `cookbook/apps/` records a scripted session and
  replays to an identical widget-patch stream. The cookbook is a real corpus and its apps
  already have package/runtime coverage to piggyback on.
- Negative control: an app that reads `Date.now()` through a path the shim missed fails replay.
- Adversarial: a hostile app under `conformance/hostile-apps/` cannot detect recording,
  cannot induce recording, and cannot read another app's trace.
- Redaction: a shape-only trace of an app that sent a known secret string does not contain
  that string, checked byte-wise over the trace file.
- Cross-host: a trace recorded on the desktop host replays headlessly in CI.

## 9. Sequencing

| Phase | Deliverable                                                             | Gate                                                         |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| 2     | Recording behind the existing `audit` seam; sandbox clock/entropy shims | Negative control fails as designed                           |
| 3     | `tp trace replay` and `tp trace step` over `widget-renderer-headless`   | Cookbook corpus replays identically                          |
| 4     | Payload recording, redaction, and sealed traces                         | Security review of §6 signed off                             |
| 5     | `tp trace shrink` and `tp trace test`                                   | A found bug becomes a checked-in regression                  |
| 6     | Desktop **Record session** chrome and the recording indicator           | Chrome rules per [SPEC-CHROME](../specs/spec-chrome/spec.md) |

Phases 2–3 are useful on their own: shape-only traces with no payload recording already
solve mishandled denials, render loops, and quota branches, and they carry none of §6's
risk. Phase 4 is where the review gate belongs.

The phases are tracked as `TRACE-1-FORMAT`, `TRACE-2-RECORD`, `TRACE-3-REPLAY`,
`TRACE-4-SEALED`, `TRACE-5-SHRINK`, and `TRACE-6-CHROME` in the
[software backlog](../STATUS-SOFTWARE.md). Shrinking waits for both replay and the sealed
payload format; host chrome waits for the privacy boundary rather than exposing an unsafe
recording mode early.

## 10. Open questions

1. **Should replay run the real sandbox or a lighter harness?** The real sandbox is the
   honest answer and matches the `sim-campaign` precedent of testing shipping code. A
   lighter harness would replay faster and step more smoothly.
2. **Does a sealed trace need publisher-key infrastructure that does not exist?** Key
   rotation and revocation are already open, and a trace encrypted to a key the author later
   loses is a trace nobody can read.
3. **How large is a real trace?** A trace containing every broker payload from a chat
   session may be far larger than the app. Bounds and a ring-buffer mode need measuring, not
   guessing, before §3's CLI is designed.
4. **Does this belong in DevStudio as well as the CLI?** DevStudio has a `code-editor`
   widget and a preview slot but no stepping UI, and the widget vocabulary would need a
   timeline surface it does not have.

## 11. What this deliberately does not do

- It is not breakpoints in live code. Replay is post-hoc; the app under replay is not
  paused, it is re-run.
- It is not remote debugging. Nothing attaches across the network; a trace is a file that
  moves, and only when a user moves it.
- It is not performance profiling. Wall-clock timings are not preserved by a virtual clock,
  and `npm run test:miniapp-benchmark` remains the tool for that.
- It does not weaken sandbox isolation. Recording happens on the host side of the broker,
  where the host already sees every call.
