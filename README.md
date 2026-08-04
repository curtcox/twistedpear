# TwistedPear

[![CI](https://github.com/curtcox/twistedpear/actions/workflows/ci.yml/badge.svg)](https://github.com/curtcox/twistedpear/actions/workflows/ci.yml)


<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

TwistedPear is a peer-to-peer application platform built around Reticulum,
LXMF, and Pear-style local-first distribution. The repository contains:

- TypeScript protocol implementations for Reticulum and LXMF.
- A signed mini-app package format, 256t share identifiers, app registry, and
  host install/update pipeline.
- A brokered mini-app runtime with host-rendered UI, explicit capabilities, and
  desktop, mobile, and web host implementations.
- Example mini-apps, an in-platform Handbook, DevStudio, and conformance suites
  that exercise the stack against local, browser, simulator, and hardware-gated
  targets.

## Repository map

| Path | Purpose |
|---|---|
| [packages/reticulum-ts](packages/reticulum-ts/) | Reticulum network stack implementation. |
| [packages/lxmf-ts](packages/lxmf-ts/) | LXMF client and router implementation. |
| [packages/miniapp-runtime](packages/miniapp-runtime/) | Broker, sandbox, lifecycle, grants, and widget model. |
| [packages/miniapp-sdk](packages/miniapp-sdk/) | SDK surface available to mini-app code. |
| [packages/bridge-freenet](packages/bridge-freenet/) | Optional Freenet contract-state adapter and verified package fetch path. |
| [packages/host-core](packages/host-core/) | Runtime-neutral host engine shared by desktop, web, mobile, and headless modes. |
| [packages/cli](packages/cli/) | `tp` CLI for packaging, publishing, seeding, and node roles. |
| [apps/harness-mobile](apps/harness-mobile/) | Expo dev-build mobile host and web-host target. |
| [apps/host-desktop](apps/host-desktop/) | Electron desktop host. |
| [apps/examples](apps/examples/) | Reference chat, file-drop, and board mini-apps. |
| [apps/handbook](apps/handbook/) | Interactive platform Handbook shipped as a mini-app. |
| [cookbook/apps](cookbook/apps/) | Twenty-five cookbook sample mini-apps. CI validates their packages, runtime rendering, and React Native Web pages. |
| [conformance](conformance/) | Scenario runners, golden vectors, interop tests, and device runbooks. |
| [specs](specs/) | Quasi-independent specification units; vectors and formal models are normative. |

## Documentation

If you want to *use* TwistedPear rather than work on it, start with the
[User Guide](guide/README.md). If you want to *write a mini-app* for it, start with the
[App Authoring Guide](authors/README.md). For twenty-five complete sample apps showing what
the platform can carry, see the [Cookbook](cookbook/README.md).

Published site: [curtcox.github.io/twistedpear](https://curtcox.github.io/twistedpear/)
([user guide](https://curtcox.github.io/twistedpear/guide/),
[app authoring guide](https://curtcox.github.io/twistedpear/authors/),
[cookbook](https://curtcox.github.io/twistedpear/cookbook/),
[docs](https://curtcox.github.io/twistedpear/docs/),
[specs](https://curtcox.github.io/twistedpear/specs/),
[quality results](https://curtcox.github.io/twistedpear/results/)).

For a map of how the pieces fit together — layers, package graph, host shapes, distribution
and messaging paths, and the conformance and quality machinery around them — read
[docs/architecture.md](docs/architecture.md).

Start with the [documentation index](docs/README.md). It identifies the canonical
reference for each topic and explains the repository's doc lifecycle: what is built
(`live`) and what is merely intended (`planned`) are separate files — `docs/<topic>.md`
and `docs/<topic>-plan.md` — and superseded plans, closed decisions, and dated evidence
live under [archive/](archive/README.md).
The path to the first release — gates, iteration loops, and sequencing — is
[RELEASE-PLAN.md](RELEASE-PLAN.md).

Package-level READMEs cover protocol development:

- [reticulum-ts](packages/reticulum-ts/README.md)
- [lxmf-ts](packages/lxmf-ts/README.md)
- [bridge-freenet](packages/bridge-freenet/README.md)
- [example mini-apps](apps/examples/README.md)
- [mobile harness](apps/harness-mobile/README.md)
- [conformance harness](conformance/README.md)

## Local setup

Install dependencies from the repository root:

```sh
npm ci
```

Build and test the TypeScript workspace:

```sh
npm run build
npm test
```

## Run implementations locally

| Target | Commands | Notes |
|---|---|---|
| Protocol packages | `npm test`<br>`npm run build` | Runs the workspace Vitest suite and builds all packages. See [reticulum-ts](packages/reticulum-ts/README.md) and [lxmf-ts](packages/lxmf-ts/README.md). |
| Reticulum/LXMF interop | `npm run test:interop` | Docker-backed Python RNS/LXMF interop. See [conformance](conformance/README.md). |
| Example mini-apps | `npm run build`<br>`npm run test:examples` | Exercises chat, file-drop, and board through package/install/runtime paths. See [apps/examples](apps/examples/README.md). |
| Handbook mini-app | `npm run build:handbook`<br>`npm run test:handbook` | Builds and validates the Handbook mini-app. Web validation is `npm run test:web-handbook`. |
| Mobile host | `npm run build`<br>`npm run build:worklet`<br>`cd apps/harness-mobile && npx expo run:android` | Use `npx expo run:ios` for the iOS simulator on macOS. See [apps/harness-mobile](apps/harness-mobile/README.md). |
| Web host | `npm run run:web` | Builds the web worker bundle and starts Expo web for local development. See [docs/web-host.md](docs/web-host.md). |
| Desktop host | `npm run run:desktop` | Builds and starts the Electron desktop host. See [docs/desktop-host.md](docs/desktop-host.md). |
| Headless node/seeder | `tp node --data-dir ~/.local/share/twistedpear/host`<br>`tp seed --transport --state-dir .tp/seeder` | Available after the workspace is built. See [docs/desktop-host.md](docs/desktop-host.md). |
| Multiple peers on one Mac | `npm run peers -- up hub node2`<br>`npm run test:local-multipeer -- --attach`<br>`npm run peers -- down` | Starts any combination of local peers (hub, extra `tp node`s, desktop, iOS simulator, Android emulator) and runs the discovery + LXMF matrix across them. See [docs/local-multipeer.md](docs/local-multipeer.md). |
| Mini-app runtime conformance | `npm run test:hostile-apps`<br>`npm run test:sdk-interop`<br>`npm run test:dev-loop`<br>`npm run test:miniapp-soak` | Runtime, SDK, dev side-load, and soak coverage. See [conformance](conformance/README.md). |
| Web conformance | `npm run test:web-runtime`<br>`npm run test:web-miniapp`<br>`npm run test:web-examples`<br>`npm run test:web-pwa` | Browser/runtime slices for the web implementation. See [docs/web-host.md](docs/web-host.md). |
| Desktop conformance | `npm run test:desktop`<br>`npm run test:desktop-lifecycle`<br>`npm run test:desktop-soak` | Desktop host smoke, lifecycle, and soak coverage. |
| Mobile simulator/lab slices | `npm run test:ios-sim`<br>`npm run test:android-emulator` | `test:ios-sim` skips outside macOS unless using `test:ios-sim:required`. Device-gated exits are tracked in [STATUS-HARDWARE.md](STATUS-HARDWARE.md). |

The full list of runnable scripts is in [package.json](package.json). The
conformance overview groups the most important suites by platform phase:
[conformance/README.md](conformance/README.md).

## Handbook

The Handbook is interactive diagnostic documentation shipped as a mini-app.

| Host | How to get the Handbook |
|---|---|
| Desktop | First boot seeds `handbook`, `devstudio`, and `chat` from the TwistedPear platform publisher. Open **Installed** and launch **handbook**. |
| Web / mobile | Install from a published 256t id (same path as any mini-app) after `tp publish` on a gateway peer, or use a desktop-seeded LAN mirror. For BLE-constrained links, publish **part packages** (`npm run pack:handbook-parts`) — five slices under ~180 KiB each. |
| Node / CI | `npm run test:handbook` |
| Develop | `npm run build:handbook` · `npm run audit:handbook` · `npm run pack:handbook-parts` then `tp pack handbook` in a temp project. |

Implementation and verification: [docs/handbook.md](docs/handbook.md).
