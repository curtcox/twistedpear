# Specifications

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

TwistedPear is decomposed into quasi-independent specifications, analogous to how the
web is layered over TCP, HTTP, HTML, CSS, and JavaScript. Each spec is small enough to
hold in your head, admits multiple valid implementations for different purposes
(production, simulation, headless testing), and is conformance-tested independently of
the others.

## Normative rule

**Vectors and formal models are normative. Prose is informative.** When a spec's prose
disagrees with its vector suite or formal model, the vectors and model win and the prose
is a bug. A spec without a machine-checkable artifact is marked _informative_ until it
has one.

Status labels used in the index:

- **normative** — the spec's own machine-checkable artifacts exist and are
  cross-checked in CI; the spec document is finished.
- **stub** — the spec document is a scaffold, but machine-checkable evidence for its
  scope already exists elsewhere in the tree (cited under "current locations").
- **stub (informative)** — a scaffold with _no_ current machine-checkable artifact;
  everything it says is informative until its first artifact lands.

Upstream compatibility is a permanent constraint: byte-level interoperability with the
Python Reticulum and LXMF reference implementations is required. The Group A specs below
are therefore **adopted** — TwistedPear does not author them; it maintains a profile
(subset used, extensions, deviations) plus conformance evidence against the upstream
reference.

Versioning and backward compatibility are deliberately out of scope until after a
widely used public release. There is one current spec set: this tree.

## Layout

Each spec directory contains:

| Entry      | Purpose                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- |
| `spec.md`  | Scope, definitions, and pointers to the normative artifacts.                                 |
| `model/`   | Formal models (TLA+, symbolic) and their checked traces, where they exist.                   |
| `schema/`  | Language-neutral schemas (JSON Schema) for wire/tape formats, where they exist.              |
| `vectors/` | Golden vectors owned by this spec, where they are not generated into `conformance/vectors/`. |

Conformance runners in [`conformance/`](../conformance/) and `formal/` consume these
artifacts; implementations live in [`packages/`](../packages/) and [`apps/`](../apps/).

## Spec index

### Group A — Adopted network specs

Authored upstream; TwistedPear maintains profiles and interop evidence.

| Spec                                 | Scope                                                                                          | Status                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| [SPEC-WIRE](spec-wire/spec.md)       | Reticulum packets, announces, links, crypto                                                    | **normative** (profile)             |
| [SPEC-MSG](spec-msg/spec.md)         | LXMF messages, propagation, tickets                                                            | **normative** (profile)             |
| [SPEC-MEDIA](spec-media/spec.md)     | Per-medium interface profiles (AutoInterface, WebSocket, BLE, RNode/LoRa, serial)              | **normative** (per-medium profiles) |
| [SPEC-FREENET](spec-freenet/spec.md) | Optional Freenet contract-state binding for package distribution, packet logs, and propagation | **stub**                            |

### Group B — Execution substrate specs

The contracts that make a seeded simulator a _conforming host_ rather than a mock.

| Spec                                 | Scope                                                                | Status        |
| ------------------------------------ | -------------------------------------------------------------------- | ------------- |
| [SPEC-MACHINE](spec-machine/spec.md) | `step(state, event) → (state', intents)` contract; forbidden effects | **normative** |
| [SPEC-EVENTS](spec-events/spec.md)   | Closed event/intent vocabulary as a language-neutral schema          | **normative** |
| [SPEC-KERNEL](spec-kernel/spec.md)   | Virtual clock, seeded PRNG discipline, deterministic dequeue         | **normative** |
| [SPEC-ADAPTER](spec-adapter/spec.md) | Effect families; real/simulated observational equivalence            | **normative** |
| [SPEC-TRACE](spec-trace/spec.md)     | Replayable trace format, hashing, shrinking                          | **normative** |

### Group C — Platform specs

TwistedPear-authored; the app platform seen by mini-apps and renderers.

