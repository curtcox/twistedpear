# Developer glossary

<!-- tp-doc
lifecycle: reference
audited: 2026-07-29
register: none
-->

Working vocabulary for people changing this repository. The plain-language,
user-facing glossary is [guide/glossary.md](../guide/glossary.md); where the two
registers use different words for the same thing, both are listed here and the
mapping is explicit. Terms owned by a spec cite the spec; the spec is canonical.

## Terms

**256t identifier** — 94 base64url characters encoding 70 bytes: a 48-bit
big-endian content length plus a 64-byte content field (SHA-512 hash for
length > 64, zero-padded inline content otherwise). Owned by
[SPEC-NAME](../specs/spec-name/spec.md); implemented in
[packages/cas-256t](../packages/cas-256t/). User-facing prose may call it a
_share identifier_.

**Account identity** — the long-lived identity of a **user**, as distinct from
any one of their machines. Trust root for package signatures and installation
certificates; in linked mode it is never registered as a live Reticulum
destination. Unlinked installations, which is every shipping host today, have no
account identity separate from the installation identity — see
[linked-devices.md](linked-devices.md).

**Adapter** — code that executes one effect family's intents and produces that
family's events, outside the pure boundary. The real and simulated adapter for a
family must be observationally equivalent under the trace hash.
[SPEC-ADAPTER](../specs/spec-adapter/spec.md);
[packages/effects/src/adapters](../packages/effects/src/adapters/).

**Adopted spec / profile** — a Group A spec authored upstream (Reticulum, LXMF,
media). TwistedPear maintains a five-section _profile_: upstream pin, subset,
extensions, deviations, and the evidence that pins each row.
[SPEC-WIRE](../specs/spec-wire/spec.md) defines the template.

**Announce** — a Reticulum destination broadcasting "I exist". The basis of
discovery, presence, and the app catalog.

**Authority machine** — one of the three formally twinned lifecycle machines
guarding user authority: grant ([SPEC-CAP](../specs/spec-cap/spec.md)), escrow
and recovery quorum ([SPEC-AUTHORITY](../specs/spec-authority/spec.md)).

**BareKit** — the mobile embedding layer (`react-native-bare-kit`) that starts
TwistedPear's packaged Bare worklet and provides the IPC channel between it and
the React Native host. Inside the worklet, `BareKit.IPC` is the global used to
exchange messages with the host. [apps/harness-mobile](../apps/harness-mobile/).

**Bee storage** — the append-only, sequence-numbered key/value surface behind
the `storage` SDK namespace (`StorageBeeBackend`): Corestore/Hyperbee in
production, KV-backed and in-memory implementations elsewhere.

**Binding** — the contract attaching the app platform to a message substrate
([SPEC-BIND-LOOPBACK](../specs/spec-bind-loopback/spec.md)). LXMF over Reticulum
is the production binding; the _loopback binding_ is an in-memory substrate that
runs the whole platform with zero network.

**Broker** — the host-side gate every SDK call crosses; enforces capabilities,
rate limits, and quotas. The broker is deliberately _not a media bus_: bulk
sample data travels on the device sidecar, not through brokered calls.
[packages/miniapp-runtime/src/broker.ts](../packages/miniapp-runtime/src/broker.ts).

**Bulk plane (Pears bulk plane)** — the Hypercore/Hyperdrive/Hyperswarm path
for large payloads when ordinary IP connectivity exists. Falls back to the
control plane. [packages/bridge-hyper](../packages/bridge-hyper/).

**Canary** — a script that plants a deliberate violation to prove the gate that
should catch it still fails (e.g. `scripts/sansio-canary.mjs`).

**Capability** — a string from the closed taxonomy a mini-app declares in
`app.manifest.json`. Unknown strings block install. Device capabilities are
generated as `device:<class>` / `device:<class>:<tier>`.
[SPEC-CAP](../specs/spec-cap/spec.md).

**CAS** — content-addressed storage keyed by 256t identifiers (`CasStore` in
[packages/cas-256t](../packages/cas-256t/)).

**Catalog** — the set of apps a host currently knows about, assembled from peer
announces. [packages/app-registry](../packages/app-registry/).

**Checked trace** — a trace fixture produced by the model checker and
cross-checked against the executable table (one of the four representations of
a twinned machine).

