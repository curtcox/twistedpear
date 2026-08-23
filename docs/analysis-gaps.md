# Analysis gaps

<!-- tp-doc
lifecycle: live
audited: 2026-08-23
register: none
-->

Different problems are found by different kinds of analysis, and the gates in
[Static analysis](static-analysis.md) cover most of them. This document covers four that
nothing covered, each because of a boundary the existing tooling deliberately does not
cross: a constant that lives in four languages, a lint group that is off by default, a
file every size gate is configured to skip, and a claim written as prose rather than as a
link.

They were added together on 2026-08-23 and share a shape. In each case the repository
already had the right idea written down somewhere — a spec stating its own done-rule, a
comment saying one file mirrors another, an exemption list that was correct for the gate
it belonged to — and nothing held it true.

| Gate                | Command                           | Tier | What it holds                                                      |
| ------------------- | --------------------------------- | ---- | ------------------------------------------------------------------ |
| `native-parity`     | `npm run native-parity:check`     | PR   | One BLE constant means one value in Swift, Kotlin, and TypeScript  |
| `rust-lints`        | `npm run rust-lints:check`        | PR   | Restriction-lint findings in the shipped wasm contracts, ratcheted |
| `artifact-sizes`    | `npm run artifact-sizes:check`    | PR   | Byte budgets for the artifacts a user or peer receives             |
| `spec-traceability` | `npm run spec-traceability:check` | PR   | Every evidence citation in `specs/` resolves to something real     |

## Cross-language parity

`swift-tests`, `kotlin-tests`, and `unit-tests` each run one language's suite against
that language's own copy of the BLE spec. All three pass. None of them compares the
copies, and the copies are typed by hand.

The default ATT MTU existed as five separate literals across four files — `defaultMtu` in
`BleBridgeSpec.swift`, `DEFAULT_MTU` in `BleBridgeSpec.kt`, `BLE_DEFAULT_PIPE_MTU` in
`spec-framing.ts`, a bare `247` in `sim.ts`, and `DEFAULT_MTU` again in the worklet's
`ipc-ble-bridge.mjs`. The four GATT UUIDs and the identity beacon size existed twice
each, in Swift and Kotlin. A transposed digit in one UUID passes every one of the 72
gates in the registry and surfaces as an iPhone that cannot see an Android device —
`STATUS-HARDWARE` work that runs rarely and reads as a radio fault rather than a typo.

`conformance/native-parity/ble-bridge.json` is the single declaration. Each row names a
value and the identifier that must carry it in each implementation, and the gate extracts
those identifiers and compares them.

Three things make it more than a list someone has to remember to extend:

- **Extraction is textual and Node-only.** A real Swift and Kotlin parser would need
  Xcode and Gradle to answer "are these two numbers the same", which would make the gate
  run on one runner and skip on the rest — the arrangement that let the copies drift in
  the first place. The cost is that an unrecognised declaration style becomes invisible,
  so a file yielding **no** constants fails rather than passes. A gate that silently
  measures nothing reports the same green as a tree that agrees.
- **A constant two implementations share must be declared.** Adding one to both native
  specs and registering it nowhere is itself the failure. Without that rule the next
  shared constant simply is not covered — and when this was verified by adding
  `connectionTimeoutMs = 8000` to Swift and `CONNECTION_TIMEOUT_MS = 9000L` to Kotlin,
  the disagreeing pair was caught purely by being unregistered.
- **The document is checked too.** Values `docs/ble-interface.md` states must still be
  what it states, so changing every implementation and not the specification fails as
  drift in the other direction.

Behaviour is out of scope. The gate compares constants, which is where the copies
actually diverge; a `shouldActAsCentral` implemented with `lexicographicallyPrecedes` in
Swift and a hand-rolled byte loop in Kotlin needs a shared case file asserted inside each
language's own suite, which is separate work.

Verified failing on all five modes: a transposed UUID digit, an MTU moved in one copy of
five, an unregistered shared constant, an extractor that can no longer read a file, and a
value changed everywhere except the specification.

## Rust contract restriction lints