| Spec                                             | Scope                                                                      | Status                   |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------ |
| [SPEC-NAME](spec-name/spec.md)                   | 256t identifiers, resolution, CAS semantics                                | **normative**            |
| [SPEC-PKG](spec-pkg/spec.md)                     | Signed package structure, manifest, capability declarations                | **normative**            |
| [SPEC-CAP](spec-cap/spec.md)                     | Capability taxonomy and grant lifecycle                                    | **normative** (exemplar) |
| [SPEC-AUTHORITY](spec-authority/spec.md)         | Escrow and recovery-quorum authority machines                              | **normative**            |
| [SPEC-SDK](spec-sdk/spec.md)                     | Broker call semantics: namespaces, errors, quotas                          | **normative**            |
| [SPEC-WIDGET](spec-widget/spec.md)               | Widget tree vocabulary and update/diff stream                              | **normative**            |
| [SPEC-APP-TRACE](spec-app-trace/spec.md)         | Mini-app session trace, shape-only canonical form                          | **normative**            |
| [SPEC-PRESENT](spec-present/spec.md)             | Layout and styling semantics, separate from vocabulary                     | stub                     |
| [SPEC-BIND-LOOPBACK](spec-bind-loopback/spec.md) | In-memory message substrate binding                                        | **normative**            |
| [SPEC-CHROME](spec-chrome/spec.md)               | Host confirmations, grant screens, draw-over rules                         | **normative**            |
| [SPEC-DEVICE](spec-device/spec.md)               | Device-class registry, tiers, session lifecycle                            | stub                     |
| [SPEC-STREAM](spec-stream/spec.md)               | Peer-media readiness, admission, adaptation, framing, and stream lifecycle | **normative**            |
| [SPEC-SYNC](spec-sync/spec.md)                   | Topic-log entry format, union-merge, digest, and local retention           | **normative**            |
| [SPEC-POLICY](spec-policy/spec.md)               | User policy: conditions, amendment, and sealing                            | stub (informative)       |

## Exemplar

[SPEC-CAP](spec-cap/spec.md) is the finished template. A **twinned machine** has
four cross-checked representations of the same transition relation:

| Layer       | Representation                                                                             | Where it lives                      |
| ----------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| **Layer-1** | Executable table — the TypeScript `step(state, event)` machine                             | `packages/protocol`                 |
| **Layer-2** | Formal twin — the TLA+ model checked by TLC in CI                                          | `specs/<spec>/model/`               |
| —           | Checked traces — model-checker fixtures replayed against Layer-1                           | `specs/<spec>/model/` / conformance |
| **Layer-3** | Generated vector — `(state, event) → (state', intents)` cases emitted from the table/model | `conformance/vectors/`              |

All four are cross-checked edge-for-edge by `npm run formal:grant`. New specs
should converge on that shape: one formal or vector artifact, multiple
implementations, one cross-check command.
[SPEC-AUTHORITY](spec-authority/spec.md) is the first follower — the same four
representations for the escrow and recovery-quorum machines.

Prefer the representation names (**executable table**, **formal twin**,
**checked traces**, **generated vector**) in prose; keep the Layer-* numbers
when referring to the three-layer state-machine discipline from the simulation
architecture (Layer-1 executable, Layer-2 twin, Layer-3 vector). Checked traces
are the fourth representation and are not numbered.

## Migration order

1. **Phase 1 — substrate codification** (SPEC-TRACE, SPEC-KERNEL, SPEC-EVENTS,
   SPEC-MACHINE, SPEC-ADAPTER): promote the existing determinism tests to freestanding
   conformance suites; invert authority so the SPEC-EVENTS schema generates the
   TypeScript types.
2. **Phase 2 — UI boundary** (SPEC-WIDGET, SPEC-PRESENT, SPEC-BIND-LOOPBACK): extract
   the widget schema, record golden widget streams, build the headless-snapshot
   renderer as the second implementation and test oracle, then DOM, TUI, and Flutter
   renderers.
3. **Phase 3 — platform codification** (SPEC-PKG, SPEC-NAME, SPEC-SDK, SPEC-CHROME,
   Group A profiles): golden/hostile vectors and one-page adoption profiles over the
   existing CI evidence. SPEC-CHROME's requirement-keyed suite covers R1–R9.