**Chrome (host chrome)** — UI the host renders outside the app's drawing
surface: grant screens, confirmations, the Devices panel, the active-use
banner. Apps can neither draw over it nor acknowledge it. Rules CHROME-R1–R6 in
[SPEC-CHROME](../specs/spec-chrome/spec.md). Unrelated to the Chromium browser
embedded by the desktop host.

**Confirmation** — a host-chrome dialog required _in addition to_ a grant for
double-gated operations (`apps:*`, device consent). Only direct user input can
answer one; headless hosts refuse (`CONFIRMATION_UNAVAILABLE`).

**Control plane** — the always-available Reticulum path: identity, announces,
links, LXMF messages. Works over any interface, including radio.

**Dev-preview slot** — the sandboxed slot in which `apps:preview` runs a built
app, gated by a host-chrome confirmation.

**Device** — a **peripheral**: camera, microphone, sensor, actuator. Never a
user's machine, which is an _installation_. All `Device *` entries below, the
Devices chrome, and `device:<class>:<tier>` capabilities use this sense only.

**Device bridge** — host-native effects (geolocation, camera, vibration, …)
exposed to the worklet's Device Manager over an RPC boundary
(`requestDeviceBridge`), replacing simulated drivers per platform.

**Device class / tier** — entries in the versioned device-class registry;
tiers subdivide access levels within a class. Registry and session lifecycle
are owned by [SPEC-DEVICE](../specs/spec-device/spec.md).

**Device Manager** — the host component owning device inventory, sessions,
drivers, and the Devices chrome
([packages/miniapp-runtime/src/device-manager.ts](../packages/miniapp-runtime/src/device-manager.ts)).

**DevStudio** — the in-platform development environment, itself a mini-app:
workspace, packaging, publishing, preview.

**Effect family** — one of Clock, Entropy, Timers, Transport, Storage, Logging;
the unit at which adapters are paired real/simulated.
[SPEC-ADAPTER](../specs/spec-adapter/spec.md).

**Event** — a host→machine input from the closed vocabulary. Everything
nondeterministic (time, entropy, IO results) reaches a machine only as an event
payload. [SPEC-EVENTS](../specs/spec-events/spec.md).

**Exemplar** — [SPEC-CAP](../specs/spec-cap/spec.md), the shape every spec
converges on: one formal model, four cross-checked representations, multiple
implementations, one conformance command. Tracked per spec as its **migration
phase**.

**Fetch plane** — the host-core abstraction that fetches a package over the
best available **fetch path**: `hyperdrive`, `lan-mirror`, or `resource`
([packages/host-core/src/fetch-plane.ts](../packages/host-core/src/fetch-plane.ts)).

**Flag-plane relay** — relay control by flipping per-interface enable flags
through the same `applyInterfaceConfig` path Settings uses
(`createWorkletFlagRelayService`), as opposed to full `InterfaceManager`
ownership (node-only today).

**Gateway** — the node a browser host connects through over WebSocket, because
browsers cannot join Reticulum directly. Also serves the bulk-plane companion
endpoints `/dht-relay` and `/bulk-fetch`.

**Golden vector** — a vector generated from a pinned upstream reference
implementation (Python RNS or LXMF), used to pin byte-level compatibility.

**Grant** — an approved (app, capability) pair, governed by the grant lifecycle
machine and persisted in the `GrantStore`. [SPEC-CAP](../specs/spec-cap/spec.md).

**Handbook** — the interactive platform guide, shipped as a mini-app
([apps/handbook](../apps/handbook/)).

**Host** — the TwistedPear program running on one installation; the peer other
nodes address. Flavors: desktop (Electron), android/ios (Expo dev build), web
(browser leaf), node (headless), and the simulator (a conforming host, not a
mock). A host is not a user: see _Account identity_ and _Installation_.

**Hostile archive / hostile app** — an adversarial fixture that must be
rejected with a pinned error code
([conformance/hostile-apps](../conformance/hostile-apps/)).

**Installation** — one TwistedPear host on one of a user's machines; the thing a
user calls "my phone". Deliberately not called a _device_, which in this
codebase means a peripheral. Capability grants, publisher trust, and moderation
state are installation-scoped; identifiers spell it `installation`
(`installationId`, `LinkedInstallationCertificate`). Contrast _Account
identity_; see [linked-devices.md](linked-devices.md).

**Intent** — a machine→host output declaring an effect to be executed by an
adapter; the only way protocol code touches the world.
[SPEC-EVENTS](../specs/spec-events/spec.md).

