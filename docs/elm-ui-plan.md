# Elm as a supported mini-app UI language — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-19
register: software
-->

**This document describes intended work, not current behaviour.** Nothing here is built.
What ships today is the JavaScript authoring path described in
[the mini-app runtime](miniapp-runtime.md), [the SDK](miniapp-sdk.md), and
[the App Authoring Guide](../authors/README.md);
[SPEC-WIDGET](../specs/spec-widget/spec.md) and [SPEC-SDK](../specs/spec-sdk/spec.md) are
the normative contracts. Where any of those disagree with this plan, they win.

**Goal.** Elm is a first-class mini-app authoring language: an author writes model,
update, and view in Elm, runs `tp app build`, and gets a `.tpkg` the host cannot
distinguish from a JavaScript one. Every documented sample exists in both languages and
the reader chooses which to read. Elm reaches the whole SDK, not just the UI.

## Why this fits

- [SPEC-WIDGET](../specs/spec-widget/spec.md) is already **language-neutral by
  requirement** — a JSON Schema with a headless renderer as its conformance oracle.
- [SPEC-SDK](../specs/spec-sdk/spec.md) already names **"future non-JS SDK bindings
  generated from the call schema"** as its implementation direction, and already ships
  [`vectors/calls.json`](../specs/spec-sdk/vectors/calls.json) — 32 vectors / 50 steps of
  `(grants, call, args) → (result | error)` — as the oracle such a binding must satisfy.
  This plan is that work, with Elm as its first consumer.
- The UI contract is already The Elm Architecture with the names filed off: the app holds
  state, emits a whole immutable tree through `ui.render`, and receives named events
  through `ui.onEvent`. Every sample hand-rolls a `render()` + mutable-module-state
  version of TEA.
- The sandbox executes a bundle with no DOM and no host globals — exactly the
  `Platform.worker` shape, and `elm make` cannot emit anything else without ports.
- An Elm app's entire host surface is its `port` declarations, of which this design has
  two. That is worth real money to [app approval risk](app-approval-risk.md) and the
  [hostile-author](hostile-author-plan.md) work.

## Settled decisions

| #   | Decision                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| D1  | **First-class from the start.** Every documented sample gains an Elm variant and the docs let the reader view either. |
| D2  | **Full SDK bindings up front**, generated from a machine-readable call descriptor.                                    |
| D3  | If Elm bundles exceed the RNode budget, **document the limit and ship**.                                              |
| D4  | On-device authoring is pursued by **porting the Elm compiler to WASM** (Track W below).                               |

## Architecture

Elm is a **compile target for the existing bundle format**. Nothing in the host, broker,
sandbox, or package format changes.

```
Main.elm ──elm make --optimize──> elm.js ──scope wrapper + shim──> bundle.js ──tp pack──> .tpkg
                                                                       │
                                     unchanged host: sandbox → broker → widget renderer
```

**1. An Elm package (vendored, `packages/elm-twistedpear/`).**

- `TwistedPear.Widget` / `TwistedPear.Style` — builders for the closed vocabulary,
  **generated** from
  [`specs/spec-widget/schema/widget.schema.json`](../specs/spec-widget/schema/widget.schema.json)
  by a new `npm run generate:elm-widget`, so the Elm types cannot drift from the schema
  the broker validates against. Same discipline as `device-capabilities.gen.ts`.
- `TwistedPear.Program` — `Program.app { init, update, view, subscriptions }` wrapping
  `Platform.worker` over exactly two ports (`tpOut : Value -> Cmd msg`,
  `tpIn : (Value -> msg) -> Sub msg`).
- `TwistedPear.Sdk.*` — generated bindings for every namespace (see Phase 2).

Vendored through `source-directories` rather than published to `package.elm-lang.org`:
publishing requires a GitHub release per version and puts a network dependency in a
local-first toolchain. Revisit once the surface is stable.

```elm
view : Model -> Widget Msg
view model =
    W.view "root" [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Hello"
        , W.button "tap" [] { label = "Tap me", onPress = Tapped }
        , W.text "count" [] ("Taps: " ++ String.fromInt model.taps)
        ]
```

Node ids stay explicit first arguments because SPEC-WIDGET requires them unique and
stable per tree and the diff stream keys on them. Event names derive from the node id, so
an app written twice emits the same frames.

