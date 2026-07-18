# Documentation index

Use this page to find the canonical document for a topic. The root
[README](../README.md) covers repository setup and common commands; the interactive
[Handbook](../apps/handbook/README.md) is the user- and app-developer-facing guide.

Documents marked **historical design** explain why the current implementation was
built, but they are not the source of truth for current status.

## Start here

| Goal | Document |
|---|---|
| Understand why the project exists and what success means | [Motivation](motivation.md) |
| See how TwistedPear relates to similar projects | [Prior art](prior-art.md) |
| See the path and gates to the v1 release | [Release plan](../RELEASE-PLAN.md) |
| Understand the platform and run it locally | [Repository README](../README.md) |
| Learn the platform interactively | [Handbook mini-app](../apps/handbook/README.md) |
| Check implemented and verified work | [Completed-work evidence](../STATUS-COMPLETE.md) |
| Check remaining software work | [Software backlog](../STATUS-SOFTWARE.md) |
| Check hardware- or account-gated work | [Hardware status](../STATUS-HARDWARE.md) |
| Review known limitations | [Limitations](../LIMITATIONS.md) |
| Run the complete local validation suite | [Single-Mac validation](mac-validation.md) |

## Status and history

The status documents are intentionally disjoint: completed evidence belongs in
[STATUS-COMPLETE.md](../STATUS-COMPLETE.md), open software work in
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md), and device/account/real-network work in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md). [PLAN.md](../PLAN.md) and documents explicitly
marked **historical design** preserve design rationale and acceptance criteria; they do not
override those status registers.

## Mini-app development and distribution

| Topic | Canonical document |
|---|---|
| Runtime isolation, capabilities, lifecycle, and UI | [Mini-app runtime](miniapp-runtime.md) |
| SDK namespaces and widget protocol | [Mini-app SDK](miniapp-sdk.md) |
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
| iOS multicast entitlement | [iOS multicast entitlement](ios-multicast-entitlement.md) |
| iOS review, privacy, and export notes | [iOS submission dossier](ios-submission.md) |
| macOS signing and notarization | [macOS notarization](macos-notarization.md) |

## Networking and interfaces

| Topic | Document |
|---|---|
| BLE roles, framing, and conformance | [BLE interface](ble-interface.md) |
| WebSocket framing, lifecycle, and gateway endpoints | [WebSocket interface](websocket-interface.md) |
| LXMF propagation-node operation | [Propagation node](propagation-node.md) |
| Battery and link-budget guidance | [Battery and bandwidth policy](battery-bandwidth-policy.md) |
| Publishing protocol work upstream | [Upstream publication](upstream-publication.md) |

Protocol implementation details live in the
[reticulum-ts](../packages/reticulum-ts/README.md) and
[lxmf-ts](../packages/lxmf-ts/README.md) package READMEs.

## Security, quality, and validation

| Topic | Document |
|---|---|
| Sandbox threat model and findings | [Security review](security-review.md) |
| CI gates, nightly jobs, and exclusions | [CI policy](ci-policy.md) |
| Full local validation workflow | [Single-Mac validation](mac-validation.md) |
| Evidence from the documented Mac validation run | [Mac validation evidence log](mac-validation-screenshots-plan.md) |
| Sans-IO boundary and enforcement | [Sans-IO protocol discipline](sansio.md) |

Additional focused runbooks are indexed from the
[conformance overview](../conformance/README.md).

## Deterministic abuse simulation

| Purpose | Document |
|---|---|
| Architecture and scope | [Simulation architecture](simulation-architecture.html) |
| Current status, evidence, and remaining external boundary | [Simulation status](simulation-outstanding-work.md) |
| Original phased design | [Implementation plan](simulation-implementation-plan.md) — **historical design** |
| Ongoing find-fix loop, fidelity ramp, and difficulty ladder | [Abuse-resistance loop](abuse-resistance-loop.md) |
