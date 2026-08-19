# Appendix: feature status

<!-- tp-doc
lifecycle: live
audited: 2026-08-19
register: none
-->

Every feature this guide marks as incomplete, in one place. This appendix is a reading aid;
the authoritative registers are [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md),
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md), and [LIMITATIONS.md](../LIMITATIONS.md). Where
those disagree with this page, they win.

Last reviewed against the registers: **2026-08-19**.

Every feature this appendix lists is a statement about **what exists today**, not a plan.
Intended work lives in separate `-plan.md` documents under [`docs/`](../docs/README.md) —
for example [device-io-plan.md](../docs/device-io-plan.md) beside
[device-io.md](../docs/device-io.md). A plan never means a feature ships; this page and the
registers it cites do. See [docs/README.md](../docs/README.md) for the full convention.

The user guide keeps its own list of what is incomplete for people _using_ TwistedPear:
[guide/appendix-feature-status.md](../guide/appendix-feature-status.md). This page covers only
what affects authoring.

## ⏳ Not yet available

You cannot use these today.

| Feature                                         | Where it appears                                                   | Blocker                                                                                                    | Tracked as                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A published `tp` package or signed binary       | [3](03-hello-world-with-the-cli.md)                                | Nothing is published or notarized; every install is built from source.                                     | H17, [release plan](../RELEASE-PLAN.md)                        |
| Key rotation, revocation, multi-maintainer apps | [3](03-hello-world-with-the-cli.md), [10](10-updates-and-trust.md) | Out of scope for v1. Lose the key and the app can never be updated.                                        | [docs/package-format.md](../docs/package-format.md) §1         |
| React binding for the UI                        | [1](01-what-you-are-building.md)                                   | A custom reconciler is designed but unbuilt, and explicitly non-blocking for v1.                           | [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) — optional backlog |
| Hyperbee replication between devices            | [6](06-storage-and-files.md)                                       | v1 Hyperbee is local-only; cross-device sync topics are future work.                                       | [docs/miniapp-sdk.md](../docs/miniapp-sdk.md)                  |
| Mini-app IPC and shared storage                 | [1](01-what-you-are-building.md), [5](05-capabilities.md)          | Deliberately deferred, not missing. Do not design a suite of cooperating apps.                             | [LIMITATIONS.md §7](../LIMITATIONS.md)                         |
| Group messaging, attachments, history sync      | [7](07-identity-messaging-and-peers.md)                            | Not in v1 scope.                                                                                           | [LIMITATIONS.md §7](../LIMITATIONS.md)                         |
| Physical-device performance and battery figures | [12](12-limits-and-budgets.md)                                     | Spawn/kill/memory/battery on real handsets is hardware debt; published battery numbers are design targets. | H3, H11, H13                                                   |

## ⚠️ Works, with limits

You can build on these, but not the way the surrounding text might suggest.

