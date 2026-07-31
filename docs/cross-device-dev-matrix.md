# Cross-device develop-and-run matrix

<!-- tp-doc
lifecycle: live
audited: 2026-07-31
register: none
-->

Automated proof that a mini-app authored on one peer implementation can be
transferred to, and run on, a different peer implementation — with every
implementation exercised as **developer**, **runner**, **transfer source**, and
**transfer target** at least once. Everything runs on a single Mac using
simulated and emulated devices.

Companion to [Single-machine multi-peer environment](local-multipeer.md) (how
the peers come up), [DevStudio](devstudio.md) (what "develop" means here), and
[Single-Mac validation](mac-validation.md) (where this plan is executed).

## Scope

**In scope — the four scored variants:**

| Variant | Implementation | Emulation |
|---|---|---|
| `desktop` | Electron host ([apps/host-desktop](../apps/host-desktop)) | native macOS process |
| `ios` | Expo harness ([apps/harness-mobile](../apps/harness-mobile)) | iOS Simulator |
| `android` | same harness | Android emulator (`Pixel_8_API_34`) |
| `web` | Expo web host in Chromium | Playwright-driven browser tab |

**Infrastructure, not scored:** the `hub` (`tp node` with the TCP server
interface, WebSocket gateway, and transport enabled) and any extra `node2…node9`
peers. They route and, where a scenario needs it, carry bytes — but they do not
consume a role slot, because the requirement is about the four product surfaces.

**Out of scope:** physical phones, real multi-machine LAN, Windows, and radio
links — all tracked in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## Role definitions

A scenario is a **chain** of one or more transfer hops. Roles are credited per
scenario:

| Role | Credited to | Proven by |
|---|---|---|
| **developer** | head of the chain | created the project in DevStudio, edited source, previewed, packaged, and signed under its own publisher identity — with the host confirmation modal for `package` observed in that host's own chrome |
| **transfer source** | the sending side of each hop | served the archive bytes for that hop (Reticulum Resource over the CAS locator it announced), and the receiver's fetch is attributed to it |
| **transfer target** | the receiving side of each hop | resolved the 94-char 256t string, fetched the archive, verified SHA-512 + SHA-256 + package signature, passed capability review, and installed |
| **runner** | tail of the chain | launched the installed app and rendered its widget tree, asserted through the running host |

