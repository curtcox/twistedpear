# Documentation index

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: none
-->

Use this page to find the canonical document for a topic. The root
[README](../README.md) covers repository setup and common commands; the interactive
[Handbook](../apps/handbook/README.md) is the user- and app-developer-facing guide.

## How to tell current from planned

**Every tracked markdown file declares its lifecycle** in a `tp-doc` comment under its
title. Read that field before you read the document.

| `lifecycle:` | The document describes | Trust it for |
|---|---|---|
| `live` | The implementation as it exists now | Current behaviour, current status |
| `planned` | Work that is intended but not built | Design intent and sequencing — **never** current behaviour |
| `reference` | Durable explanation, procedure, or runbook | How to do something; not a status claim |
| `historical` | A superseded plan, decision, or dated evidence log. Only ever under [`archive/`](../archive/README.md) | Why a past choice was made. Nothing else |

**Current and planned are separate files, never separate sections of one file.** Where a
topic has both, the pair is `<topic>.md` (live) and `<topic>-plan.md` (planned), each
naming the other in a `counterpart:` field and linking to it in its opening paragraph.
When they disagree, the `live` document wins — including against its own plan.

| Topic | Current implementation | Plan |
|---|---|---|
| Freenet integration | [freenet.md](freenet.md) | [freenet-plan.md](freenet-plan.md), sequenced by [freenet-simulator-first-work-plan.md](freenet-simulator-first-work-plan.md) |
| Device I/O | [device-io.md](device-io.md) | [device-io-plan.md](device-io-plan.md) |
| Local peer discovery | [local-peer-discovery.md](local-peer-discovery.md), [evidence register](local-peer-discovery-evidence.md) | [local-peer-discovery-plan.md](local-peer-discovery-plan.md) |
| Realtime peer media | [realtime-media.md](realtime-media.md) | [realtime-media-plan.md](realtime-media-plan.md) |
| Relay and configurable interfaces | [relay-interfaces.md](relay-interfaces.md) | [relay-interfaces-plan.md](relay-interfaces-plan.md) |
| Deterministic abuse simulation | [simulation.md](simulation.md) | [simulation-plan.md](simulation-plan.md), loop mechanics in [abuse-resistance-loop.md](abuse-resistance-loop.md) |
| Static analysis | [static-analysis.md](static-analysis.md) | [static-analysis-plan.md](static-analysis-plan.md) |
| Observability / drop census | [observability.md](observability.md) | *(executed — [archived plan](../archive/design/observability-plan.md))* |

The rule is enforced by `npm run test:doc-audit`: a missing or invalid `tp-doc` header, a
`historical` document outside `archive/`, a non-historical document inside it, or a
one-sided `counterpart:` all fail the build.

## Start here

| Goal | Document |
|---|---|
| Get a short answer to a common question and a pointer to the canonical document | [FAQ](FAQ.md) |
| Use TwistedPear as an end user (install, connect, run apps) | [User Guide](../guide/README.md) |
| Understand why the project exists and what success means | [Motivation](motivation.md) |
| See how the whole repository fits together | [Architecture](architecture.md) |
| See how TwistedPear relates to similar projects | [Prior art](prior-art.md) |
| See the path and gates to the v1 release | [Release plan](../RELEASE-PLAN.md) |
| Understand the platform and run it locally | [Repository README](../README.md) |
| See the specification decomposition and per-spec conformance | [Specifications index](../specs/README.md) |
| Look up a term used in the code, specs, or docs | [Developer glossary](glossary.md) |
| Learn the platform interactively | [Handbook mini-app](../apps/handbook/README.md) |
| Check implemented and verified work | [Completed-work evidence](../STATUS-COMPLETE.md) |
| Check remaining software work | [Software backlog](../STATUS-SOFTWARE.md) |
| Check hardware- or account-gated work | [Hardware status](../STATUS-HARDWARE.md) |
| Check capability × host implementation / testing / validation | [Platform capabilities status](platform-capabilities-status.md) |
| Review known limitations | [Limitations](../LIMITATIONS.md) |
| Run the complete local validation suite | [Single-Mac validation](mac-validation.md) |

## Status and history

The status documents are intentionally disjoint: completed evidence belongs in
[STATUS-COMPLETE.md](../STATUS-COMPLETE.md), open software work in
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md), and device/account/real-network work in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md). Everything under
[`archive/`](../archive/README.md) preserves design rationale and acceptance criteria; it
does not override those registers, and it does not describe current behaviour.

[Reader-guide remaining work](reader-guide-plan.md) is a work order derived from the
feature-status appendices of the [User Guide](../guide/appendix-feature-status.md),
[App Authoring Guide](../authors/appendix-feature-status.md), and
[Cookbook](../cookbook/appendix-feature-status.md): it sorts every incomplete feature those
guides admit to into work this repository can do and work gated on hardware, accounts, or
deliberate v1 scope.

## Archive

Superseded plans, closed decision records, one-shot handoffs, executed repository work
orders, and point-in-time evidence logs are indexed in
[archive/README.md](../archive/README.md), under `design/`, `decisions/`, `handoffs/`,
`meta/`, and `evidence/`. Do not edit archived files except to fix links, and do not cite
them as current behaviour.

## Mini-app development and distribution