**Interface** — one transmission medium carrying Reticulum traffic:
AutoInterface, TCP, WebSocket, BLE, RNode/LoRa, serial. One profile per medium
in [SPEC-MEDIA](../specs/spec-media/spec.md).

**Kernel** — the deterministic scheduler; sole holder of virtual time, owner of
the PRNG discipline and dequeue ordering.
[SPEC-KERNEL](../specs/spec-kernel/spec.md).

**Layer-1 / Layer-2 / Layer-3 (twinned machine)** — three numbered layers of the
state-machine discipline, plus an unnumbered fourth representation. Of a
twinned machine's four cross-checked representations: the **Layer-1 executable
table** is the TypeScript `step` machine in `packages/protocol`; the
**Layer-2 twin** is the TLA+ model; the **Layer-3 vector** is the generated
conformance vector; **checked traces** are model-checker fixtures replayed
against Layer-1. Prefer representation names in prose; use Layer-* when citing
the three-layer discipline. See [specs/README.md](../specs/README.md#exemplar).

**Leaf** — a peer that uses the network but does not relay for others. Browser
hosts are always leaves. **Leaf roles** are the per-host toggles
`{ transport, seeder, propagation }`
([packages/host-core/src/leaf-roles.ts](../packages/host-core/src/leaf-roles.ts)).

**Lifecycle (tp-doc)** — the `lifecycle:` field of a document's `tp-doc`
header: `live`, `reference`, `planned`, or `historical`.

**Link** — an established, encrypted Reticulum connection between two peers.

**LXMF** — the message layer over Reticulum; profiled in
[SPEC-MSG](../specs/spec-msg/spec.md).

**Machine (protocol machine)** — a pure step function
`step(state, event) → (state', intents)`: synchronous, total, deterministic,
effect-free. [SPEC-MACHINE](../specs/spec-machine/spec.md).

**Manifest** — `app.manifest.json`: name, version, entry, capability
declarations, `minHostApi`. [SPEC-PKG](../specs/spec-pkg/spec.md).

**Mini-app** — a sandboxed application running behind the broker with only the
capabilities the user granted. Prose spelling is _mini-app_; `miniapp` appears
only in identifiers and paths.

**Normative / informative** — vectors and formal models are normative; prose is
informative. When they disagree, the prose is the bug
([specs/README.md](../specs/README.md)).

**Part-package** — a piece of a package split for constrained links; reassembly
is covered by multipart propagation
([docs/multipart-propagation.md](multipart-propagation.md)).

**Propagation node** — an LXMF host that stores messages for offline peers and
hands them over on return. The user-facing register calls this a _propagation
server_ ([guide/glossary.md](../guide/glossary.md)); both name the same thing.

**Publisher** — the identity that signed a mini-app package. A **trusted
publisher** is one the user added to their own trust list; trust never skips
capability review.

**Register (tp-doc)** — the `register:` field of a `tp-doc` header, naming
which status register owns the document's claims: `none`, `complete`
(STATUS-COMPLETE), `software` (STATUS-SOFTWARE), `hardware` (STATUS-HARDWARE),
or `release` (RELEASE-PLAN).

**Resource** — Reticulum's control-plane mechanism for transferring
larger-than-packet payloads over a link; also the slowest fetch path and the
`resource` SDK namespace built on it.

**Reticulum** — the underlying network stack: identity, addressing, encryption,
routing over any mix of interfaces. Profiled in
[SPEC-WIRE](../specs/spec-wire/spec.md).

**Roles** — what a host does for others: _transport node_ (forwards traffic),
_seeder_ (serves package downloads), _propagation node_ (holds messages).

**Sans-IO** — the discipline that protocol code performs no direct IO: effects
in as events, effects out as intents. Enforced by the ratchet
(`sansio-ratchet.json`), the tripwire, the canary, and `npm run sansio`.
Prose spelling is _Sans-IO_; `sansio` appears in identifiers. Maintenance guide:
[docs/sansio.md](sansio.md); contract: [SPEC-MACHINE](../specs/spec-machine/spec.md).

**Seeder** — a host that keeps package copies so nearby peers install quickly.

**Sidecar (device sidecar)** — the out-of-broker streaming channel carrying
device sample frames, because the broker is not a media bus
([packages/miniapp-runtime/src/device-sidecar.ts](../packages/miniapp-runtime/src/device-sidecar.ts)).

**Simulator** — the seeded, deterministic host built from the same machines
behind simulated adapters; a conforming host, not a mock. Packages
`sim-adversaries` and `sim-campaign` drive it.

**Spec groups** — A: adopted network specs (profiles over upstream); B:
execution substrate (machine/events/kernel/adapter/trace); C: platform
(name/pkg/cap/sdk/widget/present/chrome/device/authority/bind).

**Store posture** — the app-store compliance variant of a host build; the
worklet refuses store-forbidden operations when `STORE_VARIANT` is set
(`store-posture-policy.mjs`).

**Tape** — the recorded event/intent stream seen as a machine tape; the "tape
alphabet" is the closed [SPEC-EVENTS](../specs/spec-events/spec.md) vocabulary.

**Trace** — the replayable recording of events, intents, and time advances;
canonicalized, hashed, diffable, shrinkable. Producer-interchangeable across
production, CI, and simulator. [SPEC-TRACE](../specs/spec-trace/spec.md).

**Tripwire** — the runtime guard that throws `SansIOViolation` when protocol
code touches a forbidden API
([packages/effects/src/tripwire.ts](../packages/effects/src/tripwire.ts)).

**Twinned (formally twinned)** — a lifecycle machine maintained as four
edge-for-edge cross-checked representations: executable table, TLA+ model,
checked traces, generated vector. See _Authority machine_, _Exemplar_.

**Vector** — a machine-checkable fixture of inputs and expected outcomes.
Kinds in use: golden (upstream-pinned), Layer-3 (model-generated), layout,
decode/reject. Vectors are normative.

**Widget / widget tree** — the declarative UI a mini-app emits over
`ui.render`; the host renders it, which is why apps cannot fake system prompts.
Vocabulary: [SPEC-WIDGET](../specs/spec-widget/spec.md); layout semantics:
[SPEC-PRESENT](../specs/spec-present/spec.md).

**Worklet** — the isolated JS process inside a host that runs the networking
stack and mini-app host (Bare on mobile, bundled process on desktop, worker on
web). A TwistedPear term of art — not a Web Worklet.

**Workspace** — the DevStudio document store. The `code-editor` widget is
content-by-reference: it carries a workspace `documentId`, never file text.

## One word, several senses

These words are overloaded in the tree. When writing, qualify them.

- **Bridge** — (1) [packages/bridge-hyper](../packages/bridge-hyper/): control
  plane ↔ bulk plane; (2) the _device bridge_ (worklet ↔ native hardware
  effects); (3) the worklet IPC bridges (`ipc-*-bridge.mjs`: mDNS, multicast,
  serial, BLE); (4) `bridge-forwarder.ts` in host-core. Prefer "hyper bridge",
  "device bridge", "IPC bridge".
- **Chrome** — host chrome (SPEC-CHROME) vs the Chromium browser runtime of the
  desktop host. Write "host chrome" for the former.
- **Harness** — the conformance harness ([conformance/](../conformance/)), the
  release harness (`test:release-harness`), and
  [apps/harness-mobile](../apps/harness-mobile/) — which, despite the name, is
  the shipping mobile/web host, not a test harness.
- **Node** — a Reticulum peer ("transport node", "propagation node"), the
  headless Node.js host (`node-host.ts`), and the Node.js runtime. Qualify.
- **Plane** — control plane (Reticulum), bulk plane (Pears), fetch plane
  (package-fetch abstraction), flag plane (relay flag control). The first two
  are transport planes; the last two are host-internal abstractions.
- **Ratchet** — the Sans-IO ratchet (`sansio-ratchet.json`, a
  monotonically-shrinking exception list) vs the cryptographic identity ratchet
  (`identity-ratchet-record.ts`).
- **Relay** — traffic relaying (transport-node role), `RelayService` /
  `relay:*` capabilities, the flag-plane relay, the gateway's `/dht-relay`
  endpoint, the web sandbox proxy relay, and the `app-relay` cookbook app.
- **Vector** — see the glossary entry; always say which kind.
- **Worklet** — the host's engine process (this repo's sense) vs Web Worklets
  (never meant here).

## Canonical spellings

| Concept          | In prose                                          | In identifiers/paths |
| ---------------- | ------------------------------------------------- | -------------------- |
| Mini-app         | mini-app                                          | `miniapp`            |
| Sans-IO          | Sans-IO                                           | `sansio`             |
| 256t identifier  | 256t identifier (user prose: share identifier)    | `cas-256t`, `256t`   |
| Propagation node | propagation node (user prose: propagation server) | `propagation`        |
| Host chrome      | host chrome                                       | `chrome`             |
