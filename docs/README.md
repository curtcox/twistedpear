# Documentation index


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Use this page to find the canonical document for a topic. The root
[README](../README.md) covers repository setup and common commands; the interactive
[Handbook](../apps/handbook/README.md) is the user- and app-developer-facing guide.

Documents marked **historical design** explain why the current implementation was
built, but they are not the source of truth for current status.

## Start here

| Goal | Document |
|---|---|
| Use TwistedPear as an end user (install, connect, run apps) | [User Guide](../guide/README.md) |
| Understand why the project exists and what success means | [Motivation](motivation.md) |
| See how TwistedPear relates to similar projects | [Prior art](prior-art.md) |
| See the path and gates to the v1 release | [Release plan](../RELEASE-PLAN.md) |
| Understand the platform and run it locally | [Repository README](../README.md) |
| See the specification decomposition and per-spec conformance | [Specifications index](../specs/README.md) |
| Look up a term used in the code, specs, or docs | [Developer glossary](glossary.md) |
| Execute the shared-abstraction and naming cleanup | [Consolidation plan](consolidation-plan.md) |
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
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md). [archive/design/plan-v0.md](../archive/design/plan-v0.md) and documents explicitly
marked **historical design** preserve design rationale and acceptance criteria; they do not
override those status registers.

[Reader-guide remaining work](reader-guide-remaining-work.md) is a work order derived from the
feature-status appendices of the [User Guide](../guide/appendix-feature-status.md),
[App Authoring Guide](../authors/appendix-feature-status.md), and
[Cookbook](../cookbook/appendix-feature-status.md): it sorts every incomplete feature those
guides admit to into work this repository can do and work gated on hardware, accounts, or
deliberate v1 scope.

## Archive

Superseded plans, one-shot handoffs, and point-in-time evidence logs are indexed in
[archive/README.md](../archive/README.md). Do not edit archived files except to fix links.

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
| Unified local peer discovery, invitation exchange, and connection | [Local peer discovery and connection plan](local-peer-discovery-plan.md), [implementation status](local-peer-discovery-implementation.md) |
| Capability × host matrix (includes `peer:connect`, `relay:*`, `device:*`) | [Platform capabilities status](platform-capabilities-status.md) |
| BLE roles, framing, and conformance | [BLE interface](ble-interface.md) |
| WebSocket framing, lifecycle, and gateway endpoints | [WebSocket interface](websocket-interface.md) |
| Freenet as a transport and app substrate | [Freenet integration plan](freenet-integration-plan.md) |
| Freenet remaining work, simulator-first sequencing | [Freenet simulator-first work plan](freenet-simulator-first-work-plan.md) |
| Freenet app-execution decision (Option A) | [ADR: Freenet app execution](adr-freenet-app-execution.md) |
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
| Expose device sensors and actuators to mini-apps | [Device I/O plan](device-io-plan.md), [add a device class](device-class-runbook.md) |
| Per-capability status including `device:*` | [Platform capabilities status](platform-capabilities-status.md) |

## Security, quality, and validation

| Topic | Document |
|---|---|
| Sandbox threat model and findings | [Security review](security-review.md) |
| CI gates, nightly jobs, and exclusions | [CI policy](ci-policy.md) |
| Full local validation workflow | [Single-Mac validation](mac-validation.md) |
| Evidence from the documented Mac validation run | [Mac validation evidence log](../archive/evidence/mac-validation-run-log.md) |
| Sans-IO boundary and enforcement | [Sans-IO protocol discipline](sansio.md) |

Additional focused runbooks are indexed from the
[conformance overview](../conformance/README.md).

## Deterministic abuse simulation

| Purpose | Document |
|---|---|
| Architecture and scope | [Simulation architecture](simulation-architecture.html) |
| Current status, evidence, and remaining external boundary | [Simulation status](simulation-outstanding-work.md) |
| Original phased design | [Implementation plan](../archive/design/simulation-implementation-plan.md) — **historical design** |
| Ongoing find-fix loop, fidelity ramp, and difficulty ladder | [Abuse-resistance loop](abuse-resistance-loop.md) |