| Topic | Canonical document |
|---|---|
| Runtime isolation, capabilities, lifecycle, and UI | [Mini-app runtime](miniapp-runtime.md) |
| SDK namespaces and widget protocol | [Mini-app SDK](miniapp-sdk.md) |
| Capability × peer-type implementation matrix | [Platform capabilities status](platform-capabilities-status.md) |
| Signed package structure and fetch paths | [Package format](package-format.md) |
| 256t identifiers and package resolution | [256t distribution](256t-distribution.md) |
| In-platform development environment | [DevStudio](devstudio.md) |
| Interactive documentation implementation | [Handbook](handbook.md) |

The package-level READMEs for
[miniapp-runtime](../packages/miniapp-runtime/),
[miniapp-sdk](../packages/miniapp-sdk/), and
[example apps](../apps/examples/README.md) contain build and test details.

## Hosts and release operations

| Topic | Document |
|---|---|
| Desktop and headless roles | [Desktop host](desktop-host.md) |
| Browser host | [Web host](web-host.md) |
| iOS behavior and simulator notes | [iOS host](ios-host.md) |
| Android emulator workflows | [Android emulator lab](android-emulator-lab.md) |
| Several peers on one Mac | [Single-machine multi-peer environment](local-multipeer.md) |
| Author on one implementation, run on another | [Cross-device develop-and-run matrix](cross-device-dev-matrix.md) |
| iOS multicast entitlement | [iOS multicast entitlement](ios-multicast-entitlement.md) |
| iOS review, privacy, and export notes | [iOS submission dossier](ios-submission.md) |
| macOS signing and notarization | [macOS notarization](macos-notarization.md) |

## Networking and interfaces

| Topic | Document |
|---|---|
| Unified local peer discovery, invitation exchange, and connection | [current implementation](local-peer-discovery.md), [plan](local-peer-discovery-plan.md) |
| Capability × host matrix (includes `peer:connect`, `relay:*`, `device:*`) | [Platform capabilities status](platform-capabilities-status.md) |
| Relay over any medium, configurable interfaces | [Relay interfaces — current](relay-interfaces.md), [plan](relay-interfaces-plan.md) |
| BLE roles, framing, and conformance | [BLE interface](ble-interface.md) |
| WebSocket framing, lifecycle, and gateway endpoints | [WebSocket interface](websocket-interface.md) |
| Screen/camera packet framing and erasure recovery | [Optical interface](optical-interface.md) |
| Speaker/microphone packet framing and FEC | [Acoustic interface](acoustic-interface.md) |
| Encrypted ntfy packet transport | [ntfy interface](ntfy-interface.md) |
| Freenet as a transport and app substrate | [Freenet — current](freenet.md), [plan](freenet-plan.md) |
| Freenet remaining work, simulator-first sequencing | [Freenet simulator-first work plan](freenet-simulator-first-work-plan.md) |
| Freenet app-execution decision (Option A) | [ADR (archived decision)](../archive/decisions/freenet-app-execution.md) |
| Discovery/delivery drop diagnosis and trace capture | [current implementation](observability.md), [archived plan](../archive/design/observability-plan.md) |
| LXMF propagation-node operation | [Propagation node](propagation-node.md) |
| Bounded multipart LXMF store-and-forward | [Multipart propagation](multipart-propagation.md) |
| Battery and link-budget guidance | [Battery and bandwidth policy](battery-bandwidth-policy.md) |
| Publishing protocol work upstream | [Upstream publication](upstream-publication.md) |

Protocol implementation details live in the
[reticulum-ts](../packages/reticulum-ts/README.md) and
[lxmf-ts](../packages/lxmf-ts/README.md) package READMEs.

## Device I/O and sensors

| Topic | Document |
|---|---|
| Expose device sensors and actuators to mini-apps | [Device I/O — current](device-io.md), [plan](device-io-plan.md), [add a device class](device-class-runbook.md) |
| Per-peer link quality and realtime audio/video between peers | [Realtime peer media — current](realtime-media.md), [plan](realtime-media-plan.md) |
| Per-capability status including `device:*` | [Platform capabilities status](platform-capabilities-status.md) |

## Security, quality, and validation

| Topic | Document |
|---|---|
| Sandbox threat model and findings | [Security review](security-review.md) |
| CI gates, nightly jobs, and exclusions | [CI policy](ci-policy.md) |
| Full local validation workflow | [Single-Mac validation](mac-validation.md) |
| Evidence from the documented Mac validation run | [Mac validation evidence log](../archive/evidence/mac-validation-run-log.md) |
| Sans-IO boundary and enforcement | [Sans-IO protocol discipline](sansio.md) |
| Source-file size thresholds and the decomposition ratchet | [File-size classification](file-sizes.md) |
| Static analysis gates, baselines, and local runner | [Static analysis](static-analysis.md), [remaining plan](static-analysis-plan.md) |

Additional focused runbooks are indexed from the
[conformance overview](../conformance/README.md).

## Deterministic abuse simulation

| Purpose | Document |
|---|---|
| Architecture and scope | [Simulation architecture](simulation-architecture.html) |
| Current status and evidence | [Simulation — current](simulation.md) |
| Remaining work and the external evidence boundary | [Simulation plan](simulation-plan.md) |
| Original phased design | [Implementation plan](../archive/design/simulation-implementation-plan.md) — **archived** |
| Ongoing find-fix loop, fidelity ramp, and difficulty ladder | [Abuse-resistance loop](abuse-resistance-loop.md) |
