# Mini-app facilities — delivery plan

<!-- tp-doc
lifecycle: historical
audited: 2026-08-21
register: none
-->

> **Status of this plan (archived 2026-08-21):** Executed. Current behaviour lives in [docs/miniapp-runtime.md](../../docs/miniapp-runtime.md), [docs/miniapp-sdk.md](../../docs/miniapp-sdk.md), [docs/devstudio.md](../../docs/devstudio.md), and the CLI. There is no `docs/miniapp-facilities.md` counterpart.

**This document is the original delivery plan, not current behaviour.** What ships today is spread across three documents and this plan does not
restate them: the [capability × peer-type matrix](../../docs/platform-capabilities-status.md) and
[Device I/O](../../docs/device-io.md) are `live` and authoritative for status; the
[Mini-app runtime](../../docs/miniapp-runtime.md), [Mini-app SDK](../../docs/miniapp-sdk.md), and
[DevStudio](../../docs/devstudio.md) are `reference` and authoritative for shape. Where any of them
disagrees with this plan, they win.

There is deliberately no `docs/miniapp-facilities.md` counterpart. This plan spans the
runtime, the SDK, the CLI, and the widget vocabulary; the live description of each already
has a home above, and duplicating it into a fourth file would create exactly the drift the
lifecycle rule exists to prevent.

## What this plan covers, and why it stops where it does

Three questions about existing behaviour are unresolved. Each blocks real work, and none of
it appears below. Everything in this plan is independent of all three answers.

| Open question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Blocks                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1 — device raw-tier carriage.** `device.read()` on a `frames` / `pcm` / `samples` session already returns real bytes: `materializeFrame` in [layer-2-samples.ts](../../packages/miniapp-runtime/src/device-manager/layer-2-samples.ts) attaches a `DeviceSidecarDelivery`. But delivery rides **in band on the broker response**, while [device-sidecar.ts](../../packages/miniapp-runtime/src/device-sidecar.ts) reports `transport: "transferable"`. Is in-band polled carriage the shipping design, or is the out-of-band sidecar unbuilt behind that label? | Declaring the raw variants in the SDK's `DeviceSample`; any display path for app-held bytes; a file/media picker.                     |
| **Q2 — is mini-app LXMF loopback deliberate?** `NamespacedLxmfService` in [services/lxmf.ts](../../packages/miniapp-runtime/src/services/lxmf.ts) is the only `LxmfBackend` in the repository, and its `send` writes straight into the recipient's local KV inbox key. [conformance/examples/run.mjs](../../conformance/examples/run.mjs) sends `to: manifest.name` — the chat sample messages itself.                                                                                                                                                             | Correcting the `lxmf:*` rows in the capability matrix; the missing `LIMITATIONS.md` entry that the parallel announce gap already has. |
| **Q3 — bridge shape.** One host delivery destination fanned out per app, or per-app LXMF destinations? `lxmfBackend` is typed as a KV store, not a backend seam, so there is nowhere to plug either one in today.                                                                                                                                                                                                                                                                                                                                            | Carrying mini-app LXMF over Reticulum at all.                                                                                         |

## Sequencing