The `rust` gate runs clippy with `-D warnings`, but only over clippy's default groups.
`indexing_slicing`, `arithmetic_side_effects`, `as_conversions`, the cast lints,
`unwrap_used`, `expect_used`, and `panic` all live in `restriction` or `pedantic`, which
are off. The three shipped Freenet contracts — the code peers agree on, the target of
`rust-fuzz`, and the one place in this repository where a panic aborts a node's contract
execution instead of failing a test — were checked by nothing beyond ordinary clippy.

The policy splits in two, because the findings do.

**Denied outright, in each contract's `Cargo.toml`.** `unwrap_used`, `expect_used`,
`panic`, `unreachable`, and `todo` already hold at zero across all three contracts.
Denying them costs nothing today and is the entire point: the decoders are careful by
hand — `checked_add` on every cursor advance, `direction` validated before it indexes an
array — and hand-discipline is what stops holding on the edit nobody reviews closely.
Test modules opt out individually with a scoped `#[allow]`, because a test asserting a
known-good decode is entitled to unwrap: the panic _is_ the assertion, and its blast
radius is the test runner.

**Ratcheted, in `language-ratchets/rust-lints.json`.** The remaining seven lints have 56
findings that cannot be fixed in one change. This is a separate gate rather than part of
`rust` because that gate is zero-tolerance and has to stay one; a `-D warnings` gate
cannot carry a backlog without becoming a list of allowed failures. Policy lives in
`rust-lint-rules.json`.

Findings are keyed by crate, lint, file, enclosing function, **and the exact offending
expression**. The expression is load-bearing: four `indexing_slicing` findings sit on one
line of `decode_entries`, one each for `bytes[5]` through `bytes[8]`. Keyed by line they
would be a single entry that neither shrinks when three are cleared nor grows when three
more arrive. Measured over `--lib` rather than `--all-targets`, because a test that
indexes a fixture it just built is not what runs in wasm32.

`[profile.release] overflow-checks = true` is set alongside. Release builds turn overflow
checking off, so in the wasm these contracts actually ship as, `cursor + 9` on
attacker-supplied bytes wraps silently — while every test and fuzz target runs a debug
build that traps. The one configuration nobody exercises was the one users get.

## Shipped artifact byte budgets

`size-rules.json` exempts `**/*.bundle`, `**/*.bundle.mjs`, and `**/*.generated.mjs`, and
`scripts/analysis/generated-paths.mjs` excludes generated trees from every other analysis
gate. Both exclusions are right for what they do: a bundle's complexity cannot be reduced
by editing it, and pinning one builds an exemption list that can never drain. Together
they meant the two largest files in the repository — `worklet.bundle` at 11.4 MB and
`worklet.bundle.mjs` at 10.9 MB, the shipped desktop and mobile host runtimes — were
measured by nothing at all. `generated-freshness` proves those bundles are current. It
says nothing about how big they are.

That matters here more than it would for a server application. TwistedPear distributes
over Reticulum, including LoRa-class links, and installs onto phones. A bundle that
quietly doubles is an install that fails on a metered connection and a mini-app that will
not transfer.

Nine artifacts totalling 24.2 MiB are budgeted in `artifact-size-rules.json`: both
worklet bundles, the Handbook mini-app bundle, both generated Guida assets, the vendored
QR decoder, and all three contract wasm binaries.

This is a **budget**, not a ratchet, and the distinction is deliberate. A monotonic floor
is right for findings, which should trend to zero. A bundle legitimately grows as
features land, so a floor that may only shrink would fail on every honest change and be
routed around within a month — the failure this repository already recorded for a
benchmark reference pinned to the fastest number ever measured. A budget is a reviewed
ceiling with headroom, crossed only by someone editing the file on purpose. A warn band
at 5% over the recorded measurement reports drift while it is still cheap to explain,
because a ceiling alone says nothing until the day it fires.

Two rules keep the list honest. A budgeted artifact that has gone missing fails, so a
rename cannot retire its budget in silence. And any tracked file under `apps/` or
`packages/` at or above 128 KiB that is neither budgeted nor excluded fails — every
exclusion carries a reason. Only committed files are budgeted:
`apps/harness-mobile/worklet/*-wasm.generated.mjs` are gitignored build output, and
measuring them would make the gate answer differently depending on whether someone had
run a build.