A single-hop scenario `A → B` credits developer+source to `A` and target+runner
to `B`. Multi-hop scenarios exist to prove source and target are genuinely
separable from developer and runner (see [S5](#s5--mirror-chain-role-independence)).

## Coverage model

Four single-hop scenarios in a rotation cover all sixteen (variant, role) cells:

| Scenario | Chain | developer | source | target | runner |
|---|---|---|---|---|---|
| S1 | `desktop → ios` | desktop | desktop | ios | ios |
| S2 | `ios → android` | ios | ios | android | android |
| S3 | `android → web` | android | android | web | web |
| S4 | `web → desktop` | web | web | desktop | desktop |

Union over S1–S4: each of `desktop`, `ios`, `android`, `web` appears exactly once
in each of the four roles. **This is the covering set and the CI gate.**

The requirement is not asserted by reading this table — the runner emits a
coverage ledger and a test fails if any cell is empty. See
[The coverage ledger](#the-coverage-ledger).

### S5 — mirror chain (role independence)

One extra scenario proves a device can be a transfer source for a package it did
not author, and a transfer target for a device that is not the developer:

```
desktop (author) → android (install + re-serve) → ios (install + re-serve) → web (install + run)
```

Credits: developer `desktop`; source `desktop, android, ios`; target
`android, ios, web`; runner `web`. Every intermediate hop re-announces the
**original signed locator** — the manifest signature stays the author's, only
the CAS locator announce is local. S5 is a nightly scenario, not a gate, because
it depends on the mirror path landing (see [Prerequisite spikes](#prerequisite-spikes)).

### Nightly full matrix

`--matrix` runs all 12 ordered single-hop pairs over the four variants, plus S5.
This is the redundancy layer: it catches a broken pair that the covering set
happens not to include.

## Topology

Reuses the hub-and-spoke topology from
[local-multipeer.md](local-multipeer.md) unchanged, with one addition — the hub
gains a WebSocket listener and serves the web bundle, so the browser peer is a
real Reticulum leaf on the same mesh rather than a special case:

```
                     tp node "hub"
      TCP 0.0.0.0:4242 · WS :4243 · --serve-web · transport on
                            |
   +-----------+------------+------------+-------------+
   |           |                         |             |
 desktop     iOS sim               Android emu       web tab
(Electron) 127.0.0.1:4242         10.0.2.2:4242    ws://127.0.0.1:4243
```

Every peer also dials out to the harness control port (34990) as it does today.
The browser leaf cannot accept inbound connections or act as a transport node —
but it *can* serve a package over the Resource path through the gateway
(`createWebPublishService` already calls `attachPackageResourceServer`), which is
what makes `web` a legitimate transfer source rather than a permanent leaf-only
target.

## Drive depth: what is driven through UI, and what is not

Mixed, deliberately. UI automation is reserved for the steps whose whole purpose
is that a human saw them; everything else goes through the test control agent.

| Step | Driven by | Why |
|---|---|---|
| create project, edit source, declare capabilities | control agent | deterministic; the editor path is already covered by `test:devstudio-loop` |
| preview in the dev-preview slot | control agent, UI assertion on the preview surface | |
| **`package` confirmation modal** | host UI (Maestro / Playwright / Electron driver) | consent is only real if it renders in host chrome outside the widget surface |
| **`publish` confirmation modal** | host UI | same |
| **publisher trust import** | host UI | 256t identity string paste/scan is a human-facing trust decision |
| **`install` confirmation + capability review** | host UI | the reviewer must see the requested capabilities and be able to grant a subset |
| resolve 256t, fetch, verify, install | control agent observes; host performs | |
| launch and assert widget tree | control agent | |
| capability denial after subset grant | control agent asserts, UI asserts the visible denial | |

The control agent never approves a confirmation. If a modal is not tapped by the
UI driver, the hop times out — that is the property being tested.

## Per-scenario assertions

Each hop asserts, in order:

1. **Author** — project created; source edited through the editor event; manifest
   declares `storage:kv` + `lxmf:send`; preview runs then stops.
2. **Package** — exactly one `package` confirmation, in host chrome, naming the
   requesting app and publisher fingerprint; a 94-char 256t string is produced
   and matches `/^[A-Za-z0-9_-]{94}$/`.
3. **Publish** — exactly one `publish` confirmation; app announce + `TPCL` CAS
   locator announce observed by the receiving peer.
4. **Trust** — target imports the source's inline publisher identity 256t string
   through host chrome.
5. **Resolve and fetch** — target resolves by 256t: local CAS miss, remembered
   locator or on-demand `TPCR` lookup, then Resource fetch. The fetch is
   attributed to the source peer (this is the transfer-source evidence).
6. **Verify** — SHA-512 against the 256t id, SHA-256 `packageHash` from the signed
   locator, `verifyPackage` signature/downgrade/host-API checks.
7. **Review and install** — capability review shows `storage:kv, lxmf:send`;
   **only `storage:kv` is granted**; install succeeds with the trusted badge.
8. **Run** — app launches on the target; the authored UI renders; the widget tree
   matches what the developer previewed (structural comparison, not pixels).
9. **Denial** — an `lxmf:send` attempt surfaces as a visible capability denial.
10. **Negative** — one hop per target variant repeats step 5 with a single flipped
    byte in the archive and asserts the install is refused before any code runs.

Per scenario the runner writes hop artifacts (logs, screenshots, the 256t string,
the widget tree, the ledger row) under `.tmp/cross-device-dev/<timestamp>/`.

## The coverage ledger

`conformance/cross-device-dev/run.mjs` emits `coverage.json`:

```json
{
  "cells": {
    "desktop": { "developer": ["S1"], "source": ["S1"], "target": ["S4"], "runner": ["S4"] },
    "ios":     { "developer": ["S2"], "source": ["S2"], "target": ["S1"], "runner": ["S1"] },
    "android": { "developer": ["S3"], "source": ["S3"], "target": ["S2"], "runner": ["S2"] },
    "web":     { "developer": ["S4"], "source": ["S4"], "target": ["S3"], "runner": ["S3"] }
  },
  "empty": []
}
```

A cell is only filled by a hop whose assertions all passed. The gate is
`empty: []` — that single assertion *is* the automated form of the requirement.
Skipped GUI peers leave cells empty and therefore fail the gate unless
`CROSS_DEVICE_ALLOW_SKIP=1` is set, mirroring `LOCAL_MULTIPEER_REQUIRED`.

## Prerequisite spikes

Three questions decide how much has to be built. Answer each with a throwaway
probe before committing to the build; each has a defined fallback.

| # | Question | Why it matters | Fallback if the answer is no |
|---|---|---|---|
| P1 | Can `ios`, `android`, and `web` complete `apps:package` + `apps:publish` end to end? [Platform capabilities status](platform-capabilities-status.md) marks all three **partial** on mobile and web. | S2, S3, S4 each need a non-desktop developer | Close the specific gap (it is host wiring, not protocol), or run the developer leg on that variant with packaging performed through its own worklet path and record the gap in [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) |
| P2 | Can a host re-serve a package it installed but did not sign? | S5 (mirror chain) only | Drop S5 to a two-hop variant where the middle peer is the hub, and note that source/target independence is proven at the infrastructure level only |
| P3 | Can the browser host mount the test agent and join the control channel? | the whole `web` column | Drive `web` entirely through Playwright with an in-page evaluation shim instead of the control agent |

P1 is the schedule risk. Run it first.

## Build items

| # | Item | Where | Notes |
|---|---|---|---|
| B1 | `web` peer adapter | `scripts/peers/adapters/web.mjs`, registered in [scripts/peers/registry.mjs](../scripts/peers/registry.mjs) and `GUI_PEER_IDS` | launches Chromium against the hub's `--serve-web` origin, waits for the WS link, mounts the test agent |
| B2 | Hub gains `--ws-listen` + `--serve-web` | `scripts/peers/adapters/node.mjs` | flags already exist in the CLI; the adapter just has to pass them |
| B3 | Web test-agent mount | [apps/harness-mobile/worklet/web-entry.mjs](../apps/harness-mobile/worklet/web-entry.mjs) | opt-in only, from an explicit control endpoint — same posture as the mobile **Connect test agent** button; never on a default path |
| B4 | Distribution verbs on the test agent | [packages/host-core/src/test-agent.ts](../packages/host-core/src/test-agent.ts) | `project.create`, `project.write`, `preview`, `package`, `publish`, `trust.import`, `install`, `run`, `state`, `cas.has`. Requests only — confirmations stay in chrome |
| B5 | Maestro flows | `.maestro/devstudio-author.yaml`, `.maestro/devstudio-install.yaml` | tap the `package` / `publish` / trust / install-review modals, assert publisher fingerprint and capability list, grant the subset |
| B6 | Playwright driver | `conformance/cross-device-dev/drivers/web.mjs` | same modal assertions in the web host chrome |
| B7 | Electron driver | reuse [conformance/desktop](../conformance/desktop) helpers | |
| B8 | Scenario runner + ledger | `conformance/cross-device-dev/run.mjs` | `--attach`, `--scenarios=S1,S3`, `--matrix`, `--allow-skip`; writes `proof.json` + `coverage.json` |
| B9 | Ledger gate test | `conformance/cross-device-dev/coverage.test.mjs` | fails on any empty cell |
| B10 | Scripts + wiring | [package.json](../package.json), [docs/mac-validation.md](mac-validation.md), [docs/ci-policy.md](ci-policy.md) | `test:cross-device-dev`, `test:cross-device-dev:matrix` |

Roughly: B1–B3 are the `web` column, B4–B7 are the drive layer, B8–B10 are the
harness. B4 is the largest single item.

## Running it

```bash
npm run build
npm run peers -- up hub desktop ios android web
npm run test:cross-device-dev -- --attach
npm run peers -- down
```

Without `--attach` the runner brings the peers up and tears them down itself.

```bash
npm run test:cross-device-dev                      # S1–S4, gate
npm run test:cross-device-dev -- --scenarios=S3    # one scenario
npm run test:cross-device-dev -- --matrix          # 12 pairs + S5, nightly
```

## Expected wall time

| Phase | Warm | Cold |
|---|---|---|
| peer bring-up (four GUI peers) | 3–5 min | 25–40 min (native iOS/Android builds) |
| S1–S4 | 12–20 min | same |
| `--matrix` | 35–60 min | same |

Announce ingress is rate limited to roughly one per five seconds per
destination, so per-hop timeouts stay generous and are overridable exactly as
in the multipeer suite.

## Flake control

- **Fixed fixture project**, not an AI edit. The mock-OpenRouter AI path is
  already covered by `test:devstudio-loop`; one nightly scenario may enable it,
  the gate never does.
- **One standing peer environment** for all scenarios in a run — GUI peers boot
  once, not per scenario.
- **Structural widget-tree comparison**, never screenshot diffing.
- **Per-hop artifact capture on failure** — logs from both peers, the 256t
  string, the last host screenshot, the control-agent state dump.
- **Explicit skip accounting** — a peer that cannot start is reported as a
  skipped cell, and a skipped cell fails the gate by default.

## Where this runs

- **Local**: a new stage in [Single-Mac validation](mac-validation.md), after the
  existing mobile stage, so the emulators are already warm.
- **CI**: the covering set joins the `workflow_dispatch` emulator lab described
  in [CI policy](ci-policy.md); `--matrix` joins the nightly schedule. Neither
  belongs on the PR path — the mobile boots are too slow.