| Wave  | Workstreams                                                                                                                                                  | Why here                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | [A](#a--sandbox-error-visibility), [B](#b--per-app-diagnostics-channel), [C](#c--author-test-harness), [D](#d--the-ambient-sandbox-surface)                  | No new capability surface, no `HOST_API_VERSION` bump, no adversarial review. Every later wave is cheaper to build and verify once an author can see a failure. |
| **2** | [E](#e--event-delivery), [F](#f--notifications), [G](#g--crypto-primitives)                                                                                  | Small brokered additions against machinery that already exists. Each needs a version bump and a grant-screen entry.                                             |
| **3** | [H](#h--package-and-project-inspection), [I](#i--widget-vocabulary-second-wave), [J](#j--multi-file-javascript-projects), [K](#k--link-condition-simulation) | Authoring reach. H depends on C; the rest are independent of everything above and of each other.                                                                |

---

## A — Sandbox error visibility

**Problem.** Both bootstraps dispatch UI events as `void Promise.resolve(uiEventHandler(...))`
with no `.catch` — `createBareBootstrapSource` in
[worker.ts](../../packages/miniapp-runtime/src/sandbox/worker.ts) and
`createBrowserWorkerBootstrapSource` in
[browser-worker-bootstrap.ts](../../packages/miniapp-runtime/src/sandbox/browser-worker-bootstrap.ts).
Every cookbook sample puts its entire logic inside that handler, so a throw is either
swallowed or becomes an unhandled rejection that terminates the worker. The `app-error`
message carries `String(error)` and nothing else — no stack, no phase — and no desktop
renderer file references it.

**Deliverable.**

- Catch in both bootstraps and report rather than drop.
- Widen the `app-error` payload to `{ phase, message, stack?, event?, nodeId? }`, where
  `phase` is `bundle` | `ui-event` | `lifecycle`.
- Surface it in the desktop Runtime controls panel beside the lifecycle chip.

**Constraints.** Error text is app-authored. Chrome must badge it as such and never render
it as chrome assurance — the same rule the device plan applies to app-supplied purpose
strings. A caught handler error must not silently mask a genuinely wedged app: the watchdog
path stays unchanged.

**Verification.** New [hostile-apps](../../conformance/hostile-apps) cases — a handler that
throws synchronously, one that rejects, one that throws after an `await`. Each asserts the
app stays `running` and the host received a structured error naming the event.

## B — Per-app diagnostics channel

**Problem.** `packages/miniapp-runtime/src` contains no reference to `console` at all.
Nothing bridges sandbox output anywhere. [Chapter 11](../../authors/11-testing-and-debugging.md)
tells authors they have "console output surfaced by the host"; they do not.

**Deliverable.**

- A `console` shim injected by all three bootstraps, forwarding to a bounded per-app ring
  (default 200 entries, 4 KiB each, drop-oldest, with a retained drop count).
- A host-side diagnostics surface alongside `BrokerAuditEntry` in
  [broker.ts](../../packages/miniapp-runtime/src/broker.ts), exposing the ring per app.
- A log pane in the desktop Runtime controls panel, and a `tp dev` stream of the same ring.

**Constraints.** The ring must not travel the broker request path: log lines cannot consume
the 60/s message budget or count against the message-size limit, or logging changes program
behaviour. It is host-owned and **not readable by the app** — no SDK accessor — otherwise it
becomes covert unmetered storage. Field reports stay user-initiated, so ring contents never
join an export without an explicit user action.

**Verification.** A soak case asserting drop-oldest under flood, and that flooding `console`
does not trip the broker rate limiter.

## C — Author test harness

**Problem.** [cookbook.test.mjs](../../conformance/cookbook/cookbook.test.mjs) already stands up
a real `MiniappHost` with `NodeWorkerSandboxBackend`, `GrantStore`, and
`KvStorageBeeBackend`, and drives packaged apps headlessly — but it imports across the
repository from `dist/`, so no third-party author can use it. The four-loop table in
[Chapter 11](../../authors/11-testing-and-debugging.md) has no automated loop at all.

**Deliverable.** A `packages/miniapp-test` workspace published as
`@twistedpear/miniapp-test`:

- `mountApp({ manifest, bundle, grants, quotas })` returning a handle.
- `handle.tree()`, `handle.fire(event, value)`, and an awaited settle.
- Fault injection: `revoke(capability)`, `setQuota()`, `setRateLimit()`,
  `suspend()` / `resume()` (exercising `setCheckpoint` / `onResume`), `crash()`.
- Assertions expressed over the golden render model — reuse `describeWidgetTree` so harness
  output and [conformance/fixtures/widget-trees](../../conformance/fixtures/widget-trees) stay
  one vocabulary rather than two.
- `tp test <app-dir>` running an app's own test files against the harness.

**Constraints.** The harness constructs the **same** `MiniappHost` a shipping host does. It
is a rehearsal, not a mock — the property that makes the dev-preview slot trustworthy. The
new CLI command lands in a new file under `packages/cli/src/commands/`:
[app-commands.ts](../../packages/cli/src/commands/app-commands.ts) is at 398 lines against a
400-line warn threshold.

**Verification.** Port two cookbook samples' behaviour to harness tests and run them in CI.
The harness must reproduce a capability denial and a quota failure that the platform's own
suites already produce.

## D — The ambient sandbox surface

**Problem.** [SPEC-SDK](../../specs/spec-sdk/spec.md) scopes itself to brokered calls and says
nothing about which JavaScript globals exist inside a sandbox. Apps already depend on
unspecified ones — the `pocket-notes` sample uses `TextEncoder` and `TextDecoder`. The three
backends (Node worker, Bare worker, browser worker) need not agree on `crypto`, `Intl`,
`structuredClone`, or timer semantics, and nothing detects it if they diverge.

**Deliverable.**

- A probe bundle enumerating a fixed global list, executed under each backend and recorded
  as a golden fixture per backend.
- An appendix to SPEC-SDK naming the guaranteed set, the forbidden set, and every known
  per-backend divergence.
- Two documentation corrections in the same change: the `console` claim in
  [Chapter 11](../../authors/11-testing-and-debugging.md) (true only once B lands), and the
  `device.subscribe` / `device.configure` entries in the Session API table of
  [device-io.md](../../docs/device-io.md), neither of which the SDK exports.

**Verification.** The fixture diff fails CI whenever a backend's global surface changes,
which is the point: today such a change is invisible.

## E — Event delivery

**Problem.** `lxmf.receive()`, `announce.subscribe()`, and `apps.channel.receive()` all
drain arrays. [Chapter 12](../../authors/12-limits-and-budgets.md) therefore has to recommend
polling on a human timescale against a 60/s broker budget — the platform's most-recommended
anti-pattern. The broker already pushes `ui-event` into the sandbox, so the mechanism exists.

**Deliverable.** `lxmf.onMessage`, `announce.onEvent`, and `apps.channel.onMessage`,
injected the way `ui.onEvent` is.

**Constraints.** Define the push on the **service interface**, not on the concrete service:
add `subscribe(appId, handler)` to `LxmfBackend` so a later transport-backed implementation
is a drop-in. That is precisely what keeps this workstream independent of Q2 and Q3.
Delivery is at-least-once with an explicit drain, or the destructive semantics of `receive()`
change silently underneath existing apps. Pushes are never delivered to a suspended sandbox
— queue and deliver on resume.

**Verification.** A conformance case asserting no polling call is required, and that a
suspend/resume cycle loses nothing.

**Known caveat.** Until the Q2/Q3 bridge exists, what gets pushed is host-local traffic. The
delivery shape is still correct, and building it now does not prejudge either answer.

## F — Notifications

**Problem.** There is no notification API anywhere in the runtime or the SDK. An installed
app cannot tell its user that anything happened unless the user is already looking at it.
`runtime:wake` ships with nowhere to report to.

**The owner already exists.** `NamespacedLxmfService` persists per-app inboxes into the KV
store under `miniapp-lxmf-inbox:<appId>`, and is constructed for every host by
`createHostLayer1Services` in
[layer-1-init.ts](../../packages/miniapp-runtime/src/host/layer-1-init.ts). Durable,
host-owned, app-addressed state survives suspend, stop, and restart today.

**Deliverable.**

- A `notify:post` capability, `elevated` risk class, with a registry entry and grant-screen
  description.
- `notify.post({ title, body, event, tag })` — host-rendered and app-attributed.
- Tapping resumes or launches the app and delivers `event` through the `ui.onEvent` path.
- Host chrome: per-app enable/disable, a rate ceiling, and a history the user can read.

**Constraints.** Rationed per host, not per app — the same reasoning `runtime:wake` already
states in its grant description. The app supplies text only; the host draws the
notification, and app-authored strings are badged. A low default sustained ceiling with a
small burst allowance.

**Verification.** Hostile-apps cases for flood behaviour and for chrome-impersonating text.

## G — Crypto primitives

**Problem.** `identity` exposes only `destinationHash` and `sign`. An app cannot hash, take
random bytes, or compare in constant time. The under-one-minute LoRa install ceiling is
about 9 KiB for code, icon, and assets combined
([Chapter 12](../../authors/12-limits-and-budgets.md)), so bundling a crypto library is not a
real option. Whether `crypto` exists in a given sandbox is exactly the unspecified surface
D pins down, which is why G follows D.

**Deliverable.** Brokered `crypto.randomBytes(n)`, `crypto.hash(alg, bytes)`,
`crypto.hmac(alg, key, bytes)`, and `crypto.timingSafeEqual(a, b)`, with bounded input
sizes. No capability: these expose no user data and no device state.

**Explicitly deferred.** Seal/open against a peer public key. It touches app-scoped identity
derivation and the egress model, and deserves its own decision rather than arriving as a
footnote to a primitives change.

**Verification.** SPEC-SDK vectors, following the existing per-namespace success and error
coverage pattern.

## H — Package and project inspection

**Deliverable, two commands.**

`tp inspect <256t>` — resolve, verify the SHA-512, the SHA-256, and the manifest signature,
then print name, version, publisher fingerprint, declared capabilities with risk class, the
file list with sizes, and estimated install time at LAN, BLE, and LoRa rates. The rate table
already exists in [Chapter 12](../../authors/12-limits-and-budgets.md).

`tp doctor <app-dir>` — declared-but-unused and used-but-undeclared capabilities, total size
against the three link ceilings, missing `accessibilityLabel`, `minHostApi` against the SDK
calls actually made, and unknown widget props.

**Note.** Most of `doctor` already exists inside
[cookbook.test.mjs](../../conformance/cookbook/cookbook.test.mjs), which type-checks every
sample and cross-references `specs/spec-sdk/schema/api-capabilities.json`. Extract it;
do not write it twice.

**Depends on** C, which is where the shared harness and lint rules land. Both commands go in
a new file, for the same size-threshold reason as C.

## I — Widget vocabulary, second wave

**Problem.** `text-input` carries only `value`, `placeholder`, and `event` in
[ui/schema.ts](../../packages/miniapp-runtime/src/ui/schema.ts) — no multiline, secure entry, or
keyboard type. There is no slider, no select, no date input, and no app-drawn modal. These
are small individually and are most of what makes a mini-app feel unfinished.

**Deliverable, one change per widget:** a [SPEC-WIDGET](../../specs/spec-widget/spec.md)
vocabulary entry, the schema prop set, a golden fixture under
[conformance/fixtures/widget-trees](../../conformance/fixtures/widget-trees), and renderer
support in [widget-renderer-rn](../../packages/widget-renderer-rn), the desktop renderer, and
the [headless geometry model](../../packages/widget-renderer-headless).

**Order.** `text-input` props first — a pure prop addition with no new node type — then
`select`, `slider`, `date`.

**Constraints.** Props and styles stay closed sets. The host rejects unknown props today and
must keep doing so; a widget that degrades by ignoring an unknown prop is how vocabulary
drift starts.

**Verification.** The [widget-parity](../../conformance/widget-parity) and `ui-golden` suites,
which are what stop the three renderers diverging.

## J — Multi-file JavaScript projects

**Problem.** JavaScript projects are single-file bundles while Guida projects are
multi-file. There are no shared libraries, no reuse between apps, and no way for a project
to grow past one file.

**Deliverable.** A deterministic ES-module linking step in `tp app build` and in DevStudio's
host-chrome compile path: resolve relative imports within the project, order
topologically, emit one bundle. No npm resolution, no `node_modules`, no network. This is
explicitly not an esbuild-class bundler.

**Constraints.** Determinism is a packaging requirement rather than a nicety — the `.tpkg`
archive is byte-deterministic and signed, so identical sources must produce an identical
bundle. The existing workspace quotas (256 KiB per file, 4 MiB total, 512 files) already
bound the input.

**Verification.** Pack the same project twice and diff the archives; add a multi-file sample
to the cookbook conformance sweep.

**Enables.** An author-facing standard library of render helpers, which is the smaller
alternative to the React reconciler already carried in
[STATUS-SOFTWARE-OPTIONAL.md](../../STATUS-SOFTWARE-OPTIONAL.md). Decide which of the two you
want before building either.

## K — Link-condition simulation

**Problem.** [Chapter 11](../../authors/11-testing-and-debugging.md) is emphatic that the
interesting failures are not on the author's desk, and then offers no tool for reaching
them. The deterministic simulator under `conformance/sim-*` targets abuse resistance, not
authoring.

**Deliverable.** `tp dev --link lan|ble|lora --loss <pct> --peer-offline`, injecting
bitrate, latency, and loss into the dev side-load path, plus the same profiles as an option
in the C harness so a degradation test runs in CI rather than by hand.

**Verification.** A sample that degrades honestly under the `lora` profile, asserted through
the harness.

---

## Host API versions

`HOST_API_VERSION` is `0.16.0`. Adding a capability bumps the minor and blocks installs on
older hosts, because unknown capability ids fail closed at install.

| Workstream            | Bump     | Reason                       |
| --------------------- | -------- | ---------------------------- |
| A, B, C, D, H, J, K   | none     | No new brokered surface      |
| E — event delivery    | `0.17.0` | New SDK delivery shape       |
| F — notifications     | `0.18.0` | New capability `notify:post` |
| G — crypto primitives | `0.19.0` | New `crypto` namespace       |
| I — widget wave       | `0.20.0` | Per batch, not per widget    |

## Not in this plan

**Blocked on Q1:** declaring the raw device variants in the SDK, any display path for bytes
an app holds, and a host-owned file or media picker.

**Blocked on Q2 and Q3:** carrying mini-app LXMF over Reticulum, and the status corrections
that depend on knowing whether today's loopback is deliberate.

**Tracked elsewhere, deliberately untouched:** the React reconciler renderer, Hyperbee
replication, transport-backed mini-app announces, shared mini-app storage, publisher key
rotation, revocation lists, and delta updates
([STATUS-SOFTWARE-OPTIONAL.md](../../STATUS-SOFTWARE-OPTIONAL.md), `docs/package-format.md`),
and Android background execution and scheduled wake (the mobile lifecycle ledger).

**Waiting on another plan:** per-app data export and import. Its shape depends on whether a
user is a machine, which [linked devices](../../docs/linked-devices-plan.md) settles. Building it
against today's one-identity-per-installation model would produce the wrong artifact.

## Recording the work

This document is a plan, not a register. Rows enter the backlog through `npm run work:add`,
with each item's classification, prerequisites, and verification command recorded in
`work/metadata.json`, and close through `npm run work:done`.