**2. A generated JS shim (~2–4 KB)**, appended by the build step. It instantiates the
compiled Elm program, pumps `tpOut` into `sdk.ui.render` and broker calls, and pumps
`sdk.ui.onEvent` and broker replies back through `tpIn` with request-id correlation. It
is the only JavaScript in an Elm app, it is generated rather than authored, and because it
calls `sdk.*` by literal name the capability-usage scan in
[`conformance/cookbook/cookbook.test.mjs`](../conformance/cookbook/cookbook.test.mjs)
keeps working unchanged.

**3. `tp app build`.** `elm make --optimize` → Elm-aware minification → scope wrapper →
concatenate shim → `bundle.js`. `tp pack` gains a build hook so packing an Elm project
just works.

### A verified compatibility fix the build step must apply

Elm 0.19 output ends with `_Platform_export` writing to the scope it captured as `this`
from `(function(scope){ … }(this))`. The sandbox backends disagree about what `this` is:

| Backend                                                                                                                                 | Bundle evaluated as                           | Elm output |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| [Bare worker](../packages/miniapp-runtime/src/sandbox/worker.ts), [Node worker](../packages/miniapp-runtime/src/sandbox/node-worker.ts) | `new AsyncFunction('sdk', src)(sdk)` — sloppy | works      |
| [Web host](../packages/miniapp-runtime/src/sandbox/browser-worker-bootstrap.ts)                                                         | ES module via `import(blobUrl)`               | **throws** |

Verified locally: Elm-shaped output succeeds on the first path and fails on the second
with `Cannot set properties of undefined (setting 'Elm')`. The build step therefore
replaces the trailing `}(this));` with an explicit scope object:

```js
const __elmScope = {};
(function (scope) {
  /* elm output */
}).call(__elmScope, __elmScope);
const Elm = __elmScope.Elm;
```

Verified to work on both paths. Build-step only — **no host change** — but a conformance
case must pin it, because it is silent until someone runs an Elm app on the web host.

## Phasing

Phases 0–5 are the authoring language. Track W is the on-device compiler and runs
independently; **nothing in Phases 0–5 waits on it.**

### Phase 0 — measure

Hand-build one Elm hello app, run it against `NodeWorkerSandboxBackend` through the real
host, and record bundle size raw and gzipped, `.tpkg` size, spawn latency, first-render
latency, and steady-state render latency beside the JavaScript twin, using
[`conformance/budgets`](../conformance/budgets/) and `npm run test:miniapp-benchmark`.

The shipped samples are 780 B – 2.6 KiB packaged; `bridge-hyper` warns above 32 KiB and
blocks automatic bulk fetch above 64 KiB on RNode-only links
([LIMITATIONS.md](../LIMITATIONS.md) §6). An Elm hello world with `--optimize` plus
Elm-aware minification is expected in the low tens of KB. Per D3 this does not gate the
work, but it must be **measured, published per sample, and written into
[LIMITATIONS.md](../LIMITATIONS.md) §6 and the authoring docs** before Elm is presented as
a peer of JavaScript. Measure the mitigations while here: `--optimize` plus terser with
Elm's documented `pure_funcs`, `elm-optimize-level-2`, and whether compressing bundle
bytes inside the `.tpkg` is worth a format revision (the archive is currently
uncompressed concatenation).

Also evaluate **Gren** — a maintained Elm fork with a task-based effect story — before
committing, since Elm 0.19.1 dates from 2019.

### Phase 1 — widget bindings and program wrapper

Generated `TwistedPear.Widget` / `Style`, `TwistedPear.Program`, the shim, the scope
wrapper. No SDK access beyond `ui.render` / `ui.onEvent`.

**Exit criterion — the parity test the whole plan rests on:** one app implemented twice,
recorded through [`scripts/record-widget-streams.mjs`](../scripts/record-widget-streams.mjs)
against the same scripted event sequence, must produce **canonically identical widget
frames and diff streams**. Canonical, not byte-identical: JSON key order is not part of
the contract. This reuses the existing widget-parity oracle rather than inventing one, and
in Phase 4 it scales to every sample — which is what makes maintaining two dozen ported
apps tractable rather than a permanent drift tax.

### Phase 2 — full SDK bindings

**Prerequisite, and valuable on its own: a machine-readable SDK call descriptor.** No
such artifact exists today — the canonical list of namespaces, methods, argument shapes,
and required capabilities is spread across the injected `sdk` object literal in
[`sandbox/worker.ts`](../packages/miniapp-runtime/src/sandbox/worker.ts), the registered
broker services, [`packages/miniapp-sdk`](../packages/miniapp-sdk/), and the
`API_CAPABILITIES` map in the cookbook test. Deriving one descriptor and generating those
consumers from it is [SPEC-SDK](../specs/spec-sdk/spec.md)'s own stated next step; do it
here, and generate the Elm bindings from it.

