# Guida as a supported mini-app UI language — plan

<!-- tp-doc
lifecycle: historical
audited: 2026-08-20
register: none
-->

> **Status of this plan (archived 2026-08-20):** Fully executed, including P5.3 DevStudio multi-file editing, `apps.format`, and `apps.diagnostics`. Current behaviour is in [docs/guida-ui.md](../../docs/guida-ui.md). The sections below are retained as the original design rationale.

**This document describes intended remaining work, not current behaviour.** The compile
target, vendored package, generated bindings, shim, CLI, cookbook/example twins, SPEC-SDK
vector replay, hello size/latency budgets, DevStudio `apps.compile` path, P5.0
compiler-speed measurements, and packing the compiler into shipping worklets
ship today — see [guida-ui.md](../../docs/guida-ui.md). P5.3 DevStudio multi-file
editor polish (format, diagnostics, add-file) also shipped.
Where the live document disagrees with this plan, it wins. The JavaScript authoring path in
[the mini-app runtime](../../docs/miniapp-runtime.md), [the SDK](../../docs/miniapp-sdk.md), and
[the App Authoring Guide](../../authors/README.md) is unchanged;
[SPEC-WIDGET](../../specs/spec-widget/spec.md) and [SPEC-SDK](../../specs/spec-sdk/spec.md) are
the normative contracts.