| Feature                      | Limit                                                                                                                                                                                | Where it appears                                                         | Tracked as                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Author-guide screenshots     | 20 of 22 are real desktop-host, DevStudio, or CLI captures; 2 still need a handset or a three-platform native-control composite. Reasons in [images/README.md](images/README.md). | everywhere                                                               | [images/README.md](images/README.md)                              |
| Publisher-identity backup    | `tp` encrypts new identities and supports backup import/export, two-part BIP-39 recovery, and passphrase changes; it does not rotate or revoke a publisher.                          | [3](03-hello-world-with-the-cli.md)                                      | [docs/identity-backup.md](../docs/identity-backup.md)             |
| Multipart propagation        | `lxmf-ts` host integrations can resume and reassemble bounded payloads; 64 KiB default, 1,000,000-byte hard maximum, and 32-byte content frames. Not a mini-app attachment API.      | [7](07-identity-messaging-and-peers.md)                                  | [docs/multipart-propagation.md](../docs/multipart-propagation.md) |
| DevStudio projects           | Single-file bundles only. No in-host bundler, so `import` works only for the SDK.                                                                                                    | [2](02-hello-world-in-devstudio.md)                                      | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |
| AI-assisted editing          | Streams a whole-file proposal for explicit review; one in-flight request; deltas are host-coalesced rather than token-aligned; ≤ 64 messages; `maxTokens` clamped to 8,192.          | [2](02-hello-world-in-devstudio.md), [8](08-ai-and-authoring-apps.md)    | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |
| Dev preview slot             | One slot. Previewing again replaces the previous preview.                                                                                                                            | [2](02-hello-world-in-devstudio.md), [11](11-testing-and-debugging.md)   | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |
| Dev side-loading             | Localhost/adb only, off by default, always badged **DEV**.                                                                                                                           | [3](03-hello-world-with-the-cli.md), [11](11-testing-and-debugging.md)   | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |
| Resolving a 256t identifier  | Local and remembered locators resolve immediately; otherwise the host requests the specific locator and holders re-announce its signed record. It still requires a reachable holder. | [2](02-hello-world-in-devstudio.md), [9](09-packaging-and-publishing.md) | [docs/256t-distribution.md](../docs/256t-distribution.md)         |
| QR scanning                  | Mobile and desktop host chrome can scan; desktop requires Chromium `BarcodeDetector` support and camera permission. Paste remains the fallback.                                      | [2](02-hello-world-in-devstudio.md)                                      | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |
| Workspace files              | 256 KiB per file, 4 MiB and 512 files per app. Editor changes are delta-based; the remaining ceiling is a host safety quota.                                                         | [6](06-storage-and-files.md)                                             | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |
| Sandbox isolation            | Broker chokepoint, deny-by-default grants, and hostile-input conformance pass on desktop and emulators; Bare Worker hostile parity on physical hardware is unmeasured.               | [1](01-what-you-are-building.md), [11](11-testing-and-debugging.md)      | H11, [docs/security-review.md](../docs/security-review.md)        |
| Runaway-app watchdog         | Thresholds untuned on low-end hardware; may stop a merely slow app.                                                                                                                  | [11](11-testing-and-debugging.md)                                        | H11                                                               |
| Browser storage              | OPFS/IndexedDB under browser quota; evictable by the user agent.                                                                                                                     | [6](06-storage-and-files.md)                                             | [LIMITATIONS.md §8](../LIMITATIONS.md)                            |
| Browser sandbox              | Rests on sandboxed iframes and CSP rather than OS processes — a weaker boundary.                                                                                                     | [11](11-testing-and-debugging.md)                                        | [LIMITATIONS.md §8](../LIMITATIONS.md)                            |
| Hyperswarm bulk distribution | Needs IP connectivity and Holepunch's DHT bootstrap; does not run over Reticulum or in a browser tab.                                                                                | [9](09-packaging-and-publishing.md)                                      | [LIMITATIONS.md §6](../LIMITATIONS.md)                            |
| Memory limit changes         | Apply at the app's next launch, not immediately; rate and quota changes apply live.                                                                                                  | [6](06-storage-and-files.md), [12](12-limits-and-budgets.md)             | [LIMITATIONS.md §7](../LIMITATIONS.md)                            |

## Permanent trade-offs

These are not going to change; they follow from the design, and are documented in full in
[LIMITATIONS.md](../LIMITATIONS.md).

- **Nothing runs while TwistedPear is not the app on screen.** On iOS the OS suspends the
  host outright and there is no way around it. (The related limit — that only _one_
  mini-app runs even while the host is in the foreground — is **not** permanent and is not
  listed here; see the section below.)
- **No native modules.** JavaScript through the broker, or nothing.
- **No central registry, so no store, no search, and no moderation.** Your app reaches people
  because a peer announced it, and nobody reviews anyone's code.
- **No anonymity.** Payloads are encrypted; local radio presence is observable.
- **Radio links are slow.** Bluetooth is tens of kilobits per second; LoRa is hundreds of bits.
  Package size is a product decision, not an optimisation.
- **Browsers can never be full peers.** No inbound connections means no seeding and no relaying
  on that target, ever.
- **Signatures authenticate the publisher, not the behaviour.** The capability grant is the
  user's actual defence.

## Limits that look permanent and are not

Mobile operating systems suspend the **host app**; they do not cap how many mini-apps a
running host may hold. Several limits that read like design rules are really unfinished
implementation, and the platform tracks them with revisit triggers that fail the build if
they lapse. Do not design as though these were settled:

- **No suspend/resume events for your app.** The host observes both transitions today and
  simply does not forward them.
- **No background execution on Android.** The host already runs a foreground service; what
  is missing is a decision about battery budgets, not a platform capability.
- **No shared storage between mini-apps.** A brokered `apps:channel` copies messages after
  both sides grant the named destination; a shared store is still withheld.

The full ledger, with the cause of each row and what would lift it, is
[docs/mobile-lifecycle.md](../docs/mobile-lifecycle.md).