Ports carry `{ id, namespace, method, payload }`; replies carry
`{ id, ok, result | error }`. Typed Elm wrappers return `Cmd Msg` with a continuation
message. **There is no `Task`**, because Elm 0.19 does not let a non-kernel package define
effect managers — this is the single largest ergonomic difference from the JavaScript SDK
and it shapes every app. Document it plainly rather than papering over it.

**Exit criterion:** an Elm harness app replays
[`specs/spec-sdk/vectors/calls.json`](../specs/spec-sdk/vectors/calls.json) and produces
results identical to the reference binding after the vectors' existing normalization —
all 13 taxonomy codes, every namespace, and the quota-exhaustion cases. Broker denials
decode to typed Elm errors, and an app survives a partial capability grant as
[chapter 5](../authors/05-capabilities.md) requires.

### Phase 3 — toolchain and packaging

- `tp elm init` template; `tp app build`; build hook in `tp pack`.
- **`collectAppFiles` needs an ignore mechanism.** It walks the whole app directory today,
  so an Elm project would package `elm-stuff/` (megabytes) and `src/*.elm`. Add
  `.tpignore` or an explicit manifest `include`.
- Pin the Elm version. `elm` installs via an npm package whose postinstall downloads a
  platform binary, which collides with
  [`install-scripts-allowlist.json`](../install-scripts-allowlist.json); add a
  `tool-versions.json` entry and a `tools:doctor` recipe so a missing compiler **skips**
  the Elm gates locally rather than failing them, matching every other external tool.
- **Reproducible build descriptor.** Optional manifest `build` field naming the compiler,
  its version, and the 256t id of the source tree, so a third party can rebuild the bundle
  and compare hashes. This converts "trust this minified blob" into "verify it came from
  this Elm source" and is the strongest single argument for Elm in an
  [approval-risk](app-approval-risk.md) frame. Elm output is deterministic for a fixed
  compiler and dependency set; **CI must prove that** by rebuilding and diffing.

### Phase 4 — every documented sample in both languages

The 25 [cookbook](../cookbook/README.md) apps and the three
[reference examples](../apps/examples/README.md) each gain an Elm variant. Handbook and
DevStudio are platform apps rather than samples and stay out of scope.

- **Layout.** Each sample directory holds both sources; the JS bundle remains the
  packaged, published artifact. The Elm variant is a _validated source variant_, not a
  second published app — two packages sharing an app name and publisher key would collide
  on app identity ([package format](package-format.md) §1), and nothing about the sample's
  distribution should change because a second implementation exists.
- **Docs.** Every sample page presents both listings. Recommend headed `### JavaScript` /
  `### Elm` subsections, which render correctly in-repo on GitHub, upgraded to tabs by a
  small VitePress transform for the published site. VitePress `::: code-group` is the
  alternative and degrades to literal `:::` text on GitHub.
- **Enforcement.** The Phase 1 parity test runs across all 28 pairs: each Elm variant must
  emit canonically identical widget streams to its JavaScript twin under the same scripted
  events. Divergence is a CI failure, so the ported set cannot silently rot.
- Per-sample size deltas land in the cookbook app-index table, so the cost of choosing Elm
  is visible per app rather than only for hello world.
- An authoring-guide chapter on building the UI in Elm, alongside — not replacing —
  [chapter 4](../authors/04-building-the-ui.md).

### Phase 5 — promotion

Register rows via `npm run work:add`, `appendix-feature-status` entries for anything
partial, LIMITATIONS §6 size language, and the FAQ / authoring-guide entry points updated
to present two authoring languages rather than one.

## Track W — porting the Elm compiler to WASM

Purpose: on-device Elm authoring in [DevStudio](devstudio.md), which today builds only
single-file JavaScript projects because it has no bundler and no compiler.

The Elm compiler is a Haskell program. GHC's `wasm32-wasi` backend is the port route;
the output is a **host-side asset shipped with the host binary, never a mini-app payload
and never distributed over Reticulum** — a compiler image is orders of magnitude past
every distribution budget in [LIMITATIONS.md](../LIMITATIONS.md) §6.

**Where WASM actually runs, measured:**

| Host               | WASM available                 | Evidence                                                                                                    |
| ------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Desktop (Electron) | Yes                            | V8 with JIT                                                                                                 |
| Web host (browser) | Yes                            | —                                                                                                           |
| Android worklet    | **Yes** — `wasmExecuted: true` | [`conformance/android-emulator/measured-worker.json`](../conformance/android-emulator/measured-worker.json) |
| **iOS worklet**    | **No** — not slow, unavailable | [`conformance/ios-sim/measured-wasm-worker.json`](../conformance/ios-sim/measured-wasm-worker.json)         |