**Goal.** [Guida](https://guida-lang.org/) is a first-class mini-app authoring language:
an author writes model, update, and view in Guida, runs `tp app build`, and gets a `.tpkg`
the host cannot distinguish from a JavaScript one. Every documented sample exists in both
languages and the reader chooses which to read. Guida reaches the whole SDK, not just the
UI.

Guida is a self-hosted continuation of Elm: the Elm 0.19.1 compiler translated from
Haskell into Elm and shipped as JavaScript. Version 0.x replicates Elm 0.19.1 exactly —
features, behaviours, bugs and quirks — and 1.x is where the language evolves. Source
files are `.elm`, the project file is `elm.json`, and the package ecosystem is Elm's.
Everything below that describes the language — The Elm Architecture, `Platform.worker`,
ports, no effect managers outside kernel packages — is inherited unchanged. What differs
from Elm is the _compiler_, and that difference is what makes this plan cheaper than its
Elm predecessor.

## Why this fits

- [SPEC-WIDGET](../../specs/spec-widget/spec.md) is already **language-neutral by
  requirement** — a JSON Schema with a headless renderer as its conformance oracle.
- [SPEC-SDK](../../specs/spec-sdk/spec.md) already names **"future non-JS SDK bindings
  generated from the call schema"** as its implementation direction, and already ships
  [`vectors/calls.json`](../../specs/spec-sdk/vectors/calls.json) — 32 vectors / 50 steps of
  `(grants, call, args) → (result | error)` — as the oracle such a binding must satisfy.
  This plan is that work, with Guida as its first consumer.
- The UI contract is already The Elm Architecture with the names filed off: the app holds
  state, emits a whole immutable tree through `ui.render`, and receives named events
  through `ui.onEvent`. Every sample hand-rolls a `render()` + mutable-module-state
  version of TEA.
- The sandbox executes a bundle with no DOM and no host globals — exactly the
  `Platform.worker` shape, and `guida make` cannot emit anything else without ports.
- A Guida app's entire host surface is its `port` declarations, of which this design has
  two. That is worth real money to [app approval risk](../../docs/app-approval-risk.md) and the
  [hostile-author](../../docs/hostile-author-plan.md) work.
- **The compiler is a JavaScript program with a documented API.** `guida` installs from
  npm with no platform binary, and exposes `make` / `format` / `diagnostics` over an
  injectable filesystem. One artifact serves the CLI build, CI, and on-device authoring in
  [DevStudio](../../docs/devstudio.md) — including iOS, where WebAssembly is unavailable. The Elm
  version of this plan needed a Haskell-to-WASM compiler port for that, as a separate
  track that could not reach iOS at all.

## Settled decisions

| #   | Decision                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **First-class from the start.** Every documented sample gains a Guida variant and the docs let the reader view either.                 |
| D2  | **Full SDK bindings up front**, generated from a machine-readable call descriptor.                                                     |
| D3  | If Guida bundles exceed the RNode budget, **document the limit and ship**.                                                             |
| D4  | **Guida is the compiler**, pinned to an exact version (`1.0.0-beta.2` at time of writing). The official Elm compiler is not toolchain. |
| D5  | **On-device authoring embeds the same compiler** through its JavaScript API, as an ordinary phase rather than a separate track.        |

## Architecture

Guida is a **compile target for the existing bundle format**. Nothing in the host, broker,
sandbox, or package format changes.

```
Main.elm ──guida make --optimize──> guida-out.js ──scope wrapper + minify + shim──> bundle.js ──tp pack──> .tpkg
                                                                       │
                                     unchanged host: sandbox → broker → widget renderer
```

**1. A Guida package (vendored, `packages/guida-twistedpear/`).**

- `TwistedPear.Widget` / `TwistedPear.Style` — builders for the closed vocabulary,
  **generated** from
  [`specs/spec-widget/schema/widget.schema.json`](../../specs/spec-widget/schema/widget.schema.json)
  by a new `npm run generate:guida-widget`, so the Guida types cannot drift from the schema
  the broker validates against. Same discipline as `device-capabilities.gen.ts`.
- `TwistedPear.Program` — `Program.app { init, update, view, subscriptions }` wrapping
  `Platform.worker` over exactly two ports (`tpOut : Value -> Cmd msg`,
  `tpIn : (Value -> msg) -> Sub msg`).
- `TwistedPear.Sdk.*` — generated bindings for every namespace (see Phase 2).

Vendored through `source-directories` rather than published to a package registry:
publishing requires a GitHub release per version and puts a network dependency in a
local-first toolchain, and Guida's registry is younger than Elm's. Revisit once the
surface is stable.

```elm
view : Model -> Widget Msg
view model =
    W.view "root" [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Hello"
        , W.button "tap" [] { label = "Tap me", onPress = Tapped, event = "tap" }
        , W.text "count" [] ("Taps: " ++ String.fromInt model.taps)
        ]
```

Node ids stay explicit first arguments because SPEC-WIDGET requires them unique and
stable per tree and the diff stream keys on them. Event names derive from the node id, so
an app written twice emits the same frames.

**2. A generated JS shim (~2–4 KB)**, appended by the build step. It instantiates the
compiled Guida program, pumps `tpOut` into `sdk.ui.render` and broker calls, and pumps
`sdk.ui.onEvent` and broker replies back through `tpIn` with request-id correlation. It
is the only JavaScript in a Guida app, it is generated rather than authored, and because it
calls `sdk.*` by literal name the capability-usage scan in
[`conformance/cookbook/cookbook.test.mjs`](../../conformance/cookbook/cookbook.test.mjs)
keeps working unchanged.

**3. `tp app build`.** `guida make --optimize` → scope wrapper → Elm-aware minification →
concatenate shim → `bundle.js`. `tp pack` gains a build hook so packing a Guida project
just works.

### A verified compatibility fix the build step must apply

Guida emits Elm 0.19.1's output shape byte-for-byte in structure, including the trailing
`_Platform_export` that writes to the scope it captured as `this` from
`(function(scope){ … }(this));`. The sandbox backends disagree about what `this` is:

| Backend                                                                                                                                 | Bundle evaluated as                           | Guida output |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------ |
| [Bare worker](../../packages/miniapp-runtime/src/sandbox/worker.ts), [Node worker](../../packages/miniapp-runtime/src/sandbox/node-worker.ts) | `new AsyncFunction('sdk', src)(sdk)` — sloppy | works        |
| [Web host](../../packages/miniapp-runtime/src/sandbox/browser-worker-bootstrap.ts)                                                         | ES module via `import(blobUrl)`               | **throws**   |

Verified locally against `guida@1.0.0-beta.2` output: it succeeds on the first path and
fails on the second with `Cannot read properties of undefined (reading 'Elm')`. The build
step therefore replaces the trailing `}(this));` with an explicit scope object:

```js
const __scope = {};
(function (scope) {
  /* guida output */
}).call(__scope, __scope);
const Elm = __scope.Elm;
```

Verified to work on both paths, before and after minification, and the wrapped bundle runs
end to end: `Elm.Main.init({})` emits its first `tpOut` frame and a `tpIn` send produces
the next one. Build-step only — **no host change** — but a conformance case must pin it,
because it is silent until someone runs a Guida app on the web host.

## Phasing

### Phase 0 — measure

A local spike has already answered the sizing question the Elm version of this plan could
only estimate. Measured on macOS with Node 22, in a scratch project outside this
repository: a `Platform.worker` hello app with the two ports above, emitting a hand-built
widget frame.

| Measurement                                           | Value                                                     |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Compiler install (`npm i guida@1.0.0-beta.2`)         | 39 packages, 0.6 s, no platform binary, no install script |
| Cold compile, including `elm/core` + `elm/json` fetch | ~5.1 s                                                    |
| Warm compile                                          | ~0.4 s                                                    |
| `guida make --optimize`                               | 62,936 B raw / 15,189 B gzip                              |
| Plus scope wrapper and terser with Elm `pure_funcs`   | 8,086 B raw / 3,253 B gzip                                |
| In-project build cache `guida-stuff/`                 | 784 KB                                                    |
| Shared package cache `~/.guida`                       | 1.4 MB                                                    |

**This changes the headline risk.** The shipped samples are 780 B – 2.6 KiB packaged;
`bridge-hyper` warns above 32 KiB and blocks automatic bulk fetch above 64 KiB on
RNode-only links ([LIMITATIONS.md](../../LIMITATIONS.md) §6). A minified hello world plus the
shim lands near 10 KB of bundle — several times a JavaScript sample, but comfortably
inside both RNode thresholds, where the Elm plan's "low tens of KB" estimate was not. Dead
code elimination is doing the work; an app that pulls in `Dict`, `Set`, or larger chunks of
`elm/core` will grow, which is exactly what Phase 0 must still measure.

What remains for Phase 0, in-repo: run the hello app against `NodeWorkerSandboxBackend`
through the real host and record `.tpkg` size, spawn latency, first-render latency, and
steady-state render latency beside the JavaScript twin, using
[`conformance/budgets`](../../conformance/budgets/) and `npm run test:miniapp-benchmark`.
Per D3 size does not gate the work, but it must be **measured, published per sample, and
written into [LIMITATIONS.md](../../LIMITATIONS.md) §6 and the authoring docs** before Guida
is presented as a peer of JavaScript. Measure `elm-optimize-level-2` while here, and
whether compressing bundle bytes inside the `.tpkg` is worth a format revision — the
archive is currently uncompressed concatenation, so the gzip column above is not what
ships.

### Phase 1 — widget bindings and program wrapper

Generated `TwistedPear.Widget` / `Style`, `TwistedPear.Program`, the shim, the scope
wrapper. No SDK access beyond `ui.render` / `ui.onEvent`.

**Exit criterion — the parity test the whole plan rests on:** one app implemented twice,
recorded through [`scripts/record-widget-streams.mjs`](../../scripts/record-widget-streams.mjs)
against the same scripted event sequence, must produce **canonically identical widget
frames and diff streams**. Canonical, not byte-identical: JSON key order is not part of
the contract. This reuses the existing widget-parity oracle rather than inventing one, and
in Phase 4 it scales to every sample — which is what makes maintaining two dozen ported
apps tractable rather than a permanent drift tax.

### Phase 2 — full SDK bindings

**Prerequisite, and valuable on its own: a machine-readable SDK call descriptor.** No
such artifact exists today — the canonical list of namespaces, methods, argument shapes,
and required capabilities is spread across the injected `sdk` object literal in
[`sandbox/worker.ts`](../../packages/miniapp-runtime/src/sandbox/worker.ts), the registered
broker services, [`packages/miniapp-sdk`](../../packages/miniapp-sdk/), and the
`API_CAPABILITIES` map in the cookbook test. Deriving one descriptor and generating those
consumers from it is [SPEC-SDK](../../specs/spec-sdk/spec.md)'s own stated next step; do it
here, and generate the Guida bindings from it.

Ports carry `{ id, namespace, method, payload }`; replies carry
`{ id, ok, result | error }`. Typed wrappers return `Cmd Msg` with a continuation
message. **There is no `Task`**, because Elm 0.19 does not let a non-kernel package define
effect managers and Guida replicates that restriction faithfully — this is the single
largest ergonomic difference from the JavaScript SDK and it shapes every app. Document it
plainly rather than papering over it. Guida 1.x is where such a restriction could
eventually be lifted, but nothing in this plan assumes it will be.

**Exit criterion:** a Guida harness app replays
[`specs/spec-sdk/vectors/calls.json`](../../specs/spec-sdk/vectors/calls.json) and produces
results identical to the reference binding after the vectors' existing normalization —
all 13 taxonomy codes, every namespace, and the quota-exhaustion cases. Broker denials
decode to typed errors, and an app survives a partial capability grant as
[chapter 5](../../authors/05-capabilities.md) requires.

### Phase 3 — toolchain and packaging

- `tp guida init` template; `tp app build`; build hook in `tp pack`.
- **`collectAppFiles` needs an ignore mechanism.** It walks the whole app directory today,
  so a Guida project would package `guida-stuff/` (784 KB measured), `src/*.elm`, and
  `elm.json`. Add `.tpignore` or an explicit manifest `include`.
- Pin the compiler. `guida` is an ordinary npm dependency: pure JavaScript, no `install`
  or `postinstall` hook, no downloaded platform binary — so unlike the Elm compiler it does
  **not** collide with [`install-scripts-allowlist.json`](../../install-scripts-allowlist.json)
  and needs no exemption there. Pin the exact version, add a `tool-versions.json` entry,
  and keep the `tools:doctor` recipe pattern so a missing compiler **skips** the Guida
  gates locally rather than failing them.
- **Offline builds.** `guida make` resolves dependencies over HTTP into `~/.guida` on
  first use. A local-first toolchain should not require the network to build: seed the
  cache in CI, and document how an author warms it before going off-grid.
- **Reproducible build descriptor.** Optional manifest `build` field naming the compiler,
  its version, and the 256t id of the source tree, so a third party can rebuild the bundle
  and compare hashes. This converts "trust this minified blob" into "verify it came from
  this source" and is the strongest single argument for Guida in an
  [approval-risk](../../docs/app-approval-risk.md) frame. Output is expected to be deterministic for
  a fixed compiler and dependency set; **CI must prove that** by rebuilding and diffing.

### Phase 4 — every documented sample in both languages

The 25 [cookbook](../../cookbook/README.md) apps and the three
[reference examples](../../apps/examples/README.md) each gain a Guida variant. Handbook and
DevStudio are platform apps rather than samples and stay out of scope.

- **Layout.** Each sample directory holds both sources; the JS bundle remains the
  packaged, published artifact. The Guida variant is a _validated source variant_, not a
  second published app — two packages sharing an app name and publisher key would collide
  on app identity ([package format](../../docs/package-format.md) §1), and nothing about the sample's
  distribution should change because a second implementation exists.
- **Docs.** Every sample page presents both listings. Recommend headed `### JavaScript` /
  `### Guida` subsections, which render correctly in-repo on GitHub, upgraded to tabs by a
  small VitePress transform for the published site. VitePress `::: code-group` is the
  alternative and degrades to literal `:::` text on GitHub.
- **Enforcement.** The Phase 1 parity test runs across all 28 pairs: each Guida variant
  must emit canonically identical widget streams to its JavaScript twin under the same
  scripted events. Divergence is a CI failure, so the ported set cannot silently rot.
- Per-sample size deltas land in the cookbook app-index table, so the cost of choosing
  Guida is visible per app rather than only for hello world.
- An authoring-guide chapter on building the UI in Guida, alongside — not replacing —
  [chapter 4](../../authors/04-building-the-ui.md).

### Phase 5 — on-device compiling in DevStudio

[DevStudio](../../docs/devstudio.md) today builds only single-file JavaScript projects because it has
no bundler and no compiler. Guida is the compiler, and it is a JavaScript module the host
can embed.

**The API this rests on.** `guida`'s library entry point exports `make`, `format`,
`install`, `uninstall`, and `diagnostics`. Every one of them takes a config object
supplying the environment: `XMLHttpRequest`, `readFile`, `writeFile`, `readDirectory`,
`createDirectory`, `details`, `getCurrentDirectory`, `homedir`, `env`. There is no hard
dependency on `node:fs`, so **DevStudio's in-memory workspace can back the compiler
directly** — no real filesystem, no shelling out, no temp directory. `diagnostics` returns
structured errors — path, name, and problems carrying `region.start`/`region.end`
line/column plus styled message segments — so the editor gets squiggles without parsing
compiler prose.

**Where it runs.** It is JavaScript, so it runs wherever the host runs JavaScript. The
constraint that shaped the Elm version of this plan was WebAssembly availability:
[`conformance/ios-sim/measured-wasm-worker.json`](../../conformance/ios-sim/measured-wasm-worker.json)
records the shipping iOS BareKit as V8 jitless with WebAssembly disabled, so `instantiate`
does not exist on the worklet isolate, while
[`conformance/android-emulator/measured-worker.json`](../../conformance/android-emulator/measured-worker.json)
records `wasmExecuted: true`. That constraint no longer applies, and **iOS is in scope**.

**What is unmeasured is speed, not availability.** The compiler is ~810 KB minified
(~205 KB gzipped) and self-hosted; under a jitless or interpreted engine its parse and run
cost is unknown. Sequencing:

- **P5.0 — measure on device.** Cold parse time, hello-world compile time, and peak memory
  for the compiler module on desktop, web, the Android worklet, the iOS worklet, and the
  iOS React Native side. Both iOS numbers are needed separately because
  [`conformance/ios-sim/README.md`](../../conformance/ios-sim/README.md) explicitly warns that
  Hermes results are not BareKit evidence. Exit criterion: numbers, plus a per-platform
  verdict on whether interactive compiling is usable. A platform that fails the bar falls
  back to **delegating the build to a paired peer** over LXMF, which needs no new transport
  and is the most local-first option available. **Executed 2026-08-20**
  (`npm run test:guida-compiler`): Node ~2 s, Chromium ~4 s, and Bare ~1.3 s
  are usable; the compiler is packed into shipping desktop/mobile worklets.
- **P5.1 — host embedding.** A `HostGuidaCompiler` interface with a JS-module
  implementation and a native-CLI implementation, so desktop can prefer a locally installed
  `guida` when present. The compiler runs in **host chrome, not in a sandbox**: it is host
  tooling being offered to a mini-app, so it goes behind the existing
  [host confirmation channel](../../docs/miniapp-runtime.md) like `apps:package`, with its own
  capability rather than widening `workspace`.
- **P5.2 — the compiler image is a host asset.** **Executed 2026-08-20.** Packed
  into the desktop and mobile worklets with seeded `elm/core` and `elm/json`;
  never a mini-app payload and never distributed over Reticulum. See
  [guida-ui.md](../../docs/guida-ui.md).
- **P5.3 — DevStudio Guida projects.** Multi-file projects (DevStudio is single-file
  today), `elm` added to the `code-editor` language allowlist — a
  [SPEC-WIDGET](../../specs/spec-widget/spec.md) schema change and a `HOST_API_VERSION` bump —
  compile errors surfaced from `diagnostics`, `format` wired to the editor, and preview
  through the existing slot.

### Phase 6 — promotion

Register rows via `npm run work:add`, `appendix-feature-status` entries for anything
partial, LIMITATIONS §6 size language, and the FAQ / authoring-guide entry points updated
to present two authoring languages rather than one. Filed: `GUIDA-SAMPLES`,
`GUIDA-VECTORS`, `GUIDA-MEASURE`, `GUIDA-DEVSTUDIO`.

## Repository integration checklist

This repository gates hard and a generated `bundle.js` trips several. Each needs a
decision, not a suppression: `eslint.config.js` and `.prettierignore` ignores,
`size-rules.json` exempt patterns (the existing `**/*.bundle.js` exemption does not match
a plain `bundle.js` in an app directory), `.jscpd.json`, `knip.json`, `cspell.json` /
`project-words.txt`, `license-allowlist.json` (`guida` and `elm/core` are BSD-3-Clause),
`tool-versions.json`, and a CI job that installs the pinned compiler and rebuilds every
Guida sample. `install-scripts-allowlist.json` needs no entry — verify that in CI rather
than assuming it. `npm run test:doc-audit` covers the new docs; work rows go in via
`npm run work:add`, never by hand.

## Risks

| Risk                                                                                                             | Response                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guida is pre-1.0 and young** — a beta compiler with a small maintainer base under the whole authoring path     | The source is Elm 0.19.1-compatible by Guida's own core principle, so a stalled compiler is recoverable by rebuilding the same tree elsewhere. Keep the widget layer generated and the shim thin. |
| **Guida 1.x intends to diverge from Elm** — the compatibility escape hatch above weakens as the language evolves | Pin exactly (D4); treat upgrades as deliberate work gated by the Phase 1 parity suite and the Phase 2 vector replay, not as dependency bumps.                                                     |
| **Bundle size versus off-grid distribution** — the platform's distinguishing constraint                          | Measured hello world at ~27 KiB (JS twin ~1.3 KiB), past the 9 KiB one-minute RNode ceiling and just under the 32 KiB warning. D3 still stands: publish the numbers, document the limit. |
| **28 ported samples are 28 things that can rot**                                                                 | The Phase 1 parity test runs over every pair in CI; drift fails the build rather than aging quietly.                                                                                              |
| Ports-only effects make the SDK less pleasant than the JavaScript one                                            | Generate the whole surface so the awkwardness is uniform and documented, not per-call surprise.                                                                                                   |
| An 810 KB self-hosted compiler may be too slow to be interactive on phones                                       | P5.0 is a measure-first gate per platform, with peer-delegated builds as the documented fallback.                                                                                                 |
| Build-time and first-run dependency resolution reach the network, in a local-first platform                      | Seed caches in CI and in the host asset; document warming the cache before going off-grid.                                                                                                        |
| Compiled output is hard to review or debug                                                                       | Phase 3's reproducible build descriptor; source maps in dev builds only.                                                                                                                          |

## Alternatives considered

- **The official Elm compiler.** Rejected: it installs through an npm package whose
  postinstall downloads a platform binary, colliding with
  [`install-scripts-allowlist.json`](../../install-scripts-allowlist.json), and it has no
  on-device story short of a Haskell-to-WASM port — which iOS could not run at all. Guida
  compiles the same sources with neither problem. Elm remains the upstream this language
  is compatible with, which is the recovery path in the risk table.
- **Gren.** A maintained Elm fork with a task-based effect story, which would answer the
  `Task` gap in Phase 2. Rejected for now: it deliberately breaks Elm compatibility, and it
  offers no in-process compiler API, so it would reintroduce the separate on-device track
  that choosing Guida deletes.
- **Host-side rendering.** Rejected: the host would run app code, inverting the sandbox
  model.
- **A bespoke Elm-like DSL compiled by the platform.** Rejected: all of the cost of a
  language, none of the ecosystem or guarantees.
- **Source interpreted on device.** Rejected: unnecessary. Phase 5 embeds the real
  compiler.