## Specification evidence traceability

`specs/spec-wire/spec.md` states the rule in its own prose: _a profile is done when every
subset row cites at least one pinned vector or interop test_. Nothing checked it.

`doc-audit` checks a great deal about these files — lifecycle headers, `counterpart:`
pairing, archive placement, every markdown link and image resolving. None of it helps
here, because a citation written as an inline code span is not a link, and that is the
form every vector key, test title, and command takes. Deleting a vector key silently
un-pins a normative claim; renaming a test leaves the spec citing evidence that no longer
exists.

Four citation forms are resolved, across all 20 specs and every document in each spec
directory:

| Form                                         | Resolved against                        |
| -------------------------------------------- | --------------------------------------- |
| `` `crypto.json` → `sha256` ``               | the vector file, and the case inside it |
| `` `link.test.ts` ("Link identification") `` | the test file, and the title inside it  |
| `` `npm run test:interop` ``                 | `package.json`                          |
| an empty Pinned-by cell                      | the profiles' own done-rule             |

Markdown links are deliberately **not** re-checked: `doc-audit` already resolves them,
and a second report of the same finding makes both less useful.

Everything is derived rather than configured. Which specs are profiles comes from their
having a Subset table; which are normative comes from the index in `specs/README.md`. A
list of specs maintained here by hand would go stale exactly as the citations do. Reading
the whole spec directory rather than only `spec.md` matters: SPEC-MEDIA's own page holds
no citations and delegates to six per-medium profiles beside it, four of which carry
Subset tables.

A cited case resolves whether the vector file keys it by property (`crypto.json` →
`sha256`) or holds it as a named entry in an array (`lxmf.json` → `hello-world` is the
`name` of one of `messages`). A title abbreviated with a trailing ellipsis matches on its
prefix, which is a citation convention in SPEC-MEDIA; a title without one must match
exactly, which is what catches a renamed test.

### What the first run found

Two subset rows cite tests that do not exist. Both are recorded in
`spec-traceability-waivers.json` with a reason and a next step, and everything else is
enforced at zero.

- **`SPEC-MEDIA-BLE-LXMF`** — the BLE profile's "LXMF exchange / Message carriage" row
  cites `ble-interop.test.ts ("exchanges LXMF messages between two peers")`. That file
  covers link establishment and echo, resource transfer, mid-transfer reconnect, and
  framing properties; nothing carries an LXMF message. This is a missing test rather than
  a stale citation, so it is recorded rather than reworded — pointing the row at a test
  that does exist would make the gate green while leaving the claim unpinned, which is
  the failure the gate exists to prevent.
- **`SPEC-MSG-PROPAGATION-TITLE`** — SPEC-MSG cites `router.test.ts ("delivers propagated
messages via a propagation node over PipeInterface")`. `PropagationClient sync` now
  contains "downloads queued messages from a propagation node over PipeInterface", which
  looks like the same behaviour renamed. Recorded rather than corrected in place, because
  editing a normative specification to make a newly added gate pass is the wrong order.

A waiver is debt, not permission. Each needs an id, a reason, and a next step, and a
waiver that no longer matches any finding **fails** the gate — so a fixed citation loses
its waiver instead of quietly licensing the next one.

## Registry decomposition

Adding four gates pushed `scripts/checks/registry.mjs` past the 769-line script
threshold, so it was decomposed rather than grandfathered, per the size rule in
`AGENTS.md`. `scripts/checks/gate.mjs` now holds the gate record shape and the scheduling
policy; `scripts/checks/gates-languages.mjs` holds the gates needing a non-Node
toolchain. Both are re-exported from `registry.mjs`, which stays the single import every
consumer uses and the list CI expands.

One constraint is worth knowing before moving anything else out of that file:
`scripts/release/status.mjs` reads it as **text** to confirm `test:release-harness`,
`test:hostile-apps`, and `test:sim-fixed-replay` are wired. Those three must stay
declared there.