The iOS reason is recorded verbatim: the shipping iOS BareKit is V8 jitless and reports
WebAssembly disabled, so `instantiate` does not exist on the worklet isolate. Track W
therefore delivers desktop, web, and Android and **must not claim iOS**.

**Sequencing.**

- **W0 — feasibility spike.** Build the Elm compiler for `wasm32-wasi` unmodified and
  compile hello world under Node's WASI. Record image size, cold-start time, compile time,
  and peak memory. Exit criterion: it compiles at all, with numbers. Everything else waits
  on this; a compiler that cannot be built or that needs more memory than a phone has ends
  the track here.
- **W1 — host embedding.** A `HostElmCompiler` interface with a WASM implementation and a
  native-binary implementation, so desktop can prefer the local `elm` when present. The
  compiler runs in **host chrome, not in a sandbox**: it is host tooling being offered to
  a mini-app, so it goes behind the existing
  [host confirmation channel](miniapp-runtime.md) like `apps:package`, with its own
  capability rather than widening `workspace`.
- **W2 — DevStudio Elm projects.** Multi-file projects (DevStudio is single-file today),
  `elm` added to the `code-editor` language allowlist — a
  [SPEC-WIDGET](../specs/spec-widget/spec.md) schema change and a `HOST_API_VERSION` bump
  — compile errors surfaced as Elm emits them, and preview through the existing slot.
- **W3 — iOS, or an honest gap.** Options, none free: BareKit built with an interpreted
  WASM engine (upstream work plus an App Store rules review); running the compiler on the
  React Native / Hermes side rather than the worklet — **unmeasured**, and
  [`conformance/ios-sim/README.md`](../conformance/ios-sim/README.md) explicitly warns
  that Hermes results are not BareKit evidence, so it needs its own probe; or
  **delegating the build to a paired peer** over LXMF, which needs no new transport, is
  the most local-first of the three, and is the recommended first attempt. Until one
  lands, iOS DevStudio stays JavaScript-only and says so.

## Repository integration checklist

This repository gates hard and a generated `bundle.js` trips several. Each needs a
decision, not a suppression: `eslint.config.js` and `.prettierignore` ignores,
`size-rules.json` exempt patterns (the existing `**/*.bundle.js` exemption does not match
a plain `bundle.js` in an app directory), `.jscpd.json`, `knip.json`, `cspell.json` /
`project-words.txt`, `license-allowlist.json` (Elm compiler and `elm/core` are BSD-3),
`tool-versions.json`, `install-scripts-allowlist.json`, and a CI job that installs the
pinned compiler and rebuilds every Elm sample. `npm run test:doc-audit` covers the new
docs; work rows go in via `npm run work:add`, never by hand.

## Risks

| Risk                                                                                                                     | Response                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundle size versus off-grid distribution** — the platform's distinguishing constraint is the one Elm is worst at       | D3: measure per sample, publish the numbers, document the limit. Elm apps may be an IP/LAN/BLE-class choice while the RNode path stays JavaScript. |
| **Elm 0.19.1 dates from 2019 with no active release cadence** — committing a supported language to it is a strategic bet | Keep the widget layer generated from the schema and the shim thin so the design retargets cheaply. Evaluate Gren in Phase 0.                       |
| **28 ported samples are 28 things that can rot**                                                                         | The Phase 1 parity test runs over every pair in CI; drift fails the build rather than aging quietly.                                               |
| Ports-only effects make the SDK less pleasant than the JavaScript one                                                    | Generate the whole surface so the awkwardness is uniform and documented, not per-call surprise.                                                    |
| Track W's compiler image is large and may not fit mobile memory                                                          | W0 is a measure-first spike with the authority to end the track.                                                                                   |
| Compiled output is hard to review or debug                                                                               | Phase 3's reproducible build descriptor; source maps in dev builds only.                                                                           |

## Alternatives considered

- **Host-side Elm rendering.** Rejected: the host would run app code, inverting the
  sandbox model.
- **A bespoke Elm-like DSL compiled by the platform.** Rejected: all of the cost of a
  language, none of Elm's ecosystem or guarantees.
- **Elm source interpreted on device.** Rejected: no viable implementation. Track W's
  WASM port is the on-device answer.
- **Gren instead of Elm.** Open — evaluate in Phase 0 (see risks).
